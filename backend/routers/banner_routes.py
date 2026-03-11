import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import List, Optional
from models import Banner
from schemas import BannerResponse, BannerCreate, BannerUpdate
from auth import get_current_admin, get_current_user_or_pandit, get_db
import shutil

router = APIRouter()
security = HTTPBearer()

UPLOAD_DIR = "uploads/banners"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/banners/active", response_model=List[BannerResponse])
async def get_active_banners(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_or_pandit)
):
    """Get all active banners for users and pandits"""
    banners = db.query(Banner).filter(Banner.is_active == True).all()
    return banners

@router.get("/admin/banners", response_model=List[BannerResponse])
async def get_all_banners(
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all banners for admin management"""
    banners = db.query(Banner).order_by(Banner.created_at.desc()).all()
    return banners

@router.post("/admin/banners", response_model=BannerResponse)
async def create_banner(
    title: str = Form(...),
    subtitle: str = Form(...),
    badge_text: Optional[str] = Form(None),
    target_audience: str = Form("both"),
    is_active: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Create a new banner"""
    
    # Validate target_audience
    if target_audience not in ["user", "pandit", "both"]:
        raise HTTPException(status_code=400, detail="Invalid target_audience")
    
    image_url = None
    if image:
        # Validate image type
        if not image.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Generate unique filename
        file_extension = os.path.splitext(image.filename)[1]
        filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        # Save image
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        
        image_url = f"/uploads/banners/{filename}"
    
    # Create banner
    banner = Banner(
        title=title,
        subtitle=subtitle,
        badge_text=badge_text,
        image_url=image_url,
        target_audience=target_audience,
        is_active=is_active
    )
    
    db.add(banner)
    db.commit()
    db.refresh(banner)
    
    return banner

@router.put("/admin/banners/{banner_id}", response_model=BannerResponse)
async def update_banner(
    banner_id: str,
    title: Optional[str] = Form(None),
    subtitle: Optional[str] = Form(None),
    badge_text: Optional[str] = Form(None),
    target_audience: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Update an existing banner"""
    
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    # Validate target_audience if provided
    if target_audience and target_audience not in ["user", "pandit", "both"]:
        raise HTTPException(status_code=400, detail="Invalid target_audience")
    
    # Handle image upload
    if image:
        # Validate image type
        if not image.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Delete old image if exists
        if banner.image_url:
            old_file_path = f"uploads{banner.image_url.replace('/uploads', '')}"
            if os.path.exists(old_file_path):
                os.remove(old_file_path)
        
        # Generate unique filename
        file_extension = os.path.splitext(image.filename)[1]
        filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        # Save new image
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        
        banner.image_url = f"/uploads/banners/{filename}"
    
    # Update fields
    if title is not None:
        banner.title = title
    if subtitle is not None:
        banner.subtitle = subtitle
    if badge_text is not None:
        banner.badge_text = badge_text
    if target_audience is not None:
        banner.target_audience = target_audience
    if is_active is not None:
        banner.is_active = is_active
    
    db.commit()
    db.refresh(banner)
    
    return banner

@router.delete("/admin/banners/{banner_id}")
async def delete_banner(
    banner_id: str,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete a banner"""
    
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    # Delete image file if exists
    if banner.image_url:
        file_path = f"uploads{banner.image_url.replace('/uploads', '')}"
        if os.path.exists(file_path):
            os.remove(file_path)
    
    db.delete(banner)
    db.commit()
    
    return {"message": "Banner deleted successfully"}

@router.get("/admin/banners/{banner_id}", response_model=BannerResponse)
async def get_banner(
    banner_id: str,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get a specific banner by ID"""
    
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    return banner