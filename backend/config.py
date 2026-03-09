import os

DATABASE_URL = "sqlite:///./pandit.db"

SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# File upload configuration
UPLOAD_DIR = "uploads"
PROFILE_PICTURES_DIR = os.path.join(UPLOAD_DIR, "profile_pictures")
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
