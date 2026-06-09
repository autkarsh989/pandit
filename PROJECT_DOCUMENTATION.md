# Pandit Platform Documentation

This repository contains a multi-client spiritual services platform built around a FastAPI backend, a modern React web application, an Expo mobile app, and a separate astrology/chart service. The platform is centered on connecting users with pandits, managing bookings and payments, supporting pandit onboarding and service management, and providing horoscope and astrology-driven utilities.

## Project Overview

The project is split into a few distinct parts:

- `backend/` is the primary API server for authentication, users, pandits, bookings, services, reviews, banners, special offers, pricing, notification settings, and horoscope-related data.
- `web-frontend/` is the modern browser UI built with React, Vite, and React Router.
- `app/` is the Expo Router mobile app for users, pandits, and admins.
- `chart/` is a separate astrology engine and daily report service that calculates Panchang-style data, kundali-related reports, numerology, transit guidance, and cached daily content.
- `frontend/` is a legacy static HTML/CSS/JavaScript frontend that still mirrors the basic auth and dashboard flows.

At a product level, the platform supports three main roles:

- Users who register, browse services, view pandits, create bookings, and track spiritual/horoscope content.
- Pandits who register, manage services, maintain profiles, and handle booking-related work.
- Admins who verify pandits and manage banners, offers, pricing, and notification timing.

## What The System Does

The application acts as a marketplace and operations platform for spiritual services. It lets a user create an account, search for pandits, browse or book services, pay for bookings, and review the service experience. Pandits can onboard themselves, define what they offer, and manage their service catalog. Admins can review and approve pandit accounts, moderate the platform, and control promotional content and platform-wide discounts.

The astrology side of the product adds daily guidance, horoscope features, and chart-style calculations. The separate `chart/` service demonstrates the underlying astrology workflow: birth details and location are converted into calculations such as Panchang, kundali data, transit analysis, muhurat suggestions, and daily predictions.

## Architecture

### Backend

The backend is a FastAPI application in `backend/main.py`. It uses SQLAlchemy with SQLite, serves uploaded files from the `uploads/` directory, and enables permissive CORS so browser and mobile clients can reach it during development.

Key backend characteristics:

- FastAPI routing and dependency injection for API endpoints.
- SQLite database with SQLAlchemy models.
- JWT-based authentication with password hashing.
- File upload handling for profile pictures, banners, and service images.
- Booking payment integration support through Razorpay fields and helper utilities.
- Lightweight startup schema patching for older databases.
- Static file serving for uploaded assets.

The backend is organized around route modules such as authentication, user, pandit, admin, bookings, services, reviews, banners, special offers, global pricing, notification settings, quotes, and horoscope routes.

### Web Frontend

The modern web frontend in `web-frontend/` uses React 18, React Router DOM, and Vite. It is a role-aware SPA that protects routes based on the token and `user_type` stored in localStorage.

Its responsibilities are:

- Login and role-based routing.
- User dashboard and browsing flows.
- Pandit portal, profile, and service management screens.
- Admin dashboards and settings screens.
- API communication through a small fetch wrapper that attaches auth headers when needed.

### Mobile App

The Expo app in `app/` uses Expo Router and React Native. It is the primary mobile client and includes a splash screen, auth context, tab navigation, and role-specific screens.

Its responsibilities are:

- Mobile login and registration for user and pandit accounts.
- Tab-based user experience after sign-in.
- Admin screens for verification and platform management.
- Persistent auth state via AsyncStorage.
- Daily quote notifications and other native app features.

### Astrology / Chart Service

The `chart/` folder is a self-contained FastAPI service for astrology calculations. It includes its own app entrypoint, templates, static assets, cached JSON data, and multiple calculation engines.

It is designed to:

- Produce daily Panchang and festival data.
- Generate kundali-style reports.
- Calculate numerology and dasha-related information.
- Refresh cached daily content automatically.
- Serve a simple browser UI for astrology reports.

### Legacy Static Frontend

The `frontend/` folder contains an older browser-based interface built from HTML, CSS, and JavaScript. It still shows the platform’s basic auth and service pages, but the modern React web app and Expo app are the primary clients.

## Tech Stack

### Backend Stack

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- SQLite
- Pydantic
- python-jose for JWT handling
- passlib[bcrypt] for password hashing
- python-multipart for form uploads
- Pillow for image handling
- reportlab for report generation
- pytz and timezonefinder for location-aware timing logic
- pyswisseph for astrology calculations
- litellm for LLM-backed report generation in the astrology service
- Razorpay integration support through helper code and order/payment fields

