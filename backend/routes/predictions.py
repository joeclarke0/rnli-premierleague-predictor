from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional

from database import get_db
from models import User, Prediction, Fixture
from auth import get_current_user, get_current_admin

router = APIRouter(prefix="/predictions", tags=["Predictions"])


class PredictionSubmit(BaseModel):
    fixture_id: int
    gameweek: int
    predicted_home: int
    predicted_away: int


@router.post("/")
def submit_prediction(
    prediction: PredictionSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit or update a prediction for a fixture.
    Requires authentication. Uses current user's ID from JWT token.

    - **fixture_id**: ID of the fixture to predict
    - **gameweek**: Gameweek number
    - **predicted_home**: Predicted home team score
    - **predicted_away**: Predicted away team score
    """
    try:
        print(f"📝 Incoming prediction from user {current_user.username}:", prediction.dict())

        # Verify fixture exists
        fixture = db.query(Fixture).filter(Fixture.id == prediction.fixture_id).first()
        if not fixture:
            raise HTTPException(status_code=404, detail="Fixture not found")

        # Check if prediction already exists for this user and fixture
        existing = db.query(Prediction).filter(
            Prediction.user_id == current_user.id,
            Prediction.fixture_id == prediction.fixture_id
        ).first()

        if existing:
            # Update existing prediction
            existing.predicted_home = prediction.predicted_home
            existing.predicted_away = prediction.predicted_away
            existing.gameweek = prediction.gameweek
            db.commit()
            db.refresh(existing)
            print(f"✅ Prediction updated: {existing.id}")
            return {"message": "Prediction updated successfully", "prediction_id": existing.id}
        else:
            # Create new prediction
            new_prediction = Prediction(
                user_id=current_user.id,
                fixture_id=prediction.fixture_id,
                gameweek=prediction.gameweek,
                predicted_home=prediction.predicted_home,
                predicted_away=prediction.predicted_away
            )
            db.add(new_prediction)
            db.commit()
            db.refresh(new_prediction)
            print(f"✅ Prediction created: {new_prediction.id}")
            return {"message": "Prediction submitted successfully", "prediction_id": new_prediction.id}

    except IntegrityError as e:
        db.rollback()
        print("❌ Database integrity error:", str(e))
        raise HTTPException(status_code=400, detail="Invalid prediction data")
    except Exception as e:
        db.rollback()
        print("❌ Error submitting prediction:", str(e))
        raise HTTPException(status_code=500, detail="Failed to save prediction")


@router.get("/")
def get_predictions(
    user_id: Optional[str] = Query(None),
    gameweek: Optional[int] = Query(None),
    fixture_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get predictions with optional filters.
    Regular users can only see their own predictions.
    Admins can see any user's predictions by providing user_id.

    - **user_id**: Filter by user ID (admin only)
    - **gameweek**: Filter by gameweek number
    - **fixture_id**: Filter by fixture ID
    """
    try:
        query = db.query(Prediction)

        # If user is admin and user_id is provided, filter by that user
        # Otherwise, filter by current user
        if current_user.role == "admin" and user_id:
            query = query.filter(Prediction.user_id == user_id)
        else:
            query = query.filter(Prediction.user_id == current_user.id)

        # Apply additional filters
        if gameweek is not None:
            query = query.filter(Prediction.gameweek == gameweek)
        if fixture_id is not None:
            query = query.filter(Prediction.fixture_id == fixture_id)

        predictions = query.all()

        # Convert to dict for JSON response
        predictions_data = [
            {
                "id": p.id,
                "user_id": p.user_id,
                "fixture_id": p.fixture_id,
                "gameweek": p.gameweek,
                "predicted_home": p.predicted_home,
                "predicted_away": p.predicted_away,
                "created_at": p.created_at.isoformat(),
                "updated_at": p.updated_at.isoformat()
            }
            for p in predictions
        ]

        print(f"✅ Predictions fetched: {len(predictions_data)} results")
        return {"predictions": predictions_data}

    except Exception as e:
        print("❌ Error fetching predictions:", str(e))
        raise HTTPException(status_code=500, detail="Could not fetch predictions")
