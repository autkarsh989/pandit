# Workflow Diagrams

```mermaid
flowchart LR
    U[User] --> W[Web Frontend]
    U --> M[Mobile App]
    P[Pandit] --> W
    P --> M
    A[Admin] --> W

    W --> B[Backend API]
    M --> B
    W --> C[Chart Service]
    M --> C
    C --> D[Daily cache + reports]
    B --> DB[(SQLite database)]
    B --> UP[(uploads/)]
```

## Workflow Files

- [System overview](system-overview.md)
- [Backend workflow](backend-workflow.md)
- [Web frontend workflow](web-frontend-workflow.md)
- [Mobile app workflow](mobile-app-workflow.md)
- [Chart service workflow](chart-service-workflow.md)
- [Deployment and configuration](deployment-and-config.md)