### Web Frontend Stack

- React 18
- React Router DOM
- Vite
- Fetch-based API layer

### Mobile App Stack

- Expo
- Expo Router
- React Native
- React Navigation
- AsyncStorage
- Expo notifications
- Expo image picker
- Expo font loading
- Expo linear gradient
- React Native Reanimated
- React Native Safe Area Context

### Chart Service Stack

- FastAPI
- Swiss Ephemeris / pyswisseph
- Cached JSON files
- HTML templates and static assets
- Astrology calculation engines for Panchang, festivals, kundali, numerology, dasha, prediction, and guidance

## Main Business Workflow

### User Workflow

1. A user registers or logs in using phone number and password.
2. After authentication, the user reaches a dashboard in either the web app or mobile app.
3. The user browses services, explores pandits, checks horoscope-related content, and views bookings.
4. The user creates a booking against a service and pandit.
5. Payment can be processed through the booking/payment flow when enabled.
6. The user can later view booking history and leave reviews.

### Pandit Workflow

1. A pandit registers or onboards with profile, experience, region, languages, and pricing details.
2. The pandit account may remain pending until an admin verifies it.
3. Once approved, the pandit can manage services and profile information.
4. The pandit can interact with booking-related data through the platform’s dashboards and management screens.

### Admin Workflow

1. The admin logs in through a separate admin login surface.
2. The admin views platform statistics and pending pandit verification requests.
3. The admin approves or rejects pandit onboarding requests.
4. The admin manages banners, special offers, global pricing, and notification timing.
5. The admin monitors user, pandit, service, and booking totals from dashboards.

### Astrology Workflow

1. A birth date, birth time, and location are provided.
2. The service computes planetary positions and Panchang-related values.
3. Dasha, transit, muhurat, and prediction logic are derived from the calculations.
4. A daily or personalized report is returned to the client.

## Backend Details

### Database Models

The backend models define the core business objects:

- `User`: user profile, phone, email, birth details, location, profile picture, and rating average.
- `Admin`: admin credentials and account metadata.
- `Pandit`: pandit profile, experience, region, languages, pricing, verification status, and rating average.
- `Service`: services offered by a pandit, with category, description, price, duration, and image.
- `Booking`: user-to-pandit service booking with status, address, location, payment fields, and Razorpay metadata.
- `Review`: rating and comment data with uniqueness enforced per booking and reviewer.
- `Banner`: promotional content and targeting.
- `SpecialOffer`: discount metadata, visual effect config, usage limits, and active dates.
- `GlobalPricing`: platform-wide discount control.
- `NotificationSchedule`: scheduled notification send times managed by admin.

### Startup Behavior

On startup, the backend:

- Creates tables if they do not already exist.
- Mounts the upload directory as a static file route.
- Applies lightweight schema patches to add missing columns for older databases.
- Enables CORS for cross-origin development clients.

The startup migration logic currently covers missing fields such as birth details on users and payment-related columns on bookings.

### Authentication And Authorization

The platform uses token-based authentication. The clients store a token locally and send it in an Authorization header for protected requests.

Typical role separation:

- `user`
- `pandit`
- `admin`

Role-based access is enforced in the clients and by backend routes.

### File Storage

Uploaded images and similar assets are stored under the backend `uploads/` folder. The backend exposes these files as static content so the web and mobile clients can render them.

### Payments

The data model includes Razorpay order/payment fields in bookings, so booking payments can be tracked through order IDs, payment IDs, signatures, payment currency, and payment timestamps.

The user payment flow uses a hosted Razorpay checkout page served by the backend. The mobile app opens that page as an auth session and returns to the app through a deep link after payment verification succeeds.

## Backend Route Groups

The backend route modules indicate these functional areas:

- Authentication for login and registration.
- User account and booking operations.
- Pandit account and service management.
- Admin statistics, verification, and platform controls.
- Horoscope or astrology content.
- Banner management.
- Special offer management.
- Global pricing management.
- Quotes and notification settings.
- Booking and review logic.

This makes the backend the central business API for all client apps.

## Web Frontend Details

The React web frontend is a role-aware SPA with routes for auth, dashboard, services, pandits, bookings, horoscope, pandit onboarding, manage services, pandit portal, pandit profile, user profile, and admin screens.

