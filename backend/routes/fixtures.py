from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from supabase_client import fetch_fixtures

router = APIRouter(prefix="/fixtures", tags=["Fixtures"])

@router.get("/")
def get_fixtures(
    gameweek: Optional[int] = Query(None),
    team: Optional[str] = Query(None),
    away_team: Optional[str] = Query(None),
    date: Optional[str] = Query(None)  # expected format: YYYY-MM-DD
):
    try:
        filters = {}
        if gameweek:
            filters["gameweek"] = gameweek
        if team:
            filters["home_team"] = team
        if away_team:
            filters["away_team"] = away_team
        if date:
            filters["date"] = date

        fixtures = fetch_fixtures(filters)
        return {"fixtures": fixtures}

    except Exception as e:
        print("❌ Error fetching fixtures:", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch fixtures")
