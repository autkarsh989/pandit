import uuid
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Float, Text, UniqueConstraint, Date
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
    dob = Column(Date, nullable=True)
    time_of_birth = Column(String(5), nullable=True)
    place_of_birth = Column(String, nullable=True)
    hashed_password = Column(String)
    profile_picture = Column(String, nullable=True)
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
    profile_picture = Column(String, nullable=True)
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
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
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
    payment_status = Column(String, default="pending", index=True)  # pending, paid, failed, refunded, not_required
    payment_amount = Column(Float, nullable=True)
    payment_currency = Column(String, default="INR")
    razorpay_order_id = Column(String(64), nullable=True, index=True)
    razorpay_payment_id = Column(String(64), nullable=True, index=True)
    razorpay_signature = Column(String(255), nullable=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("booking_id", "reviewer_id", "reviewer_type", name="uq_review_once"),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    booking_id = Column(String(36), ForeignKey("bookings.id", ondelete="CASCADE"), index=True)
    reviewer_id = Column(String(36), index=True)  # ID of who is giving the review
    reviewee_id = Column(String(36), index=True)  # ID of who is being reviewed
    reviewer_type = Column(String)  # "user" or "pandit"
    reviewee_type = Column(String)  # "user" or "pandit"
    rating = Column(Integer)
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class Banner(Base):
    __tablename__ = "banners"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String)
    subtitle = Column(Text)
    badge_text = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    target_audience = Column(String, default="both")  # "user", "pandit", or "both"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SpecialOffer(Base):
    __tablename__ = "special_offers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String)
    description = Column(Text)
    discount_percentage = Column(Float, nullable=True)  # e.g., 20.0 for 20% off
    discount_amount = Column(Float, nullable=True)  # e.g., 500.0 for Rs 500 off
    offer_code = Column(String, nullable=True)  # Promo code
    target_audience = Column(String, default="both")  # "user", "pandit", or "both"
    effect_type = Column(String, default="badge")  # "badge", "flash", "glow", "pulse"
    effect_color = Column(String, default="#ff6b35")  # Hex color for the effect
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    max_uses = Column(Integer, nullable=True)  # Maximum number of uses
    current_uses = Column(Integer, default=0)  # Current number of uses
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class GlobalPricing(Base):
    __tablename__ = "global_pricing"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    discount_percentage = Column(Float, default=0.0)  # Global discount percentage (e.g., 20.0 for 20% off)
    is_active = Column(Boolean, default=False)
    description = Column(String, nullable=True)  # Description of the pricing change
    created_by = Column(String(36), ForeignKey("admins.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NotificationSchedule(Base):
    __tablename__ = "notification_schedule"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    send_times = Column(Text, default='["05:00", "10:00", "17:00"]')
    updated_by = Column(String(36), ForeignKey("admins.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
