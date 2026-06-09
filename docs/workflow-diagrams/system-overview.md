# System Overview

```mermaid
flowchart LR
    U[User] --> W[Web Frontend\nweb-frontend/]
    U --> M[Mobile App\napp/]
    A[Admin] --> W
    P[Pandit] --> W
    P --> M

    W --> B[Backend API\nbackend/]
    M --> B
    W --> C[Chart Service\nchart/]
    M --> C

    B --> DB[(SQLite DB\npandit.db)]
    B --> UP[(uploads/)]
    C --> CACHE[(Daily cache JSON)]
    C --> TEMP[HTML templates + static assets]

    B --> R[Razorpay payment flow]
    W --> R
```

## Notes

- The backend is the central business API for authentication, accounts, bookings, services, and platform controls.
- The web frontend and mobile app both consume the backend API.
- The chart service is a separate astrology-focused FastAPI app that can be run independently.
