import secrets

# no 0/O/1/I/L so IDs are easy to read out loud
_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def new_tracking_id():
    return "RIF-" + "".join(secrets.choice(_ALPHABET) for _ in range(6))


def normalize_tracking_id(value):
    return (value or "").strip().upper()
