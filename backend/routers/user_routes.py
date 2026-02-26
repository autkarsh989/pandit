from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
import models, schemas
from auth import get_current_user, get_db
from utils import calculate_distance, calculate_match_score

router = APIRouter()

# Get user profile
@router.get("/user/profile", response_model=schemas.UserResponse)
def get_profile(user=Depends(get_current_user)):
    return user

# Update user location
@router.put("/user/location")
def update_location(
    latitude: float = Query(...),
    longitude: float = Query(...),
    location_name: str = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Update user's location"""
    user.latitude = latitude
    user.longitude = longitude
    if location_name:
        user.location_name = location_name
    
    db.commit()
    return {
        "msg": "Location updated successfully",
        "latitude": user.latitude,
        "longitude": user.longitude,
        "location_name": user.location_name
    }

# View all services
@router.get("/user/services", response_model=list[schemas.ServiceResponse])
def view_services(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100)
):
    """View all available services"""
    services = db.query(models.Service).offset(skip).limit(limit).all()
    return services

# Search services
@router.get("/user/services/search")
def search_services(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    keyword: str = Query(None, description="Search by service name or category"),
    category: str = Query(None, description="Filter by category"),
    min_price: float = Query(None, ge=0),
    max_price: float = Query(None, ge=0),
    sort_by: str = Query("price_asc", pattern="^(price_asc|price_desc|name_asc|name_desc)$")
):
    """Search for services with filters"""
    query = db.query(models.Service)
    
    if keyword:
        query = query.filter(
            or_(
                models.Service.name.ilike(f"%{keyword}%"),
                models.Service.category.ilike(f"%{keyword}%")
            )
        )
    
    if category:
        query = query.filter(models.Service.category.ilike(f"%{category}%"))
    
    if min_price is not None:
        query = query.filter(models.Service.base_price >= min_price)
    if max_price is not None:
        query = query.filter(models.Service.base_price <= max_price)
    
    # Apply sorting
    if sort_by == "price_asc":
        query = query.order_by(models.Service.base_price.asc())
    elif sort_by == "price_desc":
        query = query.order_by(models.Service.base_price.desc())
    elif sort_by == "name_asc":
        query = query.order_by(models.Service.name.asc())
    elif sort_by == "name_desc":
        query = query.order_by(models.Service.name.desc())
    
    services = query.all()
    return {
        "total": len(services),
        "items": [schemas.ServiceResponse.from_orm(s) for s in services]
    }

# Search pandits
@router.get("/user/pandits/search", response_model=list[schemas.PanditWithDistance])
def search_pandits(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    max_distance_km: float = Query(50, description="Maximum distance in kilometers"),
    min_rating: float = Query(0, ge=0, le=5),
    max_price: float = Query(None),
    sort_by: str = Query("match_score", pattern="^(distance|price|rating|match_score)$")
):
    """Find nearby pandits with filters"""
    if not user.latitude or not user.longitude:
        raise HTTPException(status_code=400, detail="Please set your location first")
    
    # Only show verified pandits to users
    pandits = db.query(models.Pandit).filter(models.Pandit.is_verified == True).all()
    matches = []
    
    for pandit in pandits:
        if not pandit.latitude or not pandit.longitude:
            continue
        
        distance = calculate_distance(
            user.latitude, user.longitude,
            pandit.latitude, pandit.longitude
        )
        
        if distance > max_distance_km:
            continue
        if pandit.rating_avg < min_rating:
            continue
        if max_price and pandit.price_per_service > max_price:
            continue
        
        match_score = calculate_match_score(
            distance_km=distance,
            price=pandit.price_per_service,
            rating=pandit.rating_avg
        )
        
        pandit_with_distance = schemas.PanditWithDistance(
            id=pandit.id,
            full_name=pandit.full_name,
            phone=pandit.phone,
            email=pandit.email,
            experience_years=pandit.experience_years,
            bio=pandit.bio,
            region=pandit.region,
            languages=pandit.languages,
            latitude=pandit.latitude,
            longitude=pandit.longitude,
            location_name=pandit.location_name,
            price_per_service=pandit.price_per_service,
            rating_avg=pandit.rating_avg,
            is_verified=pandit.is_verified,
            distance_km=round(distance, 2),
            match_score=match_score
        )
        matches.append(pandit_with_distance)
    
    # Sort results
    if sort_by == "distance":
        matches.sort(key=lambda x: x.distance_km)
    elif sort_by == "price":
        matches.sort(key=lambda x: x.price_per_service)
    elif sort_by == "rating":
        matches.sort(key=lambda x: x.rating_avg, reverse=True)
    else:
        matches.sort(key=lambda x: x.match_score, reverse=True)
    
    return matches

