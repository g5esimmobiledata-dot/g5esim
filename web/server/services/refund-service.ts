"use strict";

import { db } from "../db";
import { eq } from "drizzle-orm";
import { orders, providers, type Order } from "@shared/schema";
import { providerFactory } from "../providers/provider-factory";
import { getStripeGateway } from "../payments/gateways/stripe";
import { logger } from "../lib/logger";
import type {
  ProviderRefundRequest,
  ProviderRefundResponse,
  ProviderCancelRequest,
  ProviderCancelResponse,
  IProviderService
} from "../providers/provider-interface";

export interface RefundEligibility {
  canRefund: boolean;
  canCancel: boolean;
  reason: string;
  provider: {
    name: string;
    supportsRefunds: boolean;
    supportsCancellation: boolean;
  };
  order: {
    status: string;
    isActivated: boolean;
    hasPaymentIntent: boolean;
  };
}

export interface RefundRequest {
  orderId: string;
  reason: "SERVICE_ISSUES" | "CUSTOMER_REQUEST" | "DUPLICATE" | "FRAUDULENT" | "OTHERS";
  notes?: string;
  adminId?: string;
  refundPayment?: boolean;
}

export interface RefundResult {
  success: boolean;
  providerResult: {
    success: boolean;
    status: string;
    message?: string;
  };
  paymentResult?: {
    success: boolean;
    refundId?: string;
    amount?: number;
    status?: string;
    message?: string;
  };
  orderStatus: string;
  errorMessage?: string;
}

export interface CancelRequest {
  orderId: string;
  adminId?: string;
  refundPayment?: boolean;
}

export interface CancelResult {
  success: boolean;
  providerResult: {
    success: boolean;
    status: string;
    message?: string;
  };
  paymentResult?: {
    success: boolean;
    refundId?: string;
    amount?: number;
    status?: string;
    message?: string;
  };
  orderStatus: string;
  errorMessage?: string;
}

class RefundService {
  async checkEligibility(orderId: string): Promise<RefundEligibility> {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return {
        canRefund: false,
        canCancel: false,
        reason: "Order not found",
        provider: {
          name: "Unknown",
          supportsRefunds: false,
          supportsCancellation: false,
        },
        order: {
          status: "unknown",
          isActivated: false,
          hasPaymentIntent: false,
        },
      };
    }

    if (!order.providerId) {
      return {
        canRefund: false,
        canCancel: false,
        reason: "Order has no provider assigned",
        provider: {
          name: "Unknown",
          supportsRefunds: false,
          supportsCancellation: false,
        },
        order: {
          status: order.status,
          isActivated: !!order.activatedAt,
          hasPaymentIntent: !!order.stripePaymentIntentId,
        },
      };
    }

    let providerService: IProviderService | null = null;
    let providerName = "Unknown";

    try {
      providerService = await providerFactory.getServiceById(order.providerId);
      if (providerService) {
        providerName = providerService.getProvider().name;
      }
    } catch (error) {
      const provider = await db.query.providers.findFirst({
        where: eq(providers.id, order.providerId),
      });
      providerName = provider?.name || order.providerId;
    }

    const supportsRefunds = providerService?.supportsRefunds() ?? false;
    const supportsCancellation = providerService?.supportsCancellation() ?? false;
    const isActivated = !!order.activatedAt;
    const hasPaymentIntent = !!order.stripePaymentIntentId;

    if (order.status === "refunded") {
      return {
        canRefund: false,
        canCancel: false,
        reason: "Order has already been refunded",
        provider: {
          name: providerName,
          supportsRefunds,
          supportsCancellation,
        },
        order: {
          status: order.status,
          isActivated,
          hasPaymentIntent,
        },
      };
    }

    if (order.status === "cancelled") {
      return {
        canRefund: false,
        canCancel: false,
        reason: "Order has already been cancelled",
        provider: {
          name: providerName,
          supportsRefunds,
          supportsCancellation,
        },
        order: {
          status: order.status,
          isActivated,
          hasPaymentIntent,
        },
      };
    }

    let canRefund = false;
    let canCancel = false;
    let reason = "";

    if (isActivated) {
      if (supportsRefunds) {
        canRefund = true;
        reason = "eSIM is activated - refund may be subject to provider approval";
      } else if (supportsCancellation) {
        reason = "eSIM is activated - provider does not support refunds for activated eSIMs";
      } else {
        reason = "eSIM is activated - provider does not support refunds or cancellation";
      }
    } else {
      if (supportsCancellation) {
        canCancel = true;
        canRefund = true;
        reason = "eSIM is not activated - can be cancelled/deleted for full refund";
      } else if (supportsRefunds) {
        canRefund = true;
        reason = "eSIM is not activated - can request refund from provider";
      } else {
        reason = "Provider does not support refunds or cancellation";
      }
    }

