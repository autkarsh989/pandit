from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date

# User Schemas
class UserCreate(BaseModel):
    full_name: str
    phone: str
    password: str
    email: Optional[str] = None
    dob: Optional[date] = None
    time_of_birth: Optional[str] = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    place_of_birth: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None

class UserLogin(BaseModel):
    phone: str
    password: str


class UserDobUpdate(BaseModel):
    dob: Optional[date] = None
    time_of_birth: Optional[str] = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    place_of_birth: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    full_name: str
    phone: str
    email: Optional[str]
    dob: Optional[date]
    time_of_birth: Optional[str]
    place_of_birth: Optional[str]
    profile_picture: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    location_name: Optional[str]
    rating_avg: float

    class Config:
        from_attributes = True

# Admin Schemas
class AdminCreate(BaseModel):
    username: str
    email: str
    password: str

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminResponse(BaseModel):
    id: str
    username: str
    email: str

    class Config:
        from_attributes = True

# Pandit Schemas
class PanditCreate(BaseModel):
    full_name: str
    phone: str
    password: str
    email: Optional[str] = None
    experience_years: int = Field(..., ge=0, description="Years of experience (must be >= 0)")
    bio: str
    region: str
    languages: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    price_per_service: Optional[float] = Field(default=0, gt=0, description="Price per service (must be > 0)")

class PanditLogin(BaseModel):
    phone: str
    password: str

class PanditResponse(BaseModel):
    id: str
    full_name: str
    phone: str
    email: Optional[str]
    profile_picture: Optional[str]
    experience_years: int
    bio: str
    region: str
    languages: str
    latitude: Optional[float]
    longitude: Optional[float]
    location_name: Optional[str]
    price_per_service: float
    rating_avg: float
    is_verified: bool
    review_count: Optional[int] = None

    class Config:
        from_attributes = True

class PanditWithDistance(BaseModel):
    id: str
    full_name: str
    phone: str
    email: Optional[str]
    profile_picture: Optional[str]
    experience_years: int
    bio: str
    region: str
    languages: str
    latitude: Optional[float]
    longitude: Optional[float]
    location_name: Optional[str]
    price_per_service: float
    rating_avg: float
    is_verified: bool
    distance_km: float
    match_score: float
    review_count: Optional[int] = None

    class Config:
        from_attributes = True

