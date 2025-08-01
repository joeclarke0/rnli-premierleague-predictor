#!/usr/bin/env python3
"""
Script to update an existing user to admin role in the Supabase database.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Supabase credentials not found. Please check your .env file.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def update_user_to_admin(email: str):
    """Update an existing user to admin role"""
    try:
        print(f"📝 Updating user {email} to admin role...")
        
        # Update the user's role to admin
        response = supabase.table("users").update({"role": "admin"}).eq("email", email).execute()
        
        if response.data:
            print(f"✅ User {email} updated to admin role successfully")
            return response.data[0]
        else:
            print(f"❌ User {email} not found")
            return None
            
    except Exception as e:
        print(f"❌ Error updating user: {e}")
        return None

def main():
    print("🚀 Updating user to admin role")
    print("=" * 40)
    
    # Update joeclarke0 to admin
    user = update_user_to_admin("jea.clarke9307@gmail.com")
    
    if user:
        print(f"\n✅ User details:")
        print(f"   ID: {user['id']}")
        print(f"   Email: {user['email']}")
        print(f"   Username: {user['username']}")
        print(f"   Role: {user['role']}")
        
        print(f"\n📝 Login credentials:")
        print(f"   Email: jea.clarke9307@gmail.com")
        print(f"   Password: password")
        print(f"   Role: admin")
        
    else:
        print("❌ Failed to update user")
    
    print("\n✅ User role update complete!")

if __name__ == "__main__":
    main() 