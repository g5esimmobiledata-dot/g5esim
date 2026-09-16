# Developer Guide - eSIM Marketplace Platform

**Comprehensive Technical Reference for Development, Architecture, and Deployment**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [Authentication System](#authentication-system)
7. [Development Workflows](#development-workflows)
8. [Provider Integration Layer](#provider-integration-layer)
9. [Background Jobs & Schedulers](#background-jobs--schedulers)
10. [Design System & UI Guidelines](#design-system--ui-guidelines)
11. [Security Guidelines](#security-guidelines)
12. [Performance Optimization](#performance-optimization)
13. [Deployment Guide](#deployment-guide)
14. [Troubleshooting](#troubleshooting)
15. [Code Style & Best Practices](#code-style--best-practices)

---

## Quick Start

### Day 1: Environment Setup

1. Clone the repository
2. Set up environment variables (see [Environment Variables](#environment-variables))
3. Run `npm install`
4. Run `npm run db:push` to set up database
5. Start development server: `npm run dev`

### Essential Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Stripe Payments
STRIPE_SECRET_KEY=sk_...
VITE_STRIPE_PUBLIC_KEY=pk_...

# eSIM Providers
AIRALO_API_KEY=...
AIRALO_API_SECRET=...
ESIM_ACCESS_CLIENT_ID=...
ESIM_ACCESS_CLIENT_SECRET=...
ESIM_GO_API_KEY=...

# Email (SMTP)
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...

# Session
SESSION_SECRET=...
```

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Modules                      │
├─────────────────────────────────────────────────────────┤
│ Customer Portal  │  Enterprise Portal  │  Admin Dashboard│
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend Services                      │
├─────────────────────────────────────────────────────────┤
│ Auth  │  Orders  │  Providers  │  Notifications         │
└─────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
       Database                      External APIs
   (PostgreSQL/Neon)          (Airalo, eSIM Access, eSIM Go)
```

### Module Responsibilities

| Module | Description |
|--------|-------------|
| **Customer Portal** | OTP auth, package browsing, orders, eSIM management, support |
| **Enterprise Portal** | B2B login, quotes, bulk orders, eSIM distribution, CSV export |
| **Admin Dashboard** | Analytics, customer/order/provider management, settings |
| **Provider Layer** | Unified abstraction for Airalo, eSIM Access, eSIM Go |
| **Background Jobs** | Order status polling, retry logic, usage sync, package sync |

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool and dev server |
| Wouter | Client-side routing |
| TanStack Query | Server state management |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Component library |
| Framer Motion | Animations |
| Stripe.js | Payment processing |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js + Express | Server framework |
| TypeScript | Type safety |
| Drizzle ORM | Database queries and schema |
| express-session | Session management |
| bcrypt | Password hashing |
| Nodemailer | Email sending |
| Multer | File uploads |

### Database
| Technology | Purpose |
|------------|---------|
| PostgreSQL (Neon) | Serverless database |
| Drizzle ORM | Schema management |
| UUID primary keys | Distributed IDs |

### External Services
| Service | Purpose |
|---------|---------|
| Stripe | Payment processing |
| Airalo API | eSIM provisioning (primary) |
| eSIM Access API | eSIM provisioning (secondary) |
| eSIM Go API | eSIM provisioning (tertiary) |
| SMTP | Email delivery |

---

## Project Structure

```
project-root/
├── client/                    # Frontend (React)
│   ├── src/
│   │   ├── pages/            # Route components
│   │   │   ├── admin/        # Admin dashboard pages
│   │   │   ├── enterprise/   # Enterprise portal pages
│   │   │   └── *.tsx         # Customer pages
│   │   ├── components/       # Reusable components
│   │   │   └── ui/           # shadcn components
│   │   ├── lib/              # Utilities
│   │   │   ├── queryClient.ts
│   │   │   └── utils.ts
│   │   ├── hooks/            # Custom hooks
│   │   ├── contexts/         # React contexts
│   │   └── App.tsx           # Main app component
│   └── index.html
│
├── server/                    # Backend (Express)
│   ├── routes.ts             # All API endpoints
│   ├── vite.ts               # Vite integration
│   ├── providers/            # Provider integrations
│   │   ├── ProviderFactory.ts
│   │   ├── AiraloProvider.ts
│   │   ├── EsimAccessProvider.ts
│   │   └── EsimGoProvider.ts
│   ├── services/             # Business logic
│   │   ├── esim.ts
│   │   ├── order-status.ts
│   │   └── status-scheduler.ts
│   ├── email/                # Email utilities
│   │   ├── sendEmail.ts
│   │   └── templates/
│   └── index.ts              # Server entry point
│
├── shared/                    # Shared code
│   └── schema.ts             # Drizzle database schema
│
├── docs/                      # Documentation
│   ├── DEVELOPER_GUIDE.md    # This file
│   ├── FEATURES_GUIDE.md     # Module documentation
│   └── API_REFERENCE.md      # API endpoints
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle.config.ts
├── design_guidelines.md      # UI/UX guidelines
└── replit.md                 # Project overview
```

---

## Database Schema

### Core Tables

#### Users (Customers)
```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  displayUserId: varchar("display_user_id").unique(), // UID001, UID002
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  country: varchar("country"),
  language: varchar("language").default("en"),
  currency: varchar("currency").default("USD"),
  profileImage: text("profile_image"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### Orders
```typescript
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  displayOrderId: varchar("display_order_id").unique(), // OID001, OID002
  userId: varchar("user_id").references(() => users.id),
  packageId: varchar("package_id").references(() => packages.id),
  
  // Provider Integration
  providerId: varchar("provider_id"), // airalo, esim_access, esim_go
  requestId: varchar("request_id"),   // Provider's order ID
  iccid: varchar("iccid"),            // eSIM ICCID
  
  // Pricing
  providerPrice: varchar("provider_price"),  // Cost from provider
  customerPrice: varchar("customer_price"),  // Customer pays (with margin)
  currency: varchar("currency").default("USD"),
  
  // Status & Retry Tracking
  status: varchar("status"),          // pending, processing, completed, failed
  retryCount: integer("retry_count").default(0),
  lastRetryAt: timestamp("last_retry_at"),
  lastStatusCheck: timestamp("last_status_check"),
  failureReason: text("failure_reason"),
  
  // Payment
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  paymentStatus: varchar("payment_status"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### Enterprise Accounts
```typescript
export const enterpriseAccounts = pgTable("enterprise_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: varchar("company_name").notNull(),
  contactName: varchar("contact_name").notNull(),
  contactEmail: varchar("contact_email").unique().notNull(),
  password: varchar("password").notNull(), // bcrypt hashed
  phone: varchar("phone"),
  country: varchar("country"),
  status: varchar("status").default("active"),
  creditLimit: varchar("credit_limit"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### Enterprise Orders (Bulk)
```typescript
export const enterpriseOrders = pgTable("enterprise_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enterpriseAccountId: varchar("enterprise_account_id").references(() => enterpriseAccounts.id),
  quoteId: varchar("quote_id").references(() => enterpriseQuotes.id),
  packageId: varchar("package_id").references(() => unifiedPackages.id),
  quantity: integer("quantity").notNull(),
  unitPrice: varchar("unit_price").notNull(),
  totalPrice: varchar("total_price").notNull(),
  status: varchar("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

#### Enterprise Order Allocations (Concurrency-Safe)
```typescript
export const enterpriseOrderAllocations = pgTable("enterprise_order_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => enterpriseOrders.id).unique(), // CRITICAL: Unique constraint
  recipientEmail: varchar("recipient_email").notNull(),
  recipientName: varchar("recipient_name"),
  allocatedAt: timestamp("allocated_at").defaultNow().notNull(),
  allocatedBy: varchar("allocated_by"),
  emailSentAt: timestamp("email_sent_at"),
});
```

#### Unified Packages (Multi-Provider)
```typescript
export const unifiedPackages = pgTable("unified_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull(),           // airalo, esim_access, esim_go
  providerPackageId: varchar("provider_package_id").notNull(),
  destinationCode: varchar("destination_code").notNull(), // ISO country code
  destinationName: varchar("destination_name").notNull(),
  packageName: varchar("package_name").notNull(),
  dataAmount: varchar("data_amount").notNull(),           // e.g., "3GB"
  dataMb: integer("data_mb"),                             // Numeric MB
  validity: integer("validity").notNull(),                // Days
  providerPrice: varchar("provider_price").notNull(),     // Cost from provider
  customerPrice: varchar("customer_price").notNull(),     // With margin
  currency: varchar("currency").default("USD"),
  isBestPrice: boolean("is_best_price").default(false),   // Best price tag
  isEnabled: boolean("is_enabled").default(true),
  autoMode: boolean("auto_mode").default(true),           // Auto enable/disable
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Database Indexes

```sql
-- Performance indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status_check ON orders(status, last_status_check);

CREATE INDEX idx_packages_destination ON unified_packages(destination_code);
CREATE INDEX idx_packages_provider ON unified_packages(provider_id);
CREATE INDEX idx_packages_best_price ON unified_packages(is_best_price);

CREATE INDEX idx_enterprise_orders_account ON enterprise_orders(enterprise_account_id);
CREATE INDEX idx_enterprise_orders_status ON enterprise_orders(status);
```

---

## Authentication System

### Customer Authentication (OTP-Based)

```typescript
// 1. Request OTP
app.post("/api/auth/request-otp", async (req, res) => {
  const { email } = req.body;
  const otp = generateOTP(); // 6-digit code
  
  await storage.createOTP({
    email,
    code: otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  });
  
  await sendEmail({
    to: email,
    subject: "Your Login Code",
    html: `Your code is: ${otp}`,
  });
  
  res.json({ message: "OTP sent" });
});

// 2. Verify OTP
app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, code } = req.body;
  const otpRecord = await storage.getOTP(email, code);
  
  if (!otpRecord || otpRecord.expiresAt < new Date()) {
    return res.status(401).json({ message: "Invalid or expired code" });
  }
  
  let user = await storage.getUserByEmail(email);
  if (!user) {
    user = await storage.createUser({ email });
  }
  
  req.session.userId = user.id;
  await storage.deleteOTP(email);
  
  res.json({ user });
});
```

### Enterprise Authentication (Password-Based)

```typescript
// Uses bcrypt with cost factor 12
app.post("/api/enterprise/login", async (req, res) => {
  const { email, password } = req.body;
  const account = await storage.getEnterpriseAccountByEmail(email);
  
  if (!account) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  
  const isValid = await bcrypt.compare(password, account.password);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  
  req.session.enterpriseId = account.id;
  
  // Audit logging
  await storage.createSessionAudit({
    enterpriseAccountId: account.id,
    action: "login",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.json({ account: { ...account, password: undefined } });
});
```

### Admin Authentication

```typescript
app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body;
  const admin = await storage.getAdminByEmail(email);
  
  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  
  req.session.adminId = admin.id;
  res.json({ admin: { ...admin, password: undefined } });
});
```

---

## Development Workflows

### Adding a New Feature

**1. Update Database Schema (if needed)**
```typescript
// shared/schema.ts
export const myNewTable = pgTable("my_new_table", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create Zod schemas
export const insertMyNewTableSchema = createInsertSchema(myNewTable).omit({ id: true });
export type InsertMyNewTable = z.infer<typeof insertMyNewTableSchema>;
export type MyNewTable = typeof myNewTable.$inferSelect;
```

```bash
npm run db:push --force
```

**2. Create API Endpoint**
```typescript
// server/routes.ts
app.get("/api/my-feature", requireAuth, async (req, res) => {
  const data = await db.query.myNewTable.findMany();
  res.json({ data });
});

app.post("/api/my-feature", requireAuth, async (req, res) => {
  const parsed = insertMyNewTableSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid data" });
  }
  
  const record = await storage.createMyNewTable(parsed.data);
  res.json({ record });
});
```

**3. Add Frontend Component**
```typescript
// client/src/pages/MyFeature.tsx
export default function MyFeature() {
  const { data, isLoading } = useQuery<MyNewTable[]>({
    queryKey: ['/api/my-feature'],
  });
  
  if (isLoading) return <Skeleton />;
  
  return (
    <div>
      <h1>My Feature</h1>
      {data?.map(item => (
        <Card key={item.id}>{item.name}</Card>
      ))}
    </div>
  );
}
```

**4. Register Route**
```typescript
// client/src/App.tsx
<Route path="/my-feature" component={MyFeature} />
```

---

## Provider Integration Layer

### ProviderFactory Pattern

```typescript
// server/providers/ProviderFactory.ts
export interface IESIMProvider {
  name: string;
  getPackages(destination?: string): Promise<Package[]>;
  createOrder(packageId: string, quantity: number): Promise<OrderResponse>;
  getOrderStatus(orderId: string): Promise<OrderStatus>;
  getESIMDetails(iccid: string): Promise<ESIMDetails>;
  getUsage(iccid: string): Promise<UsageData>;
  topUp(iccid: string, packageId: string): Promise<TopUpResponse>;
}

export class ProviderFactory {
  private static providers: Map<string, IESIMProvider> = new Map();
  
  static register(name: string, provider: IESIMProvider) {
    this.providers.set(name, provider);
  }
  
  static get(name: string): IESIMProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`Provider ${name} not found`);
    return provider;
  }
  
  static getAll(): IESIMProvider[] {
    return Array.from(this.providers.values());
  }
}

// Registration
ProviderFactory.register("airalo", new AiraloProvider());
ProviderFactory.register("esim_access", new EsimAccessProvider());
ProviderFactory.register("esim_go", new EsimGoProvider());
```

### Price Comparison Algorithm

```typescript
async function syncUnifiedPackages() {
  const allPackages: Package[] = [];
  
  // Fetch from all providers
  for (const provider of ProviderFactory.getAll()) {
    const packages = await provider.getPackages();
    allPackages.push(...packages);
  }
  
  // Group by destination + data + validity
  const grouped = groupBy(allPackages, pkg => 
    `${pkg.destinationCode}-${pkg.dataMb}-${pkg.validity}`
  );
  
  // Mark best price in each group
  for (const [key, packages] of Object.entries(grouped)) {
    const sorted = packages.sort((a, b) => 
      parseFloat(a.providerPrice) - parseFloat(b.providerPrice)
    );
    
    // Best price gets tagged
    sorted[0].isBestPrice = true;
    
    // Auto-enable best price packages only
    for (const pkg of sorted) {
      pkg.isEnabled = pkg.autoMode ? pkg.isBestPrice : pkg.isEnabled;
    }
    
    // Upsert to database
    await upsertPackages(sorted);
  }
}
```

---

## Background Jobs & Schedulers

### Status Scheduler Configuration

```typescript
// server/services/status-scheduler.ts
import cron from "node-cron";

export function startStatusSchedulers() {
  console.log("Starting background schedulers...");

  // Pending orders check - every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    console.log("Checking pending orders...");
    await orderStatusService.checkPendingOrders();
  });

  // Failed orders retry - every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    console.log("Retrying failed orders...");
    await orderStatusService.retryFailedOrders();
  });

  // eSIM usage sync - every 60 minutes
  cron.schedule("0 * * * *", async () => {
    console.log("Syncing eSIM usage data...");
    await orderStatusService.syncESimUsage();
  });

  // Package sync - every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    console.log("Syncing packages from providers...");
    await packageSyncService.syncAllProviders();
  });
}
```

### Retry Strategy

```typescript
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [5, 15, 60]; // minutes

async function retryFailedOrders() {
  const failedOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.status, "failed"),
      lt(orders.retryCount, MAX_RETRY_ATTEMPTS)
    ),
  });

  for (const order of failedOrders) {
    const retryCount = order.retryCount || 0;
    const delayMinutes = RETRY_DELAYS[retryCount];
    const nextRetryTime = new Date(
      (order.lastRetryAt?.getTime() || order.createdAt.getTime()) +
      delayMinutes * 60 * 1000
    );

    if (Date.now() >= nextRetryTime.getTime()) {
      await retryOrder(order.id);
    }
  }
}
```

---

## Design System & UI Guidelines

### Color System

**Light Mode:**
- Primary: Deep Ocean Blue (#1E40AF → #3B82F6)
- Accent CTAs: Emerald Green (#10B981), Purple (#8B5CF6)
- Backgrounds: White (#FFFFFF), Light Gray (#F9FAFB, #F3F4F6)
- Text: Charcoal (#111827), Gray (#6B7280)
- Borders: #E5E7EB

**Dark Mode:**
- Primary: Bright Blue (#3B82F6, #60A5FA)
- Accent CTAs: Bright Emerald (#34D399), Bright Purple (#A78BFA)
- Backgrounds: Dark Navy (#0F172A, #1E293B), Darker Gray (#334155)
- Text: White (#F9FAFB), Light Gray (#CBD5E1)
- Borders: #334155

### Typography

Font Stack: 'Plus Jakarta Sans' (Google Fonts)

| Element | Style |
|---------|-------|
| Hero Headlines | text-6xl lg:text-7xl, font-bold, tracking-tight |
| Section Titles | text-4xl lg:text-5xl, font-semibold |
| Card Titles | text-2xl, font-semibold |
| Body | text-base (16px), font-normal, leading-relaxed |
| Secondary | text-sm, font-medium |
| Captions | text-xs, uppercase, tracking-wide |

### Component Guidelines

**Package Cards:**
- White cards (dark: #1E293B) with rounded-2xl
- Shadows: shadow-lg hover:shadow-2xl
- Flag emoji at top-left
- Pricing: Large text-4xl, font-bold
- Hover: Subtle lift (translate-y-[-4px])

**Buttons:**
- Primary: Gradient background, rounded-xl, px-8 py-4
- Secondary: Outlined with border-2
- Sizes: sm (px-6 py-2.5), md (px-8 py-4), lg (px-10 py-5)

**Toast Notifications:**
- Top-right corner, slide-in animation
- Color-coded: Success (#10B981), Error (#EF4444), Info (#3B82F6)

---

## Security Guidelines

### Password Storage

```typescript
import bcrypt from 'bcrypt';

