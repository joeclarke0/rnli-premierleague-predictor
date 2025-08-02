from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from supabase_client import supabase
from routes.auth import verify_jwt_token

router = APIRouter(prefix="/admin", tags=["admin"])

def get_current_user(token: str = Query(None)):
    """Get current user from token"""
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
    
    try:
        payload = verify_jwt_token(token)
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_admin(current_user: dict = Depends(get_current_user)):
    """Require admin role"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.get("/users")
async def get_users(current_user: dict = Depends(require_admin)):
    """
    Get all users (admin only)
    """
    try:
        # Get all users from the users table
        response = supabase.table('users').select('*').execute()
        
        if response.data is None:
            return {"users": []}
        
        # Filter out sensitive information and format response
        users = []
        for user in response.data:
            users.append({
                "id": user.get('id'),
                "username": user.get('username'),
                "email": user.get('email'),
                "role": user.get('role', 'user'),
                "created_at": user.get('created_at')
            })
        
        return {"users": users}
        
    except Exception as e:
        print(f"Error getting users: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving users") 