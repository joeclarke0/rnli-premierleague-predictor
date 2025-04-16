from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from supabase_client import insert_prediction, supabase
import uuid

router = APIRouter(prefix="/predictions", tags=["Predictions"])

class Prediction(BaseModel):
    user_id: str
    gameweek: int
    fixture_id: int
    predicted_home: int
    predicted_away: int

@router.post("/")
def submit_prediction(prediction: Prediction):
    try:
        print("📝 Incoming prediction:", prediction.dict())

        data = {
            "id": str(uuid.uuid4()),
            "user_id": prediction.user_id,
            "gameweek": prediction.gameweek,
            "fixture_id": prediction.fixture_id,
            "predicted_home": prediction.predicted_home,
            "predicted_away": prediction.predicted_away,
        }

        result = insert_prediction(data)
        print("✅ Prediction inserted:", result)

        return {"message": "Prediction submitted to Supabase"}

    except Exception as e:
        print("❌ Error submitting prediction:", str(e))
        raise HTTPException(status_code=500, detail="Failed to save prediction.")

@router.get("/")
def get_predictions(
    user_id: str = Query(None),
    gameweek: int = Query(None),
    fixture_id: int = Query(None)
):
    try:
        query = supabase.table("predictions").select("*")

        if user_id:
            query = query.eq("user_id", user_id)
        if gameweek:
            query = query.eq("gameweek", gameweek)
        if fixture_id:
            query = query.eq("fixture_id", fixture_id)

        response = query.execute()
        print("✅ Predictions fetched")
        return {"predictions": response.data}

    except Exception as e:
        print("❌ Error fetching predictions:", str(e))
        raise HTTPException(status_code=500, detail="Could not fetch predictions")
