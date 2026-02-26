from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import models, schemas
from auth import get_db, get_current_user

router = APIRouter()

@router.post("/bookings")
def create_booking(data: schemas.BookingCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    from fastapi import HTTPException
    
    service = db.query(models.Service).filter(models.Service.id == data.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Validate that the pandit owns this service
    if service.pandit_id != data.pandit_id:
        raise HTTPException(status_code=400, detail="Service is not offered by the specified pandit")

    booking = models.Booking(
        user_id=user.id,
        pandit_id=data.pandit_id,
        service_id=data.service_id,
        booking_date=data.booking_date,
        total_amount=service.base_price
    )
    db.add(booking)
    db.commit()
    return {"msg": "Booking created"}

@router.get("/my-bookings")
def my_bookings(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(models.Booking).filter(models.Booking.user_id == user.id).all()
