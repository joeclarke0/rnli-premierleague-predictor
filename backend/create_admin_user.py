#!/usr/bin/env python3
"""
Script to create an admin user in the Supabase database for the RNLI Premier League Predictor.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client
import uuid
from datetime import datetime

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Supabase credentials not found. Please check your .env file.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def create_admin_user():
    """Create an admin user in the database"""
    try:
        # Admin user details
        admin_data = {
            "id": str(uuid.uuid4()),
            "email": "admin@rnli.com",
            "username": "admin",
            "role": "admin",
            "created_at": datetime.now().isoformat()
        }
        
        print(f"📝 Creating admin user: {admin_data['email']}")
        
        # Check if admin already exists
        existing_admin = supabase.table("users").select("*").eq("email", admin_data["email"]).execute()
        
        if existing_admin.data:
            print("✅ Admin user already exists")
            # Update role to admin if needed
            if existing_admin.data[0].get("role") != "admin":
                supabase.table("users").update({"role": "admin"}).eq("email", admin_data["email"]).execute()
                print("✅ Updated existing user to admin role")
            return existing_admin.data[0]
        else:
            # Create new admin user
            response = supabase.table("users").insert(admin_data).execute()
            print("✅ Admin user created successfully")
            return response.data[0] if response.data else None
            
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        return None

def test_admin_login():
    """Test admin login functionality"""
    try:
        print("\n🧪 Testing admin login...")
        
        # Test with mock authentication (since we're not using Supabase Auth)
        from supabase_client import authenticate_user
        
        # Test admin login
        auth_response = authenticate_user("admin@rnli.com", "password")
        if auth_response:
            print("✅ Admin login test successful")
            print(f"   User: {auth_response['user']['username']}")
            print(f"   Role: {auth_response['user']['role']}")
        else:
            print("❌ Admin login test failed")
            
    except Exception as e:
        print(f"❌ Error testing admin login: {e}")

def main():
    print("🚀 Creating admin user for RNLI Premier League Predictor")
    print("=" * 60)
    
    # Create admin user
    admin_user = create_admin_user()
    
    if admin_user:
        print(f"\n✅ Admin user details:")
        print(f"   ID: {admin_user['id']}")
        print(f"   Email: {admin_user['email']}")
        print(f"   Username: {admin_user['username']}")
        print(f"   Role: {admin_user['role']}")
        
        # Test admin login
        test_admin_login()
        
        print(f"\n📝 Admin login credentials:")
        print(f"   Email: admin@rnli.com")
        print(f"   Password: password")
        print(f"   Role: admin")
        
    else:
        print("❌ Failed to create admin user")
    
    print("\n✅ Admin setup complete!")

if __name__ == "__main__":
    main() 