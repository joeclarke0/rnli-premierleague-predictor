from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="RNLI Premier League Predictor - Test")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "API is running", "status": "test_mode"}

@app.get("/test")
def test_endpoint():
    return {"message": "Test endpoint working"}

@app.get("/fixtures")
def get_test_fixtures():
    # Mock fixtures data for testing
    return {
        "fixtures": [
            {
                "id": 1,
                "gameweek": 1,
                "home_team": "Manchester Utd",
                "away_team": "Fulham",
                "date": "2024-08-16",
                "time": "20:00"
            },
            {
                "id": 2,
                "gameweek": 1,
                "home_team": "Arsenal",
                "away_team": "Wolves",
                "date": "2024-08-17",
                "time": "15:00"
            }
        ]
    }

@app.get("/leaderboard")
def get_test_leaderboard():
    # Mock leaderboard data for testing
    return {
        "leaderboard": [
            {
                "rank": 1,
                "player": "Joe",
                "week_1": 5,
                "week_2": 3,
                "total": 8
            },
            {
                "rank": 2,
                "player": "Sarah",
                "week_1": 2,
                "week_2": 5,
                "total": 7
            }
        ]
    } 