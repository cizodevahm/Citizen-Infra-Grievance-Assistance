"""Prints 7 fresh random API keys, one per endpoint. Paste the output into .env"""
import secrets

NAMES = [
    "KEY_SUBMIT_COMPLAINT", "KEY_TRACK_COMPLAINT", "KEY_LIST_COMPLAINTS", "KEY_GET_COMPLAINT",
    "KEY_UPDATE_STATUS", "KEY_DASHBOARD_STATS", "KEY_MAP_POINTS",
]
for name in NAMES:
    print(f"{name}={secrets.token_urlsafe(32)}")
