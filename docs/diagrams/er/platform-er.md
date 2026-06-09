# Platform ER Diagram

```mermaid
erDiagram
    USER {
        string id PK
        string full_name
        string phone
        string email
        date dob
        string time_of_birth
        string place_of_birth
        string profile_picture
        float latitude
        float longitude
        string location_name
        float rating_avg
        datetime created_at
        datetime updated_at
    }

    ADMIN {
        string id PK
        string username
        string email
        string hashed_password
        datetime created_at
        datetime updated_at
    }

    PANDIT {
        string id PK
        string full_name
        string phone
        string email
        string profile_picture
        int experience_years
        string bio
        string region
        string languages
        float latitude
        float longitude
        string location_name
        float price_per_service
        float rating_avg
        boolean is_verified
        datetime created_at
        datetime updated_at
    }

    SERVICE {
        string id PK
        string pandit_id FK
        string name
        string category
        string description
        string image_url
        float base_price
        int duration_minutes
        datetime created_at
        datetime updated_at
    }

    BOOKING {
        string id PK
        string user_id FK
        string pandit_id FK
        string service_id FK
        string booking_date
        string service_address
        float service_latitude
        float service_longitude
        string service_location_name
        string status
        float total_amount
        string payment_status
        float payment_amount
        string payment_currency
        string razorpay_order_id
        string razorpay_payment_id
        string razorpay_signature
        datetime paid_at
        datetime created_at
        datetime updated_at
    }

    REVIEW {
        string id PK
        string booking_id FK
        string reviewer_id
        string reviewee_id
        string reviewer_type
        string reviewee_type
        int rating
        string comment
        datetime created_at
    }

    BANNER {
        string id PK
        string title
        string subtitle
        string badge_text
        string image_url
        string target_audience
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    SPECIAL_OFFER {
        string id PK
        string title
        string description
        float discount_percentage
        float discount_amount
        string offer_code
        string target_audience
        string effect_type
        string effect_color
        datetime start_date
        datetime end_date
        boolean is_active
        int max_uses
        int current_uses
        datetime created_at
        datetime updated_at
    }

    GLOBAL_PRICING {
        string id PK
        float discount_percentage
        boolean is_active
        string description
        string created_by FK
        datetime created_at
        datetime updated_at
    }

    NOTIFICATION_SCHEDULE {
        string id PK
        string send_times
        string updated_by FK
        datetime created_at
        datetime updated_at
    }

    USER ||--o{ BOOKING : places
    PANDIT ||--o{ BOOKING : receives
    SERVICE ||--o{ BOOKING : booked_for
    BOOKING ||--o{ REVIEW : reviewed_in
    PANDIT ||--o{ SERVICE : owns
    ADMIN ||--o{ GLOBAL_PRICING : creates
    ADMIN ||--o{ NOTIFICATION_SCHEDULE : updates
