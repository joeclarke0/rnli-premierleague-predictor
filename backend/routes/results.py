from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Result, Fixture, User
from auth import get_current_admin

router = APIRouter(prefix="/results", tags=["Results"])


class ResultSubmit(BaseModel):
    gameweek: int = Field(ge=1, le=38)
    fixture_id: int
    actual_home: int = Field(ge=0, le=20)
    actual_away: int = Field(ge=0, le=20)


@router.post("/")
def submit_result(
    result: ResultSubmit,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Submit or update the actual result for a fixture.
    **Admin only** - requires admin authentication.

    - **gameweek**: Gameweek number
    - **fixture_id**: ID of the fixture
    - **actual_home**: Actual home team score
    - **actual_away**: Actual away team score
    """
    try:
        print(f"📝 Incoming result from admin {current_admin.username}:", result.dict())

        # Verify fixture exists
        fixture = db.query(Fixture).filter(Fixture.id == result.fixture_id).first()
        if not fixture:
            raise HTTPException(status_code=404, detail="Fixture not found")

        # Check if result already exists for this fixture
        existing = db.query(Result).filter(Result.fixture_id == result.fixture_id).first()

        if existing:
            # Update existing result
            existing.actual_home = result.actual_home
            existing.actual_away = result.actual_away
            existing.gameweek = result.gameweek
            db.commit()
            db.refresh(existing)
            print(f"✅ Result updated: {existing.id}")
            return {"message": "Result updated successfully", "result_id": existing.id}
        else:
            # Create new result
            new_result = Result(
                fixture_id=result.fixture_id,
                gameweek=result.gameweek,
                actual_home=result.actual_home,
                actual_away=result.actual_away
            )
            db.add(new_result)
            db.commit()
            db.refresh(new_result)
            print(f"✅ Result created: {new_result.id}")
            return {"message": "Result submitted successfully", "result_id": new_result.id}

    except Exception as e:
        db.rollback()
        print("❌ Error submitting result:", str(e))
        raise HTTPException(status_code=500, detail="Failed to save result")


@router.get("/")
def get_results(
    gameweek: Optional[int] = Query(None),
    fixture_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get results with optional filters.
    Public endpoint - anyone can view results.

    - **gameweek**: Filter by gameweek number
    - **fixture_id**: Filter by fixture ID
    """
    try:
        query = db.query(Result)

        # Apply filters
        if gameweek is not None:
            query = query.filter(Result.gameweek == gameweek)
        if fixture_id is not None:
            query = query.filter(Result.fixture_id == fixture_id)

        results = query.all()

        # Convert to dict for JSON response
        results_data = [
            {
                "id": r.id,
                "fixture_id": r.fixture_id,
                "gameweek": r.gameweek,
                "actual_home": r.actual_home,
                "actual_away": r.actual_away,
                "created_at": r.created_at.isoformat(),
                "updated_at": r.updated_at.isoformat()
            }
            for r in results
        ]

        return {"results": results_data}

    except Exception as e:
        print("❌ Error fetching results:", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch results")


@router.get("/completed-gameweeks")
def get_completed_gameweeks(db: Session = Depends(get_db)):
    """
    Return the list of "completed" gameweek numbers.
    Public endpoint - anyone can view.

    A gameweek is completed only if it has at least one fixture AND every
    fixture in it has a result. Empty gameweeks are never completed.

    Computed in a single grouped query: per gameweek, compare the total
    fixture count against the count of fixtures that have a matching result.
    Using an outer join + COUNT(Result.id) means fixtures without a result
    don't contribute to the result count, so a gameweek qualifies only when
    every fixture is matched. This replaces the client-side 38x2 request scan.
    """
    try:
        rows = (
            db.query(
                Fixture.gameweek,
                func.count(Fixture.id).label("total"),
                func.count(Result.id).label("with_result"),
            )
            .outerjoin(Result, Result.fixture_id == Fixture.id)
            .group_by(Fixture.gameweek)
            .all()
        )

        completed = [
            row.gameweek
            for row in rows
            if row.total > 0 and row.total == row.with_result
        ]

        return {"completed_gameweeks": sorted(completed)}

    except Exception as e:
        print("❌ Error fetching completed gameweeks:", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch completed gameweeks")
