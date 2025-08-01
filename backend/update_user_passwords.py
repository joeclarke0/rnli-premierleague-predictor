#!/usr/bin/env python3
"""
Script to update existing users with hashed passwords.
This ensures all users have secure password storage.
"""

import os
from dotenv import load_dotenv
import bcrypt

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Supabase credentials not found. Please check your .env file.")
    exit(1)

from supabase import create_client, Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def update_user_password(email: str, password: str):
    """Update a user's password with a hash"""
    try:
        hashed_password = hash_password(password)
        
        response = supabase.table("users").update({
            "password": hashed_password
        }).eq("email", email).execute()
        
        if response.data:
            print(f"✅ Updated password for {email}")
            return True
        else:
            print(f"❌ User {email} not found")
            return False
            
    except Exception as e:
        print(f"❌ Error updating password for {email}: {e}")
        return False

def main():
    print("🔐 Updating user passwords with secure hashing")
    print("=" * 50)
    
    # Update known users with their passwords
    users_to_update = [
        {"email": "admin@rnli.com", "password": "password"},
        {"email": "jea.clarke9307@gmail.com", "password": "password"},
        {"email": "regularuser@rnli.com", "password": "password123"},
        {"email": "testuser@rnli.com", "password": "password123"}
    ]
    
    success_count = 0
    for user in users_to_update:
        if update_user_password(user["email"], user["password"]):
            success_count += 1
    
    print(f"\n✅ Successfully updated {success_count}/{len(users_to_update)} users")
    
    # List all users to check their status
    try:
        response = supabase.table("users").select("email, password").execute()
        print(f"\n📋 Current users in database:")
        for user in response.data:
            has_password = "✅ Has password" if user.get("password") else "❌ No password"
            print(f"   {user['email']}: {has_password}")
    except Exception as e:
        print(f"❌ Error fetching users: {e}")

if __name__ == "__main__":
    main() 