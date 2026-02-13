from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Prediction, Result, User
from auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


def calculate_points(pred_home, pred_away, act_home, act_away):
    if pred_home == act_home and pred_away == act_away:
        return 5
    elif (pred_home > pred_away and act_home > act_away) or \
         (pred_home < pred_away and act_home < act_away) or \
         (pred_home == pred_away and act_home == act_away):
        return 2
    return 0


@router.get("/me/stats")
def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get personal stats for the current user.
    Returns total predictions, accuracy, points per gameweek, best/worst week, current rank.
    """
    predictions = db.query(Prediction).filter(Prediction.user_id == current_user.id).all()
    results = db.query(Result).all()
    all_users_predictions = db.query(Prediction).all()

    result_lookup = {r.fixture_id: r for r in results}

    # Gameweek-level stats
    week_points = {}
    total_exact = 0
    total_result = 0
    total_wrong = 0

    for pred in predictions:
        if pred.fixture_id in result_lookup:
            r = result_lookup[pred.fixture_id]
            pts = calculate_points(pred.predicted_home, pred.predicted_away, r.actual_home, r.actual_away)
            week = pred.gameweek
            week_points[week] = week_points.get(week, 0) + pts
            if pts == 5:
                total_exact += 1
            elif pts == 2:
                total_result += 1
            else:
                total_wrong += 1

    total_scored = total_exact + total_result + total_wrong
    accuracy = round((total_exact + total_result) / total_scored * 100) if total_scored > 0 else 0
    total_points = sum(week_points.values())
    best_week = max(week_points.values(), default=0)
    worst_week = min(week_points.values(), default=0) if week_points else 0
    best_week_num = max(week_points, key=week_points.get, default=None)

    # Calculate current rank vs all users
    user_totals = {}
    for pred in all_users_predictions:
        if pred.fixture_id in result_lookup:
            r = result_lookup[pred.fixture_id]
            pts = calculate_points(pred.predicted_home, pred.predicted_away, r.actual_home, r.actual_away)
            uid = pred.user_id
            user_totals[uid] = user_totals.get(uid, 0) + pts

    sorted_users = sorted(user_totals.items(), key=lambda x: x[1], reverse=True)
    rank = next((i + 1 for i, (uid, _) in enumerate(sorted_users) if uid == current_user.id), None)

    # Build weekly progression for chart (weeks with data)
    weekly_progression = [
        {"week": w, "points": week_points[w]}
        for w in sorted(week_points.keys())
    ]

    return {
        "username": current_user.username,
        "total_points": total_points,
        "total_predictions": len(predictions),
        "predictions_scored": total_scored,
        "exact_scores": total_exact,
        "correct_results": total_result,
        "wrong_predictions": total_wrong,
        "accuracy_pct": accuracy,
        "best_week_points": best_week,
        "best_week_num": best_week_num,
        "worst_week_points": worst_week,
        "current_rank": rank,
        "total_players": len(user_totals),
        "weekly_progression": weekly_progression,
    }
