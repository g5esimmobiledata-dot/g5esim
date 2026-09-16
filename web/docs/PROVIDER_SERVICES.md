# Provider Services Architecture

This document explains the modular provider service architecture used for integrating with eSIM providers (Airalo, eSIM Access, eSIM Go).

## Overview

The platform uses a **Provider Factory Pattern** to abstract provider-specific implementations behind a common interface (`IProviderService`). Each provider is organized into its own folder with focused, maintainable files under 250 lines each.

## Directory Structure

```
server/services/
├── provider-interface.ts    # IProviderService interface & base class
├── provider-factory.ts      # Factory for creating/caching provider services
├── airalo/                  # Airalo provider implementation
│   ├── index.ts            # AiraloService class (main entry point)
│   ├── types.ts            # API response interfaces
│   ├── sync.ts             # Package synchronization logic
│   ├── orders.ts           # Order creation & management
│   └── utils.ts            # Webhooks, usage data, health checks
├── esim-access/            # eSIM Access provider implementation
│   ├── index.ts            # EsimAccessService class
│   ├── types.ts            # API response interfaces
│   ├── sync.ts             # Package synchronization logic
│   ├── orders.ts           # Order/usage/topup management
│   └── api.ts              # HMAC authentication & API requests
└── esim-go/                # eSIM Go provider implementation
    ├── index.ts            # EsimGoService class
    ├── types.ts            # API response interfaces
    ├── sync.ts             # Package synchronization logic
    ├── orders.ts           # Order/usage/topup management
    └── api.ts              # API request handling
```

## File Responsibilities

### `index.ts` - Main Service Class

The entry point for each provider. Contains the service class that implements `IProviderService`:

```typescript
import { syncAiraloPackages } from "./sync";
import { createAiraloOrder, getAiraloOrderStatus } from "./orders";
import { getAiraloUsageData, validateAiraloWebhook } from "./utils";

export class AiraloService extends BaseProviderService {
  async syncPackages() {
    return syncAiraloPackages(this.provider);
  }
  
  async createOrder(request: ProviderOrderRequest) {
    return createAiraloOrder(request);
  }
  // ... other interface methods
}

export function createAiraloService(provider: Provider): AiraloService {
  return new AiraloService(provider);
}

export * from "./types";
```

### `types.ts` - API Response Interfaces

TypeScript interfaces for the provider's API responses:

```typescript
export interface AiraloPackageData {
  id: string;
  slug: string;
  amount: number;
  day: number;
  // ... provider-specific fields
}

export interface AiraloOrderResponse {
  data: {
    id: string;
    code: string;
    // ... provider-specific fields
  }
}
```

### `sync.ts` - Package Synchronization

Handles fetching and storing packages from the provider API:

```typescript
export async function syncAiraloPackages(provider: Provider): Promise<{
  success: boolean;
  packagesSynced: number;
  packagesUpdated: number;
  packagesRemoved: number;
  errorMessage?: string;
}> {
  // 1. Fetch packages from provider API
  // 2. Transform to internal format
  // 3. Compare with existing packages
  // 4. Create/update/deactivate as needed
  // 5. Return sync statistics
}
```

### `orders.ts` - Order Management

Handles order creation, status checks, and topups:

```typescript
export async function createAiraloOrder(
  request: ProviderOrderRequest
): Promise<ProviderOrderResponse> {
  // 1. Build API request
  // 2. Call provider API
  // 3. Transform response to standard format
}

export async function getAiraloOrderStatus(
  providerOrderId: string
): Promise<ProviderOrderStatus> {
  // Check order status from provider
}

export async function getAiraloTopupPackages(
  iccidOrPackageId: string
): Promise<ProviderTopupPackage[]> {
  // Get available topup packages
}

export async function purchaseAiraloTopup(
  request: ProviderTopupRequest
): Promise<ProviderTopupResponse> {
  // Purchase topup for existing eSIM
}
```

### `api.ts` / `utils.ts` - Authentication & Helpers

Provider-specific authentication and utility functions:

```typescript
// For eSIM Access (HMAC authentication)
export function generateHmacSignature(
  method: string,
  path: string,
  timestamp: string,
  body: string
): string {
  // Generate HMAC signature for API requests
}

// For Airalo (Webhook validation)
export function validateAiraloWebhook(
  payload: string | object,
  signature?: string,
  secretKey?: string
): WebhookValidationResult {
  // Validate incoming webhook
}

// Health checks
export async function checkAiraloHealth(): Promise<{
  healthy: boolean;
  responseTime?: number;
  errorMessage?: string;
}> {
  // Check API connectivity
}
```

## Provider Interface

All provider services must implement `IProviderService`:

```typescript
interface IProviderService {
  // Configuration
  getProvider(): Provider;
  
  // Package Management
  syncPackages(): Promise<SyncResult>;
  getPackageById(packageId: string): Promise<ProviderPackageData | null>;
  
  // Order Operations
  createOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse>;
  getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus>;
  
  // Usage & Topups
  getUsageData(iccid: string): Promise<ProviderUsageData>;
  getTopupPackages(iccidOrPackageId: string): Promise<ProviderTopupPackage[]>;
  purchaseTopup(request: ProviderTopupRequest): Promise<ProviderTopupResponse>;
  
  // Webhooks
  validateWebhook(payload: string | object, signature?: string): Promise<WebhookValidationResult>;
  parseWebhookPayload(payload: object): Promise<ProviderWebhookPayload>;
  
  // Rate Limiting
  getSyncRateLimit(): ProviderRateLimit;
  
  // Health Monitoring
  healthCheck(): Promise<HealthCheckResult>;
}
```

