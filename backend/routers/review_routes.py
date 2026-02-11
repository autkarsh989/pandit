from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import models, schemas
from auth import get_db, get_current_user

router = APIRouter()

@router.post("/reviews")
def add_review(data: schemas.ReviewCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    review = models.Review(
        booking_id=data.booking_id,
        user_id=user.id,
        pandit_id=data.pandit_id,
        rating=data.rating,
        comment=data.comment
    )
    db.add(review)
    db.commit()
    return {"msg": "Review added"}
