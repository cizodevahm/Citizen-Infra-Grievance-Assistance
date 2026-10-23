"""Run from backend/: python scripts/whatsapp_worker.py [--once]."""
import argparse
import logging
import signal
import sys
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import extensions as ext
from app.config import Config
from app.services import whatsapp_queue

logger = logging.getLogger("whatsapp_worker")


def main():
    parser = argparse.ArgumentParser(description="Process the WhatsApp inbox and outgoing replies.")
    parser.add_argument("--once", action="store_true", help="Process at most one event and one reply, then exit.")
    args = parser.parse_args()
    stopping = threading.Event()
    for signum in (signal.SIGINT, signal.SIGTERM):
        signal.signal(signum, lambda *_: stopping.set())
    try:
        Config.validate()
        if not Config.WHATSAPP_ENABLED:
            logger.error("WhatsApp is disabled; set WHATSAPP_ENABLED=true to run the worker.")
            return 1
        ext.init_extensions(None, worker=True)
        logger.info("WhatsApp worker ready; shutdown waits for the current transaction.")
        failures = 0
        while not stopping.is_set():
            try:
                incoming = whatsapp_queue.process_event()
                outgoing = False if stopping.is_set() else whatsapp_queue.send_outbox()
                failures = 0
            except Exception as error:
                # DB connection failures roll back transactions. Never log exception contents.
                failures += 1
                logger.error("WhatsApp worker iteration failed (%s)", type(error).__name__)
                if args.once:
                    return 1
                stopping.wait(min(30, 2 ** min(failures, 5)))
                continue
            if args.once:
                logger.info("WhatsApp --once finished; processed_event=%s processed_reply=%s", incoming, outgoing)
                return 0
            if not incoming and not outgoing:
                stopping.wait(1)
        return 0
    except Exception as error:
        logger.error("WhatsApp worker startup failed (%s); check backend settings and database schema.", type(error).__name__)
        return 1
    finally:
        if ext.db_pool is not None:
            ext.db_pool.close()
        if ext.openai_client is not None:
            ext.openai_client.close()
        if ext.s3_client is not None:
            ext.s3_client.close()
        logger.info("WhatsApp worker stopped.")


if __name__ == "__main__":
    raise SystemExit(main())
