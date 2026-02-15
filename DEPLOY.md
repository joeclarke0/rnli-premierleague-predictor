# Deployment Guide — RNLI Premier League Predictor

When you're ready to make the app publicly accessible to colleagues, follow this guide.

---

## Recommended Architecture

| Layer | Service | Cost |
|---|---|---|
| **Frontend** | [Vercel](https://vercel.com) | Free |
| **Backend** | [Railway](https://railway.app) | ~$5/month |
| **Database** | SQLite on Railway persistent disk | Included |

The frontend (React/Vite) deploys as static files to Vercel.
The backend (FastAPI + SQLite) runs as a persistent web service on Railway.
Both auto-deploy from GitHub on every push to `main`.

---

## Code Changes Required Before Deploying

Three things need environment-variable config (not hardcoded values):

### 1. Backend — CORS origins
In `backend/main.py`, update the `allow_origins` list to accept requests from
the Vercel URL. Best approach: read from an env var.

```python
import os

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Set `ALLOWED_ORIGINS=https://your-app.vercel.app` in Railway environment variables.

### 2. Backend — Database path
In `backend/database.py`, the SQLite path should point to Railway's persistent disk:

```python
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./rnli_predictor.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
```

Set `DATABASE_URL=sqlite:////data/rnli_predictor.db` in Railway (note: 4 slashes for absolute path).
In Railway, mount a persistent volume at `/data`.

### 3. Frontend — API URL
In `frontend/src/services/api.js`, this is already done correctly:
```js
baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
```

Set `VITE_API_URL=https://your-backend.railway.app` in Vercel environment variables.

---

## Step-by-Step Deployment

### Backend → Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select `rnli-premierleague-predictor`
4. Railway will auto-detect Python — set the **root directory** to `backend`
5. Set the **start command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables:
   - `SECRET_KEY` — generate a strong random string (e.g. `openssl rand -hex 32`)
   - `DATABASE_URL` — `sqlite:////data/rnli_predictor.db`
   - `ALLOWED_ORIGINS` — add your Vercel URL after step 9 below
7. Add a **Volume** (persistent disk) mounted at `/data`
8. Deploy — Railway gives you a URL like `https://rnli-predictor-backend.railway.app`
9. Run the seed script once via Railway's terminal: `python seed_data.py`

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **New Project → Import** the `rnli-premierleague-predictor` repo
3. Set **Root Directory** to `frontend`
4. Framework preset: **Vite** (auto-detected)
5. Add environment variable:
   - `VITE_API_URL` — your Railway backend URL (e.g. `https://rnli-predictor-backend.railway.app`)
6. Deploy — Vercel gives you a URL like `https://rnli-predictor.vercel.app`
7. Go back to Railway and update `ALLOWED_ORIGINS` to include the Vercel URL

---

## Deployment Config Files to Add

### `backend/Procfile`
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### `backend/railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### `frontend/vercel.json`
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
This ensures React Router routes (e.g. `/leaderboard`) work on direct load/refresh.

---

## Post-Deploy Checklist

- [ ] Backend health check: visit `https://your-backend.railway.app/` — should return `{"message": "RNLI Premier League Predictor API is running"}`
- [ ] API docs: visit `https://your-backend.railway.app/docs`
- [ ] Frontend loads at Vercel URL
- [ ] Register a test account, log in, make a prediction
- [ ] Log in as admin (`admin@rnli.org` / `changeme123`) — **change this password immediately**
- [ ] Load fixtures via Admin Panel → Fixtures tab
- [ ] Update season label via Admin Panel → Overview

---

## Custom Domain (Optional)

Both Vercel and Railway support custom domains at no extra cost:
- In Vercel: Project Settings → Domains → add your domain
- In Railway: Service Settings → Networking → add custom domain
- Update your DNS `CNAME` records to point to each service

---

## Future Consideration: Migrating to PostgreSQL

SQLite is fine for a small team. If you ever need more reliability or scale:

1. Provision a PostgreSQL database on Railway (free tier available)
2. Install `psycopg2-binary` and remove `check_same_thread` from database config
3. Update `DATABASE_URL` to the Postgres connection string Railway provides
4. SQLAlchemy handles the rest — no model changes needed

---

*Last updated: February 2026*
