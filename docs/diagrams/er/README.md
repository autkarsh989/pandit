# ER Diagrams

```mermaid
erDiagram
    USER ||--o{ BOOKING : places
    PANDIT ||--o{ SERVICE : offers
    PANDIT ||--o{ BOOKING : receives
    SERVICE ||--o{ BOOKING : booked_for
    BOOKING ||--o{ REVIEW : has
    ADMIN ||--o{ GLOBAL_PRICING : manages
    ADMIN ||--o{ NOTIFICATION_SCHEDULE : manages
    ADMIN ||--o{ SPECIAL_OFFER : manages
    ADMIN ||--o{ BANNER : manages
```

## Files

- [Platform ER diagram](platform-er.md)
