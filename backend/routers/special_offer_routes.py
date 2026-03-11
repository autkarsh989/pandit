from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from models import SpecialOffer
from schemas import SpecialOfferResponse, SpecialOfferCreate, SpecialOfferUpdate
from auth import get_current_admin, get_current_user_or_pandit, get_db

router = APIRouter()

@router.get("/special-offers/active", response_model=List[SpecialOfferResponse])
async def get_active_special_offers(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_or_pandit)
):
    """Get all active special offers for users and pandits"""
    current_time = datetime.now()
    offers = (
        db.query(SpecialOffer)
        .filter(
            SpecialOffer.is_active == True,
            SpecialOffer.start_date <= current_time,
            (SpecialOffer.end_date.is_(None)) | (SpecialOffer.end_date >= current_time),
            (SpecialOffer.max_uses.is_(None)) | (SpecialOffer.current_uses < SpecialOffer.max_uses)
        )
        .all()
    )
    return offers

@router.get("/admin/special-offers", response_model=List[SpecialOfferResponse])
async def get_all_special_offers(
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all special offers for admin management"""
    offers = db.query(SpecialOffer).order_by(SpecialOffer.created_at.desc()).all()
    return offers

@router.post("/admin/special-offers", response_model=SpecialOfferResponse)
async def create_special_offer(
    offer_data: SpecialOfferCreate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Create a new special offer"""
    
    # Validate that at least one discount is provided
    if not offer_data.discount_percentage and not offer_data.discount_amount:
        raise HTTPException(
            status_code=400, 
            detail="Either discount_percentage or discount_amount must be provided"
        )
    
    # Create special offer
    offer = SpecialOffer(
        title=offer_data.title,
        description=offer_data.description,
        discount_percentage=offer_data.discount_percentage,
        discount_amount=offer_data.discount_amount,
        offer_code=offer_data.offer_code,
        target_audience=offer_data.target_audience,
        effect_type=offer_data.effect_type,
        effect_color=offer_data.effect_color,
        end_date=offer_data.end_date,
        max_uses=offer_data.max_uses,
        is_active=offer_data.is_active
    )
    
    db.add(offer)
    db.commit()
    db.refresh(offer)
    
    return offer

@router.put("/admin/special-offers/{offer_id}", response_model=SpecialOfferResponse)
async def update_special_offer(
    offer_id: str,
    offer_data: SpecialOfferUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Update an existing special offer"""
    
    offer = db.query(SpecialOffer).filter(SpecialOffer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Special offer not found")
    
    # Update fields
    if offer_data.title is not None:
        offer.title = offer_data.title
    if offer_data.description is not None:
        offer.description = offer_data.description
    if offer_data.discount_percentage is not None:
        offer.discount_percentage = offer_data.discount_percentage
    if offer_data.discount_amount is not None:
        offer.discount_amount = offer_data.discount_amount
    if offer_data.offer_code is not None:
        offer.offer_code = offer_data.offer_code
    if offer_data.target_audience is not None:
        offer.target_audience = offer_data.target_audience
    if offer_data.effect_type is not None:
        offer.effect_type = offer_data.effect_type
    if offer_data.effect_color is not None:
        offer.effect_color = offer_data.effect_color
    if offer_data.end_date is not None:
        offer.end_date = offer_data.end_date
    if offer_data.max_uses is not None:
        offer.max_uses = offer_data.max_uses
    if offer_data.is_active is not None:
        offer.is_active = offer_data.is_active
    
    # Validate that at least one discount is provided
    if not offer.discount_percentage and not offer.discount_amount:
        raise HTTPException(
            status_code=400, 
            detail="Either discount_percentage or discount_amount must be provided"
        )
    
    db.commit()
    db.refresh(offer)
    
    return offer

@router.delete("/admin/special-offers/{offer_id}")
async def delete_special_offer(
    offer_id: str,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete a special offer"""
    
    offer = db.query(SpecialOffer).filter(SpecialOffer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Special offer not found")
    
    db.delete(offer)
    db.commit()
    
    return {"message": "Special offer deleted successfully"}

@router.get("/admin/special-offers/{offer_id}", response_model=SpecialOfferResponse)
async def get_special_offer(
    offer_id: str,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get a specific special offer by ID"""
    
    offer = db.query(SpecialOffer).filter(SpecialOffer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Special offer not found")
    
    return offer

@router.post("/special-offers/{offer_id}/use")
async def use_special_offer(
    offer_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_or_pandit)
):
    """Mark a special offer as used (increment usage count)"""
    
    offer = db.query(SpecialOffer).filter(SpecialOffer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Special offer not found")
    
    if not offer.is_active:
        raise HTTPException(status_code=400, detail="Special offer is not active")
    
    current_time = datetime.now()
    if offer.end_date and current_time > offer.end_date:
        raise HTTPException(status_code=400, detail="Special offer has expired")
    
    if offer.max_uses and offer.current_uses >= offer.max_uses:
        raise HTTPException(status_code=400, detail="Special offer usage limit reached")
    
    # Increment usage count
    offer.current_uses += 1
    db.commit()
    
    return {
        "message": "Special offer used successfully",
        "remaining_uses": (offer.max_uses - offer.current_uses) if offer.max_uses else None
    }