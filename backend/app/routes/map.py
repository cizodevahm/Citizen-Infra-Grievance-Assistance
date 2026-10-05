from flask import Blueprint, request

from ..constants import CATEGORIES, STATUSES
from ..errors import ValidationError
from ..responses import ok
from ..services import query_service
from ..utils.validators import parse_choices, parse_float

bp = Blueprint("map", __name__, url_prefix="/map")


@bp.get("/points")
def map_points():
    """Flat list of complaint points. Cluster / un-cluster on zoom is done by the map library."""
    categories = parse_choices(request.args.get("category"), "category", CATEGORIES)
    statuses = parse_choices(request.args.get("status"), "status", STATUSES)

    # optional viewport filter: all four or none
    keys = ("min_lat", "max_lat", "min_lng", "max_lng")
    present = [k for k in keys if request.args.get(k) not in (None, "")]
    bbox = None
    if present:
        if len(present) != 4:
            raise ValidationError("Send all of min_lat, max_lat, min_lng, max_lng or none of them.")
        bbox = {
            "min_lat": parse_float(request.args["min_lat"], "min_lat", -90, 90),
            "max_lat": parse_float(request.args["max_lat"], "max_lat", -90, 90),
            "min_lng": parse_float(request.args["min_lng"], "min_lng", -180, 180),
            "max_lng": parse_float(request.args["max_lng"], "max_lng", -180, 180),
        }

    points = query_service.map_points(categories, statuses, bbox)
    hotspots = query_service.map_hotspots(categories, statuses, bbox)
    return ok(points, {"total": len(points)}, hotspots=hotspots)
