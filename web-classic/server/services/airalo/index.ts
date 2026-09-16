"use strict";

import { db } from "../../db";
import { eq } from "drizzle-orm";
import { airaloPackages, type Provider } from "@shared/schema";
import {
  BaseProviderService,
  type ProviderPackageData,
  type ProviderOrderRequest,
  type ProviderOrderResponse,
  type ProviderOrderStatus,
  type ProviderUsageData,
  type ProviderTopupPackage,
  type ProviderTopupRequest,
  type ProviderTopupResponse,
  type WebhookValidationResult,
  type ProviderWebhookPayload,
  type ProviderRateLimit,
  type ProviderRefundRequest,
  type ProviderRefundResponse,
  type ProviderCancelRequest,
  type ProviderCancelResponse,
} from "../../providers/provider-interface";
import { syncAiraloPackages } from "./sync";
import {
  createAiraloOrder,
  getAiraloOrderStatus,
  getAiraloTopupPackages,
  purchaseAiraloTopup,
  requestAiraloRefund,
  cancelAiraloFutureOrders,
} from "./orders";
import {
  getAiraloUsageData,
  validateAiraloWebhook,
  parseAiraloWebhookPayload,
  checkAiraloHealth
} from "./utils";

export class AiraloService extends BaseProviderService {
  private readonly rateLimit = { requestsPerHour: 6000, requestsPerSecond: 1.67 };

  constructor(provider: Provider) {
    super(provider);
  }

  async syncPackages(): Promise<{
    success: boolean;
    packagesSynced: number;
    packagesUpdated: number;
    packagesRemoved: number;
    errorMessage?: string;
  }> {
    this.ensureEnabled();
    return syncAiraloPackages(this.provider);
  }

  async createOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse> {
    this.ensureEnabled();
    return createAiraloOrder(request);
  }

  async getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus> {
    return getAiraloOrderStatus(providerOrderId);
  }

  async getUsageData(iccid: string): Promise<ProviderUsageData> {
    return getAiraloUsageData(iccid);
  }

  async getTopupPackages(iccidOrPackageId: string): Promise<ProviderTopupPackage[]> {
    return getAiraloTopupPackages(iccidOrPackageId);
  }

  async purchaseTopup(request: ProviderTopupRequest): Promise<ProviderTopupResponse> {
    return purchaseAiraloTopup(request);
  }

  async validateWebhook(payload: string | object, signature?: string): Promise<WebhookValidationResult> {
    const secretKey = this.provider.webhookSecret || this.getCredential("AIRALO_WEBHOOK_SECRET");
    return validateAiraloWebhook(payload, signature, secretKey);
  }

  async parseWebhookPayload(payload: object): Promise<ProviderWebhookPayload> {
    return parseAiraloWebhookPayload(payload);
  }

  getSyncRateLimit(): ProviderRateLimit {
    return {
      requestsPerHour: this.rateLimit.requestsPerHour,
      requestsPerSecond: this.rateLimit.requestsPerSecond,
    };
  }

  async getPackageById(packageId: string): Promise<ProviderPackageData | null> {
    try {
      const pkg = await db.query.airaloPackages.findFirst({
        where: eq(airaloPackages.airaloId, packageId),
      });

      if (!pkg) return null;

      return {
        providerPackageId: pkg.airaloId,
        slug: pkg.slug,
        title: pkg.title,
        dataAmount: pkg.dataAmount,
        validity: pkg.validity,
        wholesalePrice: parseFloat(pkg.airaloPrice || pkg.price),
        currency: pkg.currency,
        type: pkg.type as "local" | "regional" | "global",
        operator: pkg.operator || undefined,
        operatorImage: pkg.operatorImage || undefined,
        coverage: pkg.coverage || undefined,
        voiceCredits: pkg.voiceCredits || 0,
        smsCredits: pkg.smsCredits || 0,
        isUnlimited: pkg.isUnlimited,
      };
    } catch (error) {
      return null;
    }
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    responseTime?: number;
    errorMessage?: string;
  }> {
    return checkAiraloHealth();
  }

  async requestRefund(request: ProviderRefundRequest): Promise<ProviderRefundResponse> {
    this.ensureEnabled();
    return requestAiraloRefund(request);
  }

  async cancelOrder(request: ProviderCancelRequest): Promise<ProviderCancelResponse> {
    this.ensureEnabled();
    console.log("request", JSON.stringify(request, null, 2));
    const requestId = request.requestId || request.providerOrderId;
    if (requestId) {
      return cancelAiraloFutureOrders([requestId]);
    }
    return {
      success: false,
      status: "not_supported",
      errorMessage: "Airalo only supports cancelling future orders with a request ID",
    };
  }

  supportsRefunds(): boolean {
    return true;
  }

  supportsCancellation(): boolean {
    return true;
  }
}

export function createAiraloService(provider: Provider): AiraloService {
  return new AiraloService(provider);
}

export * from "./types";
