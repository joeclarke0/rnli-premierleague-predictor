from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional
from supabase_client import insert_result, fetch_results, delete_result, upsert_result
from routes.auth import verify_jwt_token
import uuid

router = APIRouter(prefix="/results", tags=["Results"])


class Result(BaseModel):
    gameweek: int
    fixture_id: int
    actual_home: int
    actual_away: int

class ResultUpdate(BaseModel):
    actual_home: int
    actual_away: int

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
def submit_result(result: Result, current_user: dict = Depends(get_current_user)):
    try:
        # Only admins can submit results
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can submit results")

        print("📝 Incoming result:", result.dict())

        data = {
            "gameweek": result.gameweek,
            "fixture_id": result.fixture_id,
            "actual_home": result.actual_home,
            "actual_away": result.actual_away,
        }

        # Use upsert to either insert new or update existing
        response = upsert_result(data, current_user["user_id"])
        if response:
            print("✅ Result upserted successfully")
            return {"message": "Result submitted to Supabase"}
        else:
            raise HTTPException(status_code=500, detail="Failed to upsert result")

    except HTTPException:
        raise
    except Exception as e:
        print("❌ Error submitting result:", str(e))
        raise HTTPException(status_code=500, detail="Failed to save result.")


@router.get("/")
def get_results(
    gameweek: Optional[int] = Query(None),
    fixture_id: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    try:
        # Anyone can view results (no restrictions)
        filters = {}
        if gameweek is not None:
            filters["gameweek"] = gameweek
        if fixture_id is not None:
            filters["fixture_id"] = fixture_id

        results = fetch_results(filters)
        return {"results": results}

    except HTTPException:
        raise
    except Exception as e:
        print("❌ Error fetching results:", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch results.")

@router.delete("/{result_id}")
def delete_result_endpoint(
    result_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a result (admin only)"""
    try:
        # Only admins can delete results
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can delete results")

        success = delete_result(result_id, current_user["user_id"])
        if success:
            return {"message": "Result deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete result")

    except HTTPException:
        raise
    except Exception as e:
        print("❌ Error deleting result:", str(e))
        raise HTTPException(status_code=500, detail="Could not delete result")

@router.put("/{result_id}")
def update_result(
    result_id: str,
    result_update: ResultUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a result (admin only)"""
    try:
        # Only admins can update results
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can update results")

        from supabase_client import update_result as update_result_func
        
        data = {
            "actual_home": result_update.actual_home,
            "actual_away": result_update.actual_away
        }
        
        success = update_result_func(result_id, data, current_user["user_id"])
        if success:
            return {"message": "Result updated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update result")

    except HTTPException:
        raise
    except Exception as e:
        print("❌ Error updating result:", str(e))
        raise HTTPException(status_code=500, detail="Could not update result")
