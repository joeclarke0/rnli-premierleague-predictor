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


# ── Admin predictions viewer: optional gameweek + available_gameweeks ─────────
#
# The `client` fixture is module-scoped, so by the time these run the shared DB
# already holds predictions/fixtures from earlier tests. Each test below wipes
# Prediction → Result → Fixture (FK-safe order) and seeds only its own data so
# the exact-equality assertions on `available_gameweeks` hold deterministically.

def _wipe_match_data(db):
    db.query(Prediction).delete()
    db.query(Result).delete()
    db.query(Fixture).delete()
    db.commit()


def test_predictions_no_param_returns_latest_gameweek(client):
    """No gameweek param → resolves to the most recent GW with predictions, and
    available_gameweeks lists every distinct GW that has predictions, sorted."""
    db = SessionLocal()
    try:
        _wipe_match_data(db)
        admin = _make_user(db, username="pred_latest_admin", email="pred_latest_admin@test.com", role="admin")
        player = _make_user(db, username="pred_latest_player", email="pred_latest_player@test.com")
        fid2 = _make_fixture(db, gameweek=2, home="Arsenal", away="Chelsea")
        fid5 = _make_fixture(db, gameweek=5, home="Liverpool", away="Everton")
        _add_prediction(db, user_id=player.id, fixture_id=fid2, gameweek=2, home=1, away=0)
        _add_prediction(db, user_id=player.id, fixture_id=fid5, gameweek=5, home=2, away=2)
        admin_header = _auth_header(admin)
    finally:
        db.close()

    resp = client.get("/admin/predictions", headers=admin_header)
    assert resp.status_code == 200
    body = resp.json()
    assert body["gameweek"] == 5
    assert body["available_gameweeks"] == [2, 5]
    # Default resolved to GW5 → its single fixture is present.
    assert len(body["fixtures"]) == 1
    assert body["fixtures"][0]["home_team"] == "Liverpool"


def test_predictions_explicit_gameweek_still_works(client):
    """An explicit ?gameweek=2 returns that GW's fixtures and the unchanged
    fixture-major structure, with available_gameweeks unaffected by the choice."""
    db = SessionLocal()
    try:
        _wipe_match_data(db)
        admin = _make_user(db, username="pred_explicit_admin", email="pred_explicit_admin@test.com", role="admin")
        player = _make_user(db, username="pred_explicit_player", email="pred_explicit_player@test.com")
        fid2 = _make_fixture(db, gameweek=2, home="Tottenham", away="West Ham")
        fid5 = _make_fixture(db, gameweek=5, home="Brighton", away="Fulham")
        _add_prediction(db, user_id=player.id, fixture_id=fid2, gameweek=2, home=3, away=1)
        _add_prediction(db, user_id=player.id, fixture_id=fid5, gameweek=5, home=0, away=0)
        admin_header = _auth_header(admin)
        player_username = player.username
    finally:
        db.close()

    resp = client.get("/admin/predictions", params={"gameweek": 2}, headers=admin_header)
    assert resp.status_code == 200
    body = resp.json()
    assert body["gameweek"] == 2
    assert body["available_gameweeks"] == [2, 5]
    assert len(body["fixtures"]) == 1
    fixture = body["fixtures"][0]
    assert fixture["home_team"] == "Tottenham"
    assert fixture["away_team"] == "West Ham"
    # Structure intact: per-fixture predictions list includes the player's score.
    preds = {p["username"]: p for p in fixture["predictions"]}
    assert preds[player_username]["predicted_home"] == 3
    assert preds[player_username]["predicted_away"] == 1


def test_predictions_no_predictions_empty_state(client):
    """No predictions anywhere → available_gameweeks is empty and the endpoint
    returns a valid 200 (default GW1), not a 500."""
    db = SessionLocal()
    try:
        _wipe_match_data(db)
        admin = _make_user(db, username="pred_empty_admin", email="pred_empty_admin@test.com", role="admin")
        admin_header = _auth_header(admin)
    finally:
        db.close()

    resp = client.get("/admin/predictions", headers=admin_header)
    assert resp.status_code == 200
    body = resp.json()
    assert body["available_gameweeks"] == []
    assert body["gameweek"] == 1
    assert body["fixtures"] == []


