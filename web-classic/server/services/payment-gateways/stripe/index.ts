"use strict";

import Stripe from "stripe";
import {
  BasePaymentGateway,
  RefundRequest,
  RefundResponse,
  PaymentDetails,
} from "../payment-gateway-interface";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-10-29.clover",
});

export class StripeGateway extends BasePaymentGateway {
  readonly slug = "stripe";
  readonly name = "Stripe";

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: request.paymentIntentId,
        reason: request.reason || "requested_by_customer",
        metadata: {
          orderId: request.orderId,
          ...request.metadata,
        },
      };

      if (request.amount) {
        refundParams.amount = Math.round(request.amount * 100);
      }

      const refund = await stripe.refunds.create(refundParams);

      return {
        success: refund.status === "succeeded" || refund.status === "pending",
        refundId: refund.id,
        status: this.mapRefundStatus(refund.status),
        amount: refund.amount ? refund.amount / 100 : undefined,
        currency: refund.currency?.toUpperCase(),
        rawResponse: refund,
      };
    } catch (error: any) {
      return {
        success: false,
        status: "failed",
        errorMessage: error.message || "Refund failed",
        errorCode: error.code,
        rawResponse: error,
      };
    }
  }

  async getPaymentDetails(paymentIntentId: string): Promise<PaymentDetails | null> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: paymentIntent.status,
        customerId: typeof paymentIntent.customer === "string" 
          ? paymentIntent.customer 
          : paymentIntent.customer?.id,
        metadata: paymentIntent.metadata as Record<string, string>,
      };
    } catch (error: any) {
      return null;
    }
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    responseTime?: number;
    errorMessage?: string;
  }> {
    const startTime = Date.now();
    try {
      await stripe.balance.retrieve();
      return {
        healthy: true,
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        errorMessage: error.message,
      };
    }
  }

  private mapRefundStatus(
    stripeStatus: string | null
  ): RefundResponse["status"] {
    switch (stripeStatus) {
      case "succeeded":
        return "succeeded";
      case "pending":
        return "pending";
      case "failed":
        return "failed";
      case "requires_action":
        return "requires_action";
      default:
        return "pending";
    }
  }
}

export function createStripeGateway(): StripeGateway {
  return new StripeGateway();
}
