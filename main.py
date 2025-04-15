from fastapi import FastAPI
from routes import fixtures, predictions, results

app = FastAPI(title="RNLI Premier League Predictor")

# Include routers
app.include_router(fixtures.router)
app.include_router(predictions.router)
app.include_router(results.router)

@app.get("/")
def root():
    return {"message": "API is running"}
