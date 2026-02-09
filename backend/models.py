from sqlalchemy import Column, String, Integer, DateTime, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user", nullable=False)  # 'user' or 'admin'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")


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
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

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
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

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
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    fixture = relationship("Fixture", back_populates="result")
