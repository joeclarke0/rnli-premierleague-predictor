from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sheets import get_worksheet

router = APIRouter(prefix="/predictions", tags=["Predictions"])

# Define the structure of a prediction
class Prediction(BaseModel):
    user_id: str
    gameweek: int
    fixture_id: int
    predicted_home: int
    predicted_away: int

@router.post("/")
def submit_prediction(prediction: Prediction):
    try:
        # Open the Predictions sheet
        sheet = get_worksheet("Predictions")

        # Prepare the row to append
        row = [
            prediction.user_id,
            prediction.gameweek,
            prediction.fixture_id,
            "", "",  # leave home_team, away_team blank for now (could auto-fill later)
            prediction.predicted_home,
            prediction.predicted_away
        ]

        # Append the row to the sheet
        sheet.append_row(row)

        return {"message": "Prediction submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))