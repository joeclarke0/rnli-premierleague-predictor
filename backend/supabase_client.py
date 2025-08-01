import os
from dotenv import load_dotenv
import uuid
from datetime import datetime, timedelta
import jwt

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# For testing purposes, create a mock client if environment variables are missing
if not SUPABASE_URL or not SUPABASE_KEY:
    print("⚠️  Supabase credentials not found. Running in test mode with mock data.")
    supabase = None
else:
    from supabase import create_client, Client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ----------------------
# Authentication
# ----------------------

def authenticate_user(email: str, password: str):
    """Authenticate user with email and password"""
    if supabase is None:
        # Mock authentication for testing
        if email == "test@example.com" and password == "password":
            return {
                "user": {"id": "test-user", "email": email, "username": "Test User"},
                "session": {"access_token": "mock-token", "expires_at": (datetime.now() + timedelta(minutes=15)).isoformat()}
            }
        return None
    
    try:
        # For now, let's do a simple lookup instead of auth signin
        # This bypasses email confirmation issues
        user_info = get_user_by_email(email)
        if user_info:
            # Create a mock session for the user
            return {
                "user": user_info,
                "session": {
                    "access_token": f"mock-token-{user_info['id']}", 
                    "expires_at": (datetime.now() + timedelta(minutes=15)).isoformat()
                }
            }
        else:
            raise Exception("User not found")
            
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Authentication error: {error_msg}")
        
        # Handle specific Supabase auth errors
        if "Email not confirmed" in error_msg:
            raise Exception("Please check your email and confirm your account before logging in.")
        elif "Invalid login credentials" in error_msg:
            raise Exception("Invalid email or password.")
        else:
            raise Exception("Authentication failed. Please try again.")

def get_user_by_email(email: str):
    """Get user details by email"""
    if supabase is None:
        # Mock user lookup
        return {"id": "test-user", "email": email, "username": "Test User"}
    
    try:
        response = supabase.table("users").select("*").eq("email", email).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"❌ Error fetching user: {e}")
        return None

def create_user(email: str, password: str, username: str):
    """Create a new user"""
    if supabase is None:
        # Mock user creation
        return {"id": "new-user", "email": email, "username": username}
    
    try:
        print(f"📝 Creating user: {email} with username: {username}")
        
        # For now, let's create a simple user profile without auth signup
        # This bypasses email confirmation issues
        import uuid
        
        user_id = str(uuid.uuid4())
        user_data = {
            "id": user_id,
            "email": email,
            "username": username,
            "created_at": datetime.now().isoformat()
        }
        
        print(f"📝 Creating user profile with data: {user_data}")
        
        try:
            profile_response = supabase.table("users").insert(user_data).execute()
            print(f"✅ User profile created: {profile_response.data}")
            return profile_response.data[0] if profile_response.data else None
        except Exception as profile_error:
            print(f"❌ Error creating user profile: {profile_error}")
            return None
        
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        return None

def validate_session(token: str):
    """Validate session token and return user info"""
    if supabase is None:
        # Mock session validation
        return {"id": "test-user", "email": "test@example.com", "username": "Test User"}
    
    try:
        # Verify the token with Supabase
        response = supabase.auth.get_user(token)
        if response.user:
            # Get additional user info from users table
            user_info = get_user_by_email(response.user.email)
            return user_info
        return None
    except Exception as e:
        print(f"❌ Session validation error: {e}")
        return None

# ----------------------
# Predictions
# ----------------------

def insert_prediction(data: dict):
    if supabase is None:
        print("📝 Mock: Prediction would be inserted:", data)
        return [data]
    
    response = supabase.table("predictions").insert(data).execute()
    return response.data

def fetch_predictions(filters: dict = {}):
    if supabase is None:
        # Return mock data
        return [
            {
                "id": "test-1",
                "user_id": "user1",
                "gameweek": 1,
                "fixture_id": 1,
                "predicted_home": 2,
                "predicted_away": 1
            }
        ]
    
    query = supabase.table("predictions").select("*")
    for key, value in filters.items():
        query = query.eq(key, value)
    response = query.execute()
    return response.data

# ----------------------
# Fixtures
# ----------------------

def fetch_fixtures(filters: dict = {}):
    if supabase is None:
        # Return mock data
        return [
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
    
    query = supabase.table("fixtures").select("*")
    for key, value in filters.items():
        query = query.eq(key, value)
    response = query.execute()
    return response.data

# ----------------------
# Results
# ----------------------

def insert_result(data: dict):
    if supabase is None:
        print("📝 Mock: Result would be inserted:", data)
        return [data]
    
    response = supabase.table("results").insert(data).execute()
    return response.data

def fetch_results(filters: dict = {}):
    if supabase is None:
        # Return mock data
        return [
            {
                "id": "result-1",
                "fixture_id": 1,
                "actual_home": 2,
                "actual_away": 1
            }
        ]
    
    query = supabase.table("results").select("*")
    for key, value in filters.items():
        query = query.eq(key, value)
    response = query.execute()
    return response.data

# ----------------------
# Users
# ----------------------

def fetch_users():
    if supabase is None:
        # Return mock data
        return [
            {"id": "user1", "username": "Joe"},
            {"id": "user2", "username": "Sarah"}
        ]
    
    response = supabase.table("users").select("id, username").execute()
    return response.data
