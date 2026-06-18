# CLAUDE.md — RNLI Premier League Predictor

Invite-only Premier League score-prediction game for RNLI colleagues. Players predict every fixture's scoreline before kickoff; points are scored for accuracy; a live leaderboard tracks the season. Live: https://rnli-premierleague-predictor.vercel.app

> Read this before making changes. It captures conventions and gotchas that are **not** obvious from a single file. The README has fuller setup/operational detail; this file is the rules of the road.

## Architecture

| Layer | Tech | Hosted | Notes |
|---|---|---|---|
| Frontend | React 19 + Vite 6 + Tailwind 3, React Router 7, axios, recharts | **Vercel** | SPA; `vercel.json` rewrites all routes to `index.html` |
| Backend | FastAPI (Python 3.12) + SQLAlchemy 2 | **Render** | routers per domain under `backend/routes/` |
| Database | PostgreSQL | **Supabase** (prod) / SQLite (local) | chosen via `DATABASE_URL`; no Alembic |

- **Backend entry:** `backend/main.py` — registers all routers, runs `create_tables()` then `run_migrations()` on startup, configures CORS from `ALLOWED_ORIGINS`.
- **Frontend entry:** `frontend/src/App.jsx` (routes) → `pages/` (one file per page) wrapped by `Layout.jsx` and `ProtectedRoute.jsx`.

## Frontend conventions

- **CSS namespace pattern (important):** every page has its own prefixed class namespace **appended to `frontend/src/index.css`** — `home-*`, `lb2-*` (leaderboard), `fx-*` (fixtures), `pd-*` (predictions), `db-*` (dashboard), `adm-*` (admin), `lgn-*` (login). When styling a page, **add new prefixed classes; never modify or repurpose existing ones** (pages share one stylesheet). Dark mode is the default.
- **Brand colours:** Tailwind custom tokens `rnli-blue` / `rnli-blue-light|dark`, `rnli-yellow` / `rnli-yellow-light|dark` (RNLI navy `#003087`, PL gold `#FFB81C`). Use these, not raw hex.
- **API access goes through `src/services/api.js` only.** It's the single axios client: `baseURL` from `VITE_API_URL`, injects the `Bearer` token from `localStorage`, and on a `401` clears the token and redirects to `/login`. Add new endpoints as methods on the relevant `*API` object — do **not** call axios directly from a page.
- **Auth state** lives in `AuthContext` (`useAuth()`): `user`, `token`, `isAdmin` (`user.role === 'admin'`), `isAuthenticated`, `login/register/logout`. Gate routes with `ProtectedRoute`; gate admin UI on `isAdmin`.
- **No frontend tests exist** (only ESLint). Do not assume a test runner. If adding tests, propose Vitest + React Testing Library first — don't invent a setup silently.

## Backend conventions

- **One router per domain** in `backend/routes/` (`auth, fixtures, predictions, results, leaderboard, admin, users, settings`). New endpoints belong in the matching router; register new routers in `main.py`.
- **Protect every non-public route** with `Depends(get_current_user)`; admin-only routes with `Depends(get_current_admin)` (both in `auth.py`). JWT is HS256, 24h expiry, `sub` = user id. `SECRET_KEY` is **required** — the app refuses to start without it.
- **Scoring is centralised in `scoring.py` — the single source of truth.** Rules: exact score = **5**, correct result (right winner / draw) = **2**, else **0**; a wildcarded gameweek is **×2**; postponed fixtures contribute 0 and are excluded. Leaderboard, admin users list, and admin predictions viewer all call `compute_gameweek_points()` so totals can't diverge. **Never reimplement scoring inline** — change it here only.
- **Rate limiting** via `slowapi` (`limiter.py`); password hashing via `bcrypt` (`auth.py`). Keep secrets in env vars, never hardcoded.

## Database & migrations (read before touching models)

- **No Alembic.** `create_all` makes new *tables* but never adds *columns* to existing ones. So when you add a column to a model in `models.py`, you **must** also add an idempotent step to `run_migrations()` in `migrate.py` for **both** dialects:
  - Postgres: `ALTER TABLE x ADD COLUMN IF NOT EXISTS ...`
  - SQLite: guard with the inspector `_column_exists(...)` check, then plain `ADD COLUMN`.
  Migrations run automatically on startup and must be safe to run repeatedly.
- Use the `get_db()` session dependency in routes; don't open sessions ad hoc.

## ⚠️ Danger zone — destructive operations

Never run these against the production Supabase DB:
- `POST /admin/simulate` (in `routes/admin.py` / `simulate.py`) — **full DB reset** + simulates 10 gameweeks. Dev/demo only.
- `backend/reset_data.py`, `database.drop_tables()`, and re-seeding via `seed_data.py` — all wipe or overwrite data.
- Fixture CSV upload is an **upsert** (safe, preserves predictions/results) — that one is fine to re-run.

## Deployment (the part that bites)

- **Backend → Render: auto-deploys from `main`.** Push to `main` and Render rebuilds (~2 min). `render.yaml` defines the service.
- **Frontend → Vercel: MANUAL.** GitHub auto-deploy was **disabled** (stale-cache issues). A `git push` does **not** update the site. Deploy explicitly from the repo root:
  ```bash
  npx vercel deploy --prod
  ```
- So "shipping" a full-stack change = push to `main` (backend) **and** `npx vercel deploy --prod` (frontend). Forgetting the second step is the classic "my change isn't live" trap.
- After deploying, verify: backend health at `GET /` on the Render URL, and the live frontend renders.

## Environment variables

- **Backend (Render):** `DATABASE_URL` (Supabase Postgres), `SECRET_KEY` (JWT — required), `ALLOWED_ORIGINS` (comma-separated; must include the Vercel URL or CORS fails), `INVITE_ONLY`. `ALGORITHM`/`ACCESS_TOKEN_EXPIRE_MINUTES` optional.
- **Frontend (Vercel):** `VITE_API_URL` → the Render backend URL.
- Local: backend reads `.env` (falls back to SQLite + `localhost:5173` CORS); frontend reads `.env.local` (`VITE_API_URL=http://localhost:8000`).

## Local dev & tests

```bash
# Backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000      # docs at /docs

# Frontend
cd frontend && npm install && npm run dev   # http://localhost:5173

# Backend tests (the only test suite)
cd backend && pytest test_main.py -v
# Lint frontend
cd frontend && npm run lint
```

## Repo gotcha

There are **multiple local clones** of this repo on this machine. The canonical, up-to-date one is `/Users/joeclarke/rnli-premierleague-predictor` (matches GitHub `main`). Make sure you're working in it — the others are stale.
