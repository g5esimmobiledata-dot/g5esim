"use strict";

export interface RefundRequest {
  orderId: string;
  paymentIntentId: string;
  amount?: number;
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  metadata?: Record<string, string>;
}

export interface RefundResponse {
  success: boolean;
  refundId?: string;
  status: "succeeded" | "pending" | "failed" | "requires_action";
  amount?: number;
  currency?: string;
  errorMessage?: string;
  errorCode?: string;
  rawResponse?: any;
}

export interface PaymentDetails {
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  customerId?: string;
  metadata?: Record<string, string>;
}

export interface IPaymentGateway {
  readonly slug: string;
  readonly name: string;

  processRefund(request: RefundRequest): Promise<RefundResponse>;

  getPaymentDetails(paymentIntentId: string): Promise<PaymentDetails | null>;

  healthCheck(): Promise<{
    healthy: boolean;
    responseTime?: number;
    errorMessage?: string;
  }>;
}

export abstract class BasePaymentGateway implements IPaymentGateway {
  abstract readonly slug: string;
  abstract readonly name: string;

  abstract processRefund(request: RefundRequest): Promise<RefundResponse>;
  abstract getPaymentDetails(paymentIntentId: string): Promise<PaymentDetails | null>;

  async healthCheck(): Promise<{
    healthy: boolean;
    responseTime?: number;
    errorMessage?: string;
  }> {
    return { healthy: true };
  }
}
