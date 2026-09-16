"use strict";

/**
 * Provider Service Interface
 * All eSIM provider integrations must implement this interface
 * Enables pluggable provider architecture (Airalo, eSIM Access, eSIM Go, Maya)
 */

import type { Provider } from '@shared/schema';
import dotenv from 'dotenv';

/**
 * Provider-agnostic package data structure
 * Used to normalize package data from different provider APIs
 */
export interface ProviderPackageData {
  providerPackageId: string;
  slug: string;
  title: string;
  dataAmount: string;
  validity: number;
  wholesalePrice: number;
  currency: string;
  type: 'local' | 'regional' | 'global';
  operator?: string;
  operatorImage?: string;
  coverage?: string[];
  voiceCredits?: number;
  smsCredits?: number;
  isUnlimited: boolean;
  destinationSlug?: string;
  regionSlug?: string;
  countryCodes?: string[];
}

/**
 * Provider order request
 */
export interface ProviderOrderRequest {
  packageId: string;
  quantity?: number;
  customerRef?: string;
  transactionId?: string;
  customerEmail?: string;
  iccid?: string;
}

/**
 * Provider order response
 */
export interface ProviderOrderResponse {
  success: boolean;
  providerOrderId?: string;
  requestId?: string;
  iccid?: string;
  qrCode?: string;
  qrCodeUrl?: string;
  smdpAddress?: string;
  activationCode?: string;
  status: 'completed' | 'processing' | 'pending' | 'failed';
  errorMessage?: string;
  processingTime?: number;
}

/**
 * Provider order status
 */
export interface ProviderOrderStatus {
  providerOrderId: string;
  status: 'completed' | 'processing' | 'pending' | 'failed' | 'cancelled';
  iccid?: string;
  qrCode?: string;
  qrCodeUrl?: string;
  smdpAddress?: string;
  activationCode?: string;
  errorMessage?: string;
}

/**
 * Provider usage data
 */
export interface ProviderUsageData {
  iccid: string;
  dataUsed: number;
  dataTotal: number;
  dataRemaining: number;
  percentageUsed: number;
  activatedAt?: Date;
  expiresAt?: Date;
  status?: 'active' | 'inactive' | 'expired';
}

/**
 * Provider topup package
 */
export interface ProviderTopupPackage {
  providerPackageId: string;
  title: string;
  dataAmount: string;
  validity: number;
  wholesalePrice: number;
  currency: string;
  compatibleWith?: string[];
}

/**
 * Provider topup request
 */
export interface ProviderTopupRequest {
  iccid: string;
  packageId: string;
  quantity?: number;
}

/**
 * Provider topup response
 */
export interface ProviderTopupResponse {
  success: boolean;
  providerTopupId?: string;
  requestId?: string;
  status: 'completed' | 'processing' | 'pending' | 'failed';
  errorMessage?: string;
}

/**
 * Provider refund request
 */
export interface ProviderRefundRequest {
  iccid: string;
  reason: 'SERVICE_ISSUES' | 'CUSTOMER_REQUEST' | 'DUPLICATE' | 'FRAUDULENT' | 'OTHERS';
  notes?: string;
  email?: string;
  orderCreatedAt?: Date | string;
}

/**
 * Provider refund response
 */
export interface ProviderRefundResponse {
  success: boolean;
  approved: boolean;
  refundId?: string;
  status: 'approved' | 'pending' | 'rejected' | 'not_supported';
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
  status: 'cancelled' | 'pending' | 'failed' | 'not_supported';
  message?: string;
  errorMessage?: string;
}

/**
 * Webhook validation result
 */
export interface WebhookValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Provider webhook payload
 */
export interface ProviderWebhookPayload {
  type: 'order_status' | 'low_data' | 'expiring' | 'other';
  providerOrderId?: string;
  requestId?: string;
  iccid?: string;
  status?: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Rate limit info
 */
export interface ProviderRateLimit {
  requestsPerHour: number;
  requestsPerSecond?: number;
  remainingRequests?: number;
  resetAt?: Date;
}

/**
 * Sync result
 */
export interface SyncResult {
  success: boolean;
  packagesSynced: number;
  packagesUpdated: number;
  packagesRemoved: number;
  errorMessage?: string;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  responseTime?: number;
  errorMessage?: string;
}

/**
 * Provider Service Interface
 * All provider integrations must implement this interface
 */
export interface IProviderService {
  getProvider(): Provider;
  syncPackages(): Promise<SyncResult>;
  createOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse>;
  getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus>;
  getUsageData(iccid: string): Promise<ProviderUsageData>;
  getTopupPackages(iccidOrPackageId: string): Promise<ProviderTopupPackage[]>;
  purchaseTopup(request: ProviderTopupRequest): Promise<ProviderTopupResponse>;
  validateWebhook(payload: string | object, signature?: string): Promise<WebhookValidationResult>;
  parseWebhookPayload(payload: object): Promise<ProviderWebhookPayload>;
  getSyncRateLimit(): ProviderRateLimit;
  getPackageById(packageId: string): Promise<ProviderPackageData | null>;
  healthCheck(): Promise<HealthCheckResult>;
  requestRefund(request: ProviderRefundRequest): Promise<ProviderRefundResponse>;
  cancelOrder(request: ProviderCancelRequest): Promise<ProviderCancelResponse>;
  supportsRefunds(): boolean;
  supportsCancellation(): boolean;
}

/**
 * Provider configuration for registration
 */
export interface ProviderConfig {
  slug: string;
  name: string;
  isEnabled: boolean;
  syncIntervalMinutes: number;
  supportsRefunds: boolean;
  supportsCancellation: boolean;
  supportsTopups: boolean;
  supportsUsageTracking: boolean;
}

/**
 * Base Provider Service abstract class
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

  protected calculateRetailPrice(wholesalePrice: number): number {
    const marginPercentage = parseFloat(this.provider.pricingMargin || '15.00');
    const margin = wholesalePrice * (marginPercentage / 100);
    return Math.ceil((wholesalePrice + margin) * 100) / 100;
  }

  protected ensureEnabled(): void {
    if (!this.provider.enabled) {
      throw new Error(`Provider ${this.provider.name} is currently disabled`);
    }
  }

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

  protected async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Abstract methods
  abstract syncPackages(): Promise<SyncResult>;
  abstract createOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse>;
  abstract getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus>;
  abstract getUsageData(iccid: string): Promise<ProviderUsageData>;
  abstract getTopupPackages(iccidOrPackageId: string): Promise<ProviderTopupPackage[]>;
  abstract purchaseTopup(request: ProviderTopupRequest): Promise<ProviderTopupResponse>;
  abstract validateWebhook(payload: string | object, signature?: string): Promise<WebhookValidationResult>;
  abstract parseWebhookPayload(payload: object): Promise<ProviderWebhookPayload>;
  abstract getSyncRateLimit(): ProviderRateLimit;
  abstract getPackageById(packageId: string): Promise<ProviderPackageData | null>;
  abstract healthCheck(): Promise<HealthCheckResult>;
  abstract requestRefund(request: ProviderRefundRequest): Promise<ProviderRefundResponse>;
  abstract cancelOrder(request: ProviderCancelRequest): Promise<ProviderCancelResponse>;
  abstract supportsRefunds(): boolean;
  abstract supportsCancellation(): boolean;
}
