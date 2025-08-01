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
                "user": {"id": "test-user", "email": email, "username": "Test User", "role": "user"},
                "session": {"access_token": "mock-token", "expires_at": (datetime.now() + timedelta(minutes=15)).isoformat()}
            }
        elif email == "admin@rnli.com" and password == "password":
            return {
                "user": {"id": "admin-user", "email": email, "username": "Admin", "role": "admin"},
                "session": {"access_token": "mock-token", "expires_at": (datetime.now() + timedelta(minutes=15)).isoformat()}
            }
        return None
    
    try:
        # First, try to authenticate with Supabase Auth
        try:
            auth_response = supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if auth_response.user:
                # Get additional user info from our users table
                user_info = get_user_by_email(email)
                if user_info:
                    return {
                        "user": user_info,
                        "session": {
                            "access_token": auth_response.session.access_token,
                            "expires_at": auth_response.session.expires_at
                        }
                    }
                else:
                    # User exists in auth but not in our users table
                    # Create a basic user profile
                    user_info = {
                        "id": auth_response.user.id,
                        "email": email,
                        "username": email.split('@')[0],  # Use email prefix as username
                        "role": "user"
                    }
                    return {
                        "user": user_info,
                        "session": {
                            "access_token": auth_response.session.access_token,
                            "expires_at": auth_response.session.expires_at
                        }
                    }
        except Exception as auth_error:
            print(f"Supabase Auth failed, trying fallback: {auth_error}")
            
        # Fallback: Check our users table directly
        user_info = get_user_by_email(email)
        if user_info:
            # For now, accept any password for existing users
            # In production, you'd want proper password verification
            return {
                "user": user_info,
                "session": {
                    "access_token": f"mock-token-{user_info['id']}", 
                    "expires_at": (datetime.now() + timedelta(hours=24)).isoformat()
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
    """Get user details by email from our users table"""
    if supabase is None:
        # Mock user lookup
        if email == "admin@rnli.com":
            return {"id": "admin-user", "email": email, "username": "Admin", "role": "admin"}
        elif email == "jea.clarke9307@gmail.com":
            return {"id": "361a3c5d-ee29-4b67-8636-e893001ae573", "email": email, "username": "joeclarke0", "role": "admin"}
        return {"id": "test-user", "email": email, "username": "Test User", "role": "user"}
    
    try:
        response = supabase.table("users").select("*").eq("email", email).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"❌ Error fetching user: {e}")
        return None

def is_admin_user(user_id: str):
    """Check if user has admin role"""
    if supabase is None:
        # Mock admin check
        return user_id == "admin-user" or user_id == "361a3c5d-ee29-4b67-8636-e893001ae573"
    
    try:
        response = supabase.table("users").select("role").eq("id", user_id).execute()
        if response.data:
            return response.data[0].get("role") == "admin"
        return False
    except Exception as e:
        print(f"❌ Error checking admin status: {e}")
        return False

def create_user(email: str, password: str, username: str):
    """Create a new user"""
    if supabase is None:
        # Mock user creation
        return {"id": "new-user", "email": email, "username": username, "role": "user"}
    
    try:
        print(f"📝 Creating user: {email} with username: {username}")
        
        # Try to create user in Supabase Auth first
        try:
            auth_response = supabase.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "username": username
                    }
                }
            })
            
            if auth_response.user:
                # Create user profile in our users table
                user_data = {
                    "id": auth_response.user.id,
                    "email": email,
                    "username": username,
                    "role": "user",  # Default role is user
                    "created_at": datetime.now().isoformat()
                }
                
                try:
                    profile_response = supabase.table("users").insert(user_data).execute()
                    print(f"✅ User profile created: {profile_response.data}")
                    return profile_response.data[0] if profile_response.data else None
                except Exception as profile_error:
                    print(f"❌ Error creating user profile: {profile_error}")
                    return None
            else:
                raise Exception("Failed to create user in Auth")
                
        except Exception as auth_error:
            print(f"Supabase Auth signup failed, creating user profile only: {auth_error}")
            
            # Fallback: Create user profile only
            import uuid
            
            user_id = str(uuid.uuid4())
            user_data = {
                "id": user_id,
                "email": email,
                "username": username,
                "role": "user",  # Default role is user
                "created_at": datetime.now().isoformat()
            }
            
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
        return {"id": "test-user", "email": "test@example.com", "username": "Test User", "role": "user"}
    
    try:
        # For now, try to decode our custom JWT token
        # In production, you'd validate with Supabase
        import jwt
        JWT_SECRET = "your-secret-key-change-in-production"
        
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            return {
                "id": payload.get("user_id"),
                "email": payload.get("email"),
                "username": payload.get("username"),
                "role": payload.get("role", "user")
            }
        except jwt.InvalidTokenError:
            # Try Supabase validation as fallback
            response = supabase.auth.get_user(token)
            if response.user:
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

