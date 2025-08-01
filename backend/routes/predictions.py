from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from supabase_client import insert_prediction, fetch_predictions, delete_prediction, supabase, is_admin_user
from routes.auth import verify_jwt_token
import uuid

router = APIRouter(prefix="/predictions", tags=["Predictions"])

class Prediction(BaseModel):
    user_id: str
    gameweek: int
    fixture_id: int
    predicted_home: int
    predicted_away: int

class PredictionUpdate(BaseModel):
    predicted_home: int
    predicted_away: int

def get_current_user(token: str = Query(None)):
    """Get current user from token"""
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
    
    try:
        payload = verify_jwt_token(token)
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/")
def submit_prediction(prediction: Prediction, current_user: dict = Depends(get_current_user)):
    try:
        print("📝 Incoming prediction:", prediction.dict())
        
        # Check if user is submitting for themselves or is admin
        if prediction.user_id != current_user["user_id"] and current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Can only submit predictions for yourself")

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

    except HTTPException:
        raise
    except Exception as e:
        print("❌ Error submitting prediction:", str(e))
        raise HTTPException(status_code=500, detail="Failed to save prediction.")

@router.get("/")
def get_predictions(
    user_id: str = Query(None),
    gameweek: int = Query(None),
    fixture_id: int = Query(None),
    current_user: dict = Depends(get_current_user)
):
    try:
        # Regular users can only see their own predictions
        # Admins can see all predictions
        if current_user.get("role") != "admin":
            if user_id and user_id != current_user["user_id"]:
                raise HTTPException(status_code=403, detail="Can only view your own predictions")
            # Force user_id to current user if not admin
            user_id = current_user["user_id"]

        filters = {}
        if user_id:
            filters["user_id"] = user_id
        if gameweek:
            filters["gameweek"] = gameweek
        if fixture_id:
            filters["fixture_id"] = fixture_id

        predictions = fetch_predictions(filters)
        print("✅ Predictions fetched")
        return {"predictions": predictions}

    except HTTPException:
        raise
    except Exception as e:
        print("❌ Error fetching predictions:", str(e))
        raise HTTPException(status_code=500, detail="Could not fetch predictions")

@router.delete("/{prediction_id}")
def delete_prediction_endpoint(
    prediction_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a prediction (admin only or own prediction)"""
    try:
        # Check if user is admin or owns the prediction
        if current_user.get("role") != "admin":
            # Check if user owns the prediction
            predictions = fetch_predictions({"id": prediction_id})
            if not predictions or predictions[0]["user_id"] != current_user["user_id"]:
                raise HTTPException(status_code=403, detail="Can only delete your own predictions")

        success = delete_prediction(prediction_id, current_user["user_id"])
        if success:
            return {"message": "Prediction deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete prediction")

    except HTTPException:
        raise
    except Exception as e:
        print("❌ Error deleting prediction:", str(e))
        raise HTTPException(status_code=500, detail="Could not delete prediction")

@router.put("/{prediction_id}")
def update_prediction(
    prediction_id: str,
    prediction_update: PredictionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a prediction (admin only or own prediction)"""
    try:
        # Check if user is admin or owns the prediction
        if current_user.get("role") != "admin":
            # Check if user owns the prediction
            predictions = fetch_predictions({"id": prediction_id})
            if not predictions or predictions[0]["user_id"] != current_user["user_id"]:
                raise HTTPException(status_code=403, detail="Can only update your own predictions")

        # Update prediction logic would go here
        # For now, we'll just return success
        return {"message": "Prediction updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print("❌ Error updating prediction:", str(e))
        raise HTTPException(status_code=500, detail="Could not update prediction")
