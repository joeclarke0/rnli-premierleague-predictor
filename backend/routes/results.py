from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from supabase_client import insert_result, fetch_results
import uuid

router = APIRouter(prefix="/results", tags=["Results"])


class Result(BaseModel):
    gameweek: int
    fixture_id: int
    actual_home: int
    actual_away: int


@router.post("/")
def submit_result(result: Result):
    try:
        print("📝 Incoming result:", result.dict())

        data = {
            "id": str(uuid.uuid4()),
            "gameweek": result.gameweek,
            "fixture_id": result.fixture_id,
            "actual_home": result.actual_home,
            "actual_away": result.actual_away,
        }

        response = insert_result(data)
        print("✅ Result inserted:", response)
        return {"message": "Result submitted to Supabase"}

    except Exception as e:
        print("❌ Error submitting result:", str(e))
        raise HTTPException(status_code=500, detail="Failed to save result.")


@router.get("/")
def get_results(
    gameweek: Optional[int] = Query(None),
    fixture_id: Optional[int] = Query(None)
):
    try:
        filters = {}
        if gameweek is not None:
            filters["gameweek"] = gameweek
        if fixture_id is not None:
            filters["fixture_id"] = fixture_id

        results = fetch_results(filters)
        return {"results": results}

    except Exception as e:
        print("❌ Error fetching results:", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch results.")
