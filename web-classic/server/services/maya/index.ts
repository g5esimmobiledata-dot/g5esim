"use strict";

import { eq } from "drizzle-orm";
import { db } from "../../db";
import { mayaPackages } from "@shared/schema";
import { BaseProviderService } from "../../providers/provider-interface";
import type {
  ProviderOrderRequest,
  ProviderOrderResponse,
  ProviderOrderStatus,
  ProviderUsageData,
  ProviderTopupPackage,
  ProviderTopupRequest,
  ProviderTopupResponse,
  ProviderPackageData,
  ProviderRateLimit,
  WebhookValidationResult,
  ProviderWebhookPayload,
  ProviderRefundRequest,
  ProviderRefundResponse,
  ProviderCancelRequest,
  ProviderCancelResponse,
} from "../../providers/provider-interface";
import type { Provider } from "@shared/schema";

import { syncMayaPackages } from "./sync";
import { syncMayaTopups } from "./topup-sync";
import { createMayaOrder, getMayaOrderStatus, requestMayaRefund, cancelMayaOrder } from "./orders";
import { getMayaUsageData } from "./usage";
import { getMayaTopupPackages, purchaseMayaTopup } from "./topups";
import { validateMayaWebhook, parseMayaWebhookPayload } from "./api-client";
import { determineMayaPackageType } from "./types";

export class MayaService extends BaseProviderService {
  private readonly rateLimit = { requestsPerHour: 3600, requestsPerSecond: 2 };
  
  constructor(provider: Provider) {
    super(provider);
  }
  
  private getApiKey(): string {
    return this.getCredential("MAYA_API_KEY");
  }
  
  private getApiSecret(): string {
    return this.getCredential("MAYA_API_SECRET");
  }
  
  async healthCheck(): Promise<{ healthy: boolean; responseTime?: number; errorMessage?: string }> {
    const startTime = Date.now();
    try {
      const { getMayaProducts } = require("./api-client");
      await getMayaProducts(this.getApiKey(), this.getApiSecret(), { country: "us" });
      return {
        healthy: true,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }
  
  async syncPackages(): Promise<{
    success: boolean;
    packagesSynced: number;
    packagesUpdated: number;
    packagesRemoved: number;
    errorMessage?: string;
  }> {
    this.ensureEnabled();
    return syncMayaPackages(this.provider, this.getApiKey(), this.getApiSecret());
  }
  
  async syncTopups(): Promise<{
    success: boolean;
    topupsSynced: number;
    topupsUpdated: number;
    topupsRemoved: number;
    errorMessage?: string;
  }> {
    this.ensureEnabled();
    return syncMayaTopups(this.provider, this.getApiKey(), this.getApiSecret());
  }
  
  async createOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse> {
    this.ensureEnabled();
    return createMayaOrder(request, this.getApiKey(), this.getApiSecret());
  }
  
  async getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus> {
    return getMayaOrderStatus(providerOrderId, this.getApiKey(), this.getApiSecret());
  }
  
  async getUsageData(iccidOrEsimId: string): Promise<ProviderUsageData> {
    return getMayaUsageData(iccidOrEsimId, this.getApiKey(), this.getApiSecret());
  }
  
  async getTopupPackages(iccidOrPackageId: string): Promise<ProviderTopupPackage[]> {
    return getMayaTopupPackages(iccidOrPackageId, this.getApiKey(), this.getApiSecret());
  }
  
  async purchaseTopup(request: ProviderTopupRequest): Promise<ProviderTopupResponse> {
    return purchaseMayaTopup(request, this.getApiKey(), this.getApiSecret());
  }
  
  async validateWebhook(payload: string | object, signature?: string): Promise<WebhookValidationResult> {
    const webhookSecret = this.provider.webhookSecret || this.getCredential("MAYA_WEBHOOK_SECRET");
    return validateMayaWebhook(payload, signature, webhookSecret);
  }
  
  async parseWebhookPayload(payload: object): Promise<ProviderWebhookPayload> {
    const parsed = parseMayaWebhookPayload(payload);
    const type = parsed.type === "esim_status" ? "other" : parsed.type;
    return {
      type,
      providerOrderId: parsed.providerOrderId,
      requestId: parsed.esimId,
      iccid: parsed.iccid,
      status: parsed.status,
      data: parsed.data,
      timestamp: parsed.timestamp,
    };
  }
  
  getSyncRateLimit(): ProviderRateLimit {
    return {
      requestsPerHour: this.rateLimit.requestsPerHour,
      requestsPerSecond: this.rateLimit.requestsPerSecond,
    };
  }
  
  async getPackageById(packageId: string): Promise<ProviderPackageData | null> {
    try {
      const pkg = await db.query.mayaPackages.findFirst({
        where: eq(mayaPackages.mayaId, packageId),
      });
      
      if (!pkg) return null;
      
      return {
        providerPackageId: pkg.mayaId,
        slug: pkg.slug,
        title: pkg.title,
        dataAmount: pkg.dataAmount,
        validity: pkg.validity,
        wholesalePrice: parseFloat(pkg.wholesalePrice),
        currency: pkg.currency,
        type: pkg.type as "local" | "regional" | "global",
        coverage: pkg.coverage || undefined,
        isUnlimited: pkg.isUnlimited,
      };
    } catch (error) {
      console.error("[Maya] getPackageById error:", error);
      return null;
    }
  }
  
  async requestRefund(request: ProviderRefundRequest): Promise<ProviderRefundResponse> {
    return requestMayaRefund(request, this.getApiKey(), this.getApiSecret());
  }
  
  async cancelOrder(request: ProviderCancelRequest): Promise<ProviderCancelResponse> {
    return cancelMayaOrder(request, this.getApiKey(), this.getApiSecret());
  }
  
  supportsRefunds(): boolean {
    return true;
  }
  
  supportsCancellation(): boolean {
    return true;
  }
}

export function createMayaService(provider: Provider): MayaService {
  return new MayaService(provider);
}

export * from "./types";
