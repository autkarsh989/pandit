from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import models, schemas
from auth import get_current_pandit, get_db

router = APIRouter()

# Get pandit profile
@router.get("/pandit/profile", response_model=schemas.PanditResponse)
def get_profile(pandit=Depends(get_current_pandit)):
    return pandit

# Update pandit profile
@router.put("/pandit/profile")
def update_profile(
    bio: str = Query(None),
    region: str = Query(None),
    languages: str = Query(None),
    price_per_service: float = Query(None),
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit)
):
    """Update pandit's profile information"""
    if bio:
        pandit.bio = bio
    if region:
        pandit.region = region
    if languages:
        pandit.languages = languages
    if price_per_service is not None:
        pandit.price_per_service = price_per_service
    
    db.commit()
    return {"msg": "Profile updated successfully"}

# Update pandit location
@router.put("/pandit/location")
def update_location(
    latitude: float = Query(...),
    longitude: float = Query(...),
    location_name: str = Query(None),
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit)
):
    """Update pandit's location"""
    pandit.latitude = latitude
    pandit.longitude = longitude
    if location_name:
        pandit.location_name = location_name
    
    db.commit()
    return {
        "msg": "Location updated successfully",
        "latitude": pandit.latitude,
        "longitude": pandit.longitude,
        "location_name": pandit.location_name
    }

# Add a new service
@router.post("/pandit/services")
def add_service(
    service: schemas.ServiceCreate,
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit)
):
    """Add a new service with pricing"""
    new_service = models.Service(
        pandit_id=pandit.id,
        name=service.name,
        category=service.category,
        base_price=service.base_price,
        duration_minutes=service.duration_minutes
    )
    db.add(new_service)
    db.commit()
    db.refresh(new_service)
    return {"msg": "Service added successfully", "service_id": str(new_service.id)}

# View my services
@router.get("/pandit/services", response_model=list[schemas.ServiceResponse])
def view_my_services(
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit)
):
    """View all services offered by this pandit"""
    services = db.query(models.Service).filter(
        models.Service.pandit_id == pandit.id
    ).all()
    return services

# Update service
@router.put("/pandit/services/{service_id}")
def update_service(
    service_id: str,
    name: str = Query(None),
    category: str = Query(None),
    base_price: float = Query(None),
    duration_minutes: int = Query(None),
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit)
):
    """Update a service's details"""
    service = db.query(models.Service).filter(
        models.Service.id == service_id,
        models.Service.pandit_id == pandit.id
    ).first()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    if name:
        service.name = name
    if category:
        service.category = category
    if base_price is not None:
        service.base_price = base_price
    if duration_minutes is not None:
        service.duration_minutes = duration_minutes
    
    db.commit()
    return {"msg": "Service updated successfully"}

# Delete service
@router.delete("/pandit/services/{service_id}")
def delete_service(
    service_id: str,
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit)
):
    """Delete a service"""
    service = db.query(models.Service).filter(
        models.Service.id == service_id,
        models.Service.pandit_id == pandit.id
    ).first()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Check if there are any bookings for this service
    bookings = db.query(models.Booking).filter(
        models.Booking.service_id == service_id,
        models.Booking.status.in_(["pending", "confirmed"])
    ).first()
    
    if bookings:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete service with pending or confirmed bookings"
        )
    
    db.delete(service)
    db.commit()
    return {"msg": "Service deleted successfully"}

# View bookings
@router.get("/pandit/bookings", response_model=list[schemas.BookingResponse])
def view_bookings(
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit),
    status: str = Query(None, description="Filter by status")
):
    """View all bookings for this pandit's services"""
    query = db.query(models.Booking).filter(models.Booking.pandit_id == pandit.id)
    
    if status:
        query = query.filter(models.Booking.status == status)
    
    bookings = query.order_by(models.Booking.created_at.desc()).all()
    return bookings

# Confirm booking
@router.put("/pandit/bookings/{booking_id}/confirm")
def confirm_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit)
):
    """Confirm a pending booking"""
    booking = db.query(models.Booking).filter(
        models.Booking.id == booking_id,
        models.Booking.pandit_id == pandit.id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.status != "pending":
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot confirm booking with status: {booking.status}"
        )
    
    booking.status = "confirmed"
    db.commit()
    return {"msg": "Booking confirmed successfully"}

# Reject booking
@router.put("/pandit/bookings/{booking_id}/reject")
def reject_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit)
):
    """Reject a pending booking"""
    booking = db.query(models.Booking).filter(
        models.Booking.id == booking_id,
        models.Booking.pandit_id == pandit.id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.status != "pending":
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot reject booking with status: {booking.status}"
        )
    
    booking.status = "rejected"
    db.commit()
    return {"msg": "Booking rejected"}

# Mark booking as completed
@router.put("/pandit/bookings/{booking_id}/complete")
def complete_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit)
):
    """Mark a confirmed booking as completed"""
    booking = db.query(models.Booking).filter(
        models.Booking.id == booking_id,
        models.Booking.pandit_id == pandit.id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.status != "confirmed":
        raise HTTPException(
            status_code=400, 
            detail=f"Can only complete confirmed bookings. Current status: {booking.status}"
        )
    
    booking.status = "completed"
    db.commit()
    return {"msg": "Booking marked as completed"}

# Rate user after service
@router.post("/pandit/bookings/{booking_id}/review")
def rate_user(
    booking_id: str,
    review: schemas.ReviewCreate,
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit)
):
    """Rate a user after service completion"""
    # Verify booking exists and belongs to pandit
    booking = db.query(models.Booking).filter(
        models.Booking.id == booking_id,
        models.Booking.pandit_id == pandit.id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.status != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed bookings")
    
    # Check if pandit already reviewed this booking
    existing_review = db.query(models.Review).filter(
        models.Review.booking_id == booking_id,
        models.Review.reviewer_id == pandit.id,
        models.Review.reviewer_type == "pandit"
    ).first()
    
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this booking")
    
    # Create review
    new_review = models.Review(
        booking_id=booking_id,
        reviewer_id=pandit.id,
        reviewee_id=booking.user_id,
        reviewer_type="pandit",
        reviewee_type="user",
        rating=review.rating,
        comment=review.comment
    )
    db.add(new_review)
    
    # Update user's average rating
    user = db.query(models.User).filter(models.User.id == booking.user_id).first()
    all_reviews = db.query(models.Review).filter(
        models.Review.reviewee_id == booking.user_id,
        models.Review.reviewee_type == "user"
    ).all()
    
    total_rating = sum(r.rating for r in all_reviews) + review.rating
    user.rating_avg = total_rating / (len(all_reviews) + 1)
    
    db.commit()
    return {"msg": "Review submitted successfully"}

# View reviews received
@router.get("/pandit/reviews", response_model=list[schemas.ReviewResponse])
def view_my_reviews(
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit)
):
    """View all reviews received by this pandit"""
    reviews = db.query(models.Review).filter(
        models.Review.reviewee_id == pandit.id,
        models.Review.reviewee_type == "pandit"
    ).all()
    return reviews