// Hash password with cost 12
const hash = await bcrypt.hash(password, 12);

// Verify password
const isValid = await bcrypt.compare(password, hash);
```

### Session Security

```typescript
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));
```

### Concurrency Safety (Critical!)

```typescript
// Distribution endpoint - prevents double-allocation
await db.transaction(async (tx) => {
  // 1. Lock rows with FOR UPDATE SKIP LOCKED
  const locked = await tx.execute(sql`
    SELECT * FROM enterprise_orders 
    WHERE id IN (${orderIds.join(',')})
    FOR UPDATE SKIP LOCKED
  `);
  
  // 2. Insert with conflict handling
  const inserted = await tx.insert(enterpriseOrderAllocations)
    .values(allocations)
    .onConflictDoNothing()  // Unique constraint on order_id
    .returning();
  
  // 3. Verify all allocated
  if (inserted.length < expected) {
    throw new Error('CONCURRENT_ALLOCATION_CONFLICT');
  }
});

// Client handles HTTP 409 gracefully
if (response.status === 409) {
  toast.error("Some eSIMs were already allocated. Please refresh.");
}
```

---

## Performance Optimization

### Frontend Optimization

```typescript
// Lazy loading for routes
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));

<Suspense fallback={<Loading />}>
  <Route path="/admin" component={AdminDashboard} />
