import csv
import io
import random
from datetime import datetime, timezone, date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, Fixture, Prediction, Result, Invite, Wildcard
from auth import get_current_admin, hash_password
from scoring import calculate_points, compute_gameweek_points, wildcard_multiplier

router = APIRouter(prefix="/admin", tags=["Admin"])

VALID_FIXTURE_STATUSES = ("scheduled", "postponed", "completed")


# ── Overview ────────────────────────────────────────────────────────────────

@router.get("/overview")
def get_overview(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """High-level stats for the admin dashboard."""
    total_users = db.query(User).count()
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
    """List all users with prediction counts and total points (wildcard-doubled)."""
    users = db.query(User).order_by(User.created_at).all()
    predictions = db.query(Prediction).all()
    results = db.query(Result).all()
    result_lookup = {r.fixture_id: r for r in results}

    # Postponed fixtures must never contribute, matching the leaderboard.
    postponed_fixture_ids = {
        f.id for f in db.query(Fixture).filter(Fixture.status == "postponed").all()
    }

    # Active wildcards: (user_id, gameweek) drives x2, and the per-user list of
    # wildcarded gameweeks is surfaced so the UI can show a badge.
    wildcards = db.query(Wildcard).all()
    wildcard_lookup = {(w.user_id, w.gameweek) for w in wildcards}
    wildcard_gameweeks_by_user: dict[str, list[int]] = {}
    for w in wildcards:
        wildcard_gameweeks_by_user.setdefault(w.user_id, []).append(w.gameweek)

    # Per-prediction count is independent of scoring, so count locally to avoid
    # an N+1 query per user.
    prediction_count_by_user: dict[str, int] = {}
    for p in predictions:
        prediction_count_by_user[p.user_id] = prediction_count_by_user.get(p.user_id, 0) + 1

    # Shared scoring helper — identical doubled totals to the leaderboard.
    scored = compute_gameweek_points(
        predictions, result_lookup, postponed_fixture_ids, wildcard_lookup
    )

    user_list = []
    for u in users:
        total_points = sum(scored.get(u.id, {}).values())
        gameweeks = sorted(wildcard_gameweeks_by_user.get(u.id, []))
        user_list.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.isoformat(),
            "prediction_count": prediction_count_by_user.get(u.id, 0),
            "total_points": total_points,
            "wildcard_gameweeks": gameweeks,
            "has_wildcard": len(gameweeks) > 0,
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


class ResetPasswordRequest(BaseModel):
    new_password: str


@router.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: str,
    body: ResetPasswordRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Admin-initiated password reset for a user."""
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": f"Password reset for {user.username}"}


# ── Predictions viewer ───────────────────────────────────────────────────────

@router.get("/predictions")
def get_all_predictions(
    gameweek: int | None = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """All predictions for a given gameweek, with scoring if results exist.

    ``gameweek`` is optional. When omitted, the most recent gameweek that has
    at least one prediction is used (or gameweek 1 if no predictions exist at
    all). The response also surfaces ``available_gameweeks`` — the sorted list
    of distinct gameweeks that have predictions — so the admin UI can populate
    its selector without a second request.
    """
    # Distinct gameweeks that have at least one prediction, sorted ascending.
    available_gameweeks = sorted(
        r[0] for r in db.query(Prediction.gameweek).distinct().all()
    )
    if gameweek is None:
        gameweek = available_gameweeks[-1] if available_gameweeks else 1

    fixtures = db.query(Fixture).filter(Fixture.gameweek == gameweek).order_by(Fixture.id).all()
    users = db.query(User).order_by(User.username).all()
    results = db.query(Result).filter(Result.gameweek == gameweek).all()
    result_lookup = {r.fixture_id: r for r in results}
    predictions = db.query(Prediction).filter(Prediction.gameweek == gameweek).all()
    pred_lookup = {(p.user_id, p.fixture_id): p for p in predictions}

    # Postponed fixtures in this gameweek contribute 0, matching scoring.
    postponed_fixture_ids = {f.id for f in fixtures if f.status == "postponed"}

    # Users with an active wildcard for THIS gameweek get their per-fixture
    # points doubled here too, so the admin viewer's cells stay consistent with
    # the doubled totals shown elsewhere.
    wildcard_user_ids = {
        w.user_id
        for w in db.query(Wildcard).filter(Wildcard.gameweek == gameweek).all()
    }

    fixture_rows = []
    for f in fixtures:
        result = result_lookup.get(f.id)
        user_preds = []
        for u in users:
            pred = pred_lookup.get((u.id, f.id))
            if pred:
                pts = None
                if result and f.id not in postponed_fixture_ids:
                    base = calculate_points(pred.predicted_home, pred.predicted_away,
                                            result.actual_home, result.actual_away)
                    pts = base * wildcard_multiplier(u.id in wildcard_user_ids)
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
        "available_gameweeks": available_gameweeks,
        "users": [{"id": u.id, "username": u.username} for u in users],
        "fixtures": fixture_rows,
    }


# ── Missing predictions ──────────────────────────────────────────────────────

@router.get("/missing-predictions")
def get_missing_predictions(
    gameweek: int | None = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Which users have NOT submitted all predictions for a gameweek.

    ``gameweek`` is optional. When omitted, defaults to the first gameweek
    that has fixtures but no results entered yet (the upcoming gameweek).
    Falls back to the last gameweek with fixtures if all are scored.
    The response includes ``available_gameweeks`` — distinct gameweeks that
    have at least one fixture — so the UI can populate its selector without
    a second request.
    """
    # Gameweeks that have at least one non-postponed fixture, sorted ascending.
    available_gameweeks = sorted(
        r[0] for r in db.query(Fixture.gameweek)
        .filter(Fixture.status != "postponed")
        .distinct()
        .all()
    )

    # Gameweeks that have at least one result entered.
    scored_gameweeks = {
        r[0] for r in db.query(Result.gameweek).distinct().all()
    }

    if gameweek is None:
        # Default: first fixture GW with no results (upcoming), else last fixture GW.
        upcoming = [gw for gw in available_gameweeks if gw not in scored_gameweeks]
        gameweek = upcoming[0] if upcoming else (available_gameweeks[-1] if available_gameweeks else 1)

    fixtures = db.query(Fixture).filter(
        Fixture.gameweek == gameweek,
        Fixture.status != "postponed",
    ).all()
    users = db.query(User).order_by(User.username).all()
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
        "available_gameweeks": available_gameweeks,
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


def _parse_kickoff(fixture_date, time_str: str):
    """
    Build a UTC-aware kickoff datetime from the date column and an optional time
    column.

    Returns None if no usable time is present (so kickoff-based locking is simply
    disabled for that fixture). Accepts "HH:MM" and "HH:MM:SS".

    The time in the CSV is treated as UTC so that the kickoff-lock comparison in
    predictions.py always operates on two aware datetimes, avoiding any ambiguity
    on non-UTC hosts.
    """
    if not time_str:
        return None
    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            parsed = datetime.strptime(time_str, fmt).time()
            return datetime.combine(fixture_date, parsed, tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


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

    Fixtures are upserted: existing rows (matched on home_team + away_team +
    gameweek) are updated in place and new rows are inserted. Existing fixtures
    are never deleted, so predictions and results are preserved. The ``replace``
    flag is retained for API compatibility but no longer deletes data.
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

            rows.append({
                "gameweek": week,
                "date": fixture_date,
                "day": day,
                "time": time_str,
                "home_team": home,
                "away_team": away,
                "venue": venue,
                "kickoff_time": _parse_kickoff(fixture_date, time_str),
            })
        except (ValueError, KeyError) as e:
            errors.append(f"Row {i}: {e}")

    if errors:
        raise HTTPException(
            status_code=422,
            detail={"message": "CSV contains invalid rows", "errors": errors[:20]},
        )

    # Non-destructive upsert: match on (home_team, away_team, gameweek). Update
    # the mutable details of existing fixtures and insert any that are new. This
    # preserves predictions and results tied to existing fixtures.
    inserted = 0
    updated = 0
    for r in rows:
        existing = (
            db.query(Fixture)
            .filter(
                Fixture.home_team == r["home_team"],
                Fixture.away_team == r["away_team"],
                Fixture.gameweek == r["gameweek"],
            )
            .first()
        )
        if existing:
            existing.date = r["date"]
            existing.day = r["day"]
            existing.time = r["time"]
            existing.venue = r["venue"]
            existing.kickoff_time = r["kickoff_time"]
            # Don't clobber a postponed/completed status on re-import.
            # (existing.status is non-nullable so the None branch never fired.)
            updated += 1
        else:
            db.add(Fixture(status="scheduled", **r))
            inserted += 1

    db.commit()

    return {
        "imported": len(rows),
        "inserted": inserted,
        "updated": updated,
        "replaced": False,
        "gameweeks": sorted({r["gameweek"] for r in rows}),
    }


# ── Fixture status (postpone / reschedule / complete) ─────────────────────────

class UpdateFixtureStatusRequest(BaseModel):
    status: str


@router.patch("/fixtures/{fixture_id}/status")
def update_fixture_status(
    fixture_id: int,
    body: UpdateFixtureStatusRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Mark a fixture as scheduled, postponed, or completed."""
    if body.status not in VALID_FIXTURE_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Status must be one of: {', '.join(VALID_FIXTURE_STATUSES)}",
        )
    fixture = db.query(Fixture).filter(Fixture.id == fixture_id).first()
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture not found")
    fixture.status = body.status
    db.commit()
    return {
        "message": f"{fixture.home_team} vs {fixture.away_team} is now {body.status}",
        "fixture_id": fixture.id,
        "status": fixture.status,
    }


# ── Manual fixture editor (edit / move / add / delete) ───────────────────────

def _fixture_dict(f: Fixture) -> dict:
    """Serialise a fixture in the same shape as the public fixtures API."""
    return {
        "id": f.id,
        "gameweek": f.gameweek,
        "date": f.date.isoformat(),
        "day": f.day,
        "time": f.time,
        "home_team": f.home_team,
        "away_team": f.away_team,
        "venue": f.venue,
        "kickoff_time": f.kickoff_time.isoformat() if f.kickoff_time else None,
        "status": f.status,
    }


class EditFixtureRequest(BaseModel):
    date: Optional[str] = None   # YYYY-MM-DD
    time: Optional[str] = None   # HH:MM
    home_team: Optional[str] = None
    away_team: Optional[str] = None
    venue: Optional[str] = None


@router.patch("/fixtures/{fixture_id}")
def edit_fixture(
    fixture_id: int,
    body: EditFixtureRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Edit individual fields of a fixture. Scored fixtures are locked."""
    fixture = db.query(Fixture).filter(Fixture.id == fixture_id).first()
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture not found")
    if fixture.result:
        raise HTTPException(
            status_code=403,
            detail="Cannot edit a fixture that already has a result",
        )

    time_changed = False
    if body.date is not None:
        try:
            fixture.date = datetime.strptime(body.date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
        # Keep the derived day label consistent with the new date.
        fixture.day = fixture.date.strftime("%a")
        time_changed = True
    if body.time is not None:
        fixture.time = body.time.strip()
        time_changed = True
    if body.home_team is not None:
        stripped = body.home_team.strip()
        if not stripped:
            raise HTTPException(status_code=400, detail="home_team cannot be empty")
        fixture.home_team = stripped
    if body.away_team is not None:
        stripped = body.away_team.strip()
        if not stripped:
            raise HTTPException(status_code=400, detail="away_team cannot be empty")
        fixture.away_team = stripped
    if body.venue is not None:
        fixture.venue = body.venue.strip()

    # Recompute kickoff_time whenever date or time changed. Setting a future
    # kickoff naturally re-opens predictions (locking compares kickoff_time).
    if time_changed:
        fixture.kickoff_time = _parse_kickoff(fixture.date, fixture.time or "")

    # Reject if the updated team names collide with another fixture in the same GW.
    if body.home_team is not None or body.away_team is not None:
        collision = (
            db.query(Fixture)
            .filter(
                Fixture.home_team == fixture.home_team,
                Fixture.away_team == fixture.away_team,
                Fixture.gameweek == fixture.gameweek,
                Fixture.id != fixture_id,
            )
            .first()
        )
        if collision:
            raise HTTPException(
                status_code=409,
                detail=f"{fixture.home_team} vs {fixture.away_team} already exists in gameweek {fixture.gameweek}",
            )

    if fixture.home_team == fixture.away_team:
        raise HTTPException(status_code=400, detail="home_team and away_team cannot be the same")

    db.commit()
    db.refresh(fixture)
    return _fixture_dict(fixture)


class MoveFixtureRequest(BaseModel):
    gameweek: int


@router.patch("/fixtures/{fixture_id}/gameweek")
def move_fixture(
    fixture_id: int,
    body: MoveFixtureRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Move a fixture to another gameweek, cascading its predictions.

    Predictions carry a denormalized ``gameweek`` column, so they are updated
    in the same transaction as the fixture. Wildcards are per (user, gameweek)
    and are NOT changed — instead the affected usernames are returned so the
    UI can warn the admin.
    """
    fixture = db.query(Fixture).filter(Fixture.id == fixture_id).first()
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture not found")
    if fixture.result:
        raise HTTPException(
            status_code=403,
            detail="Cannot move a fixture that already has a result",
        )
    if not (1 <= body.gameweek <= 38):
        raise HTTPException(status_code=400, detail="Gameweek must be between 1 and 38")
    if body.gameweek == fixture.gameweek:
        raise HTTPException(status_code=400, detail="Fixture is already in this gameweek")

    old_gw = fixture.gameweek
    new_gw = body.gameweek

    # Reject if (home, away, new_gw) already exists (same natural key as CSV upsert).
    collision = (
        db.query(Fixture)
        .filter(
            Fixture.home_team == fixture.home_team,
            Fixture.away_team == fixture.away_team,
            Fixture.gameweek == new_gw,
            Fixture.id != fixture_id,
        )
        .first()
    )
    if collision:
        raise HTTPException(
            status_code=409,
            detail=f"{fixture.home_team} vs {fixture.away_team} already exists in gameweek {new_gw}",
        )

    # One transaction: fixture + its predictions' denormalized gameweek.
    fixture.gameweek = new_gw
    predictions_updated = (
        db.query(Prediction)
        .filter(Prediction.fixture_id == fixture_id)
        .update({"gameweek": new_gw})
    )
    db.commit()

    # Wildcard warning: only users who BOTH wildcarded old_gw AND have a prediction
    # on this fixture are actually affected (they lose the double on this match).
    prediction_user_ids = {
        r[0] for r in db.query(Prediction.user_id)
        .filter(Prediction.fixture_id == fixture_id)
        .all()
    }
    wildcards = (
        db.query(Wildcard)
        .filter(Wildcard.gameweek == old_gw)
        .all()
    )
    wildcard_usernames = [
        wc.user.username for wc in wildcards if wc.user_id in prediction_user_ids
    ]

    return {
        "fixture_id": fixture_id,
        "old_gameweek": old_gw,
        "new_gameweek": new_gw,
        "predictions_updated": predictions_updated,
        "wildcard_warnings": wildcard_usernames,
    }


class AddFixtureRequest(BaseModel):
    gameweek: int
    date: str          # YYYY-MM-DD
    time: str = ""
    home_team: str
    away_team: str
    venue: str = ""


@router.post("/fixtures")
def add_fixture(
    body: AddFixtureRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Add a single fixture manually (outside the CSV upload flow)."""
    if not (1 <= body.gameweek <= 38):
        raise HTTPException(status_code=400, detail="Gameweek must be between 1 and 38")
    home = body.home_team.strip()
    away = body.away_team.strip()
    if not home or not away:
        raise HTTPException(status_code=400, detail="home_team and away_team cannot be empty")
    if home == away:
        raise HTTPException(status_code=400, detail="home_team and away_team cannot be the same")
    try:
        fixture_date = datetime.strptime(body.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")

    # Same natural key as the CSV upsert: (home, away, gameweek).
    existing = (
        db.query(Fixture)
        .filter(
            Fixture.home_team == home,
            Fixture.away_team == away,
            Fixture.gameweek == body.gameweek,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"{home} vs {away} already exists in gameweek {body.gameweek}",
        )

    time_str = body.time.strip()
    fixture = Fixture(
        gameweek=body.gameweek,
        date=fixture_date,
        day=fixture_date.strftime("%a"),
        time=time_str,
        home_team=home,
        away_team=away,
        venue=body.venue.strip(),
        kickoff_time=_parse_kickoff(fixture_date, time_str),
        status="scheduled",
    )
    db.add(fixture)
    db.commit()
    db.refresh(fixture)
    return _fixture_dict(fixture)


@router.delete("/fixtures/{fixture_id}")
def delete_fixture(
    fixture_id: int,
    force: bool = False,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a fixture. If it has predictions, requires ``force=true``.

    The first non-forced call returns 409 with the prediction count so the UI
    can show an informed confirmation before the destructive retry.
    """
    fixture = db.query(Fixture).filter(Fixture.id == fixture_id).first()
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture not found")

    predictions_count = (
        db.query(Prediction).filter(Prediction.fixture_id == fixture_id).count()
    )
    if predictions_count > 0 and not force:
        # Plain JSONResponse (not HTTPException) so the body keys sit at the
        # top level — the frontend reads predictions_count/has_result directly
        # from err.response.data to build its confirmation prompt.
        return JSONResponse(
            status_code=409,
            content={
                "detail": "Fixture has predictions",
                "predictions_count": predictions_count,
                "has_result": bool(fixture.result),
            },
        )

    # cascade="all, delete-orphan" on Fixture.predictions / Fixture.result
    # removes dependent rows automatically.
    db.delete(fixture)
    db.commit()
    return {"deleted": True, "predictions_deleted": predictions_count}


# ── Invites ───────────────────────────────────────────────────────────────────

def _invite_status(invite: Invite) -> str:
    """Derive a human-friendly status for an invite."""
    if invite.used_at is not None:
        return "used"
    if getattr(invite, "revoked_at", None) is not None:
        return "revoked"
    expires_at = invite.expires_at
    # Stored values may be naive (SQLite); compare on the same basis.
    now = datetime.now(timezone.utc)
    if expires_at is not None and expires_at.tzinfo is None:
        now = now.replace(tzinfo=None)
    if expires_at is not None and now >= expires_at:
        return "expired"
    return "pending"


class CreateInviteRequest(BaseModel):
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None


@router.post("/invites")
def create_invite(
    body: Optional[CreateInviteRequest] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Generate a single-use invite token."""
    recipient_name = None
    recipient_email = None
    if body is not None:
        if body.recipient_name is not None:
            stripped = body.recipient_name.strip()
            recipient_name = stripped or None
        if body.recipient_email is not None:
            stripped = body.recipient_email.strip().lower()
            recipient_email = stripped or None
    invite = Invite(
        created_by=current_admin.id,
        recipient_name=recipient_name,
        recipient_email=recipient_email,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return {
        "token": invite.token,
        "invite_url": f"/register?invite={invite.token}",
        "recipient_name": invite.recipient_name,
        "recipient_email": invite.recipient_email,
    }


@router.get("/invites")
def list_invites(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all invites with derived status (pending / used / revoked / expired)."""
    invites = db.query(Invite).order_by(Invite.created_at.desc()).all()
    redeemer_ids = [i.used_by for i in invites if i.used_by]
    redeemer_lookup = {}
    if redeemer_ids:
        redeemers = db.query(User).filter(User.id.in_(redeemer_ids)).all()
        redeemer_lookup = {u.id: u.username for u in redeemers}

    return {
        "invites": [
            {
                "id": i.id,
                "token": i.token,
                "status": _invite_status(i),
                "recipient_name": i.recipient_name,
                "recipient_email": i.recipient_email,
                "created_at": i.created_at.isoformat() if i.created_at else None,
                "expires_at": i.expires_at.isoformat() if i.expires_at else None,
                "used_at": i.used_at.isoformat() if i.used_at else None,
                "used_by": redeemer_lookup.get(i.used_by),
                "invite_url": f"/register?invite={i.token}",
            }
            for i in invites
        ]
    }


@router.delete("/invites/{invite_id}")
def revoke_invite(
    invite_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Revoke an unused invite. Used invites cannot be revoked."""
    invite = db.query(Invite).filter(Invite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite.used_at is not None:
        raise HTTPException(status_code=400, detail="Cannot revoke an invite that has been used")
    if invite.revoked_at is not None:
        raise HTTPException(status_code=400, detail="Invite is already revoked")
    if _invite_status(invite) == "expired":
        raise HTTPException(status_code=400, detail="Cannot revoke an invite that has already expired")
    invite.revoked_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Invite revoked"}


# ── Simulate ──────────────────────────────────────────────────────────────────

_SIM_TEAMS = [
    "Arsenal", "Aston Villa", "Brentford", "Brighton",
    "Chelsea", "Crystal Palace", "Everton", "Fulham",
    "Ipswich", "Leicester", "Liverpool", "Man City",
    "Man United", "Newcastle", "Nott'm Forest", "Southampton",
    "Spurs", "West Ham", "Wolves", "Bournemouth",
]

_SIM_VENUES = {
    "Arsenal": "Emirates Stadium", "Aston Villa": "Villa Park",
    "Brentford": "Gtech Community Stadium", "Brighton": "Amex Stadium",
    "Chelsea": "Stamford Bridge", "Crystal Palace": "Selhurst Park",
    "Everton": "Goodison Park", "Fulham": "Craven Cottage",
    "Ipswich": "Portman Road", "Leicester": "King Power Stadium",
    "Liverpool": "Anfield", "Man City": "Etihad Stadium",
    "Man United": "Old Trafford", "Newcastle": "St. James' Park",
    "Nott'm Forest": "City Ground", "Southampton": "St. Mary's Stadium",
    "Spurs": "Tottenham Hotspur Stadium", "West Ham": "London Stadium",
    "Wolves": "Molineux", "Bournemouth": "Vitality Stadium",
}

_GOAL_WEIGHTS = [18, 30, 25, 15, 8, 4]  # prob for 0-5 goals, roughly realistic


def _sim_goal() -> int:
    return random.choices(range(6), weights=_GOAL_WEIGHTS)[0]


def _round_robin_rounds(teams: list, num_rounds: int) -> list:
    n = len(teams)
    fixed = teams[0]
    rotating = list(teams[1:])
    rounds = []
    for rnd in range(num_rounds):
        circle = [fixed] + rotating
        pairs = []
        for i in range(n // 2):
            if rnd % 2 == 0:
                pairs.append((circle[i], circle[n - 1 - i]))
            else:
                pairs.append((circle[n - 1 - i], circle[i]))
        rounds.append(pairs)
        rotating = rotating[1:] + [rotating[0]]
    return rounds


@router.post("/simulate")
def simulate(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Full reset + simulation.
    Wipes all fixtures/predictions/results/wildcards then seeds:
      - 10 gameweeks x 10 fixtures (round-robin from 20 PL teams)
      - Random predictions for every user (admins included)
      - Random results for every fixture (all GWs scored)
    """
    # 1. Wipe existing data
    db.query(Wildcard).delete()
    db.query(Prediction).delete()
    db.query(Result).delete()
    db.query(Fixture).delete()
    db.commit()

    # 2. Generate fixtures
    rounds = _round_robin_rounds(_SIM_TEAMS, 10)
    start_date = date(2026, 8, 15)
    all_fixtures: list[Fixture] = []
    for gw_idx, pairs in enumerate(rounds):
        gw_num = gw_idx + 1
        gw_date = start_date + timedelta(weeks=gw_idx)
        for home, away in pairs:
            f = Fixture(
                gameweek=gw_num,
                date=gw_date,
                day=gw_date.strftime("%a"),
                time="15:00",
                home_team=home,
                away_team=away,
                venue=_SIM_VENUES.get(home, ""),
                kickoff_time=None,
                status="scheduled",
            )
            db.add(f)
            all_fixtures.append(f)
    db.commit()
    for f in all_fixtures:
        db.refresh(f)

    # 3. Get all users (admins included — simulation covers everyone)
    users = db.query(User).all()
    if not users:
        return {"error": "No users found"}

    # 4. Predictions
    for user in users:
        for fixture in all_fixtures:
            db.add(Prediction(
                user_id=user.id,
                fixture_id=fixture.id,
                gameweek=fixture.gameweek,
                predicted_home=_sim_goal(),
                predicted_away=_sim_goal(),
            ))
    db.commit()

    # 5. Results — score all 10 GWs
    for fixture in all_fixtures:
        db.add(Result(
            fixture_id=fixture.id,
            gameweek=fixture.gameweek,
            actual_home=_sim_goal(),
            actual_away=_sim_goal(),
        ))
        fixture.status = "completed"
    db.commit()

    return {
        "message": "Simulation complete",
        "gameweeks": 10,
        "fixtures": len(all_fixtures),
        "users_simulated": len(users),
        "predictions": len(all_fixtures) * len(users),
        "results": len(all_fixtures),
    }
