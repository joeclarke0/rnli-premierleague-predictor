from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from supabase_client import authenticate_user, validate_session, create_user, get_user_by_email
from datetime import datetime, timedelta
import jwt

router = APIRouter(prefix="/auth", tags=["Authentication"])

# JWT Secret (in production, use environment variable)
JWT_SECRET = "your-secret-key-change-in-production"
JWT_ALGORITHM = "HS256"

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    username: str

class SessionResponse(BaseModel):
    token: str
    expires_at: str
    user: dict

def create_jwt_token(user_id: str, email: str, username: str, role: str = "user"):
    """Create JWT token with 24-hour expiration"""
    expiration = datetime.utcnow() + timedelta(hours=24)
    payload = {
        "user_id": user_id,
        "email": email,
        "username": username,
        "role": role,
        "exp": expiration
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, expiration.isoformat()

def verify_jwt_token(token: str):
    """Verify JWT token and return user info"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/login")
async def login(request: LoginRequest):
    """Login with email and password"""
    try:
        # Authenticate with Supabase
        auth_response = authenticate_user(request.email, request.password)
        
        if not auth_response:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Get user details
        user_info = get_user_by_email(request.email)
        if not user_info:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Create JWT token with role
        token, expires_at = create_jwt_token(
            user_info["id"], 
            user_info["email"], 
            user_info["username"],
            user_info.get("role", "user")
        )
        
        return SessionResponse(
            token=token,
            expires_at=expires_at,
            user={
                "id": user_info["id"],
                "email": user_info["email"],
                "username": user_info["username"],
                "role": user_info.get("role", "user")
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Login error: {error_msg}")
        
        # Handle specific error messages
        if "Email not confirmed" in error_msg or "check your email" in error_msg:
            raise HTTPException(status_code=401, detail="Please check your email and confirm your account before logging in.")
        elif "Invalid email or password" in error_msg:
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        else:
            raise HTTPException(status_code=500, detail="Login failed. Please try again.")

@router.post("/register")
async def register(request: RegisterRequest):
    """Register new user"""
    try:
        # Check if user already exists
        existing_user = get_user_by_email(request.email)
        if existing_user:
            raise HTTPException(status_code=409, detail="User already exists")
        
        # Create new user
        user_info = create_user(request.email, request.password, request.username)
        
        if not user_info:
            raise HTTPException(status_code=500, detail="Failed to create user")
        
        # Create JWT token with role
        token, expires_at = create_jwt_token(
            user_info["id"], 
            user_info["email"], 
            user_info["username"],
            user_info.get("role", "user")
        )
        
        return SessionResponse(
            token=token,
            expires_at=expires_at,
            user={
                "id": user_info["id"],
                "email": user_info["email"],
                "username": user_info["username"],
                "role": user_info.get("role", "user")
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@router.get("/validate")
async def validate_session_token(token: str = None):
    """Validate session token"""
    if not token:
        raise HTTPException(status_code=400, detail="Token is required")
        
    try:
        payload = verify_jwt_token(token)
        user_info = get_user_by_email(payload["email"])
        
        if not user_info:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "valid": True,
            "user": {
                "id": user_info["id"],
                "email": user_info["email"],
                "username": user_info["username"],
                "role": user_info.get("role", "user")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Session validation error: {e}")
        raise HTTPException(status_code=401, detail="Invalid session")

@router.post("/logout")
async def logout():
    """Logout user (client should clear token)"""
    return {"message": "Logged out successfully"} 