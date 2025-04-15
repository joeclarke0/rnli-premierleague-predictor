from fastapi import APIRouter

router = APIRouter(prefix="/predictions", tags=["Predictions"])

@router.get("/")
def test_predictions():
    return {"message": "Predictions route is working!"}
