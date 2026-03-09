import bcrypt
import math
import os
import uuid
from fastapi import UploadFile, HTTPException
from PIL import Image
import config

def hash_password(password: str):
    # Hash password using bcrypt
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")

def verify_password(plain, hashed):
    # Verify password
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula.
    Returns distance in kilometers.
    """
    if not all([lat1, lon1, lat2, lon2]):
        return float('inf')
    
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def calculate_match_score(distance_km: float, price: float, rating: float, 
                         max_distance: float = 50, max_price: float = 5000,
                         distance_weight: float = 0.4, price_weight: float = 0.3, 
                         rating_weight: float = 0.3) -> float:
    """
    Calculate match score for a pandit based on multiple factors.
    Returns score between 0 and 100.
    """
    distance_score = max(0, 100 * (1 - distance_km / max_distance)) if distance_km <= max_distance else 0
    price_score = max(0, 100 * (1 - price / max_price)) if price > 0 else 50
    rating_score = (rating / 5) * 100 if rating > 0 else 50

    
    # Calculate weighted score
    total_score = (distance_score * distance_weight + 
                  price_score * price_weight + 
                  rating_score * rating_weight)
    
    return round(total_score, 2)

def validate_image(file: UploadFile) -> None:
    """
    Validate uploaded image file.
    
    Raises:
        HTTPException: If file is invalid
    """
    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in config.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(config.ALLOWED_EXTENSIONS)}"
        )
    
def save_profile_picture(file: UploadFile, user_id: str, user_type: str) -> str:
    """
    Save uploaded profile picture and return the file path.
    
    Args:
        file: The uploaded file
        user_id: ID of the user/pandit
        user_type: 'user' or 'pandit'
        
    Returns:
        Relative path to the saved file
        
    Raises:
        HTTPException: If file is invalid or save fails
    """
    # Validate the image
    validate_image(file)
    
    # Create upload directory if it doesn't exist
    os.makedirs(config.PROFILE_PICTURES_DIR, exist_ok=True)
    
    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1].lower()
    filename = f"{user_type}_{user_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = os.path.join(config.PROFILE_PICTURES_DIR, filename)
    
    try:
        # Read and validate image data
        contents = file.file.read()
        if len(contents) > config.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {config.MAX_FILE_SIZE // (1024 * 1024)}MB"
            )
        
        # Verify it's a valid image by opening with PIL
        file.file.seek(0)
        img = Image.open(file.file)
        img.verify()
        
        # Save the file
        file.file.seek(0)
        with open(file_path, "wb") as f:
            f.write(file.file.read())
        
        # Return relative path from uploads directory
        return os.path.join("profile_pictures", filename).replace("\\", "/")
    
    except Exception as e:
        # Clean up file if it was created
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Failed to save image: {str(e)}")
    finally:
        file.file.close()

def delete_profile_picture(file_path: str) -> None:
    """
    Delete a profile picture file if it exists.
    
    Args:
        file_path: Relative path to the file
    """
    if file_path:
        full_path = os.path.join(config.UPLOAD_DIR, file_path)
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
            except Exception:
                pass  # Silently fail if deletion fails
