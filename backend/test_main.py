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
from models import User, Fixture, Result, Prediction, Invite, Wildcard  # noqa: E402
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


# ── Wildcard tests ────────────────────────────────────────────────────────────
#
# These tests share a dedicated gameweek namespace (GW 10-19) to avoid
# colliding with fixtures created by the earlier module-scoped tests.
# All wildcard tests run against the same module-scoped `client` fixture so
# schema setup is not repeated.


def _make_fixture(db, *, gameweek, home, away, status="scheduled"):
    """Insert a fixture and return its id."""
    fixture = Fixture(
        gameweek=gameweek,
        date=__import__("datetime").date(2025, 8, 1),
        home_team=home,
        away_team=away,
        status=status,
    )
    db.add(fixture)
    db.commit()
    db.refresh(fixture)
    return fixture.id


def _add_result(db, *, fixture_id, gameweek, home, away):
    result = Result(fixture_id=fixture_id, gameweek=gameweek, actual_home=home, actual_away=away)
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


def _add_prediction(db, *, user_id, fixture_id, gameweek, home, away):
    pred = Prediction(
        user_id=user_id, fixture_id=fixture_id, gameweek=gameweek,
        predicted_home=home, predicted_away=away,
    )
    db.add(pred)
    db.commit()
    db.refresh(pred)
    return pred


# --- GET /predictions/wildcard -----------------------------------------------

def test_wildcard_get_returns_empty_for_new_user(client):
    """A freshly created user has no wildcards; GET returns an empty list."""
    db = SessionLocal()
    try:
        user = _make_user(db, username="wc_get_empty", email="wc_get_empty@test.com")
        header = _auth_header(user)
    finally:
        db.close()

    resp = client.get("/predictions/wildcard", headers=header)
    assert resp.status_code == 200
    assert resp.json()["gameweeks"] == []


def test_wildcard_get_returns_active_gameweeks(client):
    """After activating GW 10 and 11, GET returns both in sorted order."""
    db = SessionLocal()
    try:
        user = _make_user(db, username="wc_get_list", email="wc_get_list@test.com")
        # Seed wildcards directly — no results in GW10/11 yet.
        db.add(Wildcard(user_id=user.id, gameweek=11))
        db.add(Wildcard(user_id=user.id, gameweek=10))
        db.commit()
        header = _auth_header(user)
    finally:
        db.close()

    resp = client.get("/predictions/wildcard", headers=header)
    assert resp.status_code == 200
    assert resp.json()["gameweeks"] == [10, 11]


# --- POST /predictions/wildcard (activate) -----------------------------------

def test_wildcard_activate_before_saving_predictions(client):
    """
    Activation is INDEPENDENT of predictions: a user can activate for a
    gameweek that has no predictions yet and the endpoint returns 200 active=True.
    """
    db = SessionLocal()
    try:
        user = _make_user(db, username="wc_activate_early", email="wc_activate_early@test.com")
        header = _auth_header(user)
        # GW 12 — no predictions, no fixtures with results.
        _make_fixture(db, gameweek=12, home="Arsenal", away="Chelsea")
    finally:
        db.close()

    resp = client.post("/predictions/wildcard", json={"gameweek": 12}, headers=header)
    assert resp.status_code == 200
    body = resp.json()
    assert body["active"] is True
    assert body["gameweek"] == 12


def test_wildcard_activate_after_saving_predictions(client):
    """
    Activation works equally when predictions for that gameweek already exist
    (no Result yet), confirming the prediction-save gate does not interfere.
    """
    db = SessionLocal()
    try:
        user = _make_user(db, username="wc_activate_after_pred", email="wc_activate_after_pred@test.com")
        fid = _make_fixture(db, gameweek=13, home="Wolves", away="Brentford")
        _add_prediction(db, user_id=user.id, fixture_id=fid, gameweek=13, home=1, away=0)
        header = _auth_header(user)
    finally:
        db.close()

    resp = client.post("/predictions/wildcard", json={"gameweek": 13}, headers=header)
    assert resp.status_code == 200
    assert resp.json()["active"] is True