class ServiceCreate(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    base_price: float = Field(..., gt=0, description="Base price (must be > 0)")
    duration_minutes: int = Field(..., gt=0, description="Duration in minutes (must be > 0)")

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    base_price: Optional[float] = Field(default=None, gt=0)
    duration_minutes: Optional[int] = Field(default=None, gt=0)

class ServiceResponse(BaseModel):
    id: str
    pandit_id: str
    name: str
    category: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    base_price: float
    duration_minutes: int

    class Config:
        from_attributes = True

class BookingCreate(BaseModel):
    pandit_id: str
    service_id: str
    booking_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Date in YYYY-MM-DD format")
    service_address: str
    service_latitude: Optional[float] = None
    service_longitude: Optional[float] = None
    service_location_name: Optional[str] = None

class BookingResponse(BaseModel):
    id: str
    user_id: str
    pandit_id: str
    service_id: str
    booking_date: str
    service_address: str
    service_latitude: Optional[float]
    service_longitude: Optional[float]
    service_location_name: Optional[str]
    status: str
    total_amount: float
    payment_status: Optional[str] = None
    payment_amount: Optional[float] = None
    payment_currency: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    paid_at: Optional[datetime] = None
    service_name: Optional[str] = None
    pandit_name: Optional[str] = None
    user_name: Optional[str] = None
    reviewed_by_user: Optional[bool] = None
    reviewed_by_pandit: Optional[bool] = None

    class Config:
        from_attributes = True


class RazorpayVerification(BaseModel):
    booking_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class BookingStatusUpdate(BaseModel):
    status: str  # confirmed, rejected, completed, cancelled

class ReviewCreate(BaseModel):
    booking_id: Optional[str] = None
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: str

class ReviewResponse(BaseModel):
    id: str
    booking_id: str
    reviewer_id: str
    reviewee_id: str
    reviewer_type: str
    reviewee_type: str
    rating: int
    comment: str

    class Config:
        from_attributes = True

class DashboardBookingItem(BaseModel):
    id: str
    booking_date: str
    status: str
    total_amount: float
    service_name: Optional[str] = None
    user_name: Optional[str] = None
    pandit_name: Optional[str] = None
    service_address: Optional[str] = None
    service_location_name: Optional[str] = None

class PanditDashboardResponse(BaseModel):
    pandit_name: Optional[str] = None
    rating_avg: Optional[float] = None
    review_count: int
    active_services: int
    pending_requests: int
    total_earnings: float
    upcoming_bookings: list[DashboardBookingItem]
    recent_requests: list[DashboardBookingItem]

class UserDashboardResponse(BaseModel):
    user_name: Optional[str] = None
    upcoming_count: int
    completed_count: int
    cancelled_count: int
    total_spend: float
    recent_bookings: list[DashboardBookingItem]

# Banner Schemas
class BannerCreate(BaseModel):
    title: str
    subtitle: str
    badge_text: Optional[str] = None
    target_audience: str = Field(default="both", pattern="^(user|pandit|both)$")
    is_active: bool = True

class BannerUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    badge_text: Optional[str] = None
    target_audience: Optional[str] = Field(default=None, pattern="^(user|pandit|both)$")
    is_active: Optional[bool] = None

class BannerResponse(BaseModel):
    id: str
    title: str
    subtitle: str
    badge_text: Optional[str]
    image_url: Optional[str]
    target_audience: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Special Offer Schemas
class SpecialOfferCreate(BaseModel):
    title: str
    description: str
    discount_percentage: Optional[float] = Field(default=None, ge=0, le=100)
    discount_amount: Optional[float] = Field(default=None, ge=0)
    offer_code: Optional[str] = None
    target_audience: str = Field(default="both", pattern="^(user|pandit|both)$")
    effect_type: str = Field(default="badge", pattern="^(badge|flash|glow|pulse)$")
    effect_color: str = Field(default="#ff6b35", pattern="^#[0-9a-fA-F]{6}$")
    end_date: Optional[datetime] = None
    max_uses: Optional[int] = Field(default=None, ge=1)
    is_active: bool = True

class SpecialOfferUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    discount_percentage: Optional[float] = Field(default=None, ge=0, le=100)
    discount_amount: Optional[float] = Field(default=None, ge=0)
    offer_code: Optional[str] = None
    target_audience: Optional[str] = Field(default=None, pattern="^(user|pandit|both)$")
    effect_type: Optional[str] = Field(default=None, pattern="^(badge|flash|glow|pulse)$")
    effect_color: Optional[str] = Field(default=None, pattern="^#[0-9a-fA-F]{6}$")
    end_date: Optional[datetime] = None
    max_uses: Optional[int] = Field(default=None, ge=1)
    is_active: Optional[bool] = None

class SpecialOfferResponse(BaseModel):
    id: str
    title: str
    description: str
    discount_percentage: Optional[float]
    discount_amount: Optional[float]
    offer_code: Optional[str]
    target_audience: str
    effect_type: str
    effect_color: str
    start_date: datetime
    end_date: Optional[datetime]
    is_active: bool
    max_uses: Optional[int]
    current_uses: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Global Pricing Schemas
class GlobalPricingCreate(BaseModel):
    discount_percentage: float = Field(..., ge=0, le=100, description="Discount percentage (0-100)")
    description: Optional[str] = None
    is_active: bool = True

class GlobalPricingUpdate(BaseModel):
    discount_percentage: Optional[float] = Field(default=None, ge=0, le=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None

class GlobalPricingResponse(BaseModel):
    id: str
    discount_percentage: float
    is_active: bool
    description: Optional[str]
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationScheduleUpdate(BaseModel):
    send_times: list[str] = Field(
        ...,
        min_length=1,
        max_length=6,
        description="List of daily notification times in HH:MM 24h format",
    )


class NotificationScheduleResponse(BaseModel):
    send_times: list[str]
    updated_by: Optional[str]
    updated_at: datetime
