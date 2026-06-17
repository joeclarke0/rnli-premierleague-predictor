import csv
import io
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
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