def test_wildcard_activate_blocked_once_result_exists(client):
    """
    POST /predictions/wildcard must return 403 once any Result exists for that GW.
    """
    db = SessionLocal()
    try:
        user = _make_user(db, username="wc_block_activate", email="wc_block_activate@test.com")
        fid = _make_fixture(db, gameweek=14, home="Villa", away="Palace")
        _add_result(db, fixture_id=fid, gameweek=14, home=2, away=1)
        header = _auth_header(user)
    finally:
        db.close()

    resp = client.post("/predictions/wildcard", json={"gameweek": 14}, headers=header)
    assert resp.status_code == 403
    assert "results" in resp.json()["detail"].lower()


def test_wildcard_activate_idempotent(client):
    """
    Re-activating an existing wildcard must not raise 500 or violate the unique
    constraint — it is a no-op success returning active=True.
    """
    db = SessionLocal()
    try:
        user = _make_user(db, username="wc_idempotent_activate", email="wc_idempotent_activate@test.com")
        _make_fixture(db, gameweek=15, home="Leicester", away="Norwich")
        header = _auth_header(user)
    finally:
        db.close()

    # First activation.
    r1 = client.post("/predictions/wildcard", json={"gameweek": 15}, headers=header)
    assert r1.status_code == 200
    assert r1.json()["active"] is True

    # Second activation (idempotent).
    r2 = client.post("/predictions/wildcard", json={"gameweek": 15}, headers=header)
    assert r2.status_code == 200
    assert r2.json()["active"] is True

    # Still only one wildcard row for this user/GW.
    db = SessionLocal()
    try:
        uid = db.query(User).filter(User.username == "wc_idempotent_activate").first().id
        count = db.query(Wildcard).filter(Wildcard.user_id == uid, Wildcard.gameweek == 15).count()
    finally:
        db.close()
    assert count == 1


def test_wildcard_activate_rejects_out_of_range_gameweek(client):
    """
    Pydantic validation rejects gameweek 0 and gameweek 39+ with 422.
    """
    db = SessionLocal()
    try:
        user = _make_user(db, username="wc_range_check", email="wc_range_check@test.com")
        header = _auth_header(user)
    finally:
        db.close()

    assert client.post("/predictions/wildcard", json={"gameweek": 0}, headers=header).status_code == 422
    assert client.post("/predictions/wildcard", json={"gameweek": 39}, headers=header).status_code == 422


# --- DELETE /predictions/wildcard (deactivate) --------------------------------

def test_wildcard_deactivate_blocked_once_result_exists(client):
    """
    DELETE /predictions/wildcard must return 403 once any Result exists for that GW,
    even if the wildcard was already set.
    """
    db = SessionLocal()
    try:
        user = _make_user(db, username="wc_block_deactivate", email="wc_block_deactivate@test.com")
        fid = _make_fixture(db, gameweek=16, home="Fulham", away="Ipswich")
        # Pre-activate, then add a result to freeze the gameweek.
        db.add(Wildcard(user_id=user.id, gameweek=16))
        _add_result(db, fixture_id=fid, gameweek=16, home=1, away=1)
        header = _auth_header(user)
    finally:
        db.close()

    resp = client.delete("/predictions/wildcard", params={"gameweek": 16}, headers=header)
    assert resp.status_code == 403


def test_wildcard_deactivate_idempotent(client):
    """
    Deactivating a wildcard that isn't active is a no-op success (active=False),
    not a 404 or 500.
    """
    db = SessionLocal()
    try:
        user = _make_user(db, username="wc_idempotent_deactivate", email="wc_idempotent_deactivate@test.com")
        _make_fixture(db, gameweek=17, home="Newcastle", away="Burnley")
        header = _auth_header(user)
    finally:
        db.close()

    # No wildcard exists yet — deactivating should be a no-op.
    resp = client.delete("/predictions/wildcard", params={"gameweek": 17}, headers=header)
    assert resp.status_code == 200
    assert resp.json()["active"] is False


# --- Scoring consistency -------------------------------------------------------