</Suspense>

// Query caching
const { data } = useQuery({
  queryKey: ['/api/packages'],
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### Backend Caching

```typescript
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 900 }); // 15 min

app.get('/api/unified-packages', async (req, res) => {
  const cacheKey = `packages-${req.query.destination}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  
  const packages = await fetchPackages();
  cache.set(cacheKey, packages);
  res.json(packages);
});
```

---

## Deployment Guide

### Production Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
SESSION_SECRET=<strong-random-string>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# Providers
AIRALO_API_KEY=<production-key>
AIRALO_API_SECRET=<production-secret>
ESIM_ACCESS_CLIENT_ID=<production-id>
ESIM_ACCESS_CLIENT_SECRET=<production-secret>
ESIM_GO_API_KEY=<production-key>

# SMTP
SMTP_HOST=<smtp-server>
SMTP_PORT=587
SMTP_USER=<email-user>
SMTP_PASS=<email-password>
```

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied: `npm run db:push`
- [ ] Stripe webhook configured
- [ ] Email service tested
- [ ] Provider API credentials verified
- [ ] Session secret is strong and unique
- [ ] HTTPS enabled
- [ ] Background schedulers running
- [ ] Error logging configured

---

## Troubleshooting

### Common Issues

**Database Connection Errors**
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

