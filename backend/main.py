import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from database import create_tables
from migrate import run_migrations
from limiter import limiter
from routes import fixtures, predictions, results, leaderboard, auth, users, admin, settings


def get_allowed_origins() -> list[str]:
    """
    Read allowed CORS origins from the ALLOWED_ORIGINS env var.

    The variable is a comma-separated list of origins (e.g. set on Render to the
    deployed frontend URL). If unset, fall back to the local Vite dev server so
    local development works without any configuration.
    """
    raw = os.getenv("ALLOWED_ORIGINS", "")
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    return origins or ["http://localhost:5173"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup: Create database tables
    print("🚀 Starting RNLI Premier League Predictor API...")
    create_tables()
    print("✅ Database tables initialized")
    # Run lightweight, idempotent column migrations for existing databases
    run_migrations()
    print("✅ Migrations applied")
    yield
    # Shutdown logic (if needed)
    print("👋 Shutting down API...")


app = FastAPI(
    title="RNLI Premier League Predictor",
    description="API for Premier League prediction competition",
    version="2.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Trust X-Forwarded-* headers from Render's edge proxy so request.client.host
# reflects the real client IP (otherwise every request shares the proxy's IP
# and all users fall into a single rate-limit bucket). trusted_hosts="*" is
# acceptable because the app is only reachable through Render's proxy — it is
# not directly exposed to the internet.
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# CORS middleware configuration.
# Origins come from the ALLOWED_ORIGINS env var in production (comma-separated),
# falling back to the local Vite dev server for development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth.router)
app.include_router(auth.register_router)
app.include_router(fixtures.router)
app.include_router(predictions.router)
app.include_router(results.router)
app.include_router(leaderboard.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(settings.router)


@app.get("/")
def root():
    """Root endpoint - API health check."""
    return {
        "message": "RNLI Premier League Predictor API is running",
        "version": "2.0.0",
        "docs": "/docs"
    }
