# Pandit Service API Documentation

## Overview
The API has been completely separated into **User** and **Pandit** systems with distinct authentication and functionality.

## Base URL
```
http://localhost:8000
```

---

## Getting Started - Running the Backend

### Prerequisites
- Python 3.8 or higher
- Virtual environment created in the `backend` directory

### Steps to Start the Backend

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies (if not already installed):**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the server:**
   ```bash
   python -m uvicorn main:app --reload
   ```
   
   The API will be available at `http://localhost:8000`

4. **Access API documentation:**
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

---

## Authentication Endpoints

### User Registration
**POST** `/user/register`

Register a new user account.

**Request Body:**
```json
{
  "full_name": "John Doe",
  "phone": "1234567890",
  "password": "securepassword",
  "email": "john@example.com",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "location_name": "Bangalore"
}
```

**Response:**
```json
{
  "msg": "User registered successfully",
  "user_id": "uuid-string"
}
```

### User Login
**POST** `/user/login`

Login as a user.

**Request Body:**
```json
{
  "phone": "1234567890",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "jwt-token",
  "token_type": "bearer",
  "user_type": "user",
  "user": {
    "id": "uuid",
    "full_name": "John Doe",
    "phone": "1234567890",
    "email": "john@example.com",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "location_name": "Bangalore",
    "rating_avg": 0
  }
}
```

### Pandit Registration
**POST** `/pandit/register`

Register a new pandit account.

**Request Body:**
```json
{
  "full_name": "Pandit Ji",
  "phone": "9876543210",
  "password": "securepassword",
  "email": "pandit@example.com",
  "experience_years": 10,
  "bio": "Experienced in all Hindu rituals",
  "region": "North India",
  "languages": "Hindi, English, Sanskrit",
  "latitude": 28.7041,
  "longitude": 77.1025,
  "location_name": "Delhi",
  "price_per_service": 2000
}
```

**Response:**
```json
{
  "msg": "Pandit registered successfully",
  "pandit_id": "uuid-string"
}
```

### Pandit Login
**POST** `/pandit/login`

Login as a pandit.

**Request Body:**
```json
{
  "phone": "9876543210",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "jwt-token",
  "token_type": "bearer",
  "user_type": "pandit",
  "pandit": {
    "id": "uuid",
    "full_name": "Pandit Ji",
    "phone": "9876543210",
    "email": "pandit@example.com",
    "experience_years": 10,
    "bio": "Experienced in all Hindu rituals",
    "region": "North India",
    "languages": "Hindi, English, Sanskrit",
    "latitude": 28.7041,
    "longitude": 77.1025,
    "location_name": "Delhi",
    "price_per_service": 2000,
    "rating_avg": 0,
    "is_verified": false
  }
}
```

### Admin Login
**POST** `/admin/login`

Login as an admin.

**Request Body:**
```json
{
  "username": "admin",
  "password": "adminpassword"
}
```

