from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import fixtures, predictions, results, leaderboard, auth  # ✅ Added auth route

app = FastAPI(title="RNLI Premier League Predictor")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Include all routers
app.include_router(fixtures.router)
app.include_router(predictions.router)
app.include_router(results.router)
app.include_router(leaderboard.router)  # ✅ Register leaderboard
app.include_router(auth.router)  # ✅ Register auth

@app.get("/")
def root():
    return {"message": "API is running"}