    return {
      canRefund,
      canCancel,
      reason,
      provider: {
        name: providerName,
        supportsRefunds,
        supportsCancellation,
      },
      order: {
        status: order.status,
        isActivated,
        hasPaymentIntent,
      },
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResult> {
    const { orderId, reason, notes, adminId, refundPayment = true } = request;

    logger.info("[RefundService] Processing refund request", { orderId, reason, adminId });

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return {
        success: false,
        providerResult: { success: false, status: "failed", message: "Order not found" },
        orderStatus: "unknown",
        errorMessage: "Order not found",
      };
    }

    if (order.status === "refunded") {
      return {
        success: false,
        providerResult: { success: false, status: "failed", message: "Order already refunded" },
        orderStatus: order.status,
        errorMessage: "Order has already been refunded",
      };
    }

    if (!order.providerId) {
      return {
        success: false,
        providerResult: { success: false, status: "failed", message: "No provider assigned" },
        orderStatus: order.status,
        errorMessage: "Order has no provider assigned",
      };
    }

    let providerService: IProviderService | null = null;
    try {
      providerService = await providerFactory.getServiceById(order.providerId);
    } catch (error) {
      logger.error("[RefundService] Failed to get provider service", { orderId, error });
    }

    if (!providerService) {
      return {
        success: false,
        providerResult: { success: false, status: "failed", message: "Provider service not available" },
        orderStatus: order.status,
        errorMessage: "Provider service not available",
      };
    }

    const providerName = providerService.getProvider().name;
    const isActivated = !!order.activatedAt;

    let providerResult: ProviderRefundResponse | ProviderCancelResponse;

    const hasIccid = !!order.iccid;
    const hasProviderOrderId = !!order.providerOrderId;
    const hasRequestId = !!order.requestId;

    if (!hasIccid && !hasProviderOrderId && !hasRequestId) {
      logger.warn("[RefundService] Order has no identifiers for provider API", { orderId });
      return {
        success: false,
        providerResult: {
          success: false,
          status: "failed",
          message: "Order has no ICCID, provider order ID, or request ID"
        },
        orderStatus: order.status,
        errorMessage: "Order has no identifiers to send to provider API",
      };
    }

    console.log("[RefundService] Order identifiers:", { orderId, hasIccid, hasProviderOrderId, hasRequestId });

    if (hasIccid && providerService.supportsRefunds()) {
      logger.info("[RefundService] Using refund request for eSIM", { orderId, providerName, isActivated });

      const refundRequest: ProviderRefundRequest = {
        iccid: order.iccid!,
        reason,
        notes,
        orderCreatedAt: order.createdAt,
      };

      providerResult = await providerService.requestRefund(refundRequest);
    } else if (!isActivated && providerService.supportsCancellation()) {
      logger.info("[RefundService] Using cancellation for unactivated eSIM without ICCID", { orderId, providerName });

      const cancelRequest: ProviderCancelRequest = {
        iccid: order.iccid || undefined,
        providerOrderId: order.providerOrderId || undefined,
        requestId: order.requestId || undefined,
      };

      providerResult = await providerService.cancelOrder(cancelRequest);
    } else {
      return {
        success: false,
        providerResult: {
          success: false,
          status: "not_supported",
          message: `${providerName} does not support refunds or cancellation`
        },
        orderStatus: order.status,
        errorMessage: `${providerName} does not support refunds or cancellation`,
      };
    }

    logger.info("[RefundService] Provider result", { orderId, providerResult });
    console.log("[RefundService] Provider result", { orderId, providerResult });

    if (!providerResult.success) {
      return {
        success: false,
        providerResult: {
          success: false,
          status: providerResult.status,
          message: providerResult.errorMessage || providerResult.message,
        },
        orderStatus: order.status,
        errorMessage: providerResult.errorMessage || "Provider refund/cancel failed",
      };
    }

    let paymentResult: RefundResult["paymentResult"];

    if (refundPayment && order.stripePaymentIntentId) {
      console.log("[RefundService] Processing Stripe refund", { orderId, paymentIntentId: order.stripePaymentIntentId });
      logger.info("[RefundService] Processing Stripe refund", { orderId, paymentIntentId: order.stripePaymentIntentId });

      try {
        const stripeGateway = getStripeGateway();
        const stripeRefund = await stripeGateway.processRefund({
          paymentIntentId: order.stripePaymentIntentId,
          reason: reason === "DUPLICATE" ? "duplicate" :
            reason === "FRAUDULENT" ? "fraudulent" : "requested_by_customer",
          metadata: {
            orderId: order.id,
            refundReason: reason,
            adminId: adminId || "",
          },
        });

        paymentResult = {
          success: stripeRefund.success,
          refundId: stripeRefund.refundId,
          amount: stripeRefund.amount,
          status: stripeRefund.status,
          message: stripeRefund.errorMessage,
        };
        console.log("[RefundService] Stripe refund result", { orderId, paymentResult });
        logger.info("[RefundService] Stripe refund result", { orderId, paymentResult });
      } catch (error) {
        logger.error("[RefundService] Stripe refund failed", { orderId, error });
        paymentResult = {
          success: false,
          message: error instanceof Error ? error.message : "Stripe refund failed",
        };
        console.log("[RefundService] Stripe refund result", { orderId, paymentResult });
      }
    }

    const isPendingProviderApproval = 'approved' in providerResult && providerResult.approved === false;
    const newStatus = isPendingProviderApproval ? "pending_refund" : "refunded";

    await db.update(orders).set({
      status: newStatus,
      updatedAt: new Date(),
    }).where(eq(orders.id, orderId));

    console.log("[RefundService] Order status updated", { orderId, newStatus });
    logger.info("[RefundService] Order status updated", { orderId, newStatus });

    return {
      success: true,
      providerResult: {
        success: true,
        status: providerResult.status,
        message: providerResult.message,
      },
      paymentResult,
      orderStatus: newStatus,
    };
  }