**Response:**
```json
{
  "access_token": "jwt-token",
  "token_type": "bearer",
  "user_type": "admin",
  "admin": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

**Note**: Admin accounts must be created using the `create_admin.py` script. There is no public registration endpoint for admins.

---

## User Endpoints
*(All require User authentication - include `Authorization: Bearer <user-token>` header)*

### Get User Profile
**GET** `/user/profile`

Get the current user's profile information.

### Update User Location
**PUT** `/user/location?latitude=12.9716&longitude=77.5946&location_name=Bangalore`

Update user's location.

### View All Services
**GET** `/user/services?skip=0&limit=10`

View all available services.

### Search Services
**GET** `/user/services/search?keyword=puja&category=Wedding&min_price=1000&max_price=5000&sort_by=price_asc`

Search and filter services.

**Query Parameters:**
- `keyword` - Search by name or category
- `category` - Filter by category
- `min_price` - Minimum price filter
- `max_price` - Maximum price filter
- `sort_by` - Options: `price_asc`, `price_desc`, `name_asc`, `name_desc`

### Search Pandits
**GET** `/user/pandits/search?max_distance_km=50&min_rating=3&max_price=5000&sort_by=match_score`

Find nearby pandits.

**Query Parameters:**
- `max_distance_km` - Maximum distance in kilometers (default: 50)
- `min_rating` - Minimum rating filter (0-5)
- `max_price` - Maximum price filter
- `sort_by` - Options: `distance`, `price`, `rating`, `match_score` (default)

### Create Booking
**POST** `/user/bookings`

Create a new booking.

**Request Body:**
```json
{
  "pandit_id": "pandit-uuid",
  "service_id": "service-uuid",
  "booking_date": "2026-02-25",
  "service_address": "123 Main Street, Apartment 4B, New Delhi - 110001",
  "service_latitude": 28.6139,
  "service_longitude": 77.2090,
  "service_location_name": "Home"
}
```

**Required Fields:**
- `pandit_id` - ID of the pandit to book
- `service_id` - ID of the service to book
- `booking_date` - Date of the service (YYYY-MM-DD format)
- `service_address` - Full address where service will be performed

**Optional Fields:**
- `service_latitude` - Latitude coordinates (for mapping/navigation)
- `service_longitude` - Longitude coordinates (for mapping/navigation)
- `service_location_name` - Display name (e.g., "Home", "Ram Mandir", "Wedding Hall")

**Note**: Only verified pandits can be booked.

### View My Bookings
**GET** `/user/bookings?status=pending`

View all bookings made by the user.

**Query Parameters:**
- `status` - Filter by status: `pending`, `confirmed`, `rejected`, `completed`, `cancelled`

### Cancel Booking
**PUT** `/user/bookings/{booking_id}/cancel`

Cancel a pending or confirmed booking.

### Rate Pandit
**POST** `/user/bookings/{booking_id}/review`

Rate a pandit after service completion.

**Request Body:**
```json
{
  "booking_id": "booking-uuid",
  "rating": 5,
  "comment": "Excellent service!"
}
```

---

## Pandit Endpoints
*(All require Pandit authentication - include `Authorization: Bearer <pandit-token>` header)*

### Get Pandit Profile
**GET** `/pandit/profile`

Get the current pandit's profile information.

### Update Pandit Profile
**PUT** `/pandit/profile?bio=Updated bio&region=South India&languages=Tamil, Hindi&price_per_service=3000`

Update pandit's profile information.

### Update Pandit Location
**PUT** `/pandit/location?latitude=13.0827&longitude=80.2707&location_name=Chennai`

Update pandit's location.

### Add Service
**POST** `/pandit/services`

Add a new service with pricing.

**Request Body:**
```json
{
  "name": "Wedding Ceremony",
  "category": "Wedding",
  "base_price": 5000,
  "duration_minutes": 180
}
```

### View My Services
**GET** `/pandit/services`

View all services offered by this pandit.

### Update Service
**PUT** `/pandit/services/{service_id}?name=Updated Name&base_price=6000`

Update a service's details.

### Delete Service
**DELETE** `/pandit/services/{service_id}`

Delete a service (only if no pending/confirmed bookings).

### View Bookings
**GET** `/pandit/bookings?status=pending`

View all bookings for this pandit's services.

**Query Parameters:**
- `status` - Filter by status: `pending`, `confirmed`, `rejected`, `completed`, `cancelled`

### Confirm Booking
**PUT** `/pandit/bookings/{booking_id}/confirm`

Confirm a pending booking.

### Reject Booking
**PUT** `/pandit/bookings/{booking_id}/reject`

Reject a pending booking.

### Complete Booking
**PUT** `/pandit/bookings/{booking_id}/complete`

Mark a confirmed booking as completed.

### Rate User
**POST** `/pandit/bookings/{booking_id}/review`

Rate a user after service completion.

**Request Body:**
```json
{
  "booking_id": "booking-uuid",
  "rating": 4,
  "comment": "Good client, punctual!"
}
```

### View My Reviews
**GET** `/pandit/reviews`

View all reviews received by this pandit.

---

## Admin Endpoints
*(All require Admin authentication - include `Authorization: Bearer <admin-token>` header)*

### Get Admin Profile
**GET** `/admin/profile`

Get the current admin's profile information.

### View All Pandits
**GET** `/admin/pandits?is_verified=false&skip=0&limit=50`

View all pandits with optional filtering.

**Query Parameters:**
- `is_verified` - Filter by verification status (true/false)
- `skip` - Pagination offset (default: 0)
- `limit` - Pagination limit (default: 50, max: 100)

### View Pending Verification Requests
**GET** `/admin/pandits/pending`

View all pandits pending verification (shortcut for `is_verified=false`).

### Get Pandit Details
**GET** `/admin/pandits/{pandit_id}`

Get detailed information about a specific pandit.

### Approve Pandit
**PUT** `/admin/pandits/{pandit_id}/approve`

Approve and verify a pandit account.

**Response:**
```json
{
  "msg": "Pandit approved and verified successfully",
  "pandit_id": "uuid",
  "pandit_name": "Pandit Ji"
}
```

### Reject Pandit
**PUT** `/admin/pandits/{pandit_id}/reject?reason=Incomplete%20documents`

Reject a pandit's verification request (keeps account but unverified).

**Query Parameters:**
- `reason` - Optional reason for rejection

**Response:**
```json
{
  "msg": "Pandit verification rejected",
  "pandit_id": "uuid",
  "pandit_name": "Pandit Ji",
  "reason": "Incomplete documents"
}
```

### Delete Pandit
**DELETE** `/admin/pandits/{pandit_id}`

Permanently delete a pandit account.

**Note**: Cannot delete pandits with active (pending/confirmed) bookings.

### Get Statistics
**GET** `/admin/stats`

Get platform statistics.

**Response:**
```json
{
  "users": {
    "total": 150
  },
  "pandits": {
    "total": 45,
    "verified": 30,
    "pending_verification": 15
  },
  "services": {
    "total": 120
  },
  "bookings": {
    "total": 300,
    "pending": 10,
    "completed": 250
  }
}
```

---

## Booking Status Flow

```
pending → confirmed → completed
   ↓          ↓
