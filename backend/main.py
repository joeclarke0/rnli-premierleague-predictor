from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import create_tables
from routes import fixtures, predictions, results, leaderboard, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup: Create database tables
    print("🚀 Starting RNLI Premier League Predictor API...")
    create_tables()
    print("✅ Database tables initialized")
    yield
    # Shutdown logic (if needed)
    print("👋 Shutting down API...")


app = FastAPI(
    title="RNLI Premier League Predictor",
    description="API for Premier League prediction competition",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative React dev server
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth.router)
app.include_router(fixtures.router)
app.include_router(predictions.router)
app.include_router(results.router)
app.include_router(leaderboard.router)


@app.get("/")
def root():
    """Root endpoint - API health check."""
    return {
        "message": "RNLI Premier League Predictor API is running",
        "version": "2.0.0",
        "docs": "/docs"
    }
