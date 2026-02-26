# Pandit Booking System - Frontend

A simple and responsive frontend for the Pandit Booking System built with HTML, CSS, and vanilla JavaScript.

## Features

- **User Authentication**: Register and login functionality
- **Browse Services**: Search and filter spiritual services
- **Find Pandits**: Discover pandits by location with distance-based matching
- **Book Services**: Easy booking system with date/time selection
- **Manage Bookings**: View and track all your bookings
- **Review System**: Rate and review pandits after service completion
- **Pandit Registration**: Users can register to become pandits on the platform
- **Service Management**: Add new services to the platform with quick-add templates

## Pages

1. **index.html** - Login/Registration page
2. **dashboard.html** - Main dashboard after login
3. **services.html** - Browse and search services
4. **pandits.html** - Find and book pandits
5. **bookings.html** - Manage bookings and reviews
6. **pandit-onboard.html** - Register as a pandit (NEW)
7. **manage-services.html** - Add and manage services (NEW)

## Setup Instructions

### Prerequisites

- Backend server running on `http://localhost:8000`
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Running the Frontend

1. **Simple HTTP Server (Recommended)**

   Using Python:
   ```bash
   cd frontend
   python -m http.server 8080
   ```

   Or using Node.js:
   ```bash
   cd frontend
   npx http-server -p 8080
   ```

2. **Open in Browser**
   
   Navigate to: `http://localhost:8080`

3. **Or Open Directly**
   
   Simply open `index.html` in your web browser (may have CORS issues with some browsers)

## Configuration

### API Base URL

The API base URL is configured in `config.js`:

```javascript
const API_BASE_URL = 'http://localhost:8000';
```

Change this if your backend is running on a different address.

## Backend CORS Configuration

Make sure your backend has CORS enabled. Add this to your `main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Usage

### 1. Register a New Account
- Open the frontend
- Click "Register" 
- Fill in your details
- Submit the form

### 2. Login
- Enter your phone number and password
- Click "Login"
- You'll be redirected to the dashboard

### 3. Browse Services
- Click "Services" in the navigation
- Use search to find specific services
- Sort by price or name

### 4. Find Pandits
- Click "Find Pandits"
- Use "Find Nearby Pandits" (requires location)
- Or view all pandits
- Click "Book Now" to create a booking

### 5. Manage Bookings
- Click "My Bookings"
- View all your bookings
- Leave reviews for completed services

### 6. Become a Pandit
- Click "Become a Pandit" in navigation
- Fill in your experience, bio, region, languages
- Set your location (manual or auto-detect)
- Set your base pricing
- Submit to register as a pandit

### 7. Add Services
- Click "Manage Services"
- Eipandit-onboard.html  # Pandit registration (NEW)
├── manage-services.html # Service management (NEW)
├── ther fill the form to add custom service
- Or use "Quick Add" buttons for popular services
- View all existing services in the table below

## File Structure

```
frontend/
├── index.html           # Login/Register page
├── dashboard.html       # Main dashboard
├── services.html        # Services listing
├── pandits.html         # Pandits finder
├── bookings.html        # Bookings management
├── styles.css           # All CSS styles
├── app.js              # Main JavaScript logic
├── config.js           # API configuration
└── README.md           # This file
```

## Features Details

### Authentication
- JWT token-based authentication
- Token stored in localStorage
- Auto-redirect to login if not authenticated

### Services
- Search by keyword
- Sort by price, name, or duration
- Responsive grid layout

### Pandits
- Location-based search
- Distance calculation
- Rating display
- Pandit onboarding for new pandits

### Bookings
- Booking history
- Status tracking (pending, confirmed, completed, cancelled)
- Review submission for completed bookings

### Services Management
- Add custom services
- Quick-add templates for popular services
- View all platform services
- Category-based organization
- Status tracking (pending, confirmed, completed, cancelled)
- Review submission for completed bookings

## Styling

The frontend uses a modern purple gradient theme with:
- Responsive design for mobile and desktop
- Card-based layout
- Smooth transitions and hover effects
- Modal dialogs for forms
- Clear visual feedback for user actions

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### CORS Errors
- Ensure backend has CORS middleware configured
- Check that API_BASE_URL in config.js matches your backend

### Login Issues
- Clear localStorage: `localStorage.clear()` in browser console
- Check backend is running
- Verify credentials

### Services Not Loading
- Open browser console (F12) to check for errors
- Verify API endpoints are working
- Check network tab for failed requests

## Future Enhancements

- Profile management page
- Advanced search filters
- Real-time notifications
- Payment integration
- Chat system
- Calendar view for bookings
- Multi-language support

## Support

For issues or questions, please check:
- Backend API documentation
- Browser console for error messages
- Network tab for API call details