## Using the Provider Factory

The `providerFactory` singleton manages provider service instances:

```typescript
import { providerFactory } from "./services/provider-factory";

// Get service by provider ID
const service = await providerFactory.getServiceById("provider-uuid");

// Get service by provider slug
const airaloService = await providerFactory.getServiceBySlug("airalo");

// Get all enabled providers
const enabledServices = await providerFactory.getAllEnabledServices();

// Get preferred provider
const { provider, service } = await providerFactory.getPreferredService();

// Clear caches (after provider settings change)
providerFactory.clearCache();
```

## Adding a New Provider

To add a new provider (e.g., "new-provider"):

### 1. Create folder structure

```bash
mkdir server/services/new-provider
touch server/services/new-provider/{index.ts,types.ts,sync.ts,orders.ts,api.ts}
```

### 2. Define types (`types.ts`)

```typescript
"use strict";

export interface NewProviderPackageData {
  id: string;
  name: string;
  // ... API-specific fields
}

export interface NewProviderOrderResponse {
  // ... API-specific fields
}
```

### 3. Implement API client (`api.ts`)

```typescript
"use strict";

const API_BASE_URL = "https://api.newprovider.com";

export async function makeApiRequest<T>(
  endpoint: string,
  method: string = "GET",
  body?: object
): Promise<T> {
  const apiKey = process.env.NEW_PROVIDER_API_KEY;
  // Implement authentication and request logic
}
```

### 4. Implement sync logic (`sync.ts`)

```typescript
"use strict";

import { storage } from "../../storage";
import type { Provider } from "@shared/schema";
import { makeApiRequest } from "./api";
import type { NewProviderPackageData } from "./types";

export async function syncNewProviderPackages(provider: Provider): Promise<{
  success: boolean;
  packagesSynced: number;
  packagesUpdated: number;
  packagesRemoved: number;
  errorMessage?: string;
}> {
  // Implement package sync
}
```

### 5. Implement order management (`orders.ts`)

```typescript
"use strict";

import type {
  ProviderOrderRequest,
  ProviderOrderResponse,
  ProviderOrderStatus,
} from "../provider-interface";
import { makeApiRequest } from "./api";

export async function createNewProviderOrder(
  request: ProviderOrderRequest
): Promise<ProviderOrderResponse> {
  // Implement order creation
}
```

### 6. Create main service class (`index.ts`)

```typescript
"use strict";

import type { Provider } from "@shared/schema";
import { BaseProviderService } from "../provider-interface";
import { syncNewProviderPackages } from "./sync";
import { createNewProviderOrder, getNewProviderOrderStatus } from "./orders";

export class NewProviderService extends BaseProviderService {
  constructor(provider: Provider) {
    super(provider);
  }
  
  async syncPackages() {
    return syncNewProviderPackages(this.provider);
  }
  
  async createOrder(request) {
    return createNewProviderOrder(request);
  }
  
  // ... implement all IProviderService methods
}

export function createNewProviderService(provider: Provider) {
  return new NewProviderService(provider);
}

export * from "./types";
```

### 7. Register in provider factory

Update `server/services/provider-factory.ts`:

```typescript
import { NewProviderService } from "./new-provider";

// In getServiceInstance method:
case 'new-provider':
  service = new NewProviderService(provider);
  break;
```

### 8. Add database table (if needed)

Update `shared/schema.ts` to add provider-specific package table:

```typescript
export const newProviderPackages = pgTable("new_provider_packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").references(() => providers.id),
  // ... package fields
});
```

## Rate Limits by Provider

| Provider | Requests/Hour | Requests/Second | Auth Method |
|----------|--------------|-----------------|-------------|
| Airalo | 6,000 | 1.67 | OAuth2 Client Credentials |
| eSIM Access | 28,800 | 8 | HMAC Signature |
| eSIM Go | 3,600 | 1 | API Key Header |

## Environment Variables

Each provider requires specific credentials:

```bash
# Airalo
AIRALO_API_KEY=your_client_id
AIRALO_API_SECRET=your_client_secret

# eSIM Access
ESIM_ACCESS_CLIENT_ID=your_client_id
ESIM_ACCESS_CLIENT_SECRET=your_client_secret

# eSIM Go
ESIM_GO_API_KEY=your_api_key
```

## Error Handling

All provider services use the centralized error handling from `server/lib/errors.ts`:

```typescript
import { AppError, NotFoundError, ValidationError } from "../lib/errors";

// Throw specific errors
throw new NotFoundError("Package not found", { packageId });
throw new ValidationError("Invalid package data", { field: "dataAmount" });

// Generic provider errors
throw new AppError("Provider API error", 502, { provider: "airalo", response });
```

## Testing Provider Services

```typescript
import { providerFactory } from "./services/provider-factory";

// Get service for testing
const service = await providerFactory.getServiceBySlug("airalo");

// Test health check
const health = await service.healthCheck();
console.log("Healthy:", health.healthy);

// Test sync
const syncResult = await service.syncPackages();
console.log("Synced:", syncResult.packagesSynced);
```

## Related Documentation

- [Developer Guide](./DEVELOPER_GUIDE.md) - General development setup
- [API Reference](./API_REFERENCE.md) - REST API documentation
- [Features Guide](./FEATURES_GUIDE.md) - Platform features overview
