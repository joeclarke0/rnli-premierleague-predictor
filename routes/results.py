from fastapi import APIRouter

router = APIRouter(prefix="/results", tags=["Results"])

@router.get("/")
def test_results():
    return {"message": "Results route is working!"}