def test_wildcard_doubles_leaderboard_total(client):
    """
    A wildcarded gameweek doubles the user's leaderboard total.
    Exact score (5 pts raw) becomes 10 when wildcarded.
    The leaderboard total for that user must equal 10.
    """
    db = SessionLocal()
    try:
        user = _make_user(db, username="wc_lb_double", email="wc_lb_double@test.com")
        fid = _make_fixture(db, gameweek=18, home="Man City", away="Liverpool")
        _add_prediction(db, user_id=user.id, fixture_id=fid, gameweek=18, home=2, away=1)
        _add_result(db, fixture_id=fid, gameweek=18, home=2, away=1)  # exact → 5 raw
        db.add(Wildcard(user_id=user.id, gameweek=18))
        db.commit()
        username = user.username
    finally:
        db.close()

    resp = client.get("/leaderboard/")
    assert resp.status_code == 200
    rows = {r["player"]: r for r in resp.json()["leaderboard"]}
    assert username in rows, "User should appear on the leaderboard"
    assert rows[username]["total"] == 10, f"Expected 10 (5×2), got {rows[username]['total']}"
    assert rows[username]["week_18"] == 10


def test_wildcard_consistent_across_leaderboard_admin_and_stats(client):
    """
    The CORE invariant: leaderboard total == admin list_users total == /users/me/stats total
    for a user with an active wildcard.
    """
    db = SessionLocal()
    try:
        user = _make_user(db, username="wc_consistent", email="wc_consistent@test.com")
        admin = _make_user(db, username="wc_admin_checker", email="wc_admin_checker@test.com", role="admin")
        fid = _make_fixture(db, gameweek=19, home="Tottenham", away="West Ham")
        _add_prediction(db, user_id=user.id, fixture_id=fid, gameweek=19, home=1, away=0)
        _add_result(db, fixture_id=fid, gameweek=19, home=1, away=0)   # exact → 5 raw → 10 doubled
        db.add(Wildcard(user_id=user.id, gameweek=19))
        db.commit()
        username = user.username
        user_header = _auth_header(user)
        admin_header = _auth_header(admin)
    finally:
        db.close()

    # 1. Leaderboard total
    lb_resp = client.get("/leaderboard/")
    assert lb_resp.status_code == 200
    lb_rows = {r["player"]: r for r in lb_resp.json()["leaderboard"]}
    lb_total = lb_rows[username]["total"]

    # 2. Admin list_users total
    admin_resp = client.get("/admin/users", headers=admin_header)
    assert admin_resp.status_code == 200
    admin_users = {u["username"]: u for u in admin_resp.json()["users"]}
    admin_total = admin_users[username]["total_points"]
    # Admin must also report has_wildcard=True and wildcard_gameweeks containing 19
    assert admin_users[username]["has_wildcard"] is True
    assert 19 in admin_users[username]["wildcard_gameweeks"]

    # 3. Personal stats total
    stats_resp = client.get("/users/me/stats", headers=user_header)
    assert stats_resp.status_code == 200
    stats_total = stats_resp.json()["total_points"]

    # All three must agree and equal 10 (5 raw × 2 wildcard).
    assert lb_total == admin_total == stats_total == 10, (
        f"Divergence: leaderboard={lb_total}, admin={admin_total}, stats={stats_total}"
    )


def test_wildcard_per_week_leaderboard_breakdown_doubled(client):
    """
    The per-week column (week_N) on the leaderboard must reflect the doubled
    value for a wildcarded gameweek. Correct-result prediction: 2 raw → 4 doubled.
    """
    db = SessionLocal()
    try:
        user = _make_user(db, username="wc_per_week", email="wc_per_week@test.com")
        fid = _make_fixture(db, gameweek=20, home="Brighton", away="Southampton")
        # Correct result (not exact): home wins either way — pred 1-0, result 2-0.
        _add_prediction(db, user_id=user.id, fixture_id=fid, gameweek=20, home=1, away=0)
        _add_result(db, fixture_id=fid, gameweek=20, home=2, away=0)   # result correct → 2 raw
        db.add(Wildcard(user_id=user.id, gameweek=20))
        db.commit()
        username = user.username
    finally:
        db.close()

    resp = client.get("/leaderboard/")
    assert resp.status_code == 200
    rows = {r["player"]: r for r in resp.json()["leaderboard"]}
    assert rows[username]["week_20"] == 4, f"Expected 4 (2×2), got {rows[username]['week_20']}"