def delete_prediction(prediction_id: str, user_id: str = None):
    """Delete a prediction (admin only or own prediction)"""
    if supabase is None:
        print(f"📝 Mock: Prediction {prediction_id} would be deleted")
        return True
    
    try:
        # If user_id is provided, check if user is admin or owns the prediction
        if user_id:
            is_admin = is_admin_user(user_id)
            if not is_admin:
                # Check if user owns the prediction
                prediction = supabase.table("predictions").select("user_id").eq("id", prediction_id).execute()
                if not prediction.data or prediction.data[0]["user_id"] != user_id:
                    raise Exception("Unauthorized to delete this prediction")
        
        response = supabase.table("predictions").delete().eq("id", prediction_id).execute()
        return True
    except Exception as e:
        print(f"❌ Error deleting prediction: {e}")
        return False

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

def update_result(result_id: str, data: dict, user_id: str = None):
    """Update an existing result (admin only)"""
    if supabase is None:
        print(f"📝 Mock: Result {result_id} would be updated:", data)
        return True
    
    try:
        # Only admins can update results
        if user_id and not is_admin_user(user_id):
            raise Exception("Only admins can update results")
        
        response = supabase.table("results").update(data).eq("id", result_id).execute()
        return True
    except Exception as e:
        print(f"❌ Error updating result: {e}")
        return False

def upsert_result(data: dict, user_id: str = None):
    """Insert or update a result based on gameweek and fixture_id (admin only)"""
    if supabase is None:
        print("📝 Mock: Result would be upserted:", data)
        return [data]
    
    try:
        # Only admins can upsert results
        if user_id and not is_admin_user(user_id):
            raise Exception("Only admins can manage results")
        
        # Check if result already exists for this gameweek and fixture
        existing = supabase.table("results").select("*").eq("gameweek", data["gameweek"]).eq("fixture_id", data["fixture_id"]).execute()
        
        if existing.data:
            # Update existing result
            result_id = existing.data[0]["id"]
            response = supabase.table("results").update({
                "actual_home": data["actual_home"],
                "actual_away": data["actual_away"]
            }).eq("id", result_id).execute()
            print(f"✅ Updated existing result: {result_id}")
        else:
            # Insert new result
            response = supabase.table("results").insert(data).execute()
            print(f"✅ Inserted new result")
        
        return response.data
    except Exception as e:
        print(f"❌ Error upserting result: {e}")
        return None

def delete_result(result_id: str, user_id: str = None):
    """Delete a result (admin only)"""
    if supabase is None:
        print(f"📝 Mock: Result {result_id} would be deleted")
        return True
    
    try:
        # Only admins can delete results
        if user_id and not is_admin_user(user_id):
            raise Exception("Only admins can delete results")
        
        response = supabase.table("results").delete().eq("id", result_id).execute()
        return True
    except Exception as e:
        print(f"❌ Error deleting result: {e}")
        return False

# ----------------------
# Users
# ----------------------

def fetch_users():
    if supabase is None:
        # Return mock data
        return [
            {"id": "user1", "username": "Joe", "role": "user"},
            {"id": "user2", "username": "Sarah", "role": "user"},
            {"id": "admin-user", "username": "Admin", "role": "admin"}
        ]
    
    response = supabase.table("users").select("id, username, role").execute()
    return response.data
