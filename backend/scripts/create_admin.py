#!/usr/bin/env python3
"""
First-admin bootstrap script for the RNLI Premier League Predictor.

Uses the same SQLAlchemy models, database engine and password hashing as the
running API, so the admin it creates can log in immediately through the normal
auth flow. Reads the database connection from the ``DATABASE_URL`` env var
(falling back to the local SQLite database, exactly like database.py).

Usage
-----
Create a brand-new admin user:

    python scripts/create_admin.py --email admin@example.com --password "s3cret!" [--username admin]

Promote an existing user to admin (by email):

    python scripts/create_admin.py --promote --email existing@example.com

Run this from the ``backend`` directory so the local imports resolve.
"""
import argparse
import os
import sys

# Ensure the backend package root is importable when run as `python scripts/create_admin.py`
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import SessionLocal, create_tables  # noqa: E402
from models import User  # noqa: E402
from auth import hash_password  # noqa: E402

MIN_PASSWORD_LENGTH = 8


def create_admin(email: str, password: str, username: str) -> int:
    """Create a new admin user. Returns a process exit code."""
    if not password or len(password) < MIN_PASSWORD_LENGTH:
        print(f"❌ Password must be at least {MIN_PASSWORD_LENGTH} characters.")
        return 1

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            print(f"❌ A user with email '{email}' already exists. "
                  f"Use --promote to make them an admin instead.")
            return 1
        if db.query(User).filter(User.username == username).first():
            print(f"❌ A user with username '{username}' already exists. "
                  f"Choose a different --username.")
            return 1

        user = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            role="admin",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print("✅ Admin user created successfully.")
        print(f"   id:       {user.id}")
        print(f"   username: {user.username}")
        print(f"   email:    {user.email}")
        print(f"   role:     {user.role}")
        return 0
    except Exception as exc:  # pragma: no cover - defensive
        db.rollback()
        print(f"❌ Failed to create admin: {exc}")
        return 1
    finally:
        db.close()


def promote_user(email: str) -> int:
    """Promote an existing user (by email) to admin. Returns a process exit code."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ No user found with email '{email}'.")
            return 1
        if user.role == "admin":
            print(f"ℹ️  User '{email}' is already an admin. Nothing to do.")
            return 0
        user.role = "admin"
        db.commit()
        print(f"✅ User '{email}' promoted to admin.")
        return 0
    except Exception as exc:  # pragma: no cover - defensive
        db.rollback()
        print(f"❌ Failed to promote user: {exc}")
        return 1
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create or promote an admin user for the RNLI Predictor."
    )
    parser.add_argument("--email", required=True, help="Email address of the admin user.")
    parser.add_argument("--password", help="Password for a new admin (min 8 chars).")
    parser.add_argument(
        "--username",
        default=None,
        help="Username for a new admin (defaults to the local-part of the email).",
    )
    parser.add_argument(
        "--promote",
        action="store_true",
        help="Promote an existing user (matched by --email) to admin instead of creating one.",
    )
    args = parser.parse_args()

    db_url = os.getenv("DATABASE_URL", "sqlite:///./rnli_predictor.db")
    print(f"🗄️  Using database: {db_url}")

    # Ensure tables exist so the script works against a brand-new database too.
    # This is idempotent and safe to run against an already-initialised DB.
    create_tables()

    if args.promote:
        return promote_user(args.email)

    if not args.password:
        parser.error("--password is required when creating a new admin "
                     "(omit it only with --promote).")

    username = args.username or args.email.split("@", 1)[0]
    return create_admin(args.email, args.password, username)


if __name__ == "__main__":
    raise SystemExit(main())
