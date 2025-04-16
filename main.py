from fastapi import FastAPI
from routes import fixtures, predictions, results, leaderboard  # ✅ Added leaderboard route

app = FastAPI(title="RNLI Premier League Predictor")

# ✅ Include all routers
app.include_router(fixtures.router)
app.include_router(predictions.router)
app.include_router(results.router)
app.include_router(leaderboard.router)  # ✅ Register leaderboard

@app.get("/")
def root():
    return {"message": "API is running"}
