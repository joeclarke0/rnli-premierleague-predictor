from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db
from models import Fixture

router = APIRouter(prefix="/fixtures", tags=["Fixtures"])

@router.get("/")
def get_fixtures(
    gameweek: Optional[int] = Query(None),
    team: Optional[str] = Query(None),
    away_team: Optional[str] = Query(None),
    date: Optional[str] = Query(None),  # expected format: YYYY-MM-DD
    db: Session = Depends(get_db)
):
    """
    Get fixtures with optional filters.

    - **gameweek**: Filter by gameweek number (1-38)
    - **team**: Filter by home team name
    - **away_team**: Filter by away team name
    - **date**: Filter by match date (YYYY-MM-DD)
    """
    try:
        query = db.query(Fixture)

        # Apply filters
        if gameweek is not None:
            query = query.filter(Fixture.gameweek == gameweek)
        if team:
            query = query.filter(Fixture.home_team.ilike(f"%{team}%"))
        if away_team:
            query = query.filter(Fixture.away_team.ilike(f"%{away_team}%"))
        if date:
            # Parse date string to date object
            date_obj = datetime.strptime(date, "%Y-%m-%d").date()
            query = query.filter(Fixture.date == date_obj)

        # Order by date and time
        query = query.order_by(Fixture.gameweek, Fixture.date, Fixture.time)

        fixtures = query.all()

        # Convert to dict for JSON response
        fixtures_data = [
            {
                "id": f.id,
                "gameweek": f.gameweek,
                "date": f.date.isoformat(),
                "day": f.day,
                "time": f.time,
                "home_team": f.home_team,
                "away_team": f.away_team,
                "venue": f.venue
            }
            for f in fixtures
        ]

        return {"fixtures": fixtures_data}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        print("❌ Error fetching fixtures:", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch fixtures")
