from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
import models, schemas
from auth import get_db, get_current_user
from utils import calculate_distance

router = APIRouter()

@router.post("/services")
def create_service(service: schemas.ServiceCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Check if user is a pandit
    pandit = db.query(models.PanditProfile).filter(models.PanditProfile.user_id == user.id).first()
    if not pandit:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only pandits can create services. Please complete pandit onboarding first.")
    
    # Create service linked to pandit
    db_service = models.Service(
        pandit_id=pandit.id,
        **service.dict()
    )
    db.add(db_service)
    db.commit()
    return {"msg": "Service created", "service_id": str(db_service.id), "pandit_id": str(pandit.id)}

@router.get("/services", response_model=list[schemas.ServiceResponse])
def list_services(db: Session = Depends(get_db)):
    return db.query(models.Service).all()

@router.get("/services/search")
def search_services(
    db: Session = Depends(get_db),
    keyword: str = Query(None, description="Search by service name or category"),
    category: str = Query(None, description="Filter by category"),
    min_price: float = Query(None, ge=0, description="Minimum price"),
    max_price: float = Query(None, ge=0, description="Maximum price"),
    sort_by: str = Query("price_asc", pattern="^(price_asc|price_desc|duration_asc|duration_desc|name_asc|name_desc)$"),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(10, ge=1, le=100, description="Pagination limit")
):
    """
    Search for services with keyword matching, filtering, and sorting.
    
    Supported sort options:
    - price_asc: Price ascending (low to high)
    - price_desc: Price descending (high to low)
    - duration_asc: Duration ascending (short to long)
    - duration_desc: Duration descending (long to short)
    - name_asc: Name ascending (A to Z)
    - name_desc: Name descending (Z to A)
    """
    query = db.query(models.Service)
    
    # Apply keyword filter
    if keyword:
        keyword_lower = keyword.lower()
        query = query.filter(
            or_(
                models.Service.name.ilike(f"%{keyword_lower}%"),
                models.Service.category.ilike(f"%{keyword_lower}%")
            )
        )
    
    # Apply category filter
    if category:
        query = query.filter(models.Service.category.ilike(f"%{category}%"))
    
    # Apply price range filter
    if min_price is not None:
        query = query.filter(models.Service.base_price >= min_price)
    if max_price is not None:
        query = query.filter(models.Service.base_price <= max_price)
    
    # Apply sorting
    if sort_by == "price_asc":
        query = query.order_by(models.Service.base_price.asc())
    elif sort_by == "price_desc":
        query = query.order_by(models.Service.base_price.desc())
    elif sort_by == "duration_asc":
        query = query.order_by(models.Service.duration_minutes.asc())
    elif sort_by == "duration_desc":
        query = query.order_by(models.Service.duration_minutes.desc())
    elif sort_by == "name_asc":
        query = query.order_by(models.Service.name.asc())
    elif sort_by == "name_desc":
        query = query.order_by(models.Service.name.desc())
    
    # Apply pagination
    total = query.count()
    services = query.offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [schemas.ServiceResponse.from_orm(s) for s in services]
    }

@router.get("/pandits/{pandit_id}/services")
def get_pandit_services(
    pandit_id: str,
    db: Session = Depends(get_db),
    keyword: str = Query(None, description="Search by service name"),
    sort_by: str = Query("price_asc", pattern="^(price_asc|price_desc|name_asc|name_desc)$")
):
    """
    Get services offered by a specific pandit with search and filtering.
    """
    # Get services for this specific pandit
    query = db.query(models.Service).filter(models.Service.pandit_id == pandit_id)
    
    # Apply keyword filter if provided
    if keyword:
        keyword_lower = keyword.lower()
        query = query.filter(
            or_(
                models.Service.name.ilike(f"%{keyword_lower}%"),
                models.Service.category.ilike(f"%{keyword_lower}%")
            )
        )
    
    # Apply sorting
    if sort_by == "price_asc":
        query = query.order_by(models.Service.base_price.asc())
    elif sort_by == "price_desc":
        query = query.order_by(models.Service.base_price.desc())
    elif sort_by == "name_asc":
        query = query.order_by(models.Service.name.asc())
    elif sort_by == "name_desc":
        query = query.order_by(models.Service.name.desc())
    
    services = query.all()
    
    if not services:
        return {"pandit_id": pandit_id, "services": []}
    
    return {
        "pandit_id": pandit_id,
        "total": len(services),
        "items": [schemas.ServiceResponse.from_orm(s) for s in services]
    }

