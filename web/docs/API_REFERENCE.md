# API Reference - Complete Endpoint Documentation

## Base URL
```
Development: http://localhost:5000
Production: https://your-domain.replit.app
```

## Authentication

All API endpoints use one of three authentication methods:

1. **Customer Auth:** Session-based (OTP verification)
2. **Enterprise Auth:** Session-based (bcrypt password)
3. **Admin Auth:** Session-based (email/password)

---

## Customer APIs

### Authentication

#### POST /api/auth/send-otp
**Purpose:** Generate and send OTP to user email

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `{ "message": "OTP sent" }`

**Errors:**
- `400`: Invalid email format
- `429`: Too many requests

---

#### POST /api/auth/verify-otp
**Purpose:** Verify OTP and create session

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Errors:**
- `401`: Invalid or expired OTP
- `400`: Missing fields

---

#### POST /api/auth/logout
**Purpose:** End session

**Response:** `{ "message": "Logged out" }`

---

#### GET /api/auth/me
**Purpose:** Get current user

**Response:**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "kyc_verified": false
  }
}
```

**Errors:**
- `401`: Not authenticated

---

### Packages

#### GET /api/unified-packages
**Purpose:** List all eSIM packages with filtering

**Query Params:**
- `destination`: Country code (e.g., "US")
- `currency`: Currency code (e.g., "EUR")
- `min_data`: Minimum data (GB)
- `max_price`: Maximum price
- `provider`: Provider filter

**Response:**
```json
{
  "packages": [
    {
      "id": "pkg_123",
      "destination": "United States",
      "country_code": "US",
      "data_amount": "5GB",
      "validity": "30 days",
      "price": 12.99,
      "currency": "USD",
      "provider": "airalo",
      "is_best_price": true
    }
  ]
}
```

---

#### GET /api/destinations
**Purpose:** List all destinations

**Response:**
```json
{
  "destinations": [
    {
      "id": "dest_123",
      "name": "United States",
      "code": "US",
      "package_count": 45,
      "min_price": 5.99
    }
  ]
}
```

---

### Orders

#### POST /api/orders
**Purpose:** Create new order with Stripe payment

**Request:**
```json
{
  "packageId": "pkg_123",
  "quantity": 1,
  "currency": "USD",
  "name": "John Doe",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "order": {
    "id": "order_456",
    "status": "pending",
    "price": 12.99
  },
  "payment": {
    "client_secret": "pi_secret_...",
    "publishable_key": "pk_..."
  }
}
```

**Errors:**
- `400`: Invalid package or validation error
- `401`: Not authenticated

---

#### GET /api/orders
**Purpose:** List user's orders

**Response:**
```json
{
  "orders": [
    {
      "id": "order_456",
      "status": "completed",
      "package_name": "USA 5GB",
      "price": 12.99,
      "iccid": "890...",
      "qr_code_url": "https://...",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

#### GET /api/orders/:id
**Purpose:** Get order details

**Response:**
```json
{
  "order": {
    "id": "order_456",
    "status": "completed",
    "package": { ... },
    "esim": {
      "iccid": "890...",
      "qr_code_url": "https://...",
      "activation_code": "LPA:1$..."
    },
    "usage": {
      "data_used": "2.5GB",
      "data_remaining": "2.5GB",
      "percentage_used": 50
    }
  }
}
```

---

### eSIM Usage

#### GET /api/sim-usage/:iccid
**Purpose:** Get real-time usage data

**Response:**
```json
{
  "iccid": "890...",
  "usage": {
    "data_total": "5GB",
    "data_used": "2.5GB",
    "data_remaining": "2.5GB",
    "percentage_used": 50
  },
  "status": "active",
  "expires_at": "2025-02-14T23:59:59Z"
}
```

---

### Top-Up

#### POST /api/top-up
**Purpose:** Add data to existing eSIM

**Request:**
```json
{
  "orderId": "order_456",
  "iccid": "890...",
  "topUpPackageId": "topup_789"
}
```

**Response:**
```json
{
  "topup": {
    "id": "topup_123",
    "package": {
      "data_amount": "3GB",
      "price": 8.99
    },
    "new_totals": {
      "data_total": "8GB"
    }
  },
  "payment": {
    "client_secret": "pi_..."
  }
}
```

---

### Support Tickets

#### POST /api/support-tickets
**Purpose:** Create support ticket

**Request:**
```json
{
  "subject": "eSIM not activating",
  "message": "...",
  "orderId": "order_456",
  "priority": "high"
}
```

**Response:**
```json
{
  "ticket": {
    "id": "ticket_123",
    "ticket_number": "SUP-00123",
    "status": "open"
  }
}
```

---

#### GET /api/support-tickets
**Purpose:** List user's tickets

---

#### POST /api/support-tickets/:id/replies
**Purpose:** Add reply to ticket

**Request:**
```json
{
  "message": "Still not working after restart"
}
```

---

### Notifications

#### GET /api/notifications
**Purpose:** Get in-app notifications

**Query Params:**
- `type`: Filter by type
- `is_read`: Filter by read status

**Response:**
```json
{
  "notifications": [
    {
      "id": "notif_123",
      "type": "order_completed",
      "title": "Your eSIM is Ready!",
      "message": "...",
      "is_read": false,
      "link": "/orders/order_456",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "unread_count": 3
}
```

---

#### PATCH /api/notifications/:id/read
**Purpose:** Mark notification as read

---

## Enterprise APIs

### Authentication

#### POST /api/enterprise/auth/register
**Purpose:** Register enterprise user

**Request:**
```json
{
  "email": "admin@company.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "company_name": "Acme Corp"
}
```

**Response:**
```json
{
  "user": {
    "id": "ent_user_123",
    "email": "admin@company.com",
    "company_name": "Acme Corp",
    "role": "admin"
  }
}
```

---

#### POST /api/enterprise/auth/login
**Purpose:** Login enterprise user

**Request:**
```json
{
  "email": "admin@company.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "user": {
    "id": "ent_user_123",
    "email": "admin@company.com",
    "enterprise_account_id": "ent_acc_456",
    "role": "admin"
  }
}
```

**Errors:**
- `401`: Invalid credentials

---

#### POST /api/enterprise/auth/logout
**Purpose:** Logout enterprise user

---

#### GET /api/enterprise/auth/me
**Purpose:** Get current enterprise user

---

### Quotes

#### GET /api/enterprise/quotes
**Purpose:** List sent quotes

**Query Params:**
- `status`: Filter by status (pending/approved/rejected)

**Response:**
```json
{
  "quotes": [
    {
      "id": "quote_123",
      "quote_number": "QT-00123",
      "package_name": "USA 5GB - 30 Days",
      "quantity": 100,
      "unit_price": 10.99,
      "total_price": 1099.00,
      "status": "pending",
      "valid_until": "2025-01-30T23:59:59Z"
    }
  ]
}
```

---

#### POST /api/enterprise/quotes/:id/accept
**Purpose:** Accept quote and create bulk order

**Response:**
```json
{
  "order": {
    "id": "bulk_order_456",
    "quote_id": "quote_123",
    "order_number": "BO-00456",
    "quantity": 100,
    "total_price": 1099.00,
    "status": "pending"
  }
}
```

**Errors:**
- `400`: Quote expired or already processed
- `404`: Quote not found

---

### Orders

#### GET /api/enterprise/orders
**Purpose:** List bulk orders

**Query Params:**
- `status`: Filter by status

**Response:**
```json
{
  "orders": [
    {
      "id": "bulk_order_456",
      "order_number": "BO-00456",
      "quantity": 100,
      "total_price": 1099.00,
      "status": "completed",
      "individual_esims": {
        "total": 100,
        "completed": 100,
        "allocated": 45,
        "unallocated": 55
      }
    }
  ]
}
```

---

#### GET /api/enterprise/orders/:id
**Purpose:** Get bulk order details

**Response:**
```json
{
  "order": {
    "id": "bulk_order_456",
    "individual_esims": [
      {
        "id": "order_001",
        "iccid": "890...",
        "status": "completed",
        "allocated_to": "emp@company.com"
      }
    ],
    "summary": {
      "total": 100,
      "completed": 100,
      "allocated": 45
    }
  }
}
```

---

#### POST /api/enterprise/orders/:id/distribute
**Purpose:** Distribute eSIMs to employee emails (concurrency-safe)

**Request:**
```json
{
  "employeeEmails": [
    "emp1@company.com",
    "emp2@company.com"
  ]
}
```

**Response (Success):**
```json
{
  "message": "Distribution completed",
  "results": [
    {
      "email": "emp1@company.com",
      "status": "sent",
      "orderId": "order_001"
    },
    {
      "email": "emp2@company.com",
      "status": "failed",
      "error": "SMTP error"
    }
  ],
  "totalSent": 1,
  "totalFailed": 1
}
```

**Response (Conflict - 409):**
```json
{
  "error": "Some eSIMs were already allocated. Please refresh and try again."
}
```

**Errors:**
- `400`: Insufficient unallocated eSIMs
- `404`: Order not found
- `409`: Conflict (concurrent allocation)

---

#### GET /api/enterprise/orders/:id/export
**Purpose:** Export eSIMs as CSV

**Response:** CSV file download

**CSV Format:**
```
Order ID,ICCID,QR Code URL,Activation Code,Data,Validity,Status,Download Token
order_001,890...,https://...,LPA:1$...,5GB,30 days,completed,DL_token_...
```

---

### eSIMs

#### GET /api/enterprise/esims
**Purpose:** List allocated eSIMs

**Query Params:**
- `status`: Filter by allocation status
- `search`: Search by email or order ID

---

## Admin APIs

### Authentication

#### POST /api/admin/auth/login
**Purpose:** Admin login

**Request:**
```json
{
  "email": "admin@platform.com",
  "password": "AdminPass123!"
}
```

**Response:**
```json
{
  "admin": {
    "id": "admin_123",
    "email": "admin@platform.com",
    "role": "super_admin"
  }
}
```

---

### Analytics

#### GET /api/admin/analytics/revenue
**Purpose:** Get revenue metrics

**Query Params:**
- `start_date`: ISO date
- `end_date`: ISO date

**Response:**
```json
{
  "total_revenue": 50000.00,
  "revenue_by_day": [
    { "date": "2025-01-15", "amount": 1200.00 }
  ],
  "revenue_by_provider": [
    { "provider": "airalo", "amount": 30000.00 }
  ]
}
```

---

#### GET /api/admin/analytics/orders
**Purpose:** Get order statistics

**Response:**
```json
{
  "total_orders": 1500,
  "orders_by_status": {
    "completed": 1400,
    "processing": 50,
    "failed": 50
  },
  "orders_by_provider": {
    "airalo": 800,
    "esim_access": 400,
    "esim_go": 300
  }
}
```

---

### Customer Management

#### GET /api/admin/customers
**Purpose:** List all customers

**Query Params:**
- `kyc_verified`: Filter by KYC status
- `search`: Search by email or name

---

### Order Management

#### GET /api/admin/orders
**Purpose:** List all orders

**Query Params:**
- `status`: Filter by status
- `provider`: Filter by provider
- `start_date`, `end_date`: Date range

---

### Enterprise Management

#### POST /api/admin/enterprise/accounts
**Purpose:** Create enterprise account

**Request:**
```json
{
  "company_name": "Acme Corporation",
  "contact_email": "admin@acme.com",
  "billing_email": "billing@acme.com",
  "company_size": "100-500",
  "industry": "Technology"
}
```

**Response:**
```json
{
  "account": {
    "id": "ent_acc_123",
    "company_name": "Acme Corporation",
    "status": "pending_kyc"
  }
}
```

---

#### POST /api/admin/enterprise/quotes
**Purpose:** Create quote for enterprise

**Request:**
```json
{
  "enterpriseAccountId": "ent_acc_123",
  "packageId": "pkg_456",
  "quantity": 100,
  "unit_price": 10.99,
  "valid_until": "2025-01-30T23:59:59Z",
  "notes": "Bulk discount applied"
}
```

**Response:**
```json
{
  "quote": {
    "id": "quote_789",
    "quote_number": "QT-00789",
    "total_price": 1099.00,
    "status": "pending"
  }
}
```

---

#### POST /api/admin/enterprise/orders
**Purpose:** Create bulk order from quote

**Request:**
```json
{
  "quoteId": "quote_789"
}
```

---

#### POST /api/admin/enterprise/orders/:id/execute
**Purpose:** Execute bulk order (provision eSIMs from provider)

**Response:**
```json
{
  "execution": {
    "total": 100,
    "successful": 100,
    "failed": 0,
    "provider": "airalo",
    "execution_type": "batch"
  }
}
```

---

#### GET /api/admin/enterprise/orders/:id/details
**Purpose:** Get detailed execution status

**Response:**
```json
{
  "order": {
    "id": "bulk_order_456",
    "status": "completed",
    "individual_orders": [...]
  }
}
```

---

### Provider Management

#### GET /api/admin/providers
**Purpose:** List all providers

**Response:**
```json
{
  "providers": [
    {
      "id": "prov_123",
      "name": "Airalo",
      "is_enabled": true,
      "pricing_margin": 10,
      "api_status": "active",
      "last_sync": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

#### PATCH /api/admin/providers/:id
**Purpose:** Update provider configuration

**Request:**
```json
{
  "is_enabled": true,
  "pricing_margin": 15,
  "api_key": "new_key_..."
}
```

---

#### POST /api/admin/sync-packages
**Purpose:** Manually trigger package sync from all providers

**Response:**
```json
{
  "sync": {
    "status": "completed",
    "providers_synced": 3,
    "packages_updated": 450,
    "duration_ms": 12500
  }
}
```

---

### Email Template Management

#### GET /api/admin/email-templates
**Purpose:** List email templates

---

#### POST /api/admin/email-templates
**Purpose:** Create email template

**Request:**
```json
{
  "name": "order_confirmation",
  "subject": "Your eSIM Order Confirmation",
  "html_body": "<h1>Hello {{user.name}}</h1>...",
  "variables": ["user.name", "order.id"],
  "is_active": true
}
```

---

#### PATCH /api/admin/email-templates/:id
**Purpose:** Update email template

---

### Currency Management

#### GET /api/admin/currencies
**Purpose:** List currencies

---

#### POST /api/admin/currencies
**Purpose:** Add currency

**Request:**
```json
{
  "currency_code": "EUR",
  "rate": 0.92,
  "is_enabled": true
}
```

---

#### PATCH /api/admin/currencies/:id
**Purpose:** Update currency rate

---

#### DELETE /api/admin/currencies/:id
**Purpose:** Remove currency

---

## Public APIs (No Auth Required)

#### GET /api/currencies
**Purpose:** Get enabled currencies

**Response:**
```json
{
  "currencies": [
    {
      "code": "USD",
      "name": "US Dollar",
      "symbol": "$",
      "rate": 1.00,
      "is_base": true
    },
    {
      "code": "EUR",
      "name": "Euro",
      "symbol": "€",
      "rate": 0.92
    }
  ]
}
```

---

## Webhooks

### Stripe Webhook

#### POST /api/webhooks/stripe
**Purpose:** Handle Stripe payment events

**Events:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

**Signature Validation:** Required (Stripe-Signature header)

---

### Airalo Webhook

#### POST /api/webhooks/airalo
**Purpose:** Handle Airalo notifications

**Events:**
- `low_data_warning`
- `esim_expiring_soon`

**Signature Validation:** Required (HMAC)

---

## Error Response Format

All API errors follow this format:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (validation error)
- `401`: Unauthorized (not authenticated)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (e.g., concurrent allocation)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

---

*Last Updated: 2025-11-11*