def test_wildcard_does_not_affect_non_wildcarded_gameweek(client):
    """
    A wildcard on GW21 must not alter the user's score on GW22 — base scoring
    (exact=5, result=2, wrong=0) is unchanged for non-wildcarded gameweeks.
    """
    db = SessionLocal()
    try:
        user = _make_user(db, username="wc_no_bleed", email="wc_no_bleed@test.com")
        fid21 = _make_fixture(db, gameweek=21, home="Everton", away="Forest")
        fid22 = _make_fixture(db, gameweek=22, home="Wolves", away="Sheffield")
        # GW21: exact → 5 raw, wildcarded → 10
        _add_prediction(db, user_id=user.id, fixture_id=fid21, gameweek=21, home=1, away=0)
        _add_result(db, fixture_id=fid21, gameweek=21, home=1, away=0)
        db.add(Wildcard(user_id=user.id, gameweek=21))
        # GW22: exact → 5 raw, NOT wildcarded → stays 5
        _add_prediction(db, user_id=user.id, fixture_id=fid22, gameweek=22, home=3, away=1)
        _add_result(db, fixture_id=fid22, gameweek=22, home=3, away=1)
        db.commit()
        username = user.username
    finally:
        db.close()

    resp = client.get("/leaderboard/")
    assert resp.status_code == 200
    rows = {r["player"]: r for r in resp.json()["leaderboard"]}
    assert rows[username]["week_21"] == 10, "Wildcarded GW should be 10"
    assert rows[username]["week_22"] == 5,  "Non-wildcarded GW should be raw 5"
    assert rows[username]["total"] == 15


def test_wildcard_postponed_fixture_contributes_zero_even_when_wildcarded(client):
    """
    A postponed fixture must contribute 0 points, even when the gameweek is
    wildcarded. Doubling zero is still zero.
    """
    db = SessionLocal()
    try:
        user = _make_user(db, username="wc_postponed", email="wc_postponed@test.com")
        fid = _make_fixture(db, gameweek=23, home="Leeds", away="Derby", status="postponed")
        _add_prediction(db, user_id=user.id, fixture_id=fid, gameweek=23, home=2, away=0)
        # Add a result on the postponed fixture (stale result scenario).
        _add_result(db, fixture_id=fid, gameweek=23, home=2, away=0)
        db.add(Wildcard(user_id=user.id, gameweek=23))
        db.commit()
        username = user.username
    finally:
        db.close()

    resp = client.get("/leaderboard/")
    assert resp.status_code == 200
    rows = {r["player"]: r for r in resp.json()["leaderboard"]}
    # Either not present or total is 0 — never 10 from a postponed fixture.
    assert rows.get(username, {"total": 0})["total"] == 0


# --- Authorisation -----------------------------------------------------------

def test_wildcard_authz_user_cannot_set_another_users_wildcard(client):
    """
    The wildcard endpoints set the wildcard for the AUTHENTICATED user only.
    User A cannot activate a wildcard that ends up on User B's account.
    """
    db = SessionLocal()
    try:
        user_a = _make_user(db, username="wc_authz_a", email="wc_authz_a@test.com")
        user_b = _make_user(db, username="wc_authz_b", email="wc_authz_b@test.com")
        _make_fixture(db, gameweek=24, home="Reading", away="Stoke")
        header_a = _auth_header(user_a)
        uid_b = user_b.id
    finally:
        db.close()

    # User A activates GW24 using their own token.
    resp = client.post("/predictions/wildcard", json={"gameweek": 24}, headers=header_a)
    assert resp.status_code == 200

    # User B must have NO wildcard for GW24 — the activation was for A only.
    db = SessionLocal()
    try:
        b_wildcard = db.query(Wildcard).filter(
            Wildcard.user_id == uid_b, Wildcard.gameweek == 24
        ).first()
    finally:
        db.close()
    assert b_wildcard is None, "User A's activation must not create a wildcard for User B"


def test_wildcard_endpoints_require_authentication(client):
    """All three wildcard endpoints must reject unauthenticated requests with 401 or 403."""
    get_resp = client.get("/predictions/wildcard")
    post_resp = client.post("/predictions/wildcard", json={"gameweek": 1})
    del_resp = client.delete("/predictions/wildcard", params={"gameweek": 1})

    for resp in (get_resp, post_resp, del_resp):
        assert resp.status_code in (401, 403), (
            f"Expected 401/403 for unauthenticated request, got {resp.status_code}"
        )
