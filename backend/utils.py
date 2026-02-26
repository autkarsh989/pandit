from passlib.context import CryptContext
import math

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula.
    Returns distance in kilometers.
    """
    if not all([lat1, lon1, lat2, lon2]):
        return float('inf')  # Return infinity if any coordinate is missing
    
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
    Calculate match score for a pandit based on multiple factors.Returns score between 0 and 100.
    
    Args:
        distance_km: Distance in kilometers (lower is better)
        price: Price per service (lower is better)
        rating: Rating out of 5 (higher is better)
        max_distance: Maximum distance threshold in km
        max_price: Maximum price threshold
        distance_weight: Weight for distance factor (0-1)
        price_weight: Weight for price factor (0-1)
        rating_weight: Weight for rating factor (0-1)
    """
    # Normalize distance (closer = higher score)
    distance_score = max(0, 100 * (1 - distance_km / max_distance)) if distance_km <= max_distance else 0
    
    # Normalize price (cheaper = higher score)
    price_score = max(0, 100 * (1 - price / max_price)) if price > 0 else 50
    
    # Normalize rating (higher rating = higher score)
    rating_score = (rating / 5) * 100 if rating > 0 else 50
    
    # Calculate weighted score
    total_score = (distance_score * distance_weight + 
                  price_score * price_weight + 
                  rating_score * rating_weight)
    
    return round(total_score, 2)