# ── Missing predictions ──────────────────────────────────────────────────────
#
# Uses a high gameweek namespace (GW 50+) to avoid colliding with fixtures
# seeded by earlier tests. Each test that needs a fresh state wipes predictions
# and fixtures for its own GWs only (finer-grained than _wipe_match_data which
# wipes everything and breaks earlier tests).

def test_missing_admin_user_appears_in_summary(client):
    """Admin users must appear in the missing-predictions summary (regression
    for the role-filter bug — previously filtered to role='user' only)."""
    db = SessionLocal()
    try:
        admin = _make_user(db, username="miss_admin", email="miss_admin@test.com", role="admin")
        player = _make_user(db, username="miss_player", email="miss_player@test.com")
        fid = _make_fixture(db, gameweek=50, home="Hull", away="Preston")
        admin_header = _auth_header(admin)
    finally:
        db.close()

    resp = client.get("/admin/missing-predictions", params={"gameweek": 50}, headers=admin_header)
    assert resp.status_code == 200
    usernames = {u["username"] for u in resp.json()["summary"]}
    assert "miss_admin" in usernames, "Admin user must appear in missing summary"
    assert "miss_player" in usernames, "Player user must appear in missing summary"


def test_missing_default_resolves_to_upcoming_gameweek(client):
    """Omitting gameweek resolves to the first GW with fixtures but no results."""
    db = SessionLocal()
    try:
        admin = _make_user(db, username="miss_def_admin", email="miss_def_admin@test.com", role="admin")
        # Wipe GW50 fixtures left by the previous test so they don't pollute the
        # default-GW resolution (the endpoint picks the *first* upcoming GW).
        for fid in [f.id for f in db.query(Fixture).filter(Fixture.gameweek == 50).all()]:
            db.query(Prediction).filter(Prediction.fixture_id == fid).delete()
            db.query(Result).filter(Result.fixture_id == fid).delete()
        db.query(Fixture).filter(Fixture.gameweek == 50).delete()
        db.commit()
        # GW51: has fixtures + a result (scored)
        fid51 = _make_fixture(db, gameweek=51, home="Millwall", away="Cardiff")
        _add_result(db, fixture_id=fid51, gameweek=51, home=1, away=0)
        # GW52: has fixtures, no results (upcoming)
        _make_fixture(db, gameweek=52, home="QPR", away="Swansea")
        admin_header = _auth_header(admin)
    finally:
        db.close()

    resp = client.get("/admin/missing-predictions", headers=admin_header)
    assert resp.status_code == 200
    body = resp.json()
    # Should resolve to GW52 (upcoming), not GW51 (already scored).
    assert body["gameweek"] == 52
    assert 52 in body["available_gameweeks"]


def test_missing_postponed_fixture_excluded_from_count(client):
    """Postponed fixtures must not appear in the missing count — same exclusion
    rule as scoring. A user who never predicted against a postponed fixture
    must not show a non-zero missing count for it."""
    db = SessionLocal()
    try:
        admin = _make_user(db, username="miss_ppt_admin", email="miss_ppt_admin@test.com", role="admin")
        player = _make_user(db, username="miss_ppt_player", email="miss_ppt_player@test.com")
        # GW53: one normal fixture (player predicts), one postponed (no prediction).
        fid_normal = _make_fixture(db, gameweek=53, home="Barnsley", away="Wigan")
        _make_fixture(db, gameweek=53, home="Rotherham", away="Blackburn", status="postponed")
        _add_prediction(db, user_id=player.id, fixture_id=fid_normal, gameweek=53, home=1, away=0)
        admin_header = _auth_header(admin)
        player_username = player.username
    finally:
        db.close()

    resp = client.get("/admin/missing-predictions", params={"gameweek": 53}, headers=admin_header)
    assert resp.status_code == 200
    body = resp.json()
    summary = {u["username"]: u for u in body["summary"]}
    # Player submitted for the only non-postponed fixture → complete.
    assert summary[player_username]["complete"] is True, (
        f"Player should be complete (postponed fixture excluded): {summary[player_username]}"
    )
    # Total fixture count must reflect only non-postponed fixtures (1, not 2).
    assert body["total_fixtures"] == 1


