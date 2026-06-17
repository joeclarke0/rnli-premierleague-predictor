from sqlalchemy import Column, String, Integer, DateTime, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, timedelta
import uuid
from database import Base


def generate_uuid():
    return str(uuid.uuid4())


def default_invite_expiry():
    """Invites expire 7 days after creation by default."""
    return datetime.now(timezone.utc) + timedelta(days=7)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user", nullable=False)  # 'user' or 'admin'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")
    wildcards = relationship("Wildcard", back_populates="user", cascade="all, delete-orphan")


class Fixture(Base):
    __tablename__ = "fixtures"

    id = Column(Integer, primary_key=True, autoincrement=True)
    gameweek = Column(Integer, nullable=False, index=True)
    date = Column(Date, nullable=False)
    day = Column(String(10))
    time = Column(String(10))
    home_team = Column(String(50), nullable=False)
    away_team = Column(String(50), nullable=False)
    venue = Column(String(100))
    # Full kickoff timestamp (date + time). Nullable for backwards compatibility
    # with fixtures imported before this column existed — when null, predictions
    # are never locked by kickoff.
    kickoff_time = Column(DateTime, nullable=True)
    # Lifecycle status: 'scheduled' | 'postponed' | 'completed'.
    status = Column(String(20), default="scheduled", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    predictions = relationship("Prediction", back_populates="fixture", cascade="all, delete-orphan")
    result = relationship("Result", back_populates="fixture", uselist=False, cascade="all, delete-orphan")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    fixture_id = Column(Integer, ForeignKey("fixtures.id", ondelete="CASCADE"), nullable=False, index=True)
    gameweek = Column(Integer, nullable=False)
    predicted_home = Column(Integer, nullable=False)
    predicted_away = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="predictions")
    fixture = relationship("Fixture", back_populates="predictions")

    # Unique constraint: one prediction per user per fixture
    __table_args__ = (
        UniqueConstraint('user_id', 'fixture_id', name='uix_user_fixture'),
    )


class Result(Base):
    __tablename__ = "results"

    id = Column(String, primary_key=True, default=generate_uuid)
    fixture_id = Column(Integer, ForeignKey("fixtures.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    gameweek = Column(Integer, nullable=False)
    actual_home = Column(Integer, nullable=False)
    actual_away = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    fixture = relationship("Fixture", back_populates="result")


class Wildcard(Base):
    """
    A player's "wildcard" activation for a single gameweek.

    When a wildcard exists for (user_id, gameweek), every point that user earns
    in that gameweek is doubled (x2) in their total. One wildcard per user per
    gameweek is enforced by the unique constraint, so activation is naturally
    idempotent at the data layer.

    This is a NEW table, so SQLAlchemy's create_all (via create_tables) creates
    it automatically — no migrate.py change is required.
    """
    __tablename__ = "wildcards"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    gameweek = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="wildcards")

    # One wildcard per user per gameweek.
    __table_args__ = (
        UniqueConstraint("user_id", "gameweek", name="uix_user_gameweek_wildcard"),
    )


class SiteSetting(Base):
    __tablename__ = "site_settings"

    key = Column(String(100), primary_key=True)
    value = Column(String(255), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class Invite(Base):
    """
    Single-use registration invite.

    When INVITE_ONLY is enabled, a valid, unused, non-expired token is required
    to register. The token is consumed (used_by / used_at set) on successful
    registration so it can never be reused.
    """
    __tablename__ = "invites"

    id = Column(String, primary_key=True, default=generate_uuid)
    token = Column(String(36), unique=True, nullable=False, index=True, default=generate_uuid)
    created_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    used_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime, default=default_invite_expiry, nullable=False)
    used_at = Column(DateTime, nullable=True)
    recipient_name = Column(String(120), nullable=True)
    revoked_at = Column(DateTime, nullable=True)

    # Relationships (explicit foreign_keys because there are two FKs to users)
    creator = relationship("User", foreign_keys=[created_by])
    redeemer = relationship("User", foreign_keys=[used_by])
