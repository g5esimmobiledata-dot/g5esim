"use strict";

import Stripe from 'stripe';
import {
  BasePaymentGateway,
  PaymentGatewayConfig,
  CreatePaymentIntentRequest,
  PaymentIntentResponse,
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
  PaymentStatus,
  RefundRequest,
  RefundResponse,
  WebhookValidationResult,
  CreateCustomerRequest,
  CustomerResponse,
} from '../contracts/IPaymentGateway';

/**
 * Stripe Payment Gateway Implementation
 * Handles all Stripe payment processing
 */
export class StripeGateway extends BasePaymentGateway {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor() {
    const config: PaymentGatewayConfig = {
      name: 'Stripe',
      slug: 'stripe',
      isEnabled: true,
      isTestMode: process.env.NODE_ENV !== 'production',
      supportedCurrencies: ['usd', 'eur', 'gbp', 'aud', 'cad', 'jpy', 'inr', 'sgd', 'aed'],
      supportedPaymentMethods: ['card', 'bank_transfer', 'wallet'],
      webhookEndpoint: '/api/webhooks/stripe',
    };
    super(config);

    const secretKey = this.getCredential('STRIPE_SECRET_KEY');
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover',
    });
  }

  /**
   * Create a payment intent for checkout
   */
  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntentResponse> {
    this.ensureEnabled();

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: request.amount,
        currency: request.currency.toLowerCase(),
        ...(request.customerEmail && { receipt_email: request.customerEmail }),
        ...(request.description && { description: request.description }),
        ...(request.metadata && { metadata: request.metadata }),
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || '',
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: this.mapStripeStatus(paymentIntent.status),
      };
    } catch (error) {
      console.error('[Stripe] createPaymentIntent error:', error);
      return {
        success: false,
        paymentIntentId: '',
        clientSecret: '',
        amount: request.amount,
        currency: request.currency,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Failed to create payment intent',
      };
    }
  }

  /**
   * Confirm a payment (typically done client-side via Stripe.js)
   */
  async confirmPayment(request: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(request.paymentIntentId);

      return {
        success: paymentIntent.status === 'succeeded',
        paymentIntentId: paymentIntent.id,
        status: this.mapStripeStatus(paymentIntent.status),
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        receiptUrl: paymentIntent.latest_charge 
          ? (typeof paymentIntent.latest_charge === 'string' 
              ? undefined 
              : (paymentIntent.latest_charge as Stripe.Charge).receipt_url || undefined)
          : undefined,
      };
    } catch (error) {
      console.error('[Stripe] confirmPayment error:', error);
      return {
        success: false,
        paymentIntentId: request.paymentIntentId,
        status: 'failed',
        amount: 0,
        currency: 'usd',
        errorMessage: error instanceof Error ? error.message : 'Failed to confirm payment',
      };
    }
  }

  /**
   * Get current payment status
   */
  async getPaymentStatus(paymentIntentId: string): Promise<{
    status: PaymentStatus;
    amount: number;
    currency: string;
  }> {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      status: this.mapStripeStatus(paymentIntent.status),
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  }

  /**
   * Process a refund
   */
  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(request.paymentIntentId);
      
      if (!paymentIntent.latest_charge) {
        return {
          success: false,
          refundId: '',
          amount: 0,
          currency: 'usd',
          status: 'failed',
          errorMessage: 'No charge found for this payment intent',
        };
      }

      const chargeId = typeof paymentIntent.latest_charge === 'string' 
        ? paymentIntent.latest_charge 
        : paymentIntent.latest_charge.id;

      const refund = await this.stripe.refunds.create({
        charge: chargeId,
        ...(request.amount && { amount: request.amount }),
        ...(request.reason && { reason: request.reason }),
        ...(request.metadata && { metadata: request.metadata }),
      });

      return {
        success: refund.status === 'succeeded' || refund.status === 'pending',
        refundId: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status === 'succeeded' ? 'succeeded' : refund.status === 'pending' ? 'pending' : 'failed',
      };
    } catch (error) {
      console.error('[Stripe] processRefund error:', error);
      return {
        success: false,
        refundId: '',
        amount: 0,
        currency: 'usd',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Failed to process refund',
      };
    }
  }

  /**
   * Validate webhook signature and parse event
   */
  async validateWebhook(payload: string | Buffer, signature: string): Promise<WebhookValidationResult> {
    try {
      if (!this.webhookSecret) {
        console.warn('[Stripe] Webhook secret not configured');
        return { isValid: false, errorMessage: 'Webhook secret not configured' };
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );

      return {
        isValid: true,
        event: {
          id: event.id,
          type: event.type,
          data: event.data.object as unknown as Record<string, unknown>,
          timestamp: new Date(event.created * 1000),
        },
      };
    } catch (error) {
      console.error('[Stripe] validateWebhook error:', error);
      return {
        isValid: false,
        errorMessage: error instanceof Error ? error.message : 'Invalid webhook signature',
      };
    }
  }

  /**
   * Create a Stripe customer
   */
  async createCustomer(request: CreateCustomerRequest): Promise<CustomerResponse> {
    try {
      const customer = await this.stripe.customers.create({
        email: request.email,
        ...(request.name && { name: request.name }),
        ...(request.phone && { phone: request.phone }),
        ...(request.metadata && { metadata: request.metadata }),
      });

      return {
        success: true,
        customerId: customer.id,
        email: customer.email || request.email,
        name: customer.name || undefined,
      };
    } catch (error) {
      console.error('[Stripe] createCustomer error:', error);
      return {
        success: false,
        customerId: '',
        email: request.email,
        errorMessage: error instanceof Error ? error.message : 'Failed to create customer',
      };
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<CustomerResponse | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      
      if (customer.deleted) {
        return null;
      }

      return {
        success: true,
        customerId: customer.id,
        email: customer.email || '',
        name: customer.name || undefined,
      };
    } catch (error) {
      console.error('[Stripe] getCustomer error:', error);
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; responseTime?: number; errorMessage?: string }> {
    const startTime = Date.now();
    try {
      await this.stripe.balance.retrieve();
      return {
        healthy: true,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  /**
   * Map Stripe status to standard PaymentStatus
   */
  private mapStripeStatus(stripeStatus: Stripe.PaymentIntent.Status): PaymentStatus {
    const statusMap: Record<Stripe.PaymentIntent.Status, PaymentStatus> = {
      requires_payment_method: 'requires_payment_method',
      requires_confirmation: 'requires_confirmation',
      requires_action: 'requires_action',
      processing: 'processing',
      requires_capture: 'processing',
      canceled: 'canceled',
      succeeded: 'succeeded',
    };
    return statusMap[stripeStatus] || 'pending';
  }
}

/**
 * Create singleton Stripe gateway instance
 */
let stripeGatewayInstance: StripeGateway | null = null;

export function getStripeGateway(): StripeGateway {
  if (!stripeGatewayInstance) {
    stripeGatewayInstance = new StripeGateway();
  }
  return stripeGatewayInstance;
}
