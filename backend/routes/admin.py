import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, Fixture, Prediction, Result
from auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


def calculate_points(pred_home, pred_away, act_home, act_away):
    if pred_home == act_home and pred_away == act_away:
        return 5
    elif (pred_home > pred_away and act_home > act_away) or \
         (pred_home < pred_away and act_home < act_away) or \
         (pred_home == pred_away and act_home == act_away):
        return 2
    return 0


# ── Overview ────────────────────────────────────────────────────────────────

@router.get("/overview")
def get_overview(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """High-level stats for the admin dashboard."""
    total_users = db.query(User).filter(User.role == "user").count()
    total_predictions = db.query(Prediction).count()
    total_results = db.query(Result).count()
    total_fixtures = db.query(Fixture).count()

    # Gameweeks that have at least one result
    scored_gws = db.query(Result.gameweek).distinct().all()
    scored_gws = sorted([r[0] for r in scored_gws])

    # Gameweeks that have fixtures
    all_gws = db.query(Fixture.gameweek).distinct().order_by(Fixture.gameweek).all()
    all_gws = [r[0] for r in all_gws]

    # Next unscored gameweek
    scored_set = set(scored_gws)
    next_gw = next((gw for gw in all_gws if gw not in scored_set), None)

    return {
        "total_users": total_users,
        "total_predictions": total_predictions,
        "total_results": total_results,
        "total_fixtures": total_fixtures,
        "scored_gameweeks": len(scored_gws),
        "next_gameweek": next_gw,
        "completion_pct": round(total_results / total_fixtures * 100) if total_fixtures > 0 else 0,
    }


# ── Users ────────────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all users with prediction counts and total points."""
    users = db.query(User).order_by(User.created_at).all()
    results = db.query(Result).all()
    result_lookup = {r.fixture_id: r for r in results}

    user_list = []
    for u in users:
        preds = db.query(Prediction).filter(Prediction.user_id == u.id).all()
        points = 0
        for p in preds:
            if p.fixture_id in result_lookup:
                r = result_lookup[p.fixture_id]
                points += calculate_points(p.predicted_home, p.predicted_away, r.actual_home, r.actual_away)
        user_list.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.isoformat(),
            "prediction_count": len(preds),
            "total_points": points,
        })

    return {"users": user_list}


class UpdateRoleRequest(BaseModel):
    role: str  # "user" or "admin"


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    body: UpdateRoleRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Promote or demote a user."""
    if body.role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Role must be 'user' or 'admin'")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    user.role = body.role
    db.commit()
    return {"message": f"User {user.username} is now {body.role}"}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a user and all their predictions."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    db.delete(user)
    db.commit()
    return {"message": f"User {user.username} deleted"}


# ── Predictions viewer ───────────────────────────────────────────────────────

@router.get("/predictions")
def get_all_predictions(
    gameweek: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """All predictions for a given gameweek, with scoring if results exist."""
    fixtures = db.query(Fixture).filter(Fixture.gameweek == gameweek).order_by(Fixture.id).all()
    users = db.query(User).filter(User.role == "user").order_by(User.username).all()
    results = db.query(Result).filter(Result.gameweek == gameweek).all()
    result_lookup = {r.fixture_id: r for r in results}
    predictions = db.query(Prediction).filter(Prediction.gameweek == gameweek).all()
    pred_lookup = {(p.user_id, p.fixture_id): p for p in predictions}

    fixture_rows = []
    for f in fixtures:
        result = result_lookup.get(f.id)
        user_preds = []
        for u in users:
            pred = pred_lookup.get((u.id, f.id))
            if pred:
                pts = None
                if result:
                    pts = calculate_points(pred.predicted_home, pred.predicted_away,
                                           result.actual_home, result.actual_away)
                user_preds.append({
                    "user_id": u.id,
                    "username": u.username,
                    "predicted_home": pred.predicted_home,
                    "predicted_away": pred.predicted_away,
                    "points": pts,
                })
            else:
                user_preds.append({
                    "user_id": u.id,
                    "username": u.username,
                    "predicted_home": None,
                    "predicted_away": None,
                    "points": None,
                })
        fixture_rows.append({
            "fixture_id": f.id,
            "home_team": f.home_team,
            "away_team": f.away_team,
            "result": {"home": result.actual_home, "away": result.actual_away} if result else None,
            "predictions": user_preds,
        })

    return {
        "gameweek": gameweek,
        "users": [{"id": u.id, "username": u.username} for u in users],
        "fixtures": fixture_rows,
    }


# ── Missing predictions ──────────────────────────────────────────────────────

@router.get("/missing-predictions")
def get_missing_predictions(
    gameweek: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Which users have NOT submitted all predictions for a gameweek."""
    fixtures = db.query(Fixture).filter(Fixture.gameweek == gameweek).all()
    users = db.query(User).filter(User.role == "user").order_by(User.username).all()
    predictions = db.query(Prediction).filter(Prediction.gameweek == gameweek).all()

    fixture_ids = {f.id for f in fixtures}
    pred_lookup = {(p.user_id, p.fixture_id) for p in predictions}

    summary = []
    for u in users:
        submitted = [fid for fid in fixture_ids if (u.id, fid) in pred_lookup]
        missing = [fid for fid in fixture_ids if (u.id, fid) not in pred_lookup]
        summary.append({
            "user_id": u.id,
            "username": u.username,
            "submitted": len(submitted),
            "missing": len(missing),
            "total": len(fixture_ids),
            "complete": len(missing) == 0,
        })

    return {
        "gameweek": gameweek,
        "total_fixtures": len(fixture_ids),
        "summary": summary,
    }


