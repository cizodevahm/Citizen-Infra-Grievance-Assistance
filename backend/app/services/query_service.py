"""Read-only queries: list, detail and map points."""
from .. import extensions as ext
from ..errors import NotFoundError

_FIELDS = """
  c.id, c.tracking_id, c.parent_id, p.tracking_id as parent_tracking_id,
  c.status, c.category, c.severity, c.is_urgent, c.department, c.summary,
  c.original_text_english, c.raw_text, c.transcript, c.image_url, c.audio_url,
  c.lat, c.lng, c.report_count, c.user_message, c.ai_decision,
  c.created_at, c.updated_at, c.acknowledged_at, c.resolved_at,
  c.deleted_at, c.deleted_by, c.delete_reason, c.deleted_at is not null as is_deleted
"""
_FROM = "from complaints c left join complaints p on p.id = c.parent_id"

_SORT_COLUMNS = {"id": "c.id", "created_at": "c.created_at"}
_LOOKUP = {"tracking_id": "c.tracking_id", "id": "c.id"}


def list_complaints(page, limit, categories, statuses, sort_by, order, main_only, urgent_only):
    where, params = ["c.deleted_at is null"], {}
    if categories:
        where.append("c.category = any(%(categories)s::text[])")
        params["categories"] = categories
    if statuses:
        where.append("c.status = any(%(statuses)s::text[])")
        params["statuses"] = statuses
    if main_only:
        where.append("c.parent_id is null")
    if urgent_only:
        where.append("c.is_urgent")
    where_sql = ("where " + " and ".join(where)) if where else ""

    # sort_by / order are validated against whitelists in the route, never taken raw
    order_sql = f"{_SORT_COLUMNS[sort_by]} {'asc' if order == 'asc' else 'desc'}, c.id desc"

    with ext.db_pool.connection() as conn:
        total = conn.execute(f"select count(*) as n {_FROM} {where_sql}", params).fetchone()["n"]
        rows = conn.execute(
            f"select {_FIELDS} {_FROM} {where_sql} order by {order_sql} "
            "limit %(limit)s offset %(offset)s",
            {**params, "limit": limit, "offset": (page - 1) * limit},
        ).fetchall()

    meta = {
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": (total + limit - 1) // limit if total else 0,
    }
    return rows, meta


def get_detail(by, value):
    """Full detail by 'tracking_id' or 'id', with history and linked tickets."""
    column = _LOOKUP[by]
    with ext.db_pool.connection() as conn:
        row = conn.execute(f"select {_FIELDS} {_FROM} where {column} = %s", (value,)).fetchone()
        if not row:  # soft-deleted rows are still returned, with is_deleted=true
            raise NotFoundError("Complaint not found.")

        row["history"] = conn.execute(
            "select old_status, new_status, changed_by, changed_at "
            "from status_history where complaint_id = %s order by id",
            (row["id"],),
        ).fetchall()

        row["sub_complaints"] = []
        if row["parent_id"] is None:
            row["sub_complaints"] = conn.execute(
                "select tracking_id, status, image_url, audio_url, user_message, ai_decision, created_at "
                "from complaints where parent_id = %s and deleted_at is null order by id",
                (row["id"],),
            ).fetchall()
    return row


def map_points(categories, statuses, bbox):
    """All complaint points. Clustering on zoom is done by the frontend map library."""
    where, params = ["c.deleted_at is null"], {}
    if categories:
        where.append("c.category = any(%(categories)s::text[])")
        params["categories"] = categories
    if statuses:
        where.append("c.status = any(%(statuses)s::text[])")
        params["statuses"] = statuses
    if bbox:
        where.append("c.lat between %(min_lat)s and %(max_lat)s "
                     "and c.lng between %(min_lng)s and %(max_lng)s")
        params.update(bbox)

    with ext.db_pool.connection() as conn:
        return conn.execute(
            "select c.tracking_id, c.parent_id is null as is_main, "
            "p.tracking_id as parent_tracking_id, "
            "c.lat, c.lng, c.category, c.severity, c.is_urgent, "
            "c.status, c.report_count, c.image_url, c.audio_url, c.user_message, c.ai_decision, "
            "c.created_at "
            f"{_FROM} {('where ' + ' and '.join(where)) if where else ''} order by c.id",
            params,
        ).fetchall()


def map_hotspots(categories, statuses, bbox):
    """Hotspots for the same map filters/viewport."""
    where, params = ["c.deleted_at is null", "c.parent_id is null", "c.report_count >= 2"], {}
    if categories:
        where.append("c.category = any(%(categories)s::text[])")
        params["categories"] = categories
    if statuses:
        where.append("c.status = any(%(statuses)s::text[])")
        params["statuses"] = statuses
    else:
        where.append("c.status <> 'completed'")
    if bbox:
        where.append("c.lat between %(min_lat)s and %(max_lat)s "
                     "and c.lng between %(min_lng)s and %(max_lng)s")
        params.update(bbox)

    with ext.db_pool.connection() as conn:
        return conn.execute(
            """
            select c.tracking_id, c.lat, c.lng, c.category, c.severity, c.is_urgent,
                   c.status, c.report_count, c.image_url, c.audio_url, c.user_message, c.ai_decision,
                   c.created_at,
                   case c.severity
                     when 'urgent' then 4
                     when 'high' then 3
                     when 'medium' then 2
                     else 1
                   end as severity_rank
            from complaints c
            where """ + " and ".join(where) + """
            order by c.is_urgent desc, severity_rank desc, c.report_count desc, c.created_at asc
            limit 5
            """,
            params,
        ).fetchall()
