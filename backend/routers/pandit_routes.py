from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional
from sqlalchemy import func
from pathlib import Path
import uuid
import models, schemas
from auth import get_current_pandit, get_db
from utils import save_profile_picture, delete_profile_picture

router = APIRouter()

# Get pandit profile
@router.get("/pandit/profile", response_model=schemas.PanditResponse)
def get_profile(pandit=Depends(get_current_pandit)):
    return pandit

# Upload/Update pandit profile picture
@router.post("/pandit/profile/picture")
def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit)
):
    """Upload or update pandit profile picture"""
    # Delete old profile picture if exists
    if pandit.profile_picture:
        delete_profile_picture(pandit.profile_picture)
    
    # Save new profile picture
    file_path = save_profile_picture(file, pandit.id, "pandit")
    pandit.profile_picture = file_path
    
    db.commit()
    return {
        "msg": "Profile picture uploaded successfully",
        "profile_picture": file_path
    }

# Delete pandit profile picture
@router.delete("/pandit/profile/picture")
def delete_pandit_profile_picture(
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit)
):
    """Delete pandit profile picture"""
    if not pandit.profile_picture:
        raise HTTPException(status_code=404, detail="No profile picture to delete")
    
    delete_profile_picture(pandit.profile_picture)
    pandit.profile_picture = None
    
    db.commit()
    return {"msg": "Profile picture deleted successfully"}

# Update pandit profile
@router.put("/pandit/profile")
def update_profile(
    full_name: str = Query(None),
    phone: str = Query(None),
    email: str = Query(None),
    bio: str = Query(None),
    region: str = Query(None),
    languages: str = Query(None),
    experience_years: int = Query(None, ge=0),
    price_per_service: float = Query(None),
    location_name: str = Query(None),
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit)
):
    """Update pandit's profile information"""
    if full_name:
        pandit.full_name = full_name
    if phone:
        pandit.phone = phone
    if email is not None:
        pandit.email = email
    if bio:
        pandit.bio = bio
    if region:
        pandit.region = region
    if languages:
        pandit.languages = languages
    if experience_years is not None:
        pandit.experience_years = experience_years
    if price_per_service is not None:
        pandit.price_per_service = price_per_service
    if location_name:
        pandit.location_name = location_name
    
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
    name: str = Form(...),
    category: str = Form(...),
    base_price: float = Form(...),
    duration_minutes: int = Form(...),
    description: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit)
):
    """Add a new service with optional image upload."""
    image_url = None

    if file and file.filename:
        filename = file.filename
        lower = filename.lower()
        if not (lower.endswith(".jpg") or lower.endswith(".jpeg") or lower.endswith(".png") or lower.endswith(".webp")):
            raise HTTPException(status_code=400, detail="Only JPG, JPEG, PNG, and WEBP images are allowed")

        if lower.endswith(".jpg"):
            ext = ".jpg"
        elif lower.endswith(".jpeg"):
            ext = ".jpeg"
        elif lower.endswith(".png"):
            ext = ".png"
        else:
            ext = ".webp"

        safe_name = f"{uuid.uuid4().hex}{ext}"
        upload_dir = Path(__file__).resolve().parent.parent / "uploads" / "services"
        upload_dir.mkdir(parents=True, exist_ok=True)
        target_path = upload_dir / safe_name

        with target_path.open("wb") as out_file:
            out_file.write(file.file.read())

        image_url = f"/uploads/services/{safe_name}"

    new_service = models.Service(
        pandit_id=pandit.id,
        name=name,
        category=category,
        description=description,
        image_url=image_url,
        base_price=base_price,
        duration_minutes=duration_minutes
    )
    db.add(new_service)
    db.commit()
    db.refresh(new_service)
    return {
        "msg": "Service added successfully",
        "service_id": str(new_service.id),
        "image_url": new_service.image_url,
    }

