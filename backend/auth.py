from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from database import SessionLocal
import models
import uuid


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_token(data: dict) -> str:
    """Create a JWT access token from the provided data."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """Decode and verify a JWT access token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Get the current authenticated user from the JWT token in Authorization header."""
    if authorization is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Remove "Bearer " prefix if present
    token = authorization
    if token.startswith("Bearer "):
        token = token[7:]
    
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("sub")
    user_type = payload.get("type")
    
    if user_id is None or user_type != "user":
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Validate UUID format
    try:
        uuid.UUID(user_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=401, detail="Invalid token format")
    
    # Query with string UUID (no conversion needed since DB stores as string)
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


def get_current_pandit(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Get the current authenticated pandit from the JWT token in Authorization header."""
    if authorization is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Remove "Bearer " prefix if present
    token = authorization
    if token.startswith("Bearer "):
        token = token[7:]
    
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    pandit_id = payload.get("sub")
    user_type = payload.get("type")
    
    if pandit_id is None or user_type != "pandit":
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Validate UUID format
    try:
        uuid.UUID(pandit_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=401, detail="Invalid token format")
    
    # Query with string UUID (no conversion needed since DB stores as string)
    pandit = db.query(models.Pandit).filter(models.Pandit.id == pandit_id).first()
    if pandit is None:
        raise HTTPException(status_code=401, detail="Pandit not found")
    
    return pandit


def get_current_admin(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Get the current authenticated admin from the JWT token in Authorization header."""
    if authorization is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Remove "Bearer " prefix if present
    token = authorization
    if token.startswith("Bearer "):
        token = token[7:]
    
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    admin_id = payload.get("sub")
    user_type = payload.get("type")
    
    if admin_id is None or user_type != "admin":
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Validate UUID format
    try:
        uuid.UUID(admin_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=401, detail="Invalid token format")
    
    # Query with string UUID (no conversion needed since DB stores as string)
    admin = db.query(models.Admin).filter(models.Admin.id == admin_id).first()
    if admin is None:
        raise HTTPException(status_code=401, detail="Admin not found")
    
    return admin
