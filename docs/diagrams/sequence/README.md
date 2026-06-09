# Sequence Diagrams

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web/Mobile Client
    participant B as Backend API
    participant D as Database

    U->>W: Enter phone and password
    W->>B: POST /login
    B->>D: Validate credentials
    D-->>B: User record
    B-->>W: JWT token + role
    W-->>U: Redirect to dashboard
```

## Files

- [Auth sequence](auth-sequence.md)
- [Booking sequence](booking-sequence.md)
- [Pandit approval sequence](pandit-approval-sequence.md)
- [Service management sequence](service-management-sequence.md)
- [Astrology report sequence](astrology-report-sequence.md)
