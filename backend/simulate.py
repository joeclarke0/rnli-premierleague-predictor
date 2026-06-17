"""
Full reset + simulation script.

Clears all fixtures, predictions, results, and wildcards then seeds:
  - 10 gameweeks x 10 fixtures (real PL teams, round-robin schedule)
  - Random predictions for every non-admin user (0-4 goals each side)
  - Random results for every fixture

Run from the backend/ directory:
    python simulate.py
"""

import os
import random
from datetime import date, timedelta, datetime, timezone

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from database import SessionLocal
from models import User, Fixture, Prediction, Result, Wildcard

TEAMS = [
    "Arsenal", "Aston Villa", "Brentford", "Brighton",
    "Chelsea", "Crystal Palace", "Everton", "Fulham",
    "Ipswich", "Leicester", "Liverpool", "Man City",
    "Man United", "Newcastle", "Nott'm Forest", "Southampton",
    "Spurs", "West Ham", "Wolves", "Bournemouth",
]

VENUES = {
    "Arsenal": "Emirates Stadium",
    "Aston Villa": "Villa Park",
    "Brentford": "Gtech Community Stadium",
    "Brighton": "Amex Stadium",
    "Chelsea": "Stamford Bridge",
    "Crystal Palace": "Selhurst Park",
    "Everton": "Goodison Park",
    "Fulham": "Craven Cottage",
    "Ipswich": "Portman Road",
    "Leicester": "King Power Stadium",
    "Liverpool": "Anfield",
    "Man City": "Etihad Stadium",
    "Man United": "Old Trafford",
    "Newcastle": "St. James' Park",
    "Nott'm Forest": "City Ground",
    "Southampton": "St. Mary's Stadium",
    "Spurs": "Tottenham Hotspur Stadium",
    "West Ham": "London Stadium",
    "Wolves": "Molineux",
    "Bournemouth": "Vitality Stadium",
}


def generate_rounds(teams: list[str], num_rounds: int) -> list[list[tuple[str, str]]]:
    """Round-robin: fix teams[0], rotate the rest. Returns home/away pairs."""
    n = len(teams)
    fixed = teams[0]
    rotating = list(teams[1:])
    rounds = []
    for rnd in range(num_rounds):
        circle = [fixed] + rotating
        pairs = []
        for i in range(n // 2):
            if rnd % 2 == 0:
                pairs.append((circle[i], circle[n - 1 - i]))
            else:
                pairs.append((circle[n - 1 - i], circle[i]))
        rounds.append(pairs)
        rotating = rotating[1:] + [rotating[0]]
    return rounds


def goal(bias: float = 0.0) -> int:
    """Weighted random goal count (0-5), loosely realistic."""
    weights = [18, 30, 25, 15, 8, 4]
    return random.choices(range(6), weights=weights)[0]


def main() -> None:
    db = SessionLocal()
    try:
        # ── 1. Full wipe ────────────────────────────────────────────────────────
        print("⚠️  Clearing wildcards, predictions, results, fixtures …")
        db.query(Wildcard).delete()
        db.query(Prediction).delete()
        db.query(Result).delete()
        db.query(Fixture).delete()
        db.commit()
        print("✅  Tables cleared.")

        # ── 2. Generate 10 GWs × 10 fixtures ───────────────────────────────────
        print("📅  Generating fixtures …")
        rounds = generate_rounds(TEAMS, 10)
        start_date = date(2026, 8, 15)

        all_fixtures: list[Fixture] = []
        for gw_idx, pairs in enumerate(rounds):
            gw_num = gw_idx + 1
            gw_date = start_date + timedelta(weeks=gw_idx)
            for home, away in pairs:
                f = Fixture(
                    gameweek=gw_num,
                    date=gw_date,
                    day=gw_date.strftime("%a"),
                    time="15:00",
                    home_team=home,
                    away_team=away,
                    venue=VENUES.get(home, ""),
                    kickoff_time=None,
                    status="scheduled",
                )
                db.add(f)
                all_fixtures.append(f)

        db.commit()
        for f in all_fixtures:
            db.refresh(f)
        print(f"✅  {len(all_fixtures)} fixtures across 10 gameweeks.")

        # ── 3. Fetch users ──────────────────────────────────────────────────────
        users = db.query(User).filter(User.role == "user").all()
        if not users:
            print("❌  No non-admin users found — create players first and re-run.")
            return
        print(f"👥  Simulating {len(users)} users: {', '.join(u.username for u in users)}")

        # ── 4. Predictions ──────────────────────────────────────────────────────
        print("🎯  Generating predictions …")
        pred_count = 0
        for user in users:
            for fixture in all_fixtures:
                db.add(Prediction(
                    user_id=user.id,
                    fixture_id=fixture.id,
                    gameweek=fixture.gameweek,
                    predicted_home=goal(),
                    predicted_away=goal(),
                ))
                pred_count += 1
        db.commit()
        print(f"✅  {pred_count} predictions inserted.")

        # ── 5. Results ──────────────────────────────────────────────────────────
        print("⚽  Generating results …")
        result_count = 0
        for fixture in all_fixtures:
            db.add(Result(
                fixture_id=fixture.id,
                gameweek=fixture.gameweek,
                actual_home=goal(),
                actual_away=goal(),
            ))
            fixture.status = "completed"
            result_count += 1
        db.commit()
        print(f"✅  {result_count} results inserted, all fixtures marked completed.")

        # ── 6. Summary ──────────────────────────────────────────────────────────
        print()
        print("🎉  Simulation complete!")
        print(f"    Gameweeks   : 10")
        print(f"    Fixtures    : {len(all_fixtures)} (10 per GW)")
        print(f"    Users       : {len(users)}")
        print(f"    Predictions : {pred_count}")
        print(f"    Results     : {result_count}")
        print()
        print("The leaderboard now has real scored data across 10 gameweeks.")

    except Exception as exc:
        db.rollback()
        print(f"❌  Error — rolled back. {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
