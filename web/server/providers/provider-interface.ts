import type {
  Provider,
  AiraloPackage,
  EsimAccessPackage,
  EsimGoPackage,
  UnifiedPackage
} from "@shared/schema";
import dotenv from "dotenv";

/**
 * Provider-agnostic package data structure
 * Used to normalize package data from different provider APIs
 */
export interface ProviderPackageData {
  providerPackageId: string; // Provider's unique ID for the package
  slug: string;
  title: string;
  dataAmount: string; // "1GB", "5GB", "10GB", "Unlimited"
  validity: number; // days
  wholesalePrice: number; // What provider charges us (in USD)
  currency: string;
  type: "local" | "regional" | "global";
  operator?: string;
  operatorImage?: string;
  coverage?: string[]; // Country codes
  voiceCredits?: number;
  smsCredits?: number;
  isUnlimited: boolean;

  // Destination/Region mapping
  destinationSlug?: string; // To match with destinations table
  regionSlug?: string; // To match with regions table
  countryCodes?: string[]; // For region packages
}

/**
 * Provider-agnostic order data structure
 * Used to normalize order creation across providers
 */
export interface ProviderOrderRequest {
  packageId: string; // Provider's package ID
  quantity?: number; // Number of eSIMs (default: 1)
  transactionId: string;
  customerRef?: string; // Optional customer reference
  customerEmail?: string; // Optional customer email for provider-hosted delivery
  iccid?: string; // Optional pre-allocated SIM/eSIM ICCID for providers that attach packages to inventory
}

/**
 * Provider order response
 */
export interface ProviderOrderResponse {
  success: boolean;
  providerOrderId?: string; // Provider's order ID
  requestId?: string; // For async orders
  iccid?: string; // eSIM ICCID (if available immediately)
  qrCode?: string; // QR code data (LPA format)
  qrCodeUrl?: string; // Pre-generated QR code image URL
  smdpAddress?: string; // SMDP+ address
  activationCode?: string; // Matching ID/activation code
  providerEmailSent?: boolean; // Provider already sent the installation email/PDF
  status: "completed" | "processing" | "pending" | "failed";
  errorMessage?: string; // Error details if failed
  processingTime?: number; // Estimated processing time in minutes
}

/**
 * Provider order status response
 */
export interface ProviderOrderStatus {
  providerOrderId: string;
  status: "completed" | "processing" | "pending" | "failed" | "cancelled";
  iccid?: string;
  qrCode?: string;
  qrCodeUrl?: string;
  smdpAddress?: string;
  activationCode?: string;
  errorMessage?: string;
  esimStatus?: string;
  directAppleUrl?: string;
  apnValue?: string;
  apnType?: string;
  isRoaming?: boolean;
}

/**
 * Provider usage data response
 */
export interface ProviderUsageData {
  iccid: string;
  dataUsed: number; // bytes
  dataTotal: number; // bytes
  dataRemaining: number; // bytes
  percentageUsed: number; // 0-100
  activatedAt?: Date;
  expiresAt?: Date;
  status?: "active" | "inactive" | "expired";
}

/**
 * Provider top-up package data
 */
export interface ProviderTopupPackage {
  providerPackageId: string;
  title: string;
  dataAmount: string;
  validity: number;
  wholesalePrice: number;
  currency: string;
  compatibleWith?: string[]; // ICCIDs or package codes this top-up works with
}

/**
 * Provider top-up request
 */
export interface ProviderTopupRequest {
  iccid: string;
  packageId: string; // Provider's top-up package ID
  quantity?: number;
}

/**
 * Provider top-up response
 */
export interface ProviderTopupResponse {
  success: boolean;
  providerTopupId?: string;
  requestId?: string; // For async top-ups
  status: "completed" | "processing" | "pending" | "failed";
  errorMessage?: string;
}

/**
 * Provider webhook validation result
 */
export interface WebhookValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Provider webhook payload (generic structure)
 */
