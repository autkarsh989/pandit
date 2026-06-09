# Deployment And Configuration Flow

```mermaid
flowchart LR
    ENV[Environment variables] --> BECFG[backend/config.py]
    ENV --> ACFG[app/lib/config.ts]
    ENV --> WCFG[web-frontend/src/api/config.js]

    BECFG --> BE[Backend API]
    ACFG --> APP[Expo App]
    WCFG --> WEB[Web Frontend]

    BE --> DB[(SQLite)]
    BE --> UP[(uploads/)]
    APP --> BE
    WEB --> BE
    APP --> ASSET[Asset base URL]
    WEB --> ASSET

    BE --> PAY[Razorpay keys]
    APP --> PAY
    WEB --> PAY

    BE --> LAN[Listen on 0.0.0.0 for device access]
    APP --> LAN
```

## Notes

- The backend, web frontend, and mobile app each have their own base URL configuration.
- For physical mobile devices, the backend must be reachable on the LAN rather than only on localhost.
- Asset URLs should match the backend host because uploaded images are served from the API server.
