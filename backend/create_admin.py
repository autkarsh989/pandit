"""
Script to create an admin user
Run this script to create the first admin account
"""

from database import SessionLocal
import models
from utils import hash_password


def create_admin():
    """Create an admin user"""
    db = SessionLocal()
    
    try:
        # Get admin details
        print("=== Create Admin Account ===")
        username = input("Enter admin username: ").strip()
        email = input("Enter admin email: ").strip()
        password = input("Enter admin password: ").strip()
        
        if not username or not email or not password:
            print("Error: All fields are required!")
            return
        
        # Check if admin already exists
        existing_admin = db.query(models.Admin).filter(
            (models.Admin.username == username) | (models.Admin.email == email)
        ).first()
        
        if existing_admin:
            print("Error: Admin with this username or email already exists!")
            return
        
        # Create admin
        hashed_password = hash_password(password)
        admin = models.Admin(
            username=username,
            email=email,
            hashed_password=hashed_password
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print("\n✅ Admin created successfully!")
        print(f"Username: {admin.username}")
        print(f"Email: {admin.email}")
        print(f"Admin ID: {admin.id}")
        print("\nYou can now login using the /admin/login endpoint")
        
    except Exception as e:
        print(f"Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
