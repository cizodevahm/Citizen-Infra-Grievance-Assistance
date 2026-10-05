from .. import extensions as ext
from ..config import Config

_STATS = """
select
  count(*)                                                        as received,
  count(*) filter (where status in ('pending','processing'))      as open,
  count(*) filter (where status = 'completed')                    as resolved,
  count(*) filter (where status in ('pending','processing')
                     and created_at < now() - make_interval(days => %(days)s::int)) as overdue,
  count(*) filter (where parent_id is null)                       as unique_issues,
  count(*) filter (where is_urgent and status <> 'completed')     as urgent_open,
  avg(extract(epoch from (acknowledged_at - created_at)))
      filter (where parent_id is null and acknowledged_at is not null) as avg_ack_seconds
from complaints
where deleted_at is null
"""

_BY_CATEGORY = """
select category, count(*) as count
from complaints
where deleted_at is null
group by category
order by count desc
"""


def get_stats():
    with ext.db_pool.connection() as conn:
        s = conn.execute(_STATS, {"days": Config.OVERDUE_DAYS}).fetchone()
        by_category = conn.execute(_BY_CATEGORY).fetchall()

    avg_seconds = float(s["avg_ack_seconds"]) if s["avg_ack_seconds"] is not None else None
    return {
        "received": s["received"],
        "open": s["open"],
        "resolved": s["resolved"],
        "overdue": s["overdue"],
        "overdue_after_days": Config.OVERDUE_DAYS,
        "avg_time_to_acknowledge": _format_duration(avg_seconds),
        "unique_issues": s["unique_issues"],
        "urgent_open": s["urgent_open"],
        "by_category": by_category,
    }


def _format_duration(seconds):
    if seconds is None:
        return None

    total_seconds = max(0, round(seconds))
    days, remainder = divmod(total_seconds, 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes, seconds = divmod(remainder, 60)

    parts = []
    if days:
        parts.append(f"{days} day{'s' if days != 1 else ''}")
    if hours:
        parts.append(f"{hours} hr{'s' if hours != 1 else ''}")
    if minutes:
        parts.append(f"{minutes} min{'s' if minutes != 1 else ''}")
    if not parts:
        parts.append(f"{seconds} sec{'s' if seconds != 1 else ''}")
    return " ".join(parts)
