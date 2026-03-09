from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import Base, engine
from routers import auth_routes, pandit_routes, user_routes, admin_routes , horoscope_routes
import os
import config

app = FastAPI()

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

@app.get("/")
def root():
    return {
        "message": "Pandit Service API",
        "features": {
            "users": "Complete user system with booking and rating",
            "pandits": "Complete pandit system with services and verification",
            "admin": "Admin system for pandit verification and platform management"
        }
    }
