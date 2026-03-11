from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import Base, engine
from routers import auth_routes, pandit_routes, user_routes, admin_routes , horoscope_routes
import os
import config
from routers import auth_routes, pandit_routes, user_routes, admin_routes, banner_routes, special_offer_routes, global_pricing_routes

app = FastAPI()

# Serve uploaded service images
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins like ["http://localhost:8080"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create upload directories if they don't exist
os.makedirs(config.UPLOAD_DIR, exist_ok=True)
os.makedirs(config.PROFILE_PICTURES_DIR, exist_ok=True)

# Create tables on startup
Base.metadata.create_all(bind=engine)

# Mount static files for serving uploaded images
app.mount("/uploads", StaticFiles(directory=config.UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(auth_routes.router, tags=["Authentication"])
app.include_router(user_routes.router, tags=["User"])
app.include_router(pandit_routes.router, tags=["Pandit"])
app.include_router(admin_routes.router, tags=["Admin"])
app.include_router(horoscope_routes.router, tags=["Horoscope"])
app.include_router(banner_routes.router, tags=["Banners"])
app.include_router(special_offer_routes.router, tags=["Special Offers"])
app.include_router(global_pricing_routes.router, tags=["Global Pricing"])

@app.get("/")
def root():
    return {
        "message": "Pandit Service API",
        "features": {
            "users": "Complete user system with booking and rating",
            "pandits": "Complete pandit system with services and verification",
            "admin": "Admin system for pandit verification and platform management",
            "banners": "Dynamic banner management system",
            "special_offers": "Special offers with visual effects system",
            "global_pricing": "Global pricing discount system"
        }
    }
