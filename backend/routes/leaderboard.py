from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from collections import defaultdict

from database import get_db
from models import Prediction, Result, User
from scoring import calculate_points

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

        # Create lookup dictionaries
        result_lookup = {r.fixture_id: r for r in results}
        user_lookup = {u.id: u.username for u in users}

        # Initialize leaderboard: {user_id: {gameweek: points}}
        leaderboard = defaultdict(lambda: defaultdict(int))

        # Calculate points for each prediction
        for pred in predictions:
            fixture_id = pred.fixture_id
            user_id = pred.user_id
            gameweek = pred.gameweek

            # Only calculate points if result exists for this fixture
            if fixture_id in result_lookup:
                result = result_lookup[fixture_id]
                score = calculate_points(
                    pred.predicted_home, pred.predicted_away,
                    result.actual_home, result.actual_away
                )
                leaderboard[user_id][gameweek] += score

        # Format leaderboard for response
        formatted = []
        for user_id, scores in leaderboard.items():
            row = {
                "player": user_lookup.get(user_id, f"Unknown ({user_id[:8]})"),
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
