"""Run from backend/: python scripts/whatsapp_photo_worker.py [--once]."""
from whatsapp_worker import main

if __name__ == "__main__":
    raise SystemExit(main(processing=True))