export interface ProviderWebhookPayload {
  type: "order_status" | "low_data" | "expiring" | "other";
  providerOrderId?: string;
  requestId?: string;
  iccid?: string;
  status?: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Provider API rate limit info
 */
export interface ProviderRateLimit {
  requestsPerHour: number;
  requestsPerSecond?: number;
  remainingRequests?: number;
  resetAt?: Date;
}

/**
 * Provider refund request
 */
export interface ProviderRefundRequest {
  iccid: string;
  reason: "SERVICE_ISSUES" | "CUSTOMER_REQUEST" | "DUPLICATE" | "FRAUDULENT" | "OTHERS";
  notes?: string;
  email?: string;
  orderCreatedAt?: Date | string; // For checking refund window eligibility
}

/**
 * Provider refund response
 */
export interface ProviderRefundResponse {
  success: boolean;
  approved: boolean;
  refundId?: string;
  status: "approved" | "pending" | "rejected" | "not_supported";
  message?: string;
  errorMessage?: string;
  creditsRefunded?: number;
}

/**
 * Provider cancel request
 */
export interface ProviderCancelRequest {
  iccid?: string;
  requestId?: string;
  providerOrderId?: string;
}

/**
 * Provider cancel response  
 */
export interface ProviderCancelResponse {
  success: boolean;
  status: "cancelled" | "pending" | "failed" | "not_supported";
  message?: string;
  errorMessage?: string;
}

/**
 * Provider Service Interface
 * All provider integrations (Airalo, eSIM Access, eSIM Go) must implement this interface
 */
export interface IProviderService {
  /**
   * Get provider configuration
   */
  getProvider(): Provider;

  /**
   * Sync packages from provider API
   * Fetches all available packages and stores them in provider-specific table
   * @returns Number of packages synced
   */
  syncPackages(): Promise<{
    success: boolean;
    packagesSynced: number;
    packagesUpdated: number;
    packagesRemoved: number;
    errorMessage?: string;
  }>;

  /**
   * Create an order for eSIM purchase
   * @param request Order request details
   * @returns Order response with eSIM details
   */
  createOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse>;

  /**
   * Get order status
   * Used for tracking async orders
   * @param providerOrderId Provider's order ID or requestId
   * @returns Current order status
   */
  getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus>;

  /**
   * Get usage data for an eSIM
   * @param iccid eSIM ICCID
   * @returns Current usage data
   */
  getUsageData(iccid: string): Promise<ProviderUsageData>;

  /**
   * Get available top-up packages for an eSIM or base package
   * @param iccidOrPackageId ICCID or base package ID
   * @returns Available top-up packages
   */
  getTopupPackages(iccidOrPackageId: string): Promise<ProviderTopupPackage[]>;

  /**
   * Purchase a top-up for an existing eSIM
   * @param request Top-up request details
   * @returns Top-up response
   */
  purchaseTopup(request: ProviderTopupRequest): Promise<ProviderTopupResponse>;

  /**
   * Validate webhook signature and payload
   * @param payload Webhook payload (usually raw request body)
   * @param signature Signature from webhook headers
   * @returns Validation result
   */
  validateWebhook(payload: string | object, signature?: string): Promise<WebhookValidationResult>;

  /**
   * Parse and normalize webhook payload
   * Converts provider-specific webhook format to standard ProviderWebhookPayload
   * @param payload Raw webhook payload
   * @returns Normalized webhook data
   */
  parseWebhookPayload(payload: object): Promise<ProviderWebhookPayload>;

  /**
   * Get current rate limit information
   * @returns Rate limit details
   */
  getSyncRateLimit(): ProviderRateLimit;

  /**
   * Get provider-specific package by ID
   * @param packageId Provider package ID
   * @returns Package data or null
   */
  getPackageById(packageId: string): Promise<ProviderPackageData | null>;

  /**
   * Health check - verify API connectivity and credentials
   * @returns True if provider API is accessible
   */
  healthCheck(): Promise<{
    healthy: boolean;
    responseTime?: number; // milliseconds
    errorMessage?: string;
  }>;

  /**
   * Request refund for an eSIM
   * @param request Refund request with ICCID and reason
   * @returns Refund response with approval status
   */
  requestRefund(request: ProviderRefundRequest): Promise<ProviderRefundResponse>;

