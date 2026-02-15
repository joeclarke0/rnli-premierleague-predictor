"""
Seed script to initialize the database with:
1. Fixtures from CSV file
2. Admin user account
3. Test user accounts for development
"""
import csv
import sys
import os
from datetime import datetime
from pathlib import Path

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, create_tables, engine
from models import User, Fixture, SiteSetting
import bcrypt


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def seed_fixtures(db):
    """Load fixtures from CSV file into database."""
    print("🏟️  Seeding fixtures from CSV...")

    # Path to fixtures.csv (one level up from backend/)
    csv_path = Path(__file__).parent.parent / "fixtures.csv"

    if not csv_path.exists():
        print(f"❌ Error: fixtures.csv not found at {csv_path}")
        return False

    # Check if fixtures already exist
    existing_count = db.query(Fixture).count()
    if existing_count > 0:
        print(f"⚠️  Fixtures already exist ({existing_count} rows). Skipping...")
        return True

    fixtures_added = 0

    with open(csv_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)

        for row in reader:
            try:
                # Parse date from CSV format (YYYY-MM-DD)
                fixture_date = datetime.strptime(row['date'], '%Y-%m-%d').date()

                fixture = Fixture(
                    gameweek=int(row['week']),
                    date=fixture_date,
                    day=row['day'],
                    time=row['time'],
                    home_team=row['home'],
                    away_team=row['away'],
                    venue=row['venue']
                )

                db.add(fixture)
                fixtures_added += 1

            except Exception as e:
                print(f"❌ Error processing row {row}: {e}")
                continue

        db.commit()

    print(f"✅ Successfully added {fixtures_added} fixtures to database")
    return True


def seed_admin_user(db):
    """Create default admin user account."""
    print("👤 Creating admin user...")

    # Check if admin already exists
    existing_admin = db.query(User).filter(User.email == "admin@rnli.org").first()
    if existing_admin:
        print("⚠️  Admin user already exists. Skipping...")
        return True

    admin = User(
        username="admin",
        email="admin@rnli.org",
        password_hash=hash_password("changeme123"),
        role="admin"
    )

    db.add(admin)
    db.commit()

    print(f"✅ Admin user created:")
    print(f"   Email: admin@rnli.org")
    print(f"   Password: changeme123")
    print(f"   ⚠️  IMPORTANT: Change this password after first login!")

    return True


def seed_test_users(db):
    """Create test users for development."""
    print("👥 Creating test users...")

    test_users = [
        {"username": "joe", "email": "joe@test.com", "password": "test123"},
        {"username": "sarah", "email": "sarah@test.com", "password": "test123"},
        {"username": "mike", "email": "mike@test.com", "password": "test123"},
    ]

    users_added = 0

    for user_data in test_users:
        # Check if user already exists
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if existing:
            continue

        user = User(
            username=user_data["username"],
            email=user_data["email"],
            password_hash=hash_password(user_data["password"]),
            role="user"
        )

        db.add(user)
        users_added += 1

    db.commit()

    if users_added > 0:
        print(f"✅ Created {users_added} test users (password: test123)")
        for user_data in test_users:
            print(f"   - {user_data['email']}")
    else:
        print("⚠️  Test users already exist. Skipping...")

    return True


def seed_settings(db):
    """Seed default site settings."""
    print("⚙️  Seeding site settings...")
    defaults = {"season_name": "2024/25"}
    added = 0
    for key, value in defaults.items():
        existing = db.query(SiteSetting).filter(SiteSetting.key == key).first()
        if not existing:
            db.add(SiteSetting(key=key, value=value))
            added += 1
    db.commit()
    if added:
        print(f"✅ Added {added} default setting(s)")
    else:
        print("⚠️  Settings already exist. Skipping...")
    return True


def main():
    """Main seeding function."""
    print("\n" + "="*60)
    print("🌱 RNLI Premier League Predictor - Database Seeding")
    print("="*60 + "\n")

    # Create tables
    print("📊 Creating database tables...")
    try:
        create_tables()
        print("✅ Database tables created successfully\n")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return

    # Create database session
    db = SessionLocal()

    try:
        # Seed data
        success = True
        success = seed_fixtures(db) and success
        success = seed_admin_user(db) and success
        success = seed_test_users(db) and success
        success = seed_settings(db) and success

        if success:
            print("\n" + "="*60)
            print("✅ Database seeding completed successfully!")
            print("="*60)
            print("\n🚀 You can now run the backend with:")
            print("   uvicorn main:app --reload")
            print("\n🔐 Login credentials:")
            print("   Admin: admin@rnli.org / changeme123")
            print("   Test users: joe@test.com, sarah@test.com, mike@test.com / test123")
            print()
        else:
            print("\n⚠️  Some seeding operations failed. Check errors above.")

    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        db.rollback()

    finally:
        db.close()


if __name__ == "__main__":
    main()
