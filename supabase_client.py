# supabase.py

from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Example helper to insert a prediction
def insert_prediction(prediction: dict):
    response = supabase.table("predictions").insert(prediction).execute()
    return response.data

# Example helper to fetch fixtures by gameweek
def get_fixtures_by_gameweek(gameweek: int):
    response = supabase.table("fixtures").select("*").eq("gameweek", gameweek).execute()
    return response.data
