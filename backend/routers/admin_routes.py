from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import models, schemas
from utils import hash_password, verify_password
from auth import create_token, get_db, get_current_admin

router = APIRouter()

# Admin Login (No registration - admins created manually)
@router.post("/admin/login")
def login_admin(admin: schemas.AdminLogin, db: Session = Depends(get_db)):
    """Admin login endpoint"""
    db_admin = db.query(models.Admin).filter(models.Admin.username == admin.username).first()
    if not db_admin or not verify_password(admin.password, db_admin.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_token({"sub": str(db_admin.id), "type": "admin"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_type": "admin",
        "admin": schemas.AdminResponse.from_orm(db_admin)
    }

# Get admin profile
@router.get("/admin/profile", response_model=schemas.AdminResponse)
def get_profile(admin=Depends(get_current_admin)):
    """Get current admin profile"""
    return admin

# View all pandits (with filter for verification status)
@router.get("/admin/pandits", response_model=list[schemas.PanditResponse])
def view_all_pandits(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
    is_verified: bool = Query(None, description="Filter by verification status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """View all pandits with optional filter for verification status"""
    query = db.query(models.Pandit)
    
    if is_verified is not None:
        query = query.filter(models.Pandit.is_verified == is_verified)
    
    pandits = query.order_by(models.Pandit.created_at.desc()).offset(skip).limit(limit).all()
    return pandits

# View pending verification requests
@router.get("/admin/pandits/pending", response_model=list[schemas.PanditResponse])
def view_pending_pandits(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """View all pandits pending verification"""
    pandits = db.query(models.Pandit).filter(
        models.Pandit.is_verified == False
    ).order_by(models.Pandit.created_at.desc()).all()
    return pandits

# Get specific pandit details
@router.get("/admin/pandits/{pandit_id}", response_model=schemas.PanditResponse)
def get_pandit_details(
    pandit_id: str,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Get detailed information about a specific pandit"""
    pandit = db.query(models.Pandit).filter(models.Pandit.id == pandit_id).first()
    if not pandit:
        raise HTTPException(status_code=404, detail="Pandit not found")
    return pandit

# Approve/Verify pandit
@router.put("/admin/pandits/{pandit_id}/approve")
def approve_pandit(
    pandit_id: str,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Approve and verify a pandit"""
    pandit = db.query(models.Pandit).filter(models.Pandit.id == pandit_id).first()
    
    if not pandit:
        raise HTTPException(status_code=404, detail="Pandit not found")
    
    if pandit.is_verified:
        raise HTTPException(status_code=400, detail="Pandit is already verified")
    
    pandit.is_verified = True
    db.commit()
    
    return {
        "msg": "Pandit approved and verified successfully",
        "pandit_id": pandit_id,
        "pandit_name": pandit.full_name
    }

# Reject pandit verification
@router.put("/admin/pandits/{pandit_id}/reject")
def reject_pandit(
    pandit_id: str,
    reason: str = Query(None, description="Reason for rejection"),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Reject a pandit's verification request (keeps account but unverified)"""
    pandit = db.query(models.Pandit).filter(models.Pandit.id == pandit_id).first()
    
    if not pandit:
        raise HTTPException(status_code=404, detail="Pandit not found")
    
    # Keep the pandit account but ensure it's unverified
    # In a real system, you might want to store the rejection reason
    pandit.is_verified = False
    db.commit()
    
    return {
        "msg": "Pandit verification rejected",
        "pandit_id": pandit_id,
        "pandit_name": pandit.full_name,
        "reason": reason
    }

# Delete pandit account (use with caution)
@router.delete("/admin/pandits/{pandit_id}")
def delete_pandit(
    pandit_id: str,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Delete a pandit account permanently"""
    pandit = db.query(models.Pandit).filter(models.Pandit.id == pandit_id).first()
    
    if not pandit:
        raise HTTPException(status_code=404, detail="Pandit not found")
    
    # Check if pandit has any active bookings
    active_bookings = db.query(models.Booking).filter(
        models.Booking.pandit_id == pandit_id,
        models.Booking.status.in_(["pending", "confirmed"])
    ).first()
    
    if active_bookings:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete pandit with active bookings. Please complete or cancel bookings first."
        )
    
    # Delete associated services first
    db.query(models.Service).filter(models.Service.pandit_id == pandit_id).delete()
    
    # Delete the pandit
    db.delete(pandit)
    db.commit()
    
    return {"msg": "Pandit account deleted successfully", "pandit_id": pandit_id}

# Get statistics
@router.get("/admin/stats")
def get_statistics(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Get platform statistics"""
    total_users = db.query(models.User).count()
    total_pandits = db.query(models.Pandit).count()
    verified_pandits = db.query(models.Pandit).filter(models.Pandit.is_verified == True).count()
    pending_pandits = db.query(models.Pandit).filter(models.Pandit.is_verified == False).count()
    total_services = db.query(models.Service).count()
    total_bookings = db.query(models.Booking).count()
    pending_bookings = db.query(models.Booking).filter(models.Booking.status == "pending").count()
    completed_bookings = db.query(models.Booking).filter(models.Booking.status == "completed").count()
    
    return {
        "users": {
            "total": total_users
        },
        "pandits": {
            "total": total_pandits,
            "verified": verified_pandits,
            "pending_verification": pending_pandits
        },
        "services": {
            "total": total_services
        },
        "bookings": {
            "total": total_bookings,
            "pending": pending_bookings,
            "completed": completed_bookings
        }
    }
