"""
Real, self-contained API tests for the RNLI Premier League Predictor.

These run entirely in-process against a temporary SQLite database using
FastAPI's TestClient — no external server, no network. They exercise the
production-critical behaviours added in this change set:

  1. Prediction locking at kickoff
  2. Postponed fixtures are excluded from leaderboard scoring
  3. Admin password reset (auth + validation + success)
  4. Single-use invite validation endpoint

Run with:  python -m pytest backend/
"""
import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone

import pytest

# Ensure imports resolve whether pytest is invoked from the repo root or backend/
sys.path.insert(0, os.path.dirname(__file__))

# A SECRET_KEY must exist before auth.py is imported, and DATABASE_URL must point
# at a throwaway SQLite file so tests never touch real data.
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-only")
_tmp_db = os.path.join(tempfile.gettempdir(), "rnli_pytest.db")
if os.path.exists(_tmp_db):
    os.remove(_tmp_db)
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_db}"

from fastapi.testclient import TestClient  # noqa: E402

from database import Base, engine, SessionLocal  # noqa: E402
from main import app  # noqa: E402
from migrate import run_migrations  # noqa: E402
from models import User, Fixture, Result, Prediction, Invite  # noqa: E402
from auth import hash_password, create_access_token  # noqa: E402


@pytest.fixture(scope="module")
def client():
    """Build a fresh schema once for the module and yield a TestClient."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    run_migrations()
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)


def _auth_header(user: User) -> dict:
    token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})
    return {"Authorization": f"Bearer {token}"}


def _make_user(db, *, username, email, role="user", password="password123"):
    user = User(username=username, email=email, password_hash=hash_password(password), role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_prediction_locked_after_kickoff(client):
    """Submitting a prediction after kickoff_time must be rejected with 403."""
    db = SessionLocal()
    try:
        user = _make_user(db, username="locker", email="locker@test.com")
        # Kickoff one hour in the past -> locked. Stored naive to match SQLite.
        past_kickoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=1)
        fixture = Fixture(
            gameweek=1, date=past_kickoff.date(), home_team="Arsenal",
            away_team="Chelsea", kickoff_time=past_kickoff, status="scheduled",
        )
        db.add(fixture)
        db.commit()
        db.refresh(fixture)
        fid = fixture.id
        header = _auth_header(user)
    finally:
        db.close()

    resp = client.post(
        "/predictions/",
        json={"fixture_id": fid, "gameweek": 1, "predicted_home": 2, "predicted_away": 1},
        headers=header,
    )
    assert resp.status_code == 403
    assert "locked" in resp.json()["detail"].lower()


def test_postponed_fixture_excluded_from_leaderboard(client):
    """A result on a postponed fixture must not contribute points."""
    db = SessionLocal()
    try:
        user = _make_user(db, username="ppt", email="ppt@test.com")
        # Postponed fixture with a perfect-score result + prediction.
        fixture = Fixture(
            gameweek=2, date=datetime.now(timezone.utc).date(), home_team="Spurs",
            away_team="Everton", status="postponed",
        )
        db.add(fixture)
        db.commit()
        db.refresh(fixture)
        db.add(Prediction(
            user_id=user.id, fixture_id=fixture.id, gameweek=2,
            predicted_home=3, predicted_away=0,
        ))
        db.add(Result(
            fixture_id=fixture.id, gameweek=2, actual_home=3, actual_away=0,
        ))
        db.commit()
        username = user.username
    finally:
        db.close()

    resp = client.get("/leaderboard/")
    assert resp.status_code == 200
    rows = {r["player"]: r for r in resp.json()["leaderboard"]}
    # Either the player isn't on the board at all, or their total is 0 — never the
    # 5 points an exact-score prediction would otherwise earn.
    assert rows.get(username, {"total": 0})["total"] == 0


def test_admin_password_reset(client):
    """Admin reset rejects short passwords, 404s on missing user, succeeds otherwise."""
    db = SessionLocal()
    try:
        admin = _make_user(db, username="adminx", email="adminx@test.com", role="admin")
        target = _make_user(db, username="victim", email="victim@test.com")
        admin_header = _auth_header(admin)
        target_id = target.id
        target_email = target.email
    finally:
        db.close()

    # Too-short password -> 400
    short = client.post(
        f"/admin/users/{target_id}/reset-password",
        json={"new_password": "short"}, headers=admin_header,
    )
    assert short.status_code == 400

    # Unknown user -> 404
    missing = client.post(
        "/admin/users/does-not-exist/reset-password",
        json={"new_password": "a-valid-password"}, headers=admin_header,
    )
    assert missing.status_code == 404

    # Valid reset -> 200, and the new password actually works at login.
    ok = client.post(
        f"/admin/users/{target_id}/reset-password",
        json={"new_password": "brand-new-pass"}, headers=admin_header,
    )
    assert ok.status_code == 200

    login = client.post(
        "/auth/login", json={"email": target_email, "password": "brand-new-pass"},
    )
    assert login.status_code == 200
    assert "access_token" in login.json()


def test_invite_validation_endpoint(client):
    """Valid invites return 200; unknown/expired tokens return 404."""
    db = SessionLocal()
    try:
        admin = _make_user(db, username="inviter", email="inviter@test.com", role="admin")
        valid = Invite(created_by=admin.id)
        expired = Invite(
            created_by=admin.id,
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=1),
        )
        db.add_all([valid, expired])
        db.commit()
        db.refresh(valid)
        db.refresh(expired)
        valid_token, expired_token = valid.token, expired.token
    finally:
        db.close()

    good = client.get("/auth/validate-invite", params={"token": valid_token})
    assert good.status_code == 200
    assert good.json()["valid"] is True

    unknown = client.get("/auth/validate-invite", params={"token": "nope-not-real"})
    assert unknown.status_code == 404

    stale = client.get("/auth/validate-invite", params={"token": expired_token})
    assert stale.status_code == 404
