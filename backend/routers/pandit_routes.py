from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import models, schemas
from auth import get_current_user, get_db

router = APIRouter()

@router.post("/pandit/onboard")
def onboard(data: schemas.PanditCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    pandit = models.PanditProfile(
        user_id=user.id,
        experience_years=data.experience_years,
        bio=data.bio,
        region=data.region,
        languages=data.languages
    )
    db.add(pandit)
    db.commit()
    return {"msg": "Pandit profile created"}

@router.get("/pandits")
def list_pandits(db: Session = Depends(get_db)):
    return db.query(models.PanditProfile).all()