# View my services
@router.get("/pandit/services", response_model=list[schemas.ServiceResponse])
def view_my_services(
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    """View all services offered by this pandit"""
    services = (
        db.query(models.Service)
        .filter(
        models.Service.pandit_id == pandit.id
        )
        .offset(skip)
        .limit(limit)
        .all()
    )
    return services

@router.get("/pandit/services/paged")
def view_my_services_paged(
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit),
    skip: int = Query(0, ge=0),
    limit: int = Query(12, ge=1, le=100),
):
    total = (
        db.query(func.count(models.Service.id))
        .filter(models.Service.pandit_id == pandit.id)
        .scalar()
        or 0
    )
    services = (
        db.query(models.Service)
        .filter(models.Service.pandit_id == pandit.id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [schemas.ServiceResponse.from_orm(s) for s in services],
    }

# Update service
@router.put("/pandit/services/{service_id}")
def update_service(
    service_id: str,
    service_data: schemas.ServiceUpdate,
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
    
    if service_data.name is not None:
        service.name = service_data.name
    if service_data.category is not None:
        service.category = service_data.category
    if service_data.description is not None:
        service.description = service_data.description
    if service_data.image_url is not None:
        service.image_url = service_data.image_url
    if service_data.base_price is not None:
        service.base_price = service_data.base_price
    if service_data.duration_minutes is not None:
        service.duration_minutes = service_data.duration_minutes
    
    db.commit()
    return {"msg": "Service updated successfully"}

# Upload a service image
@router.post("/pandit/services/{service_id}/image")
def upload_service_image(
    service_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit)
):
    """Upload an image for a service (JPEG/PNG)."""
    service = db.query(models.Service).filter(
        models.Service.id == service_id,
        models.Service.pandit_id == pandit.id
    ).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    filename = file.filename or ""
    lower = filename.lower()
    if not (lower.endswith(".jpg") or lower.endswith(".jpeg") or lower.endswith(".png")):
        raise HTTPException(status_code=400, detail="Only JPG and PNG images are allowed")

    ext = ".jpg" if lower.endswith(".jpg") else ".jpeg" if lower.endswith(".jpeg") else ".png"
    safe_name = f"{uuid.uuid4().hex}{ext}"
    upload_dir = Path(__file__).resolve().parent.parent / "uploads"
    upload_dir.mkdir(exist_ok=True)
    target_path = upload_dir / safe_name

    with target_path.open("wb") as out_file:
        content = file.file.read()
        out_file.write(content)

    service.image_url = f"/uploads/{safe_name}"
    db.commit()
    return {"msg": "Image uploaded", "image_url": service.image_url}

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
    query = (
        db.query(
            models.Booking,
            models.Service.name.label("service_name"),
            models.User.full_name.label("user_name"),
        )
        .outerjoin(models.Service, models.Service.id == models.Booking.service_id)
        .outerjoin(models.User, models.User.id == models.Booking.user_id)
        .filter(models.Booking.pandit_id == pandit.id)
    )
    
    if status:
        query = query.filter(models.Booking.status == status)
    
    rows = query.order_by(models.Booking.created_at.desc()).all()
    reviewed_ids = {
        row.booking_id
        for row in db.query(models.Review.booking_id)
        .filter(
            models.Review.reviewer_id == pandit.id,
            models.Review.reviewer_type == "pandit",
        )
        .all()
    }

    def to_response(booking: models.Booking, service_name: Optional[str], user_name: Optional[str]):
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
            "user_name": user_name,
            "reviewed_by_pandit": booking.id in reviewed_ids,
        }

    return [to_response(booking, service_name, user_name) for booking, service_name, user_name in rows]