### Web Routing Pattern

The app uses React Router and protects routes by checking `token` and `user_type` from localStorage.

The client-side route structure includes:

- Auth landing page.
- Admin login route.
- Dashboard route.
- User-facing browsing routes for services, pandits, horoscope, bookings, and profile.
- Pandit-facing routes for onboarding, portal, profile, and service management.
- Admin-facing routes for dashboards, banners, offers, pricing, and notification settings.

### Web API Layer

The web frontend uses a small fetch wrapper under `web-frontend/src/api/`.

Notable behavior:

- The base API URL is hardcoded to `http://localhost:8000` for local development.
- Auth headers are added automatically when requests need them.
- JSON responses are parsed and error messages are surfaced from backend `detail` fields when available.
- Booking payment helpers integrate with Razorpay checkout and payment verification.

### Web Features

- Login and registration flow.
- Dashboard view with contextual navigation.
- Admin dashboard and admin settings pages.
- Pandit onboarding and profile management.
- Services and pandits browsing.
- Booking list and booking-related interactions.
- Horoscope page for astrology content.
- Role-based navigation and guarded pages.

## Mobile App Details

The Expo app uses Expo Router file-based routing and provides a more native experience than the web frontend.

### App Navigation

The root layout includes a stack with these major screens:

- Splash and entry screen.
- Auth screens.
- Tab navigator for the main app sections.
- Pandit detail screen.
- Service management screen.
- Admin dashboard and admin management screens.

### App Auth Flow

The app uses an Auth context and AsyncStorage to persist the token and user type. On launch it:

- Shows a branded splash animation.
- Waits for auth state readiness.
- Redirects users to the login screen, the user dashboard, or the admin dashboard depending on stored authentication state.

### App Tab Structure

The main tab layout includes:

- Dashboard
- Horoscope
- Services
- Pandits
- Bookings
- Profile

Some tabs are hidden for pandit accounts to keep the experience role-aware.

### App Features

- User login and registration.
- Pandit login and registration.
- Admin login and admin dashboard access.
- Daily quote notification initialization.
- Native form inputs and reusable UI components.
- Location-aware API base URL support for device testing.
- Image and date/time capabilities via Expo libraries.

### Mobile API Configuration

The app reads the API base URL from environment variables when present:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_ASSET_BASE_URL`

If those are not set, it falls back to a LAN IP-based default in development.

## Chart Service Details

The `chart/` service is an astrology-focused FastAPI app that provides daily and personalized astrology calculations.

### What It Calculates

- Kundali / birth-chart style data.
- Mulank / numerology.
- Panchang for a given moment.
- Daily guidance and prediction data.
- Dasha and antardasha timing.
- Transit analysis and aspect calculations.
- Muhurat suggestions for activity planning.
- Festival calendars and daily cache snapshots.

### Service Behavior

- It refreshes a daily cache automatically.
- It keeps a current location in memory for calculations.
- It exposes a simple HTML UI and a JSON API.
- It uses Swiss Ephemeris and related calculation engines for the astrology math.

### Chart Endpoints

- `GET /` serves the UI.
- `GET /api/today` returns the cached daily report.
- `POST /api/report` generates a personalized report from DOB, time, and coordinates.
- `POST /api/refresh` refreshes the daily cache for a given location.
- `GET /api/festivals` returns cached festival data.

## Legacy Static Frontend Details

The `frontend/` folder is an older HTML/CSS/JavaScript implementation.

### What It Contains

- Auth pages.
- Dashboard pages.
- Services pages.
- Pandit onboarding page.
- Manage-services page.
- Booking-related pages.
- Shared CSS and JavaScript helpers.

### Behavior

- It uses fetch requests directly against the backend.
- It stores the auth token in localStorage.
- It redirects users between login and dashboard pages based on token presence.
- It is useful as a simple static browser interface, but it is not the primary frontend stack anymore.

## Requirements

### Global Requirements

- Git
- Python 3.10 or newer
- Node.js 18 or newer
- npm
- SQLite is bundled with Python and is enough for local development

### Backend Requirements

Install the packages listed in `backend/requirements.txt`:

- FastAPI
- Uvicorn
- SQLAlchemy
- passlib[bcrypt]
- python-jose
- pydantic
- python-multipart
- litellm
- Pillow
- reportlab
- pyswisseph
- geopy
- timezonefinder
- pytz
- python-dotenv

### Web Frontend Requirements

- Node.js
- npm

### Mobile App Requirements

- Node.js
- npm
- Expo CLI or the Expo tooling bundled through `npm run start`
- Android emulator, iOS simulator, or a physical device

### Chart Service Requirements

- Python environment separate from or shared with the backend
- The same astrology-related Python dependencies from its own `requirements.txt`
- Optional environment variables for external services if you use them

## Setup

### 1. Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Why `0.0.0.0` matters: the mobile app and physical devices can only reach the backend if it listens on the LAN interface, not just on `127.0.0.1`.

### 2. Web Frontend Setup

```bash
cd web-frontend
npm install
npm run dev
```

The web client expects the backend at `http://localhost:8000` during local development. If you are testing against a different machine or a device, update `web-frontend/src/api/config.js` accordingly.

