from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from routers import auth_routes, pandit_routes, user_routes, admin_routes

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins like ["http://localhost:8080"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables on startup
Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(auth_routes.router, tags=["Authentication"])
app.include_router(user_routes.router, tags=["User"])
app.include_router(pandit_routes.router, tags=["Pandit"])
app.include_router(admin_routes.router, tags=["Admin"])

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