@router.get("/pandit/bookings/{booking_id}", response_model=schemas.BookingResponse)
def view_booking_detail(
    booking_id: str,
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit)
):
    row = (
        db.query(
            models.Booking,
            models.Service.name.label("service_name"),
            models.User.full_name.label("user_name"),
        )
        .outerjoin(models.Service, models.Service.id == models.Booking.service_id)
        .outerjoin(models.User, models.User.id == models.Booking.user_id)
        .filter(models.Booking.id == booking_id, models.Booking.pandit_id == pandit.id)
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking, service_name, user_name = row
    reviewed = (
        db.query(models.Review)
        .filter(
            models.Review.booking_id == booking_id,
            models.Review.reviewer_id == pandit.id,
            models.Review.reviewer_type == "pandit",
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
        "payment_status": booking.payment_status,
        "payment_amount": booking.payment_amount,
        "payment_currency": booking.payment_currency,
        "razorpay_order_id": booking.razorpay_order_id,
        "razorpay_payment_id": booking.razorpay_payment_id,
        "paid_at": booking.paid_at,
        "service_name": service_name,
        "user_name": user_name,
        "reviewed_by_pandit": reviewed,
    }

@router.get("/pandit/dashboard", response_model=schemas.PanditDashboardResponse)
def pandit_dashboard(
    db: Session = Depends(get_db),
    pandit=Depends(get_current_pandit)
):
    services_count = (
        db.query(func.count(models.Service.id))
        .filter(models.Service.pandit_id == pandit.id)
        .scalar()
        or 0
    )
    bookings = (
        db.query(
            models.Booking,
            models.Service.name.label("service_name"),
            models.User.full_name.label("user_name"),
        )
        .outerjoin(models.Service, models.Service.id == models.Booking.service_id)
        .outerjoin(models.User, models.User.id == models.Booking.user_id)
        .filter(models.Booking.pandit_id == pandit.id)
        .order_by(models.Booking.created_at.desc())
        .all()
    )

    pending_requests = sum(1 for booking, _, _ in bookings if booking.status == "pending")
    total_earnings = sum(
        booking.total_amount or 0 for booking, _, _ in bookings if booking.status == "completed"
    )
    upcoming = [
        (booking, service_name, user_name)
        for booking, service_name, user_name in bookings
        if booking.status in ["pending", "confirmed", "scheduled"]
    ]
    upcoming = sorted(upcoming, key=lambda row: row[0].booking_date)[:4]
    recent_requests = [row for row in bookings if row[0].status == "pending"][:4]
    review_count = (
        db.query(func.count(models.Review.id))
        .filter(
            models.Review.reviewee_id == pandit.id,
            models.Review.reviewee_type == "pandit",
        )
        .scalar()
        or 0
    )

    def to_item(booking, service_name, user_name):
        return {
            "id": booking.id,
            "booking_date": booking.booking_date,
            "status": booking.status,
            "total_amount": booking.total_amount,
            "service_name": service_name,
            "user_name": user_name,
            "service_address": booking.service_address,
            "service_location_name": booking.service_location_name,
        }

    return {
        "pandit_name": pandit.full_name,
        "rating_avg": pandit.rating_avg,
        "review_count": review_count,
        "active_services": services_count,
        "pending_requests": pending_requests,
        "total_earnings": total_earnings,
        "upcoming_bookings": [to_item(*row) for row in upcoming],
        "recent_requests": [to_item(*row) for row in recent_requests],
    }

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
    from datetime import datetime, timedelta
    
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
    
    # Validate booking date - can only complete on or after the booking date
    try:
        # Try to parse as datetime first (YYYY-MM-DD HH:MM:SS or YYYY-MM-DD HH:MM)
        booking_datetime = None
        try:
            booking_datetime = datetime.strptime(booking.booking_date, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            try:
                booking_datetime = datetime.strptime(booking.booking_date, "%Y-%m-%d %H:%M")
            except ValueError:
                # Fall back to date only
                booking_datetime = datetime.strptime(booking.booking_date, "%Y-%m-%d")
        
        current_datetime = datetime.now()
        
        # Can only complete on or after the booking datetime
        if current_datetime < booking_datetime:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot mark booking as completed before the service date and time ({booking.booking_date}). Please wait until the scheduled time to mark as completed."
            )
        
        # Add a minimum buffer time - can only complete if booking time was at least 30 minutes ago
        time_diff = current_datetime - booking_datetime
        min_buffer = timedelta(minutes=30)
        
        if time_diff < min_buffer:
            remaining_minutes = int((min_buffer - time_diff).total_seconds() / 60)
            raise HTTPException(
                status_code=400,
                detail=f"Cannot mark booking as completed immediately after the service time. Please wait {remaining_minutes} more minutes to ensure the service has been completed."
            )
                
    except ValueError as e:
        # If date parsing fails, log the issue but don't block completion
        print(f"Warning: Could not parse booking date '{booking.booking_date}': {e}")
        pass
    
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
    
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="You have already reviewed this booking")
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
