"""
Authentication routes for RNLI Premier League Predictor.
Handles user registration, login, and profile retrieval.
"""
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Request, status, Query
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
from limiter import limiter
from models import User, Invite
from auth import hash_password, authenticate_user, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

# A separate router (no /auth prefix) for the public invite-validation endpoint,
# which lives under /register to mirror the frontend route.
register_router = APIRouter(prefix="/register", tags=["Authentication"])


def _invite_only_enabled() -> bool:
    """INVITE_ONLY defaults to false; accept common truthy spellings."""
    return os.getenv("INVITE_ONLY", "false").strip().lower() in ("1", "true", "yes", "on")


def _get_valid_invite(db: Session, token: Optional[str]) -> Optional[Invite]:
    """
    Return a usable invite for the given token, or None.

    Usable means: exists, not yet used, and not expired. Handles both naive
    (SQLite) and aware (Postgres) expiry timestamps.
    """
    if not token:
        return None
    invite = db.query(Invite).filter(Invite.token == token).first()
    if not invite or invite.used_at is not None:
        return None
    expires_at = invite.expires_at
    now = datetime.now(timezone.utc)
    if expires_at is not None and expires_at.tzinfo is None:
        now = now.replace(tzinfo=None)
    if expires_at is not None and now >= expires_at:
        return None
    return invite


# ============================================================================
# Pydantic Models
# ============================================================================

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    invite_token: Optional[str] = None

    @field_validator('username')
    @classmethod
    def username_length(cls, v: str) -> str:
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        if len(v) > 50:
            raise ValueError('Username must be at most 50 characters long')
        return v

    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# ============================================================================
# Routes
# ============================================================================

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user account.

    - **username**: Unique username (3-50 characters)
    - **email**: Valid email address (must be unique)
    - **password**: Password (minimum 8 characters)

    Returns the created user details (without password).
    """
    try:
        # Enforce invite-only registration when enabled. The token is validated
        # here and consumed only after the user is successfully created.
        invite = None
        if _invite_only_enabled():
            invite = _get_valid_invite(db, body.invite_token)
            if invite is None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="A valid invite is required to register",
                )

        # Check if username already exists
        existing_username = db.query(User).filter(User.username == body.username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )

        # Check if email already exists
        existing_email = db.query(User).filter(User.email == body.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create new user
        new_user = User(
            username=body.username,
            email=body.email,
            password_hash=hash_password(body.password),
            role="user"
        )

        db.add(new_user)
        db.flush()  # assign new_user.id without ending the transaction

        # Consume the invite (single-use) as part of the same transaction.
        if invite is not None:
            invite.used_by = new_user.id
            invite.used_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(new_user)

        print(f"✅ New user registered: {new_user.email}")

        return UserResponse(
            id=new_user.id,
            username=new_user.username,
            email=new_user.email,
            role=new_user.role
        )

    except HTTPException:
        # Intentional HTTP errors (e.g. invite required, duplicate user) must
        # propagate unchanged rather than being swallowed by the catch-all below.
        db.rollback()
        raise
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        print(f"❌ Error during registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account"
        )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    """
    Login with email and password to receive a JWT access token.

    - **email**: User's email address
    - **password**: User's password

    Returns a JWT token and user details on successful authentication.
    """
    # Authenticate user
    user = authenticate_user(db, body.email, body.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token = create_access_token(
        data={
            "sub": user.id,
            "email": user.email,
            "role": user.role
        }
    )

    print(f"✅ User logged in: {user.email}")

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role
        )
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user's profile.

    Requires valid JWT token in Authorization header.
    Returns the current user's details.
    """
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role
    )


def _validate_invite_impl(token: str, db: Session):
    """
    Public endpoint: check whether an invite token is valid and unused.

    Returns 200 with {"valid": true} when usable, 404 otherwise. Always 200/404
    regardless of whether INVITE_ONLY is enabled, so the frontend can show an
    "invited" banner in either mode.
    """
    invite = _get_valid_invite(db, token)
    if invite is None:
        raise HTTPException(status_code=404, detail="Invalid or expired invite")
    return {"valid": True}


@register_router.get("/validate-invite")
def validate_invite_register(token: str = Query(...), db: Session = Depends(get_db)):
    """Validate an invite token. Mirrors the frontend /register route."""
    return _validate_invite_impl(token, db)


@router.get("/validate-invite")
def validate_invite_auth(token: str = Query(...), db: Session = Depends(get_db)):
    """Validate an invite token (canonical /auth-prefixed path per the API spec)."""
    return _validate_invite_impl(token, db)
