from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Prediction, Result, User, Fixture, Wildcard
from scoring import compute_gameweek_points, calculate_points

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


@router.get("/")
def get_leaderboard(db: Session = Depends(get_db)):
    """
    Get the leaderboard with all users' scores across all gameweeks.

    Returns a leaderboard with:
    - Rank (1st, 2nd, 3rd, etc.)
    - Player name
    - Score for each gameweek (week_1 through week_38)
    - Total score

    Scoring system:
    - Exact score: 5 points
    - Correct result: 2 points
    - Wrong prediction: 0 points
    """
    try:
        # Fetch all predictions, results, and users
        predictions = db.query(Prediction).all()
        results = db.query(Result).all()
        users = db.query(User).all()

        # Fixtures that are postponed must not contribute to scoring even if a
        # stale result lingers on them.
        postponed_fixture_ids = {
            f.id for f in db.query(Fixture).filter(Fixture.status == "postponed").all()
        }

        # Create lookup dictionaries
        result_lookup = {r.fixture_id: r for r in results}
        user_lookup = {u.id: u.username for u in users}

        # (user_id, gameweek) pairs that have an active wildcard — drives x2.
        wildcard_lookup = {
            (w.user_id, w.gameweek) for w in db.query(Wildcard).all()
        }

        # Shared scoring helper: returns {user_id: {gameweek: doubled_points}},
        # already applying postponed exclusion and wildcard doubling so the
        # leaderboard and admin totals can never diverge.
        leaderboard = compute_gameweek_points(
            predictions, result_lookup, postponed_fixture_ids, wildcard_lookup
        )

        # Count exact score predictions per player (raw count, not points).
        # Postponed fixtures are excluded — a stale result on a postponed fixture
        # should never contribute.
        exact_counts = {}
        for pred in predictions:
            if pred.fixture_id in postponed_fixture_ids:
                continue
            result = result_lookup.get(pred.fixture_id)
            if result is None:
                continue
            if calculate_points(pred.predicted_home, pred.predicted_away,
                                result.actual_home, result.actual_away) == 5:
                exact_counts[pred.user_id] = exact_counts.get(pred.user_id, 0) + 1

        # Format leaderboard for response
        formatted = []
        for user_id, scores in leaderboard.items():
            row = {
                "player": user_lookup.get(user_id, f"Unknown ({user_id[:8]})"),
                "exact_scores": exact_counts.get(user_id, 0),
            }

            # Add scores for all 38 gameweeks
            total = 0
            for week in range(1, 39):
                week_score = scores.get(week, 0)
                row[f"week_{week}"] = week_score
                total += week_score

            row["total"] = total
            formatted.append(row)

        # Sort by total score (descending)
        sorted_leaderboard = sorted(formatted, key=lambda x: x["total"], reverse=True)

        # Add rank
        for idx, row in enumerate(sorted_leaderboard, start=1):
            row["rank"] = idx

        print(f"✅ Leaderboard calculated: {len(sorted_leaderboard)} players")

        return {"leaderboard": sorted_leaderboard}

    except Exception as e:
        print("❌ Error generating leaderboard:", str(e))
        raise HTTPException(status_code=500, detail="Failed to calculate leaderboard")