# ── Fixture Upload ────────────────────────────────────────────────────────────

REQUIRED_COLS = {"week", "date", "home", "away"}
OPTIONAL_COLS = {"time", "day", "venue"}
# Accept common aliases
COL_ALIASES = {
    "gameweek": "week",
    "home_team": "home",
    "away_team": "away",
    "hometeam": "home",
    "awayteam": "away",
}


def _normalise_header(raw: str) -> str:
    key = raw.strip().lower().replace(" ", "_")
    return COL_ALIASES.get(key, key)


@router.post("/fixtures/upload")
async def upload_fixtures(
    file: UploadFile = File(...),
    replace: bool = True,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Upload a CSV file of fixtures for the new season.
    Required columns: week, date, home, away
    Optional columns: time, day (auto-computed if absent), venue
    Set replace=true (default) to clear existing fixtures first.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")  # handle BOM from Excel
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))

    # Normalise headers
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV appears to be empty")

    norm_headers = [_normalise_header(h) for h in reader.fieldnames]
    missing = REQUIRED_COLS - set(norm_headers)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required columns: {', '.join(sorted(missing))}. "
                   f"Required: week, date, home, away. Optional: time, day, venue",
        )

    rows = []
    errors = []
    for i, raw_row in enumerate(reader, start=2):  # row 2 = first data row
        row = {_normalise_header(k): v.strip() for k, v in raw_row.items() if k}
        try:
            week = int(row["week"])
            if not (1 <= week <= 38):
                raise ValueError(f"week must be 1–38, got {week}")

            fixture_date = datetime.strptime(row["date"], "%Y-%m-%d").date()
            home = row["home"]
            away = row["away"]
            if not home or not away:
                raise ValueError("home and away team names cannot be empty")

            # Auto-compute day from date if not provided
            day = row.get("day") or fixture_date.strftime("%a")
            time_str = row.get("time") or ""
            venue = row.get("venue") or ""

            rows.append(Fixture(
                gameweek=week,
                date=fixture_date,
                day=day,
                time=time_str,
                home_team=home,
                away_team=away,
                venue=venue,
            ))
        except (ValueError, KeyError) as e:
            errors.append(f"Row {i}: {e}")

    if errors:
        raise HTTPException(
            status_code=422,
            detail={"message": "CSV contains invalid rows", "errors": errors[:20]},
        )

    if replace:
        # Delete results and predictions first (FK constraints), then fixtures
        db.query(Result).delete()
        db.query(Prediction).delete()
        db.query(Fixture).delete()
        db.commit()

    db.add_all(rows)
    db.commit()

    return {
        "imported": len(rows),
        "replaced": replace,
        "gameweeks": sorted({r.gameweek for r in rows}),
    }
