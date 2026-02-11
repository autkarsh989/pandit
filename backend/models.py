import uuid
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Float, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String)
    phone = Column(String, unique=True)
    email = Column(String, nullable=True)
    role = Column(String, default="user")
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class PanditProfile(Base):
    __tablename__ = "pandit_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    experience_years = Column(Integer)
    bio = Column(Text)
    region = Column(String)
    languages = Column(String)
    rating_avg = Column(Float, default=0)
    is_verified = Column(Boolean, default=False)

class Service(Base):
    __tablename__ = "services"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String)
    category = Column(String)
    base_price = Column(Float)
    duration_minutes = Column(Integer)

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    pandit_id = Column(UUID(as_uuid=True), ForeignKey("pandit_profiles.id"))
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id"))
    booking_date = Column(String)
    status = Column(String, default="pending")
    total_amount = Column(Float)

class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    pandit_id = Column(UUID(as_uuid=True), ForeignKey("pandit_profiles.id"))
    rating = Column(Integer)
    comment = Column(Text)