@router.get("/services/nearby-distance")
def search_services_by_distance(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    keyword: str = Query(None, description="Search by service name or category"),
    min_price: float = Query(None, ge=0, description="Minimum price"),
    max_price: float = Query(None, ge=0, description="Maximum price"),
    max_distance_km: float = Query(50, description="Maximum distance to pandit (km)"),
    sort_by: str = Query("distance_asc", pattern="^(distance_asc|price_asc|price_desc)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100)
):
    """
    Search for services based on user location and distance to available pandits.
    Returns services sorted by distance to nearest pandit offering that service.
    
    Requires user to have set their location.
    """
    # Check if user has location
    if not user.latitude or not user.longitude:
        return {"error": "User location not set. Please update your profile with location."}
    
    # Get all services
    query = db.query(models.Service)
    
    # Apply keyword filter
    if keyword:
        keyword_lower = keyword.lower()
        query = query.filter(
            or_(
                models.Service.name.ilike(f"%{keyword_lower}%"),
                models.Service.category.ilike(f"%{keyword_lower}%")
            )
        )
    
    # Apply price filters
    if min_price is not None:
        query = query.filter(models.Service.base_price >= min_price)
    if max_price is not None:
        query = query.filter(models.Service.base_price <= max_price)
    
    services = query.all()
    
    # Get all pandits with locations
    pandits = db.query(models.PanditProfile).filter(
        and_(
            models.PanditProfile.latitude != None,
            models.PanditProfile.longitude != None
        )
    ).all()
    
    # Calculate distance for each service to nearest pandit
    services_with_distance = []
    
    for service in services:
        # Find nearest pandit offering this service
        min_distance = float('inf')
        nearest_pandit_name = None
        
        for pandit in pandits:
            distance = calculate_distance(
                user.latitude, user.longitude,
                pandit.latitude, pandit.longitude
            )
            
            if distance < min_distance and distance <= max_distance_km:
                min_distance = distance
                nearest_pandit_user = db.query(models.User).filter(models.User.id == pandit.user_id).first()
                nearest_pandit_name = nearest_pandit_user.full_name if nearest_pandit_user else "Unknown"
        
        # Only include if found within max distance
        if min_distance != float('inf'):
            services_with_distance.append({
                "id": str(service.id),
                "name": service.name,
                "category": service.category,
                "base_price": service.base_price,
                "duration_minutes": service.duration_minutes,
                "nearest_pandit": nearest_pandit_name,
                "distance_km": round(min_distance, 2)
            })
    
    # Apply sorting
    if sort_by == "distance_asc":
        services_with_distance.sort(key=lambda x: x["distance_km"])
    elif sort_by == "price_asc":
        services_with_distance.sort(key=lambda x: x["base_price"])
    elif sort_by == "price_desc":
        services_with_distance.sort(key=lambda x: x["base_price"], reverse=True)
    
    # Apply pagination
    total = len(services_with_distance)
    paginated = services_with_distance[skip:skip + limit]
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": paginated
    }
@router.put("/services/{service_id}")
def update_service(service_id: str, service_data: schemas.ServiceCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    from fastapi import HTTPException
    
    # Get the service
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Check if user is the pandit who created this service
    pandit = db.query(models.PanditProfile).filter(models.PanditProfile.id == service.pandit_id).first()
    if not pandit or pandit.user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own services")
    
    # Update service
    service.name = service_data.name
    service.category = service_data.category
    service.base_price = service_data.base_price
    service.duration_minutes = service_data.duration_minutes
    
    db.commit()
    return {"msg": "Service updated", "service_id": str(service.id)}

@router.delete("/services/{service_id}")
def delete_service(service_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    from fastapi import HTTPException
    
    # Get the service
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Check if user is the pandit who created this service
    pandit = db.query(models.PanditProfile).filter(models.PanditProfile.id == service.pandit_id).first()
    if not pandit or pandit.user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own services")
    
    # Delete service
    db.delete(service)
    db.commit()
    return {"msg": "Service deleted", "service_id": str(service.id)}

@router.get("/my-services")
def get_my_services(db: Session = Depends(get_db), user=Depends(get_current_user)):
    from fastapi import HTTPException
    
    # Get pandit profile for current user
    pandit = db.query(models.PanditProfile).filter(models.PanditProfile.user_id == user.id).first()
    if not pandit:
        raise HTTPException(status_code=403, detail="You are not a pandit")
    
    # Get all services created by this pandit
    services = db.query(models.Service).filter(models.Service.pandit_id == pandit.id).all()
    return [schemas.ServiceResponse.from_orm(s) for s in services]