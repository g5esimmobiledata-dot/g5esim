"use strict";

import { db } from "../../db";
import { eq } from "drizzle-orm";
import { esimGoPackages, type Provider } from "@shared/schema";
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
import { syncEsimGoPackages } from "./sync";
import {
  createEsimGoOrder,
  getEsimGoOrderStatus,
  getEsimGoUsageData,
  getEsimGoTopupPackages,
  purchaseEsimGoTopup,
  requestEsimGoRefund,
  cancelEsimGoOrder,
} from "./orders";
import { 
  makeEsimGoRequest, 
  validateEsimGoWebhook, 
  parseEsimGoWebhookPayload 
} from "./api";

export class EsimGoService extends BaseProviderService {
  private readonly rateLimit = { requestsPerHour: 3600, requestsPerMinute: 60 };
  
  constructor(provider: Provider) {
    super(provider);
  }
  
  private getApiKey(): string {
    return this.getCredential("ESIM_GO_API_KEY");
  }
  
  async syncPackages(): Promise<{
    success: boolean;
    packagesSynced: number;
    packagesUpdated: number;
    packagesRemoved: number;
    errorMessage?: string;
  }> {
    this.ensureEnabled();
    return syncEsimGoPackages(this.provider, this.getApiKey());
  }
  
  async createOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse> {
    this.ensureEnabled();
    return createEsimGoOrder(request, this.getApiKey());
  }
  
  async getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus> {
    return getEsimGoOrderStatus(providerOrderId, this.getApiKey());
  }
  
  async getUsageData(iccid: string): Promise<ProviderUsageData> {
    return getEsimGoUsageData(iccid, this.getApiKey());
  }
  
  async getTopupPackages(iccidOrPackageId: string): Promise<ProviderTopupPackage[]> {
    return getEsimGoTopupPackages(iccidOrPackageId, this.getApiKey());
  }
  
  async purchaseTopup(request: ProviderTopupRequest): Promise<ProviderTopupResponse> {
    return purchaseEsimGoTopup(request, this.getApiKey());
  }
  
  async validateWebhook(payload: string | object, signature?: string): Promise<WebhookValidationResult> {
    const secretKey = this.provider.webhookSecret || this.getApiKey();
    return validateEsimGoWebhook(payload, signature, secretKey);
  }
  
  async parseWebhookPayload(payload: object): Promise<ProviderWebhookPayload> {
    return parseEsimGoWebhookPayload(payload);
  }
  
  getSyncRateLimit(): ProviderRateLimit {
    return {
      requestsPerHour: this.rateLimit.requestsPerHour,
      requestsPerSecond: 1,
    };
  }
  
  async getPackageById(packageId: string): Promise<ProviderPackageData | null> {
    try {
      const pkg = await db.query.esimGoPackages.findFirst({
        where: eq(esimGoPackages.esimGoId, packageId),
      });
      
      if (!pkg) return null;
      
      return {
        providerPackageId: pkg.esimGoId,
        slug: pkg.slug,
        title: pkg.title,
        dataAmount: pkg.dataAmount,
        validity: pkg.validity,
        wholesalePrice: parseFloat(pkg.wholesalePrice),
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
    const startTime = Date.now();
    
    try {
      await makeEsimGoRequest('/bundles', 'GET', undefined, this.getApiKey());
      
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: true,
        responseTime,
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async requestRefund(request: ProviderRefundRequest): Promise<ProviderRefundResponse> {
    this.ensureEnabled();
    return requestEsimGoRefund(request, this.getApiKey());
  }

  async cancelOrder(request: ProviderCancelRequest): Promise<ProviderCancelResponse> {
    this.ensureEnabled();
    return cancelEsimGoOrder(request, this.getApiKey());
  }

  supportsRefunds(): boolean {
    return true;
  }

  supportsCancellation(): boolean {
    return false;
  }
}

export * from "./types";
