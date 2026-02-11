from pydantic import BaseModel
from uuid import UUID
from typing import Optional

class UserCreate(BaseModel):
    full_name: str
    phone: str
    password: str

class UserLogin(BaseModel):
    phone: str
    password: str

class PanditCreate(BaseModel):
    experience_years: int
    bio: str
    region: str
    languages: str

class ServiceCreate(BaseModel):
    name: str
    category: str
    base_price: float
    duration_minutes: int

class BookingCreate(BaseModel):
    pandit_id: UUID
    service_id: UUID
    booking_date: str

class ReviewCreate(BaseModel):
    booking_id: UUID
    pandit_id: UUID
    rating: int
    comment: str
