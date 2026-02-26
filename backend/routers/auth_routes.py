from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas
from utils import hash_password, verify_password
from auth import create_token, get_db

router = APIRouter()

# User Authentication
@router.post("/user/register")
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if phone already exists
    existing_user = db.query(models.User).filter(models.User.phone == user.phone).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    hashed = hash_password(user.password)
    db_user = models.User(
        full_name=user.full_name, 
        phone=user.phone,
        email=user.email,
        hashed_password=hashed,
        latitude=user.latitude,
        longitude=user.longitude,
        location_name=user.location_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"msg": "User registered successfully", "user_id": str(db_user.id)}

@router.post("/user/login")
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.phone == user.phone).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_token({"sub": str(db_user.id), "type": "user"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_type": "user",
        "user": schemas.UserResponse.from_orm(db_user)
    }

# Pandit Authentication
@router.post("/pandit/register")
def register_pandit(pandit: schemas.PanditCreate, db: Session = Depends(get_db)):
    # Check if phone already exists
    existing_pandit = db.query(models.Pandit).filter(models.Pandit.phone == pandit.phone).first()
    if existing_pandit:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    hashed = hash_password(pandit.password)
    db_pandit = models.Pandit(
        full_name=pandit.full_name,
        phone=pandit.phone,
        email=pandit.email,
        hashed_password=hashed,
        experience_years=pandit.experience_years,
        bio=pandit.bio,
        region=pandit.region,
        languages=pandit.languages,
        latitude=pandit.latitude,
        longitude=pandit.longitude,
        location_name=pandit.location_name,
        price_per_service=pandit.price_per_service
    )
    db.add(db_pandit)
    db.commit()
    db.refresh(db_pandit)
    return {"msg": "Pandit registered successfully", "pandit_id": str(db_pandit.id)}

@router.post("/pandit/login")
def login_pandit(pandit: schemas.PanditLogin, db: Session = Depends(get_db)):
    db_pandit = db.query(models.Pandit).filter(models.Pandit.phone == pandit.phone).first()
    if not db_pandit or not verify_password(pandit.password, db_pandit.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_token({"sub": str(db_pandit.id), "type": "pandit"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_type": "pandit",
        "pandit": schemas.PanditResponse.from_orm(db_pandit)
    }