**Stripe Payment Not Working**
- Verify STRIPE_SECRET_KEY and VITE_STRIPE_PUBLIC_KEY
- Check Stripe Dashboard for errors
- Verify webhook endpoint is reachable

**Email Not Sending**
- Verify SMTP credentials
- Check spam folder
- Test with simple email first

**Provider API Timeout**
- Check provider status in admin panel
- Switch to fallback provider if needed
- Review rate limits

**eSIM Details Not Loading**
- Verify order has ICCID assigned
- Check Airalo API authentication
- Review network timeouts

---

## Code Style & Best Practices

### TypeScript

```typescript
// PascalCase for types/interfaces
interface UserProfile { }

// camelCase for variables/functions
const userName = "John";
function getUserById() { }

// UPPER_CASE for constants
const MAX_RETRY_COUNT = 3;

// Always use proper types (no 'any')
function processOrder(orderId: string): Promise<Order> { }
```

### React Components

```typescript
export default function MyComponent({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({ 
    queryKey: ['/api/user', userId] 
  });
  
  if (isLoading) return <Skeleton />;
  if (!data) return <EmptyState />;
  
  return (
    <div data-testid="user-profile">
      <h1>{data.name}</h1>
    </div>
  );
}
```

### Git Commit Messages

```bash
# Good
git commit -m "Add concurrency-safe distribution endpoint"
git commit -m "Fix: Stripe webhook signature validation"

# Bad
git commit -m "changes"
git commit -m "fix stuff"
```

---

**Document Version:** 1.0  
**Last Updated:** November 2025

For API endpoint details, see [API_REFERENCE.md](API_REFERENCE.md).  
For module-specific features, see [FEATURES_GUIDE.md](FEATURES_GUIDE.md).
