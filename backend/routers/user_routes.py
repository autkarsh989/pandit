from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_, func
from typing import Optional
import models, schemas
from auth import get_current_user, get_db
from utils import calculate_distance, calculate_match_score, save_profile_picture, delete_profile_picture

router = APIRouter()

# Get user profile
@router.get("/user/profile", response_model=schemas.UserResponse)
def get_profile(user=Depends(get_current_user)):
    return user


@router.put("/user/profile/dob")
def update_user_dob(
    payload: schemas.UserDobUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Add or update birth details for the logged-in user; pass null to clear values."""
    user.dob = payload.dob
    user.time_of_birth = payload.time_of_birth
    user.place_of_birth = payload.place_of_birth
    db.commit()
    db.refresh(user)
    return {
        "msg": "Birth details updated successfully",
        "dob": user.dob,
        "time_of_birth": user.time_of_birth,
        "place_of_birth": user.place_of_birth,
    }

# Upload/Update user profile picture
@router.post("/user/profile/picture")
def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Upload or update user profile picture"""
    # Delete old profile picture if exists
    if user.profile_picture:
        delete_profile_picture(user.profile_picture)
    
    # Save new profile picture
    file_path = save_profile_picture(file, user.id, "user")
    user.profile_picture = file_path
    
    db.commit()
    return {
        "msg": "Profile picture uploaded successfully",
        "profile_picture": file_path
    }

# Delete user profile picture
@router.delete("/user/profile/picture")
def delete_user_profile_picture(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Delete user profile picture"""
    if not user.profile_picture:
        raise HTTPException(status_code=404, detail="No profile picture to delete")
    
    delete_profile_picture(user.profile_picture)
    user.profile_picture = None
    
    db.commit()
    return {"msg": "Profile picture deleted successfully"}

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
    services = (
        db.query(models.Service)
        .join(models.Pandit, models.Service.pandit_id == models.Pandit.id)
        .filter(models.Pandit.is_verified == True)
        .offset(skip)
        .limit(limit)
        .all()
    )
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
    query = (
        db.query(models.Service)
        .join(models.Pandit, models.Service.pandit_id == models.Pandit.id)
        .filter(models.Pandit.is_verified == True)
    )
    
    if keyword:
        query = query.filter(
            or_(
                models.Service.name.ilike(f"%{keyword}%"),
                models.Service.category.ilike(f"%{keyword}%"),
                models.Service.description.ilike(f"%{keyword}%")
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

# Services for a specific pandit (users only, verified pandits only)
@router.get("/user/pandits/{pandit_id}/services", response_model=list[schemas.ServiceResponse])
def view_pandit_services(
    pandit_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    pandit = db.query(models.Pandit).filter(models.Pandit.id == pandit_id).first()
    if not pandit:
        raise HTTPException(status_code=404, detail="Pandit not found")
    if not pandit.is_verified:
        raise HTTPException(status_code=403, detail="Pandit is not verified")

    services = db.query(models.Service).filter(models.Service.pandit_id == pandit_id).all()
    return services

# Search pandits
@router.get("/user/pandits/search", response_model=list[schemas.PanditWithDistance])
def search_pandits(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    latitude: Optional[float] = Query(None, description="Override latitude for search"),
    longitude: Optional[float] = Query(None, description="Override longitude for search"),
    max_distance_km: float = Query(50, description="Maximum distance in kilometers"),
    min_rating: float = Query(0, ge=0, le=5),
    max_price: float = Query(None),
    sort_by: str = Query("match_score", pattern="^(distance|price|rating|match_score)$")
):
    """Find nearby pandits with filters"""
    origin_lat = latitude if latitude is not None else user.latitude
    origin_lon = longitude if longitude is not None else user.longitude

    if not origin_lat or not origin_lon:
        raise HTTPException(status_code=400, detail="Please set your location first")
    
    # Only show verified pandits to users
    pandits = db.query(models.Pandit).filter(models.Pandit.is_verified == True).all()
    matches = []
    pandit_ids = [pandit.id for pandit in pandits]
    review_counts = {}
    if pandit_ids:
        rows = (
            db.query(models.Review.reviewee_id, func.count(models.Review.id))
            .filter(
                models.Review.reviewee_type == "pandit",
                models.Review.reviewee_id.in_(pandit_ids),
            )
            .group_by(models.Review.reviewee_id)
            .all()
        )
        review_counts = {row[0]: row[1] for row in rows}
    
    for pandit in pandits:
        if not pandit.latitude or not pandit.longitude:
            continue
        
        distance = calculate_distance(
            origin_lat, origin_lon,
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
            match_score=match_score,
            review_count=review_counts.get(pandit.id, 0)
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

# Get pandit detail (users only, verified pandits only)
@router.get("/user/pandits/{pandit_id}", response_model=schemas.PanditResponse)
def get_pandit_detail(
    pandit_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    pandit = db.query(models.Pandit).filter(models.Pandit.id == pandit_id).first()
    if not pandit:
        raise HTTPException(status_code=404, detail="Pandit not found")
    if not pandit.is_verified:
        raise HTTPException(status_code=403, detail="Pandit is not verified")
    review_count = (
        db.query(func.count(models.Review.id))
        .filter(
            models.Review.reviewee_id == pandit.id,
            models.Review.reviewee_type == "pandit",
        )
        .scalar()
        or 0
    )
    return {
        "id": pandit.id,
        "full_name": pandit.full_name,
        "phone": pandit.phone,
        "email": pandit.email,
        "experience_years": pandit.experience_years,
        "bio": pandit.bio,
        "region": pandit.region,
        "languages": pandit.languages,
        "latitude": pandit.latitude,
        "longitude": pandit.longitude,
        "location_name": pandit.location_name,
        "price_per_service": pandit.price_per_service,
        "rating_avg": pandit.rating_avg,
        "is_verified": pandit.is_verified,
        "review_count": review_count,
    }

# List all verified pandits (no distance filter)
@router.get("/user/pandits", response_model=list[schemas.PanditResponse])
def list_verified_pandits(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
):
    """List verified pandits for fallback discovery."""
    pandits = (
        db.query(models.Pandit)
        .filter(models.Pandit.is_verified == True)
        .order_by(models.Pandit.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    pandit_ids = [pandit.id for pandit in pandits]
    review_counts = {}
    if pandit_ids:
        rows = (
            db.query(models.Review.reviewee_id, func.count(models.Review.id))
            .filter(
                models.Review.reviewee_type == "pandit",
                models.Review.reviewee_id.in_(pandit_ids),
            )
            .group_by(models.Review.reviewee_id)
            .all()
        )
        review_counts = {row[0]: row[1] for row in rows}
    return [
        {
            "id": pandit.id,
            "full_name": pandit.full_name,
            "phone": pandit.phone,
            "email": pandit.email,
            "experience_years": pandit.experience_years,
            "bio": pandit.bio,
            "region": pandit.region,
            "languages": pandit.languages,
            "latitude": pandit.latitude,
            "longitude": pandit.longitude,
            "location_name": pandit.location_name,
            "price_per_service": pandit.price_per_service,
            "rating_avg": pandit.rating_avg,
            "is_verified": pandit.is_verified,
            "review_count": review_counts.get(pandit.id, 0),
        }
        for pandit in pandits
    ]

@router.get("/user/pandits/paged")
def list_verified_pandits_paged(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(12, ge=1, le=100),
):
    total = db.query(func.count(models.Pandit.id)).filter(models.Pandit.is_verified == True).scalar() or 0
    pandits = (
        db.query(models.Pandit)
        .filter(models.Pandit.is_verified == True)
        .order_by(models.Pandit.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    pandit_ids = [pandit.id for pandit in pandits]
    review_counts = {}
    if pandit_ids:
        rows = (
            db.query(models.Review.reviewee_id, func.count(models.Review.id))
            .filter(
                models.Review.reviewee_type == "pandit",
                models.Review.reviewee_id.in_(pandit_ids),
            )
            .group_by(models.Review.reviewee_id)
            .all()
        )
        review_counts = {row[0]: row[1] for row in rows}
    items = [
        {
            "id": pandit.id,
            "full_name": pandit.full_name,
            "phone": pandit.phone,
            "email": pandit.email,
            "experience_years": pandit.experience_years,
            "bio": pandit.bio,
            "region": pandit.region,
            "languages": pandit.languages,
            "latitude": pandit.latitude,
            "longitude": pandit.longitude,
            "location_name": pandit.location_name,
            "price_per_service": pandit.price_per_service,
            "rating_avg": pandit.rating_avg,
            "is_verified": pandit.is_verified,
            "review_count": review_counts.get(pandit.id, 0),
        }
        for pandit in pandits
    ]
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": items,
    }

@router.get("/user/dashboard", response_model=schemas.UserDashboardResponse)
def user_dashboard(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    rows = (
        db.query(
            models.Booking,
            models.Service.name.label("service_name"),
            models.Pandit.full_name.label("pandit_name"),
        )
        .outerjoin(models.Service, models.Service.id == models.Booking.service_id)
        .outerjoin(models.Pandit, models.Pandit.id == models.Booking.pandit_id)
        .filter(models.Booking.user_id == user.id)
        .order_by(models.Booking.created_at.desc())
        .all()
    )
    upcoming_count = sum(1 for booking, _, _ in rows if booking.status in ["pending", "confirmed", "scheduled"])
    completed_count = sum(1 for booking, _, _ in rows if booking.status == "completed")
    cancelled_count = sum(1 for booking, _, _ in rows if booking.status in ["cancelled", "rejected"])
    total_spend = sum(booking.total_amount or 0 for booking, _, _ in rows if booking.status == "completed")

    recent = rows[:5]
    recent_items = []
    for booking, service_name, pandit_name in recent:
        recent_items.append({
            "id": booking.id,
            "booking_date": booking.booking_date,
            "status": booking.status,
            "total_amount": booking.total_amount,
            "service_name": service_name,
            "pandit_name": pandit_name,
            "service_address": booking.service_address,
            "service_location_name": booking.service_location_name,
        })

    return {
        "user_name": user.full_name,
        "upcoming_count": upcoming_count,
        "completed_count": completed_count,
        "cancelled_count": cancelled_count,
        "total_spend": total_spend,
        "recent_bookings": recent_items,
    }

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
    query = (
        db.query(
            models.Booking,
            models.Service.name.label("service_name"),
            models.Pandit.full_name.label("pandit_name"),
        )
        .outerjoin(models.Service, models.Service.id == models.Booking.service_id)
        .outerjoin(models.Pandit, models.Pandit.id == models.Booking.pandit_id)
        .filter(models.Booking.user_id == user.id)
    )
    
    if status:
        query = query.filter(models.Booking.status == status)
    
    rows = query.order_by(models.Booking.created_at.desc()).all()
    reviewed_ids = {
        row.booking_id
        for row in db.query(models.Review.booking_id)
        .filter(
            models.Review.reviewer_id == user.id,
            models.Review.reviewer_type == "user",
        )
        .all()
    }

    def to_response(booking: models.Booking, service_name: Optional[str], pandit_name: Optional[str]):
        return {
            "id": booking.id,
            "user_id": booking.user_id,
            "pandit_id": booking.pandit_id,
            "service_id": booking.service_id,
            "booking_date": booking.booking_date,
            "service_address": booking.service_address,
            "service_latitude": booking.service_latitude,
            "service_longitude": booking.service_longitude,
            "service_location_name": booking.service_location_name,
            "status": booking.status,
            "total_amount": booking.total_amount,
            "service_name": service_name,
            "pandit_name": pandit_name,
            "reviewed_by_user": booking.id in reviewed_ids,
        }

    return [to_response(booking, service_name, pandit_name) for booking, service_name, pandit_name in rows]

# View booking detail (user)
@router.get("/user/bookings/{booking_id}", response_model=schemas.BookingResponse)
def view_booking_detail(
    booking_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    row = (
        db.query(
            models.Booking,
            models.Service.name.label("service_name"),
            models.Pandit.full_name.label("pandit_name"),
        )
        .outerjoin(models.Service, models.Service.id == models.Booking.service_id)
        .outerjoin(models.Pandit, models.Pandit.id == models.Booking.pandit_id)
        .filter(models.Booking.id == booking_id, models.Booking.user_id == user.id)
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking, service_name, pandit_name = row
    reviewed = (
        db.query(models.Review)
        .filter(
            models.Review.booking_id == booking_id,
            models.Review.reviewer_id == user.id,
            models.Review.reviewer_type == "user",
        )
        .first()
        is not None
    )
    return {
        "id": booking.id,
        "user_id": booking.user_id,
        "pandit_id": booking.pandit_id,
        "service_id": booking.service_id,
        "booking_date": booking.booking_date,
        "service_address": booking.service_address,
        "service_latitude": booking.service_latitude,
        "service_longitude": booking.service_longitude,
        "service_location_name": booking.service_location_name,
        "status": booking.status,
        "total_amount": booking.total_amount,
        "service_name": service_name,
        "pandit_name": pandit_name,
        "reviewed_by_user": reviewed,
    }

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
    
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="You have already reviewed this booking")
    return {"msg": "Review submitted successfully"}

# View reviews received by the user
@router.get("/user/reviews", response_model=list[schemas.ReviewResponse])
def view_my_reviews(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """View all reviews received by this user"""
    reviews = db.query(models.Review).filter(
        models.Review.reviewee_id == user.id,
        models.Review.reviewee_type == "user"
    ).all()
    return reviews

# View reviews for a specific pandit (user access)
@router.get("/user/pandits/{pandit_id}/reviews", response_model=list[schemas.ReviewResponse])
def view_pandit_reviews(
    pandit_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """View reviews received by a pandit"""
    reviews = db.query(models.Review).filter(
        models.Review.reviewee_id == pandit_id,
        models.Review.reviewee_type == "pandit"
    ).all()
    return reviews
