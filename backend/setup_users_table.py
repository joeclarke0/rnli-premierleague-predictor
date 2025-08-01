#!/usr/bin/env python3
"""
Script to set up the users table in Supabase for the RNLI Premier League Predictor.
This table will store user profiles and track user activity.
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

# Use service role key for table creation
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if SERVICE_ROLE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
else:
    print("⚠️  Service role key not found, using anon key (may have limited permissions)")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def create_users_table():
    """Create the users table if it doesn't exist"""
    try:
        # Check if table exists by trying to select from it
        response = supabase.table("users").select("id").limit(1).execute()
        print("✅ Users table already exists")
        return True
    except Exception as e:
        print(f"❌ Users table doesn't exist or error: {e}")
        print("📝 You'll need to create the table manually in Supabase Dashboard")
        print("\n📋 SQL to create the users table:")
        print("""
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, username, role)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'username', 'User'), 'user');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
        """)
        return False

def add_role_column():
    """Add role column to existing users table"""
    try:
        print("📝 Adding role column to users table...")
        print("\n📋 SQL to add role column:")
        print("""
-- Add role column to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Update existing users to have 'user' role
UPDATE users SET role = 'user' WHERE role IS NULL;
        """)
        return True
    except Exception as e:
        print(f"❌ Error adding role column: {e}")
        return False

def create_admin_user():
    """Create an admin user for testing"""
    try:
        print("📝 Creating admin user...")
        print("\n📋 SQL to create admin user:")
        print("""
-- Insert admin user (replace with actual admin details)
INSERT INTO users (id, email, username, role) 
VALUES (
    gen_random_uuid(), 
    'admin@rnli.com', 
    'admin', 
    'admin'
) ON CONFLICT (email) DO UPDATE SET role = 'admin';
        """)
        return True
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        return False

def test_user_creation():
    """Test creating a user to verify the setup works"""
    try:
        # Test with a dummy user (this will fail but we can see the error)
        test_data = {
            "id": "test-user-id",
            "email": "test@example.com",
            "username": "testuser",
            "role": "user",
            "created_at": "2024-01-01T00:00:00Z"
        }
        
        response = supabase.table("users").insert(test_data).execute()
        print("✅ User creation test successful")
        
        # Clean up test data
        supabase.table("users").delete().eq("id", "test-user-id").execute()
        print("✅ Test data cleaned up")
        
        return True
    except Exception as e:
        print(f"❌ User creation test failed: {e}")
        return False

def main():
    print("🚀 Setting up users table for RNLI Premier League Predictor")
    print("=" * 60)
    
    # Check if table exists
    table_exists = create_users_table()
    
    if table_exists:
        # Add role column
        add_role_column()
        
        # Create admin user
        create_admin_user()
        
        # Test user creation
        test_user_creation()
    
    print("\n📝 Next steps:")
    print("1. If the table doesn't exist, run the SQL above in Supabase Dashboard")
    print("2. Add the role column to existing users table")
    print("3. Create an admin user with role='admin'")
    print("4. Make sure email confirmation is disabled in Supabase Auth settings")
    print("5. Test registration in the app")
    print("\n✅ Setup complete!")

if __name__ == "__main__":
    main() 