# Create booking
@router.post("/user/bookings")
def create_booking(
    booking: schemas.BookingCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Create a new booking"""
    # Check if pandit is verified
    pandit = db.query(models.Pandit).filter(models.Pandit.id == booking.pandit_id).first()
    if not pandit:
        raise HTTPException(status_code=404, detail="Pandit not found")
    
    if not pandit.is_verified:
        raise HTTPException(status_code=403, detail="This pandit is not verified yet. Only verified pandits can accept bookings.")
    
    service = db.query(models.Service).filter(models.Service.id == booking.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    if service.pandit_id != booking.pandit_id:
        raise HTTPException(status_code=400, detail="Service not offered by this pandit")
    
    new_booking = models.Booking(
        user_id=user.id,
        pandit_id=booking.pandit_id,
        service_id=booking.service_id,
        booking_date=booking.booking_date,
        service_address=booking.service_address,
        service_latitude=booking.service_latitude,
        service_longitude=booking.service_longitude,
        service_location_name=booking.service_location_name,
        total_amount=service.base_price,
        status="pending"
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return {"msg": "Booking created successfully", "booking_id": str(new_booking.id)}

# View my bookings
@router.get("/user/bookings", response_model=list[schemas.BookingResponse])
def view_my_bookings(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    status: str = Query(None, description="Filter by status")
):
    """View all bookings made by the user"""
    query = db.query(models.Booking).filter(models.Booking.user_id == user.id)
    
    if status:
        query = query.filter(models.Booking.status == status)
    
    bookings = query.order_by(models.Booking.created_at.desc()).all()
    return bookings

# Cancel booking
@router.put("/user/bookings/{booking_id}/cancel")
def cancel_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Cancel a booking (only if pending or confirmed)"""
    booking = db.query(models.Booking).filter(
        models.Booking.id == booking_id,
        models.Booking.user_id == user.id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.status not in ["pending", "confirmed"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel booking with status: {booking.status}")
    
    booking.status = "cancelled"
    db.commit()
    return {"msg": "Booking cancelled successfully"}

# Rate pandit after service
@router.post("/user/bookings/{booking_id}/review")
def rate_pandit(
    booking_id: str,
    review: schemas.ReviewCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Rate a pandit after service completion"""
    # Verify booking exists and belongs to user
    booking = db.query(models.Booking).filter(
        models.Booking.id == booking_id,
        models.Booking.user_id == user.id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.status != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed bookings")
    
    # Check if user already reviewed this booking
    existing_review = db.query(models.Review).filter(
        models.Review.booking_id == booking_id,
        models.Review.reviewer_id == user.id,
        models.Review.reviewer_type == "user"
    ).first()
    
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this booking")
    
    # Create review
    new_review = models.Review(
        booking_id=booking_id,
        reviewer_id=user.id,
        reviewee_id=booking.pandit_id,
        reviewer_type="user",
        reviewee_type="pandit",
        rating=review.rating,
        comment=review.comment
    )
    db.add(new_review)
    
    # Update pandit's average rating
    pandit = db.query(models.Pandit).filter(models.Pandit.id == booking.pandit_id).first()
    all_reviews = db.query(models.Review).filter(
        models.Review.reviewee_id == booking.pandit_id,
        models.Review.reviewee_type == "pandit"
    ).all()
    
    total_rating = sum(r.rating for r in all_reviews) + review.rating
    pandit.rating_avg = total_rating / (len(all_reviews) + 1)
    
    db.commit()
    return {"msg": "Review submitted successfully"}
