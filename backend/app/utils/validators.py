import math

from ..errors import ValidationError


def parse_int(value, name, default, min_value=1, max_value=None):
    if value in (None, ""):
        return default
    try:
        n = int(value)
    except (TypeError, ValueError):
        raise ValidationError(f"'{name}' must be an integer.")
    if n < min_value or (max_value is not None and n > max_value):
        limit = f"{min_value}..{max_value}" if max_value is not None else f">= {min_value}"
        raise ValidationError(f"'{name}' must be {limit}.")
    return n


def parse_float(value, name, min_value, max_value, required=True):
    if value in (None, ""):
        if required:
            raise ValidationError(f"'{name}' is required.")
        return None
    try:
        f = float(value)
    except (TypeError, ValueError):
        raise ValidationError(f"'{name}' must be a number.")
    if not math.isfinite(f) or f < min_value or f > max_value:
        raise ValidationError(f"'{name}' must be between {min_value} and {max_value}.")
    return f


def parse_choices(value, name, allowed):
    """'a,b' -> ['a','b'] (validated). Empty -> None."""
    if not value:
        return None
    items = [v.strip().lower() for v in value.split(",") if v.strip()]
    bad = [i for i in items if i not in allowed]
    if bad:
        raise ValidationError(f"Invalid {name}: {', '.join(bad)}. Allowed: {', '.join(allowed)}.")
    return items or None


def parse_bool(value):
    return str(value or "").strip().lower() in ("1", "true", "yes")
