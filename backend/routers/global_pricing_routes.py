from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from models import GlobalPricing
from schemas import GlobalPricingResponse, GlobalPricingCreate, GlobalPricingUpdate
from auth import get_current_admin, get_current_user_or_pandit, get_db

router = APIRouter()

@router.get("/global-pricing/current", response_model=Optional[GlobalPricingResponse])
async def get_current_global_pricing(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_or_pandit)
):
    """Get the current active global pricing for users and pandits"""
    pricing = (
        db.query(GlobalPricing)
        .filter(GlobalPricing.is_active == True)
        .order_by(GlobalPricing.created_at.desc())
        .first()
    )
    return pricing

@router.get("/admin/global-pricing", response_model=List[GlobalPricingResponse])
async def get_all_global_pricing(
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all global pricing configurations for admin management"""
    pricing_configs = db.query(GlobalPricing).order_by(GlobalPricing.created_at.desc()).all()
    return pricing_configs

@router.post("/admin/global-pricing", response_model=GlobalPricingResponse)
async def create_global_pricing(
    pricing_data: GlobalPricingCreate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Create a new global pricing configuration"""
    
    # If setting as active, deactivate all other pricing configs
    if pricing_data.is_active:
        db.query(GlobalPricing).update({"is_active": False})
    
    # Create new pricing configuration
    pricing = GlobalPricing(
        discount_percentage=pricing_data.discount_percentage,
        description=pricing_data.description,
        is_active=pricing_data.is_active,
        created_by=current_admin.id
    )
    
    db.add(pricing)
    db.commit()
    db.refresh(pricing)
    
    return pricing

@router.put("/admin/global-pricing/{pricing_id}", response_model=GlobalPricingResponse)
async def update_global_pricing(
    pricing_id: str,
    pricing_data: GlobalPricingUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Update an existing global pricing configuration"""
    
    pricing = db.query(GlobalPricing).filter(GlobalPricing.id == pricing_id).first()
    if not pricing:
        raise HTTPException(status_code=404, detail="Global pricing configuration not found")
    
    # If setting as active, deactivate all other pricing configs
    if pricing_data.is_active and not pricing.is_active:
        db.query(GlobalPricing).update({"is_active": False})
    
    # Update fields
    if pricing_data.discount_percentage is not None:
        pricing.discount_percentage = pricing_data.discount_percentage
    if pricing_data.description is not None:
        pricing.description = pricing_data.description
    if pricing_data.is_active is not None:
        pricing.is_active = pricing_data.is_active
    
    db.commit()
    db.refresh(pricing)
    
    return pricing

@router.delete("/admin/global-pricing/{pricing_id}")
async def delete_global_pricing(
    pricing_id: str,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete a global pricing configuration"""
    
    pricing = db.query(GlobalPricing).filter(GlobalPricing.id == pricing_id).first()
    if not pricing:
        raise HTTPException(status_code=404, detail="Global pricing configuration not found")
    
    db.delete(pricing)
    db.commit()
    
    return {"message": "Global pricing configuration deleted successfully"}

@router.post("/admin/global-pricing/activate/{pricing_id}")
async def activate_global_pricing(
    pricing_id: str,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Activate a specific global pricing configuration"""
    
    pricing = db.query(GlobalPricing).filter(GlobalPricing.id == pricing_id).first()
    if not pricing:
        raise HTTPException(status_code=404, detail="Global pricing configuration not found")
    
    # Deactivate all other pricing configs
    db.query(GlobalPricing).update({"is_active": False})
    
    # Activate the selected one
    pricing.is_active = True
    db.commit()
    
    return {"message": "Global pricing configuration activated successfully"}

@router.post("/admin/global-pricing/deactivate-all")
async def deactivate_all_global_pricing(
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Deactivate all global pricing configurations (return to normal pricing)"""
    
    db.query(GlobalPricing).update({"is_active": False})
    db.commit()
    
    return {"message": "All global pricing configurations deactivated successfully"}