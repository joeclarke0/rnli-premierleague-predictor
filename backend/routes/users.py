from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Prediction, Result, Fixture, Wildcard, User
from auth import get_current_user
from scoring import calculate_points, compute_gameweek_points

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me/stats")
def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get personal stats for the current user.
    Returns total predictions, accuracy, points per gameweek, best/worst week, current rank.
    """
    try:
        predictions = db.query(Prediction).filter(Prediction.user_id == current_user.id).all()
        results = db.query(Result).all()
        all_users_predictions = db.query(Prediction).all()

        result_lookup = {r.fixture_id: r for r in results}

        # Postponed fixtures must never contribute, even if a stale Result lingers.
        postponed_fixture_ids = {
            f.id for f in db.query(Fixture).filter(Fixture.status == "postponed").all()
        }
        # Every (user_id, gameweek) that has an active wildcard (points doubled).
        wildcard_lookup = {(w.user_id, w.gameweek) for w in db.query(Wildcard).all()}

        # ── Per-week points + total (DOUBLED), via the shared helper so the
        # personal-stats total matches the leaderboard exactly under wildcards. ──
        my_scored = compute_gameweek_points(
            predictions, result_lookup, postponed_fixture_ids, wildcard_lookup
        ).get(current_user.id, {})
        # Doubled per-week breakdown the client expects.
        week_points = dict(my_scored)
        total_points = sum(week_points.values())

        # ── Accuracy counters use RAW calculate_points: a wildcard changes the
        # points value, not whether a prediction was exact / correct-result /
        # wrong. Postponed fixtures are skipped so a stale Result can't be counted. ──
        total_exact = 0
        total_result = 0
        total_wrong = 0
        for pred in predictions:
            if pred.fixture_id in postponed_fixture_ids:
                continue
            if pred.fixture_id in result_lookup:
                r = result_lookup[pred.fixture_id]
                pts = calculate_points(pred.predicted_home, pred.predicted_away, r.actual_home, r.actual_away)
                if pts == 5:
                    total_exact += 1
                elif pts == 2:
                    total_result += 1
                else:
                    total_wrong += 1

        total_scored = total_exact + total_result + total_wrong
        accuracy = round((total_exact + total_result) / total_scored * 100) if total_scored > 0 else 0
        best_week = max(week_points.values(), default=0)
        worst_week = min(week_points.values(), default=0) if week_points else 0
        best_week_num = max(week_points, key=week_points.get, default=None)

        # ── Current rank vs all users, computed from DOUBLED per-user totals via
        # the same shared helper so rank matches the leaderboard exactly. ──
        all_scored = compute_gameweek_points(
            all_users_predictions, result_lookup, postponed_fixture_ids, wildcard_lookup
        )
        user_totals = {uid: sum(weeks.values()) for uid, weeks in all_scored.items()}

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
    except Exception as e:
        print("❌ Error generating user stats:", str(e))
        raise HTTPException(status_code=500, detail="Failed to calculate user stats")
