"""
Authentication routes for RNLI Premier League Predictor.
Handles user registration, login, and profile retrieval.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr, validator
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
from models import User
from auth import hash_password, authenticate_user, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============================================================================
# Pydantic Models
# ============================================================================

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

    @validator('username')
    def username_length(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        if len(v) > 50:
            raise ValueError('Username must be at most 50 characters long')
        return v

    @validator('password')
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
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
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user account.

    - **username**: Unique username (3-50 characters)
    - **email**: Valid email address (must be unique)
    - **password**: Password (minimum 6 characters)

    Returns the created user details (without password).
    """
    try:
        # Check if username already exists
        existing_username = db.query(User).filter(User.username == request.username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )

        # Check if email already exists
        existing_email = db.query(User).filter(User.email == request.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create new user
        new_user = User(
            username=request.username,
            email=request.email,
            password_hash=hash_password(request.password),
            role="user"
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        print(f"✅ New user registered: {new_user.email}")

        return UserResponse(
            id=new_user.id,
            username=new_user.username,
            email=new_user.email,
            role=new_user.role
        )

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
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login with email and password to receive a JWT access token.

    - **email**: User's email address
    - **password**: User's password

    Returns a JWT token and user details on successful authentication.
    """
    # Authenticate user
    user = authenticate_user(db, request.email, request.password)

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
