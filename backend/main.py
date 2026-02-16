from fastapi import FastAPI
from database import Base, engine
from routers import auth_routes, pandit_routes, service_routes, bookings_routes, review_routes

app = FastAPI()

# Create tables on startup
Base.metadata.create_all(bind=engine)

app.include_router(auth_routes.router)
app.include_router(pandit_routes.router)
app.include_router(service_routes.router)
app.include_router(bookings_routes.router)
app.include_router(review_routes.router)
