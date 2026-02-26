import uuid
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Float, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

# Helper function to generate UUID as string
def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    full_name = Column(String)
    phone = Column(String, unique=True)
    email = Column(String, nullable=True)
    hashed_password = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_name = Column(String, nullable=True)
    rating_avg = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Admin(Base):
    __tablename__ = "admins"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String, unique=True)
    email = Column(String, unique=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Pandit(Base):
    __tablename__ = "pandits"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    full_name = Column(String)
    phone = Column(String, unique=True)
    email = Column(String, nullable=True)
    hashed_password = Column(String)
    experience_years = Column(Integer)
    bio = Column(Text)
    region = Column(String)
    languages = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_name = Column(String, nullable=True)
    price_per_service = Column(Float, default=0)
    rating_avg = Column(Float, default=0)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Service(Base):
    __tablename__ = "services"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    pandit_id = Column(String(36), ForeignKey("pandits.id", ondelete="CASCADE"), index=True)
    name = Column(String)
    category = Column(String)
    base_price = Column(Float)
    duration_minutes = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    pandit_id = Column(String(36), ForeignKey("pandits.id", ondelete="CASCADE"), index=True)
    service_id = Column(String(36), ForeignKey("services.id", ondelete="CASCADE"), index=True)
    booking_date = Column(String)
    service_address = Column(Text)  # Full address where service will be performed
    service_latitude = Column(Float, nullable=True)  # Optional coordinates
    service_longitude = Column(Float, nullable=True)
    service_location_name = Column(String, nullable=True)  # e.g., "Ram Mandir", "Home", "Wedding Hall"
    status = Column(String, default="pending", index=True)  # pending, confirmed, rejected, completed, cancelled
    total_amount = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Review(Base):
    __tablename__ = "reviews"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    booking_id = Column(String(36), ForeignKey("bookings.id", ondelete="CASCADE"), index=True)
    reviewer_id = Column(String(36), index=True)  # ID of who is giving the review
    reviewee_id = Column(String(36), index=True)  # ID of who is being reviewed
    reviewer_type = Column(String)  # "user" or "pandit"
    reviewee_type = Column(String)  # "user" or "pandit"
    rating = Column(Integer)
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