  async processCancellation(request: CancelRequest): Promise<CancelResult> {
    const { orderId, adminId, refundPayment = true } = request;

    logger.info("[RefundService] Processing cancellation request", { orderId, adminId });

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return {
        success: false,
        providerResult: { success: false, status: "failed", message: "Order not found" },
        orderStatus: "unknown",
        errorMessage: "Order not found",
      };
    }

    if (order.status === "cancelled") {
      return {
        success: false,
        providerResult: { success: false, status: "failed", message: "Order already cancelled" },
        orderStatus: order.status,
        errorMessage: "Order has already been cancelled",
      };
    }

    if (!order.providerId) {
      return {
        success: false,
        providerResult: { success: false, status: "failed", message: "No provider assigned" },
        orderStatus: order.status,
        errorMessage: "Order has no provider assigned",
      };
    }

    let providerService: IProviderService | null = null;
    try {
      providerService = await providerFactory.getServiceById(order.providerId);
    } catch (error) {
      logger.error("[RefundService] Failed to get provider service", { orderId, error });
    }

    if (!providerService) {
      return {
        success: false,
        providerResult: { success: false, status: "failed", message: "Provider service not available" },
        orderStatus: order.status,
        errorMessage: "Provider service not available",
      };
    }

    if (!providerService.supportsCancellation()) {
      return {
        success: false,
        providerResult: {
          success: false,
          status: "not_supported",
          message: `${providerService.getProvider().name} does not support cancellation`
        },
        orderStatus: order.status,
        errorMessage: `${providerService.getProvider().name} does not support cancellation`,
      };
    }

    const cancelRequest: ProviderCancelRequest = {
      iccid: order.iccid || undefined,
      providerOrderId: order.providerOrderId || undefined,
      requestId: order.requestId || undefined,
    };

    const providerResult = await providerService.cancelOrder(cancelRequest);

    logger.info("[RefundService] Provider cancel result", { orderId, providerResult });

    if (!providerResult.success) {
      return {
        success: false,
        providerResult: {
          success: false,
          status: providerResult.status,
          message: providerResult.errorMessage || providerResult.message,
        },
        orderStatus: order.status,
        errorMessage: providerResult.errorMessage || "Provider cancellation failed",
      };
    }

    let paymentResult: CancelResult["paymentResult"];

    if (refundPayment && order.stripePaymentIntentId) {
      logger.info("[RefundService] Processing Stripe refund for cancellation", { orderId });

      try {
        const stripeGateway = getStripeGateway();
        const stripeRefund = await stripeGateway.processRefund({
          paymentIntentId: order.stripePaymentIntentId,
          reason: "requested_by_customer",
          metadata: {
            orderId: order.id,
            refundReason: "ORDER_CANCELLED",
            adminId: adminId || "",
          },
        });

        paymentResult = {
          success: stripeRefund.success,
          refundId: stripeRefund.refundId,
          amount: stripeRefund.amount,
          status: stripeRefund.status,
          message: stripeRefund.errorMessage,
        };
      } catch (error) {
        logger.error("[RefundService] Stripe refund failed for cancellation", { orderId, error });
        paymentResult = {
          success: false,
          message: error instanceof Error ? error.message : "Stripe refund failed",
        };
      }
    }

    await db.update(orders).set({
      status: "cancelled",
      updatedAt: new Date(),
    }).where(eq(orders.id, orderId));

    logger.info("[RefundService] Order cancelled", { orderId });

    return {
      success: true,
      providerResult: {
        success: true,
        status: providerResult.status,
        message: providerResult.message,
      },
      paymentResult,
      orderStatus: "cancelled",
    };
  }
}

export const refundService = new RefundService();
