"""
Soft reset script — clears predictions, results, and wildcards
while keeping all fixtures intact.

Fixture status is also reset to 'scheduled' so the UI shows matches
as upcoming rather than completed.

Run from the backend/ directory:
    python reset_data.py
"""

import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from database import SessionLocal
from models import Fixture, Prediction, Result, Wildcard


def main() -> None:
    db = SessionLocal()
    try:
        pred_count = db.query(Prediction).count()
        result_count = db.query(Result).count()
        wildcard_count = db.query(Wildcard).count()

        print(f"Found: {pred_count} predictions, {result_count} results, {wildcard_count} wildcards")
        confirm = input("Proceed with reset? [y/N] ").strip().lower()
        if confirm != "y":
            print("Aborted.")
            return

        print("Clearing wildcards, predictions, results …")
        db.query(Wildcard).delete()
        db.query(Prediction).delete()
        db.query(Result).delete()

        print("Resetting fixture statuses to 'scheduled' …")
        db.query(Fixture).filter(Fixture.status != "scheduled").update({"status": "scheduled"})

        db.commit()

        fixture_count = db.query(Fixture).count()
        print()
        print("Reset complete!")
        print(f"  Fixtures kept : {fixture_count}")
        print(f"  Predictions   : deleted {pred_count}")
        print(f"  Results       : deleted {result_count}")
        print(f"  Wildcards     : deleted {wildcard_count}")
        print()
        print("Wayne can now test the full prediction flow from scratch.")

    except Exception as exc:
        db.rollback()
        print(f"Error — rolled back. {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
