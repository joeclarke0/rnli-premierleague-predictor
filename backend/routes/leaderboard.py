from fastapi import APIRouter, HTTPException
from supabase_client import fetch_predictions, fetch_results, fetch_users
from collections import defaultdict
import time

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])

POINTS = {
    "exact": 5,
    "result": 2,
    "wrong": 0,
}


def calculate_points(pred_home, pred_away, act_home, act_away):
    if pred_home == act_home and pred_away == act_away:
        return POINTS["exact"]
    elif (pred_home > pred_away and act_home > act_away) or \
         (pred_home < pred_away and act_home < act_away) or \
         (pred_home == pred_away and act_home == act_away):
        return POINTS["result"]
    return POINTS["wrong"]


@router.get("/")
def get_leaderboard():
    try:
        print("📊 Generating leaderboard...")
        
        # Add retry logic for database connections
        max_retries = 3
        for attempt in range(max_retries):
            try:
                predictions = fetch_predictions()
                results = fetch_results()
                users = fetch_users()
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    print(f"❌ Failed to fetch data after {max_retries} attempts: {e}")
                    raise HTTPException(status_code=500, detail="Failed to fetch leaderboard data")
                print(f"⚠️  Attempt {attempt + 1} failed, retrying...")
                time.sleep(0.5)  # Brief delay before retry
        
        print(f"✅ Fetched {len(predictions)} predictions, {len(results)} results, {len(users)} users")

        result_lookup = {r["fixture_id"]: r for r in results}
        user_lookup = {u["id"]: u["username"] for u in users}

        leaderboard = defaultdict(lambda: defaultdict(int))

        for pred in predictions:
            fixture_id = pred["fixture_id"]
            user_id = pred["user_id"]
            gameweek = pred["gameweek"]

            if fixture_id in result_lookup:
                result = result_lookup[fixture_id]
                score = calculate_points(
                    pred["predicted_home"], pred["predicted_away"],
                    result["actual_home"], result["actual_away"]
                )
                leaderboard[user_id][gameweek] += score

        formatted = []
        for user_id, scores in leaderboard.items():
            row = {
                "player": user_lookup.get(user_id, user_id),
            }
            total = 0
            for week in range(1, 39):
                week_score = scores.get(week, 0)
                row[f"week_{week}"] = week_score
                total += week_score
            row["total"] = total
            formatted.append(row)

        sorted_leaderboard = sorted(formatted, key=lambda x: x["total"], reverse=True)

        # ✅ Add rank
        for idx, row in enumerate(sorted_leaderboard, start=1):
            row["rank"] = idx

        print(f"✅ Leaderboard generated with {len(sorted_leaderboard)} users")
        return {"leaderboard": sorted_leaderboard}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating leaderboard: {e}")
        # Return empty leaderboard instead of crashing
        return {"leaderboard": []}