rejected   cancelled
```

- **pending**: Initial state when user creates booking
- **confirmed**: Pandit confirms the booking
- **rejected**: Pandit rejects the booking
- **completed**: Pandit marks booking as completed (both can now rate each other)
- **cancelled**: User cancels the booking

---

## Rating System

### Bidirectional Ratings
- **Users** can rate **Pandits** after booking completion
- **Pandits** can rate **Users** after booking completion
- Both ratings are tracked separately
- Average ratings are updated automatically for both users and pandits

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "detail": "Error message here"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation error, invalid state transition)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

---

## Authentication Flow

### For Users and Pandits:
1. **Registration**: Use `/user/register` or `/pandit/register`
2. **Login**: Use `/user/login` or `/pandit/login` to get JWT token
3. **API Calls**: Include token in `Authorization: Bearer <token>` header
4. **Token Type**: The token includes a `type` field (`user`, `pandit`, or `admin`) to ensure proper authorization

### For Admins:
1. **Create Admin**: Run `python create_admin.py` script to create an admin account
2. **Login**: Use `/admin/login` to get JWT token
3. **API Calls**: Include token in `Authorization: Bearer <token>` header

**Important**: 
- User tokens only work with `/user/*` endpoints
- Pandit tokens only work with `/pandit/*` endpoints
- Admin tokens only work with `/admin/*` endpoints
- Tokens are not interchangeable

## Pandit Verification Flow

1. Pandit registers via `/pandit/register` (status: `is_verified=false`)
2. Admin views pending pandits via `/admin/pandits/pending`
3. Admin reviews pandit details via `/admin/pandits/{pandit_id}`
4. Admin approves via `/admin/pandits/{pandit_id}/approve` OR rejects via `/admin/pandits/{pandit_id}/reject`
5. Only verified pandits (`is_verified=true`) can receive bookings from users