### 3. Mobile App Setup

```bash
cd app
npm install
npm run start
```

Before testing on a real device, set these environment variables to your machine’s reachable address:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_ASSET_BASE_URL`

The app defaults to a LAN IP in development, but you should still align it with the address the device can actually reach.

### 4. Chart Service Setup

```bash
cd chart
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

If you want the astrology report UI and cache service, run this separately from the main backend.

### 5. Legacy Frontend Setup

The legacy `frontend/` folder does not use a build tool. Serve it with any static server if you want to use it in a browser.

Example:

```bash
cd frontend
npx serve .
```

If you use the legacy UI, confirm that `frontend/config.js` points at the correct backend address.

## Configuration

### Backend Configuration

`backend/config.py` defines the main runtime config values:

- `DATABASE_URL` points to the local SQLite database `pandit.db`.
- `SECRET_KEY` is used for token signing.
- `ALGORITHM` and `ACCESS_TOKEN_EXPIRE_MINUTES` control JWT behavior.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_CURRENCY` configure payment integration.
- `UPLOAD_DIR`, `PROFILE_PICTURES_DIR`, `MAX_FILE_SIZE`, and `ALLOWED_EXTENSIONS` control uploaded media handling.

### Web Frontend Configuration

`web-frontend/src/api/config.js` controls the API and asset base URLs for the React web client.

### Mobile App Configuration

`app/lib/config.ts` controls the API and asset base URLs for the Expo client.

### Legacy Frontend Configuration

`frontend/config.js` currently points the legacy client to `http://localhost:8000`.

## Features By Role

### User Features

- Register and log in.
- Browse services and pandits.
- View horoscope or astrology content.
- Create bookings.
- Track booking status.
- Review completed services.
- Manage a profile.

### Pandit Features

- Register or onboard as a pandit.
- Provide profile, region, language, and pricing details.
- Manage services.
- View platform surfaces designed for pandits.
- Participate in the booking ecosystem.

### Admin Features

- Separate admin login.
- Dashboard with totals for users, pandits, services, and bookings.
- Pending pandit review queue.
- Approve or reject pandit onboarding.
- Manage banners.
- Manage special offers.
- Manage global pricing discounts.
- Manage notification send times.

## Platform Notes

- The backend is configured with very broad CORS during development, so browser and mobile clients can connect easily.
- Uploaded assets are served from the backend, so image URLs should typically be built relative to the backend host.
- The project uses SQLite for local development, which makes it easy to run without external infrastructure.
- The chart service is separate, so it can be run independently if you only need astrology calculations.
- The mobile app uses native routing and state persistence, while the web app uses browser routing and localStorage.

## Suggested Run Order

For a full local setup, start the services in this order:

1. Backend API.
2. Chart service, if you want astrology report features.
3. Web frontend or mobile app.
4. Legacy frontend only if you want to compare or keep the older UI available.

## Practical Development Notes

- If the web app or mobile app appears to hang on login, confirm the backend is reachable from that client’s network path.
- If you are using a real mobile device, the backend must listen on `0.0.0.0` and the app must use a LAN-reachable API URL.
- If you change upload paths or asset URLs, make sure both the web and mobile clients are updated consistently.
- If you are testing payment flows, make sure Razorpay keys are present and the backend payment verification routes are enabled.
- On mobile, the booking checkout is intentionally handled as a hosted Razorpay session with a return redirect back into the app.

## Summary

This codebase is a full-stack pandit booking platform with three client surfaces and a supporting astrology service. The backend handles core business logic and storage, the web frontend provides a browser-based management and user experience, the Expo app provides a mobile-first client, and the chart service powers astrology calculations and daily guidance.