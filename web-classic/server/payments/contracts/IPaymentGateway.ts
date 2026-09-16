"use strict";

/**
 * Payment Gateway Interface
 * All payment gateway integrations must implement this interface
 * Enables pluggable payment processing (Stripe, PayPal, Razorpay, etc.)
 */

/**
 * Payment intent creation request
 */
export interface CreatePaymentIntentRequest {
  amount: number; // Amount in smallest currency unit (cents for USD)
  currency: string; // ISO 4217 currency code (e.g., 'usd')
  customerId?: string; // Platform customer ID
  customerEmail?: string;
  metadata?: Record<string, string>;
  description?: string;
}

/**
 * Payment intent response
 */
export interface PaymentIntentResponse {
  success: boolean;
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  errorMessage?: string;
}

/**
 * Payment status enum
 */
export type PaymentStatus =
  | 'pending'
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'canceled'
  | 'failed';

/**
 * Payment confirmation request
 */
export interface ConfirmPaymentRequest {
  paymentIntentId: string;
}

/**
 * Payment confirmation response
 */
export interface ConfirmPaymentResponse {
  success: boolean;
  paymentIntentId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  receiptUrl?: string;
  errorMessage?: string;
}

/**
 * Refund request
 */
export interface RefundRequest {
  paymentIntentId: string;
  amount?: number; // Partial refund amount (omit for full refund)
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
}

/**
 * Refund response
 */
export interface RefundResponse {
  success: boolean;
  refundId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  errorMessage?: string;
}

/**
 * Webhook event payload
 */
export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Webhook validation result
 */
export interface WebhookValidationResult {
  isValid: boolean;
  event?: WebhookEvent;
  errorMessage?: string;
}

/**
 * Customer creation request
 */
export interface CreateCustomerRequest {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

/**
 * Customer response
 */
export interface CustomerResponse {
  success: boolean;
  customerId: string;
  email: string;
  name?: string;
  errorMessage?: string;
}

/**
 * Payment method types supported
 */
export type PaymentMethodType = 'card' | 'bank_transfer' | 'wallet' | 'upi';

/**
 * Payment Gateway Configuration
 */
export interface PaymentGatewayConfig {
  name: string;
  slug: string;
  isEnabled: boolean;
  isTestMode: boolean;
  supportedCurrencies: string[];
  supportedPaymentMethods: PaymentMethodType[];
  webhookEndpoint: string;
}

/**
 * Payment Gateway Interface
 * All payment providers (Stripe, PayPal, Razorpay, etc.) must implement this
 */
export interface IPaymentGateway {
  /**
   * Get gateway configuration
   */
  getConfig(): PaymentGatewayConfig;

  /**
   * Create a payment intent
   * @param request Payment intent request
   * @returns Payment intent with client secret
   */
  createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntentResponse>;

  /**
   * Confirm a payment
   * @param request Payment confirmation request
   * @returns Confirmation result
   */
  confirmPayment(request: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse>;

  /**
   * Get payment status
   * @param paymentIntentId Payment intent ID
   * @returns Current payment status
   */
  getPaymentStatus(paymentIntentId: string): Promise<{
    status: PaymentStatus;
    amount: number;
    currency: string;
  }>;

  /**
   * Process a refund
   * @param request Refund request
   * @returns Refund result
   */
  processRefund(request: RefundRequest): Promise<RefundResponse>;

  /**
   * Validate webhook signature and parse event
   * @param payload Raw webhook payload
   * @param signature Webhook signature header
   * @returns Validation result with parsed event
   */
  validateWebhook(payload: string | Buffer, signature: string): Promise<WebhookValidationResult>;

  /**
   * Create or retrieve customer
   * @param request Customer creation request
   * @returns Customer details
   */
  createCustomer(request: CreateCustomerRequest): Promise<CustomerResponse>;

  /**
   * Get customer by ID
   * @param customerId Customer ID
   * @returns Customer details or null
   */
  getCustomer(customerId: string): Promise<CustomerResponse | null>;

  /**
   * Check if gateway is healthy and credentials are valid
   * @returns Health check result
   */
  healthCheck(): Promise<{
    healthy: boolean;
    responseTime?: number;
    errorMessage?: string;
  }>;

  /**
   * Check if a specific payment method is supported
   * @param method Payment method type
   * @returns True if supported
   */
  supportsPaymentMethod(method: PaymentMethodType): boolean;

  /**
   * Check if a currency is supported
   * @param currency ISO 4217 currency code
   * @returns True if supported
   */
  supportsCurrency(currency: string): boolean;
}

/**
 * Base Payment Gateway Class
 * Provides common utilities for gateway implementations
 */
export abstract class BasePaymentGateway implements IPaymentGateway {
  protected config: PaymentGatewayConfig;

  constructor(config: PaymentGatewayConfig) {
    this.config = config;
  }

  getConfig(): PaymentGatewayConfig {
    return this.config;
  }

  supportsPaymentMethod(method: PaymentMethodType): boolean {
    return this.config.supportedPaymentMethods.includes(method);
  }

  supportsCurrency(currency: string): boolean {
    return this.config.supportedCurrencies.includes(currency.toLowerCase());
  }

  /**
   * Ensure gateway is enabled before processing
   */
  protected ensureEnabled(): void {
    if (!this.config.isEnabled) {
      throw new Error(`Payment gateway ${this.config.name} is currently disabled`);
    }
  }

  /**
   * Get credential from environment
   */
  protected getCredential(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing credential ${key} for ${this.config.name}`);
    }
    return value;
  }

  // Abstract methods that must be implemented
  abstract createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntentResponse>;
  abstract confirmPayment(request: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse>;
  abstract getPaymentStatus(paymentIntentId: string): Promise<{
    status: PaymentStatus;
    amount: number;
    currency: string;
  }>;
  abstract processRefund(request: RefundRequest): Promise<RefundResponse>;
  abstract validateWebhook(payload: string | Buffer, signature: string): Promise<WebhookValidationResult>;
  abstract createCustomer(request: CreateCustomerRequest): Promise<CustomerResponse>;
  abstract getCustomer(customerId: string): Promise<CustomerResponse | null>;
  abstract healthCheck(): Promise<{ healthy: boolean; responseTime?: number; errorMessage?: string }>;
}
