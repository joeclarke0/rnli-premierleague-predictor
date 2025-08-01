#!/usr/bin/env python3
"""
Script to set up admin users in Supabase Auth with proper password storage.
This creates users in Supabase Auth and then updates their roles in our users table.
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

def create_admin_user_in_auth(email: str, password: str, username: str):
    """Create an admin user in Supabase Auth"""
    try:
        print(f"📝 Creating admin user in Supabase Auth: {email}")
        
        # Create user in Supabase Auth
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
            print(f"✅ Admin user created in Auth: {auth_response.user.id}")
            
            # Create user profile in our users table
            user_data = {
                "id": auth_response.user.id,
                "email": email,
                "username": username,
                "role": "admin",
                "created_at": auth_response.user.created_at.isoformat() if hasattr(auth_response.user.created_at, 'isoformat') else str(auth_response.user.created_at)
            }
            
            try:
                profile_response = supabase.table("users").insert(user_data).execute()
                print(f"✅ Admin user profile created: {profile_response.data}")
                return profile_response.data[0] if profile_response.data else None
            except Exception as profile_error:
                print(f"❌ Error creating admin profile: {profile_error}")
                return None
        else:
            print("❌ Failed to create admin user in Auth")
            return None
            
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        return None

def update_existing_user_to_admin(email: str, password: str):
    """Update an existing user to admin role"""
    try:
        print(f"📝 Updating existing user to admin: {email}")
        
        # First, try to sign in to verify the user exists
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if auth_response.user:
            print(f"✅ User authenticated: {auth_response.user.id}")
            
            # Update the user's role in our users table
            response = supabase.table("users").update({"role": "admin"}).eq("email", email).execute()
            
            if response.data:
                print(f"✅ User {email} updated to admin role successfully")
                return response.data[0]
            else:
                print(f"❌ User {email} not found in users table")
                return None
        else:
            print(f"❌ User {email} not found in Auth")
            return None
            
    except Exception as e:
        print(f"❌ Error updating user: {e}")
        return None

def test_admin_login(email: str, password: str):
    """Test admin login functionality"""
    try:
        print(f"\n🧪 Testing admin login for: {email}")
        
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if auth_response.user:
            print("✅ Admin login test successful")
            print(f"   User ID: {auth_response.user.id}")
            print(f"   Email: {auth_response.user.email}")
            
            # Get role from our users table
            user_info = supabase.table("users").select("role").eq("email", email).execute()
            if user_info.data:
                print(f"   Role: {user_info.data[0]['role']}")
            else:
                print("   Role: Not found in users table")
        else:
            print("❌ Admin login test failed")
            
    except Exception as e:
        print(f"❌ Error testing admin login: {e}")

def main():
    print("🚀 Setting up Supabase Auth for RNLI Premier League Predictor")
    print("=" * 70)
    
    # Create admin user
    admin_user = create_admin_user_in_auth("admin@rnli.com", "password", "admin")
    
    if admin_user:
        print(f"\n✅ Admin user details:")
        print(f"   ID: {admin_user['id']}")
        print(f"   Email: {admin_user['email']}")
        print(f"   Username: {admin_user['username']}")
        print(f"   Role: {admin_user['role']}")
        
        # Test admin login
        test_admin_login("admin@rnli.com", "password")
        
        print(f"\n📝 Admin login credentials:")
        print(f"   Email: admin@rnli.com")
        print(f"   Password: password")
        print(f"   Role: admin")
        
    else:
        print("❌ Failed to create admin user")
    
    # Try to update existing user joeclarke0
    print(f"\n" + "=" * 70)
    print("🔄 Updating existing user joeclarke0 to admin...")
    
    existing_admin = update_existing_user_to_admin("jea.clarke9307@gmail.com", "password")
    
    if existing_admin:
        print(f"\n✅ Existing user details:")
        print(f"   ID: {existing_admin['id']}")
        print(f"   Email: {existing_admin['email']}")
        print(f"   Username: {existing_admin['username']}")
        print(f"   Role: {existing_admin['role']}")
        
        # Test existing user login
        test_admin_login("jea.clarke9307@gmail.com", "password")
        
        print(f"\n📝 Existing user login credentials:")
        print(f"   Email: jea.clarke9307@gmail.com")
        print(f"   Password: password")
        print(f"   Role: admin")
        
    else:
        print("❌ Failed to update existing user")
    
    print("\n✅ Supabase Auth setup complete!")
    print("\n💡 Note: Users created in Supabase Auth will need to confirm their email")
    print("   You may need to disable email confirmation in your Supabase dashboard")
    print("   or check your email for confirmation links.")

if __name__ == "__main__":
    main() 