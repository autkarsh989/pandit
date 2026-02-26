from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# User Schemas
class UserCreate(BaseModel):
    full_name: str
    phone: str
    password: str
    email: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None

class UserLogin(BaseModel):
    phone: str
    password: str

class UserResponse(BaseModel):
    id: str
    full_name: str
    phone: str
    email: Optional[str]
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

    class Config:
        from_attributes = True

class PanditWithDistance(BaseModel):
    id: str
    full_name: str
    phone: str
    email: Optional[str]
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

    class Config:
        from_attributes = True

class ServiceCreate(BaseModel):
    name: str
    category: str
    base_price: float = Field(..., gt=0, description="Base price (must be > 0)")
    duration_minutes: int = Field(..., gt=0, description="Duration in minutes (must be > 0)")

class ServiceResponse(BaseModel):
    id: str
    pandit_id: str
    name: str
    category: str
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

    class Config:
        from_attributes = True

class BookingStatusUpdate(BaseModel):
    status: str  # confirmed, rejected, completed, cancelled

class ReviewCreate(BaseModel):
    booking_id: str
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
