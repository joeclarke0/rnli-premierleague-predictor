import os
from supabase import create_client, Client
from dotenv import load_dotenv
import uuid

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def insert_prediction(data: dict):
    response = supabase.table("predictions").insert(data).execute()
    return response.data


def fetch_predictions(filters: dict):
    query = supabase.table("predictions").select("*")

    for key, value in filters.items():
        query = query.eq(key, value)

    response = query.execute()
    return response.data


def fetch_fixtures(filters: dict):
    query = supabase.table("fixtures").select("*")

    for key, value in filters.items():
        query = query.eq(key, value)

    response = query.execute()
    return response.data
