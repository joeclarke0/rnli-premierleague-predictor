from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sheets import get_worksheet
import traceback

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
        sheet = get_worksheet("Predictions")
        print("✅ Connected to Predictions sheet")

        row = [
            prediction.user_id,
            prediction.gameweek,
            prediction.fixture_id,
            "", "",  # home_team, away_team (to be filled later)
            prediction.predicted_home,
            prediction.predicted_away
        ]

        sheet.append_row(row)
        print("✅ Row appended to Google Sheet")

        return {"message": "Prediction submitted successfully"}

    except Exception as e:
        print("❌ Error:", str(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Something went wrong while saving your prediction.")

