from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import models, schemas
from auth import get_db

router = APIRouter()

@router.post("/services")
def create_service(service: schemas.ServiceCreate, db: Session = Depends(get_db)):
    db_service = models.Service(**service.dict())
    db.add(db_service)
    db.commit()
    return {"msg": "Service created"}

@router.get("/services")
def list_services(db: Session = Depends(get_db)):
    return db.query(models.Service).all()