  /**
   * Cancel an order or eSIM
   * @param request Cancel request with identifiers
   * @returns Cancel response with status
   */
  cancelOrder(request: ProviderCancelRequest): Promise<ProviderCancelResponse>;

  /**
   * Check if refunds are supported by this provider
   */
  supportsRefunds(): boolean;

  /**
   * Check if order cancellation is supported by this provider
   */
  supportsCancellation(): boolean;
}

/**
 * Base Provider Service Class
 * Provides common utilities for provider implementations
 */
export abstract class BaseProviderService implements IProviderService {
  protected provider: Provider;

  constructor(provider: Provider) {
    this.provider = provider;
  }

  getProvider(): Provider {
    return this.provider;
  }

  // Abstract methods that must be implemented by each provider
  abstract syncPackages(): Promise<{
    success: boolean;
    packagesSynced: number;
    packagesUpdated: number;
    packagesRemoved: number;
    errorMessage?: string;
  }>;

  abstract createOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse>;
  abstract getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus>;
  abstract getUsageData(iccid: string): Promise<ProviderUsageData>;
  abstract getTopupPackages(iccidOrPackageId: string): Promise<ProviderTopupPackage[]>;
  abstract purchaseTopup(request: ProviderTopupRequest): Promise<ProviderTopupResponse>;
  abstract validateWebhook(payload: string | object, signature?: string): Promise<WebhookValidationResult>;
  abstract parseWebhookPayload(payload: object): Promise<ProviderWebhookPayload>;
  abstract getSyncRateLimit(): ProviderRateLimit;
  abstract getPackageById(packageId: string): Promise<ProviderPackageData | null>;
  abstract healthCheck(): Promise<{ healthy: boolean; responseTime?: number; errorMessage?: string; }>;
  abstract requestRefund(request: ProviderRefundRequest): Promise<ProviderRefundResponse>;
  abstract cancelOrder(request: ProviderCancelRequest): Promise<ProviderCancelResponse>;
  abstract supportsRefunds(): boolean;
  abstract supportsCancellation(): boolean;

  /**
   * Helper: Calculate retail price from wholesale price
   * @param wholesalePrice Provider's wholesale price
   * @returns Customer-facing retail price (with margin)
   */
  protected calculateRetailPrice(wholesalePrice: number): number {
    const marginPercentage = parseFloat(this.provider.pricingMargin || "15.00");
    const margin = wholesalePrice * (marginPercentage / 100);
    return Math.ceil((wholesalePrice + margin) * 100) / 100; // Round up to nearest cent
  }

  /**
   * Helper: Check if provider is enabled
   */
  protected ensureEnabled(): void {
    if (!this.provider.enabled) {
      throw new Error(`Provider ${this.provider.name} is currently disabled`);
    }
  }

  /**
   * Helper: Get API credentials from environment
   * @param credentialKey Environment variable name
   * @returns API credential value
   */
  protected getCredential(credentialKey: string): string {
    let value = process.env[credentialKey]?.trim();
    if (!value) {
      dotenv.config({ override: false });
      value = process.env[credentialKey]?.trim();
    }
    if (!value) {
      throw new Error(`Missing credential ${credentialKey} for provider ${this.provider.name}`);
    }
    return value;
  }

  /**
   * Helper: Delay execution for rate limiting
   * @param ms Milliseconds to delay
   */
  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper: Make HTTP request with automatic retry
   * @param url Request URL
   * @param options Fetch options
   * @param maxRetries Maximum retry attempts
   * @returns Response
   */
  protected async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = 3
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        // If rate limited, wait and retry
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
          console.log(`Rate limited by ${this.provider.name}, waiting ${retryAfter}s...`);
          await this.delay(retryAfter * 1000);
          continue;
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        console.error(`Request failed (attempt ${attempt + 1}/${maxRetries}):`, error);

        if (attempt < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const backoffMs = Math.pow(2, attempt) * 1000;
          await this.delay(backoffMs);
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }
}
