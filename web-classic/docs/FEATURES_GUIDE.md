# Features Guide - eSIM Marketplace Platform

**Complete Documentation for Customer, Enterprise, and eSIM Management Modules**

---

## Table of Contents

1. [Customer Module](#customer-module)
2. [Enterprise B2B Module](#enterprise-b2b-module)
3. [eSIM Management System](#esim-management-system)
4. [Admin Panel Features](#admin-panel-features)
5. [Testing Checklists](#testing-checklists)

---

# Customer Module

The customer-facing portal enables users to browse, purchase, and manage eSIM data packages for international travel.

## Authentication (OTP-Based)

### Flow
1. Customer enters email address
2. System sends 6-digit OTP code via email
3. Customer enters code within 5 minutes
4. Session established upon verification

### Key Features
- Passwordless authentication (improved security)
- Single-use codes with 5-minute expiration
- Automatic account creation for new emails
- Session persistence with HTTP-only cookies

### Implementation
```typescript
// Request OTP
POST /api/auth/request-otp
{ "email": "customer@example.com" }

// Verify OTP
POST /api/auth/verify-otp
{ "email": "customer@example.com", "code": "123456" }
```

---

## Package Discovery

### Browsing Features
- **Destination Search**: Search by country name or code
- **Region Filtering**: Africa, Asia, Europe, Americas, Oceania
- **Data Amount Filters**: 1GB, 3GB, 5GB, 10GB, Unlimited
- **Validity Filters**: 7, 15, 30, 60, 90 days
- **Price Range**: Slider for min/max price
- **Provider Filter**: Airalo, eSIM Access, eSIM Go
- **Best Price Tags**: Highlighted packages with lowest price for data/validity combo

### Package Card Display
- Country flag and destination name
- Data amount and validity period
- Provider logo
- Price with currency conversion
- "Best Price" badge (when applicable)
- Quick "Buy Now" button

### Multi-Currency Support
- Automatic conversion based on user preference
- Supported currencies: USD, EUR, GBP, CAD, AUD, JPY
- Real-time exchange rates (updated daily)

---

## Order Flow

### Purchase Process
1. **Select Package**: Choose from filtered results
2. **Review Details**: Confirm data amount, validity, price
3. **Payment**: Stripe checkout with card processing
4. **Confirmation**: Order created, payment processed
5. **eSIM Delivery**: QR code available in dashboard

### Payment Integration
- Stripe Payment Intents API
- Secure card tokenization
- Support for major credit/debit cards
- Payment status tracking (pending → completed → failed)

### Order Statuses
| Status | Description |
|--------|-------------|
| `pending` | Order created, awaiting processing |
| `processing` | Submitted to provider |
| `completed` | eSIM provisioned, ready for use |
| `failed` | Processing failed (auto-retry enabled) |

---

## eSIM Activation

### QR Code Installation
1. Navigate to "My eSIMs" section
2. Click on completed order
3. Scan QR code with device camera
4. Follow on-screen installation prompts

### Manual Installation
- LPA string available for manual entry
- Step-by-step instructions per device type
- Supported: iOS 12.1+, Android 9+

### Device-Specific Guides
- **iPhone**: Settings → Cellular → Add Cellular Plan
- **Samsung**: Settings → Connections → SIM Manager
- **Google Pixel**: Settings → Network & Internet → SIMs

---

## Data Usage Tracking

### Dashboard Features
- Real-time data consumption display
- Visual progress bar (% used)
- Days remaining until expiration
- Data remaining in MB/GB

### Usage Updates
- Synced from provider every 60 minutes
- Manual refresh available
- Low data alerts (50%, 75%, 90%)

---

## Top-Up Functionality

### Adding Data
1. View active eSIM in dashboard
2. Click "Top Up" button
3. Select from compatible packages
4. Complete payment
5. Data added immediately

### Pricing
- Separate margin from package purchases (default: 40%)
- Compatible packages shown based on eSIM type
- Same payment flow as initial purchase

---

## Support Tickets

### Creating Tickets
- Category selection (Order, Technical, Billing, Other)
- Priority levels (Low, Medium, High, Urgent)
- File attachments supported
- Order reference linking

### Ticket Management
- View all tickets with status
- Real-time status updates
- Admin response notifications
- Resolution tracking

---

## Multi-Language Support

### Available Languages
- English (en) - Default
- Spanish (es)
- French (fr)

### Implementation
```typescript
// TranslationContext usage
const { t, language, setLanguage } = useTranslation();

// Usage in components
<h1>{t('welcome_message')}</h1>
<Button>{t('buy_now')}</Button>
```

### Language Detection
- Browser preference detection
- Manual selection in settings
- Persistence across sessions

---

# Enterprise B2B Module

The Enterprise module enables businesses to manage bulk eSIM orders for employees with secure distribution and tracking.

## Enterprise Account Management

### Account Creation (Admin)
1. Admin creates enterprise account with company details
2. Initial password set and hashed (bcrypt, cost 12)
3. Credit limit configured
4. Account activated

### Account Fields
| Field | Description |
|-------|-------------|
| Company Name | Legal business name |
| Contact Name | Primary contact person |
| Contact Email | Login email (unique) |
| Password | Bcrypt hashed |
| Phone | Contact number |
| Country | Business location |
| Credit Limit | Maximum order value |
| Status | active, suspended, inactive |

---

## Enterprise Authentication

### Login Flow
1. Enterprise user enters email + password
2. Password verified against bcrypt hash
3. Session established with enterprise context
4. Audit log entry created

### Session Audit Logging
```typescript
// Logged events
{
  enterpriseAccountId: "uuid",
  action: "login" | "logout" | "quote_view" | "order_place",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  timestamp: "2025-11-27T10:00:00Z"
}
```

---

## Quote Management

### Quote Generation (Admin)
1. Admin selects enterprise account
2. Chooses package from unified catalog
3. Sets quantity and unit price
4. Calculates total with any discounts
5. Quote sent to enterprise contact

### Quote Fields
| Field | Description |
|-------|-------------|
| Package | Selected eSIM package |
| Quantity | Number of eSIMs |
| Unit Price | Price per eSIM |
| Total Price | Quantity × Unit Price |
| Validity | Quote expiration date |
| Status | pending, accepted, rejected, expired |
| Notes | Additional terms/conditions |

### Quote Statuses
| Status | Description |
|--------|-------------|
| `pending` | Awaiting enterprise response |
| `accepted` | Enterprise accepted, ready for execution |
| `rejected` | Enterprise declined |
| `expired` | Past validity date |
| `executed` | Order placed successfully |

---

## Bulk Order Execution

### Execution Flow
1. Enterprise accepts quote
2. Admin clicks "Execute Order"
3. System calls provider API for each eSIM
4. Individual order records created
5. eSIMs provisioned with ICCIDs assigned
6. Available for distribution

### Order Processing
```typescript
// Batch order submission
for (let i = 0; i < quantity; i++) {
  const order = await providerFactory
    .get(package.providerId)
    .createOrder(package.providerPackageId, 1);
  
  await db.insert(enterpriseOrders).values({
    enterpriseAccountId: account.id,
    quoteId: quote.id,
    packageId: package.id,
    providerOrderId: order.requestId,
    iccid: order.iccid,
    status: order.status,
  });
}
```

---

## Concurrency-Safe Distribution

### The Problem
Multiple enterprise users might try to distribute the same eSIMs simultaneously, risking double-allocation.

### The Solution
```typescript
// Transaction-scoped distribution with row locking
await db.transaction(async (tx) => {
  // 1. Lock available orders (skips already-locked rows)
  const locked = await tx.execute(sql`
    SELECT eo.* FROM enterprise_orders eo
    WHERE eo.enterprise_account_id = ${accountId}
    AND eo.status = 'completed'
    AND eo.id NOT IN (
      SELECT order_id FROM enterprise_order_allocations
    )
    FOR UPDATE SKIP LOCKED
    LIMIT ${requestedQuantity}
  `);

  // 2. Verify enough available
  if (locked.rows.length < requestedQuantity) {
    throw new Error('INSUFFICIENT_AVAILABLE_ESIMS');
  }

  // 3. Insert allocations with unique constraint
  for (const order of locked.rows) {
    await tx.insert(enterpriseOrderAllocations)
      .values({
        orderId: order.id,  // UNIQUE constraint prevents duplicates
        recipientEmail: recipientEmail,
        recipientName: recipientName,
        allocatedBy: userId,
      })
      .onConflictDoNothing();
  }

  // 4. Verify all inserted
  const inserted = await tx.query.enterpriseOrderAllocations.findMany({
    where: inArray(allocations.orderId, locked.rows.map(o => o.id))
  });

  if (inserted.length < requestedQuantity) {
    throw new Error('CONCURRENT_ALLOCATION_CONFLICT');
  }
});
```

### Client-Side Conflict Handling
```typescript
const distributeMutation = useMutation({
  mutationFn: async (data) => {
    const response = await apiRequest("POST", "/api/enterprise/distribute", data);
    if (response.status === 409) {
      throw new ConflictError("eSIMs already allocated");
    }
    return response.json();
  },
  onError: (error) => {
    if (error instanceof ConflictError) {
      toast.error("Some eSIMs were already distributed. Refreshing...");
      queryClient.invalidateQueries({ queryKey: ["/api/enterprise/orders"] });
    }
  }
});
```

---

## Enterprise Portal Features

### Dashboard
- Account overview with company details
- Active quotes summary
- Order statistics
- Recent activity feed

### Quotes Page
- View all quotes (pending, accepted, executed)
- Accept/reject quotes
- Quote detail view with terms
- Historical quote archive

### Orders Page
- All bulk orders with status
- Filter by status, date range
- Order detail view
- Distribution status per order

### eSIM Distribution
- Select unallocated eSIMs
- Enter recipient details (email, name)
- Bulk distribution (CSV upload)
- Email notification sent to recipients

### CSV Export
- Export all eSIMs with details
- Columns: ICCID, QR Code URL, Recipient, Status
- Filtered export options
- Secure download links

---

## Distribution Email Template

```html
Subject: Your eSIM is Ready - [Company Name]

Dear [Recipient Name],

Your eSIM has been allocated and is ready for installation.

Package: [Package Name]
Data: [Data Amount]
Validity: [Days] days

Installation:
1. Scan the attached QR code with your device camera
2. Follow the on-screen prompts to add the eSIM
3. Enable the eSIM when you arrive at your destination

QR Code: [Attached or linked]

If you have any questions, contact [Company Contact].

Best regards,
[Company Name]
```

---

# eSIM Management System

Comprehensive lifecycle management for eSIMs from order to expiration.

## eSIM Details & Tracking

### Data Retrieved
- ICCID (unique identifier)
- Activation status
- Package information
- Data remaining
- Validity remaining
- Activation date
- Operator information

### Admin View
```typescript
// Admin can view any eSIM
GET /api/admin/orders/:orderId/esim

// Response
{
  "esim": {
    "iccid": "89012345678901234567",
    "status": "activated",
    "package": "Turkey - 3GB - 30 Days",
    "dataRemaining": "2.5 GB",
    "validityRemaining": "25 days",
    "activationDate": "2025-11-01T10:00:00Z"
  }
}
```

### Customer View
```typescript
// Customer can view their own eSIMs
GET /api/user/orders/:orderId/esim
// Same response, with ownership validation
```

---

## Installation Instructions

### QR Code Generation
- High-resolution QR code for scanning
- LPA string for manual entry
- Downloadable/printable format

### Device-Specific Instructions
```typescript
GET /api/esims/:iccid/instructions?device=ios&model=iphone-14&language=en

// Response
{
  "qrCode": "data:image/png;base64,iVBORw0KG...",
  "manualCode": "LPA:1$rsp.truphone.com$ABC123",
  "steps": [
    "Open Settings on your iPhone",
    "Tap Cellular",
    "Tap Add Cellular Plan",
    "Scan the QR code or enter manually"
  ],
  "deviceCompatibility": {
    "compatible": true,
    "requirements": "iOS 12.1 or later"
  }
}
```

---

## Data Usage Monitoring

### Real-Time Tracking
```typescript
GET /api/esims/:iccid/usage

// Response
{
  "usage": {
    "totalMb": 3072,
    "usedMb": 512,
    "remainingMb": 2560,
    "percentageUsed": 16.67,
    "validityEnd": "2025-12-01T23:59:59Z",
    "daysRemaining": 25
  }
}
```

### Usage Alerts
- Low data notifications (configurable thresholds)
- Expiring eSIM alerts
- Integration with Airalo webhook notifications

---

## Top-Up System

### Dual Pricing Structure
| Order Type | Default Margin |
|------------|----------------|
| Package Orders | 50% |
| Top-Up Orders | 40% |

### Top-Up Flow
1. Customer views eSIM in dashboard
2. Available top-up packages loaded
3. Prices calculated with margin
4. Payment processed via Stripe
5. Data added to existing eSIM

### API Endpoints
```typescript
// Get available top-ups
GET /api/esims/:iccid/topup-packages

// Submit top-up order
POST /api/topups
{
  "orderId": "original-order-uuid",
  "packageId": "topup-package-uuid",
  "iccid": "89012345678901234567"
}
```

---

## Background Jobs

### Pending Orders Check (Every 5 Minutes)
```typescript
cron.schedule("*/5 * * * *", async () => {
  const pendingOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.status, "pending"),
      or(
        isNull(orders.lastStatusCheck),
        lt(orders.lastStatusCheck, cutoffTime)
      )
    ),
  });

  for (const order of pendingOrders) {
    await checkAndUpdateOrderStatus(order.id);
  }
});
```

### Failed Order Retry (Every 10 Minutes)
```typescript
const RETRY_DELAYS = [5, 15, 60]; // minutes
const MAX_RETRIES = 3;

// Exponential backoff retry logic
cron.schedule("*/10 * * * *", async () => {
  const failedOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.status, "failed"),
      lt(orders.retryCount, MAX_RETRIES)
    ),
  });

  for (const order of failedOrders) {
    const retryCount = order.retryCount || 0;
    const delayMinutes = RETRY_DELAYS[retryCount];
    const nextRetryTime = order.lastRetryAt + (delayMinutes * 60 * 1000);

    if (Date.now() >= nextRetryTime) {
      await retryOrder(order.id);
    }
  }
});
```

### Usage Sync (Every 60 Minutes)
```typescript
cron.schedule("0 * * * *", async () => {
  const completedOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.status, "completed"),
      isNotNull(orders.iccid)
    ),
    limit: 100, // Batch processing
  });

  for (const order of completedOrders) {
    await syncUsageData(order.iccid);
  }
});
```

---

# Admin Panel Features

## Dashboard Analytics

### Metrics Displayed
- Total Revenue (today, week, month)
- Active Orders count
- New Customers count
- Average Order Value
- Trend indicators (% change)
- 7-day sparkline charts

### Revenue Breakdown
- By provider (Airalo, eSIM Access, eSIM Go)
- By destination (top 10)
- By package type

---

## Customer Management

### Customer List
- Search by email, name, ID
- Filter by status (verified, unverified)
- Sort by registration date, order count
- Export to CSV

### Customer Detail
- Profile information
- Order history
- Support tickets
- KYC status
- Account actions (suspend, delete)

---

## Order Management

### Order List
- All orders with status
- Filter by status, provider, date
- Search by order ID, customer email
- Bulk actions (retry, cancel)

### Order Detail
- Complete order information
- eSIM details (when completed)
- Payment information
- Status timeline
- Manual actions (refresh status, retry)

---

## Provider Configuration

### Provider Settings
| Setting | Description |
|---------|-------------|
| API Key | Provider authentication |
| API Secret | Provider secret |
| Enabled | Toggle provider on/off |
| Priority | Order preference |
| Sandbox Mode | Use test environment |

### Provider Health
- Connection status
- Last sync time
- Error rate
- Average response time

---

## Email Template Management

### Template Types
- Order Confirmation
- eSIM Ready
- Payment Receipt
- Password Reset
- Support Ticket Update
- Enterprise Quote
- Distribution Notification

### Dynamic Variables
```
{{user.name}} - Customer name
{{order.id}} - Order ID
{{package.name}} - Package name
{{esim.qrCode}} - QR code image
{{company.name}} - Business name
```

### Template Editor
- WYSIWYG editor
- Variable insertion
- Preview mode
- Test send functionality

---

## Platform Settings

### General Settings
- Site name and logo
- Default currency
- Default language
- Support email

### Pricing Settings
- Package margin (default: 50%)
- Top-up margin (default: 40%)
- Currency conversion rates
- Discount codes

### Security Settings
- Session timeout
- OTP expiration
- Password requirements
- IP whitelist (admin)

---

# Testing Checklists

## Customer Flow Testing

### Authentication
- [ ] Request OTP sends email
- [ ] Valid OTP logs in user
- [ ] Expired OTP rejected
- [ ] Invalid OTP rejected
- [ ] New user account created
- [ ] Session persists on refresh

### Package Browsing
- [ ] Packages load on page
- [ ] Destination search works
- [ ] Filters apply correctly
- [ ] Best price badges display
- [ ] Multi-currency conversion
- [ ] Mobile responsive layout

### Order Process
- [ ] Add package to cart
- [ ] Payment form loads
- [ ] Card payment succeeds
- [ ] Order confirmation displays
- [ ] Order appears in history
- [ ] Email notification sent

### eSIM Management
- [ ] QR code displays
- [ ] Manual code copyable
- [ ] Usage data accurate
- [ ] Top-up packages load
- [ ] Top-up purchase works

---

## Enterprise Flow Testing

### Authentication
- [ ] Login with password works
- [ ] Invalid password rejected
- [ ] Session audit logged
- [ ] Logout clears session

### Quotes
- [ ] View pending quotes
- [ ] Accept quote works
- [ ] Reject quote works
- [ ] Quote details accurate

### Distribution
- [ ] Available eSIMs display
- [ ] Single distribution works
- [ ] Bulk distribution works
- [ ] Concurrent access handled (409)
- [ ] Email sent to recipient
- [ ] CSV export downloads

---

## Admin Flow Testing

### Dashboard
- [ ] Analytics load correctly
- [ ] Revenue figures accurate
- [ ] Charts render properly

### Management
- [ ] Customer list loads
- [ ] Order list loads
- [ ] Filtering works
- [ ] Search works
- [ ] Actions complete

### Provider Config
- [ ] Settings save correctly
- [ ] Connection test works
- [ ] Sync triggers properly

---

## Background Jobs Testing

### Pending Orders (5 min)
```bash
# Create pending order
# Wait 5 minutes
# Verify status updated
```

### Failed Retries (exponential)
```bash
# Create failed order (retryCount=0)
# Wait 5 min → retryCount=1
# Wait 15 min → retryCount=2
# Wait 60 min → retryCount=3
# Verify no more retries
```

### Usage Sync (60 min)
```bash
# Check logs for sync activity
# Verify usage data updated
```

---

## End-to-End Scenarios

### Scenario 1: Complete Customer Journey
```
1. Customer signs up → OTP sent
2. Customer verifies → Account created
3. Customer browses → Packages displayed
4. Customer purchases → Order created
5. Order processed → eSIM ready
6. Customer installs → QR code used
7. Customer uses data → Usage tracked
8. Customer tops up → Data added
```

### Scenario 2: Enterprise Bulk Order
```
1. Admin creates account → Credentials set
2. Admin generates quote → Email sent
3. Enterprise accepts → Quote marked accepted
4. Admin executes → Orders created
5. eSIMs provisioned → ICCIDs assigned
6. Enterprise distributes → Allocations created
7. Recipients notified → Emails sent
8. eSIMs installed → Activation tracked
```

### Scenario 3: Failed Order Recovery
```
1. Order fails → Status: failed, retryCount: 0
2. 5 min → Retry #1, retryCount: 1
3. Still fails → Wait 15 min
4. Retry #2 → retryCount: 2
5. Still fails → Wait 60 min
6. Retry #3 → retryCount: 3
7. Success → Status: completed
   OR Max retries → Permanent failure
```

---

**Document Version:** 1.0  
**Last Updated:** November 2025

For API endpoint details, see [API_REFERENCE.md](API_REFERENCE.md).  
For technical implementation, see [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).