# ── Phase A: Manual Fixture Editor ───────────────────────────────────────────
#
# All Phase A tests use GW 30-38 namespace so they never collide with data
# seeded by earlier module-scoped tests (GW 1-29 core tests, GW 50-53 missing
# predictions tests). Tests are ordered: edit, move, add, delete.

def _make_admin_and_header(db, username_suffix: str):
    """Create a fresh admin user and return (admin, header)."""
    admin = _make_user(
        db,
        username=f"fa_admin_{username_suffix}",
        email=f"fa_admin_{username_suffix}@test.com",
        role="admin",
    )
    return admin, _auth_header(admin)


# ── Edit fixture ─────────────────────────────────────────────────────────────

def test_edit_fixture_updates_date_and_kickoff(client):
    """PATCH /admin/fixtures/{id} — admin can update date/time; kickoff_time recomputes."""
    db = SessionLocal()
    try:
        _, header = _make_admin_and_header(db, "edit_date")
        fid = _make_fixture(db, gameweek=30, home="EditHome1", away="EditAway1")
    finally:
        db.close()

    resp = client.patch(
        f"/admin/fixtures/{fid}",
        json={"date": "2025-12-01", "time": "15:00"},
        headers=header,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["date"] == "2025-12-01"
    # kickoff_time must be non-null — a time was provided so it should recompute.
    assert body["kickoff_time"] is not None
    assert "2025-12-01" in body["kickoff_time"]


def test_edit_fixture_blocked_if_scored(client):
    """PATCH /admin/fixtures/{id} — 403 when a Result already exists for the fixture."""
    db = SessionLocal()
    try:
        _, header = _make_admin_and_header(db, "edit_scored")
        fid = _make_fixture(db, gameweek=30, home="EditHome2", away="EditAway2")
        _add_result(db, fixture_id=fid, gameweek=30, home=1, away=0)
    finally:
        db.close()

    resp = client.patch(
        f"/admin/fixtures/{fid}",
        json={"date": "2025-12-02"},
        headers=header,
    )
    assert resp.status_code == 403
    assert "result" in resp.json()["detail"].lower()


def test_edit_fixture_duplicate_teams_rejected(client):
    """PATCH /admin/fixtures/{id} — 409 when renaming would create a duplicate natural key."""
    db = SessionLocal()
    try:
        _, header = _make_admin_and_header(db, "edit_dup")
        # Existing fixture that our rename would collide with.
        _make_fixture(db, gameweek=31, home="CollideA", away="CollideB")
        # The fixture we are editing — rename its home to 'CollideA' (same GW, same away).
        fid = _make_fixture(db, gameweek=31, home="OriginalA", away="CollideB")
    finally:
        db.close()

    resp = client.patch(
        f"/admin/fixtures/{fid}",
        json={"home_team": "CollideA"},
        headers=header,
    )
    assert resp.status_code == 409


def test_edit_fixture_home_equals_away_rejected(client):
    """PATCH /admin/fixtures/{id} — 400 when home_team == away_team after update."""
    db = SessionLocal()
    try:
        _, header = _make_admin_and_header(db, "edit_same")
        fid = _make_fixture(db, gameweek=31, home="SameTeamA", away="SameTeamB")
    finally:
        db.close()

    resp = client.patch(
        f"/admin/fixtures/{fid}",
        json={"home_team": "SameTeamB"},
        headers=header,
    )
    assert resp.status_code == 400


# ── Move fixture ──────────────────────────────────────────────────────────────

def test_move_fixture_cascades_predictions(client):
    """PATCH /admin/fixtures/{id}/gameweek — fixture and predictions both move to new GW."""
    db = SessionLocal()
    try:
        _, header = _make_admin_and_header(db, "move_cascade")
        user = _make_user(db, username="fa_move_player", email="fa_move_player@test.com")
        fid = _make_fixture(db, gameweek=32, home="MoveHome1", away="MoveAway1")
        _add_prediction(db, user_id=user.id, fixture_id=fid, gameweek=32, home=1, away=0)
    finally:
        db.close()

    resp = client.patch(
        f"/admin/fixtures/{fid}/gameweek",
        json={"gameweek": 33},
        headers=header,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["old_gameweek"] == 32
    assert body["new_gameweek"] == 33
    assert body["predictions_updated"] == 1

    # Verify DB state: fixture in GW33, prediction.gameweek also 33.
    db = SessionLocal()
    try:
        fixture = db.query(Fixture).filter(Fixture.id == fid).first()
        assert fixture.gameweek == 33
        pred = db.query(Prediction).filter(Prediction.fixture_id == fid).first()
        assert pred.gameweek == 33
    finally:
        db.close()


def test_move_fixture_blocked_if_scored(client):
    """PATCH /admin/fixtures/{id}/gameweek — 403 when a Result exists."""
    db = SessionLocal()
    try:
        _, header = _make_admin_and_header(db, "move_scored")
        fid = _make_fixture(db, gameweek=32, home="MoveHome2", away="MoveAway2")
        _add_result(db, fixture_id=fid, gameweek=32, home=2, away=1)
    finally:
        db.close()

    resp = client.patch(
        f"/admin/fixtures/{fid}/gameweek",
        json={"gameweek": 33},
        headers=header,
    )
    assert resp.status_code == 403
    assert "result" in resp.json()["detail"].lower()


def test_move_fixture_blocked_if_same_gameweek(client):
    """PATCH /admin/fixtures/{id}/gameweek — 400 when target GW equals current GW."""
    db = SessionLocal()
    try:
        _, header = _make_admin_and_header(db, "move_same_gw")
        fid = _make_fixture(db, gameweek=33, home="MoveHome3", away="MoveAway3")
    finally:
        db.close()

    resp = client.patch(
        f"/admin/fixtures/{fid}/gameweek",
        json={"gameweek": 33},
        headers=header,
    )
    assert resp.status_code == 400
    assert "already" in resp.json()["detail"].lower()


def test_move_fixture_collision_rejected(client):
    """PATCH /admin/fixtures/{id}/gameweek — 409 when (home, away, new_gw) already exists."""
    db = SessionLocal()
    try:
        _, header = _make_admin_and_header(db, "move_collision")
        # Target GW already has the same matchup.
        _make_fixture(db, gameweek=35, home="CollideMove", away="CollideMoveAway")
        # The fixture to move — currently in GW34, same teams as above.
        fid = _make_fixture(db, gameweek=34, home="CollideMove", away="CollideMoveAway")
    finally:
        db.close()

    resp = client.patch(
        f"/admin/fixtures/{fid}/gameweek",
        json={"gameweek": 35},
        headers=header,
    )
    assert resp.status_code == 409


def test_move_fixture_wildcard_warning_only_for_users_with_predictions(client):
    """PATCH /admin/fixtures/{id}/gameweek — wildcard_warnings only includes users who
    BOTH wildcarded the old GW AND have a prediction on this specific fixture."""
    db = SessionLocal()
    try:
        _, header = _make_admin_and_header(db, "move_wc_warn")
        # User A: wildcarded old GW + has prediction on this fixture → IN warnings.
        user_a = _make_user(db, username="fa_wc_a", email="fa_wc_a@test.com")
        # User B: wildcarded old GW but NO prediction on this fixture → NOT in warnings.
        user_b = _make_user(db, username="fa_wc_b", email="fa_wc_b@test.com")
        # User C: has prediction but NO wildcard → NOT in warnings.
        user_c = _make_user(db, username="fa_wc_c", email="fa_wc_c@test.com")

        fid = _make_fixture(db, gameweek=36, home="WCMoveHome", away="WCMoveAway")

        _add_prediction(db, user_id=user_a.id, fixture_id=fid, gameweek=36, home=1, away=0)
        _add_prediction(db, user_id=user_c.id, fixture_id=fid, gameweek=36, home=2, away=1)

        db.add(Wildcard(user_id=user_a.id, gameweek=36))
        db.add(Wildcard(user_id=user_b.id, gameweek=36))
        db.commit()

        username_a = user_a.username
        username_b = user_b.username
        username_c = user_c.username
    finally:
        db.close()

    resp = client.patch(
        f"/admin/fixtures/{fid}/gameweek",
        json={"gameweek": 37},
        headers=header,
    )
    assert resp.status_code == 200
    warnings = resp.json()["wildcard_warnings"]
    assert username_a in warnings, "User A (wildcard + prediction) must be warned"
    assert username_b not in warnings, "User B (wildcard only, no prediction) must NOT be warned"
    assert username_c not in warnings, "User C (prediction only, no wildcard) must NOT be warned"


# ── Add fixture ───────────────────────────────────────────────────────────────

def test_add_fixture_success(client):
    """POST /admin/fixtures — creates fixture with correct fields in DB."""
    db = SessionLocal()
    try:
        _, header = _make_admin_and_header(db, "add_ok")
    finally:
        db.close()

    resp = client.post(
        "/admin/fixtures",
        json={
            "gameweek": 34,
            "date": "2025-11-15",
            "time": "12:30",
            "home_team": "AddHome1",
            "away_team": "AddAway1",
            "venue": "Test Stadium",
        },
        headers=header,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["home_team"] == "AddHome1"
    assert body["away_team"] == "AddAway1"
    assert body["gameweek"] == 34
    assert body["date"] == "2025-11-15"
    assert body["status"] == "scheduled"
    assert body["kickoff_time"] is not None

    # Verify fixture persisted in DB.
    db = SessionLocal()
    try:
        fixture = db.query(Fixture).filter(Fixture.id == body["id"]).first()
        assert fixture is not None
        assert fixture.venue == "Test Stadium"
    finally:
        db.close()


def test_add_fixture_duplicate_rejected(client):
    """POST /admin/fixtures — 409 when (home, away, gameweek) already exists."""
    db = SessionLocal()
    try:
        _, header = _make_admin_and_header(db, "add_dup")
        # Seed the existing fixture.
        _make_fixture(db, gameweek=34, home="DupHome", away="DupAway")
    finally:
        db.close()

    resp = client.post(
        "/admin/fixtures",
        json={
            "gameweek": 34,
            "date": "2025-11-15",
            "home_team": "DupHome",
            "away_team": "DupAway",
        },
        headers=header,
    )
    assert resp.status_code == 409


def test_add_fixture_home_equals_away_rejected(client):
    """POST /admin/fixtures — 400 when home_team == away_team."""
    db = SessionLocal()
    try:
        _, header = _make_admin_and_header(db, "add_same")
    finally:
        db.close()

    resp = client.post(
        "/admin/fixtures",
        json={
            "gameweek": 35,
            "date": "2025-11-22",
            "home_team": "SameClub",
            "away_team": "SameClub",
        },
        headers=header,
    )
    assert resp.status_code == 400


# ── Delete fixture ────────────────────────────────────────────────────────────

def test_delete_fixture_no_predictions_succeeds(client):
    """DELETE /admin/fixtures/{id} — fixture with no predictions is deleted directly."""
    db = SessionLocal()
    try:
        _, header = _make_admin_and_header(db, "del_clean")
        fid = _make_fixture(db, gameweek=38, home="DelHome1", away="DelAway1")
    finally:
        db.close()

    resp = client.delete(f"/admin/fixtures/{fid}", headers=header)
    assert resp.status_code == 200
    assert resp.json()["deleted"] is True

    # Fixture must be gone.
    db = SessionLocal()
    try:
        assert db.query(Fixture).filter(Fixture.id == fid).first() is None
    finally:
        db.close()


def test_delete_fixture_with_predictions_returns_409(client):
    """DELETE /admin/fixtures/{id} (no force) — returns 409 with predictions_count when
    predictions exist. Body fields are at the top level (plain JSONResponse)."""
    db = SessionLocal()
    try:
        _, header = _make_admin_and_header(db, "del_409")
        user = _make_user(db, username="fa_del_player", email="fa_del_player@test.com")
        fid = _make_fixture(db, gameweek=38, home="DelHome2", away="DelAway2")
        _add_prediction(db, user_id=user.id, fixture_id=fid, gameweek=38, home=1, away=1)
    finally:
        db.close()

    resp = client.delete(f"/admin/fixtures/{fid}", headers=header)
    assert resp.status_code == 409
    body = resp.json()
    # Body fields sit at top level (JSONResponse, not HTTPException).
    assert body["predictions_count"] == 1
    assert "has_result" in body

    # Fixture must still exist (not deleted).
    db = SessionLocal()
    try:
        assert db.query(Fixture).filter(Fixture.id == fid).first() is not None
    finally:
        db.close()


def test_delete_fixture_force_cascades_predictions(client):
    """DELETE /admin/fixtures/{id}?force=true — deletes fixture and its predictions."""
    db = SessionLocal()
    try:
        _, header = _make_admin_and_header(db, "del_force")
        user = _make_user(db, username="fa_del_force_player", email="fa_del_force_player@test.com")
        fid = _make_fixture(db, gameweek=38, home="DelHome3", away="DelAway3")
        _add_prediction(db, user_id=user.id, fixture_id=fid, gameweek=38, home=2, away=0)
    finally:
        db.close()

    resp = client.delete(f"/admin/fixtures/{fid}", params={"force": "true"}, headers=header)
    assert resp.status_code == 200
    body = resp.json()
    assert body["deleted"] is True
    assert body["predictions_deleted"] == 1

    # Both fixture and its prediction must be gone.
    db = SessionLocal()
    try:
        assert db.query(Fixture).filter(Fixture.id == fid).first() is None
        assert db.query(Prediction).filter(Prediction.fixture_id == fid).count() == 0
    finally:
        db.close()


# ── Invite single-use consumption ─────────────────────────────────────────────

def test_invite_single_use_second_registration_rejected(client, monkeypatch):
    """A single-use invite must only ever create one account.

    The invite is consumed via an atomic conditional UPDATE (used_at IS NULL
    guard) so a second registration — including one racing under Postgres READ
    COMMITTED — sees rowcount == 0 and is rejected. True concurrency isn't
    reproducible with TestClient's in-process SQLite, so this proves the
    sequential contract: first use succeeds, any reuse fails.
    """
    monkeypatch.setenv("INVITE_ONLY", "true")

    db = SessionLocal()
    try:
        admin = _make_user(db, username="race_inviter", email="race_inviter@test.com", role="admin")
        invite = Invite(created_by=admin.id)
        db.add(invite)
        db.commit()
        db.refresh(invite)
        token = invite.token
        invite_id = invite.id
    finally:
        db.close()

    first = client.post("/auth/register", json={
        "username": "race_winner", "email": "race_winner@test.com",
        "password": "password123", "invite_token": token,
    })
    assert first.status_code == 201
    winner_id = first.json()["id"]

    # Second attempt with the same token: _get_valid_invite sees used_at set
    # and returns None -> 403. (If two requests raced past that check, the
    # atomic UPDATE's rowcount guard would return 409 instead — either way,
    # no second account is created.)
    second = client.post("/auth/register", json={
        "username": "race_loser", "email": "race_loser@test.com",
        "password": "password123", "invite_token": token,
    })
    assert second.status_code in (403, 409)

    db = SessionLocal()
    try:
        # Invite is bound to the first user only, and no second account exists.
        used = db.query(Invite).filter(Invite.id == invite_id).first()
        assert used.used_at is not None
        assert used.used_by == winner_id
        assert db.query(User).filter(User.username == "race_loser").first() is None
    finally:
        db.close()
