# Backend Workflow

```mermaid
flowchart TD
    S[Backend starts] --> T[Load config.py]
    T --> M[Create tables with SQLAlchemy]
    M --> X[Run lightweight startup migrations]
    X --> C[Enable CORS and mount uploads]

    C --> A[Auth routes]
    C --> U[User routes]
    C --> P[Pandit routes]
    C --> AD[Admin routes]
    C --> BK[Booking routes]
    C --> SRV[Service routes]
    C --> RV[Review routes]
    C --> BN[Banner routes]
    C --> OF[Special offer routes]
    C --> GP[Global pricing routes]
    C --> NS[Notification settings routes]
    C --> HQ[Horoscope and quotes routes]

    A --> AUTH[Register and login\nJWT token issuance]
    U --> USER[Profile, booking, location, and birth data]
    P --> PANDIT[Onboarding, profile, services, pricing]
    AD --> ADMIN[Verification, stats, promotions, controls]
    BK --> PAY[Booking lifecycle and payment metadata]
    SRV --> DATA[Service catalog and media]
    RV --> FEED[Ratings and comments]
    BN --> PROMO[Homepage and in-app banners]
    OF --> DISCOUNT[Targeted offers and effects]
    GP --> PLATFORM[Platform-wide pricing rules]
    NS --> SCHED[Notification send times]
    HQ --> ASTRO[Horoscope and astrology outputs]

    AUTH --> DB[(SQLite / pandit.db)]
    USER --> DB
    PANDIT --> DB
    ADMIN --> DB
    PAY --> DB
    DATA --> DB
    FEED --> DB
    PROMO --> DB
    DISCOUNT --> DB
    PLATFORM --> DB
    SCHED --> DB
    ASTRO --> DB

    DATA --> UP[(uploads/)]
    PROMO --> UP
```

## Notes

- `backend/main.py` is responsible for startup wiring, migrations, CORS, static files, and router registration.
- Models include users, admins, pandits, services, bookings, reviews, banners, special offers, global pricing, and notification schedules.
- Booking records carry payment fields so the platform can track Razorpay order and verification state.
