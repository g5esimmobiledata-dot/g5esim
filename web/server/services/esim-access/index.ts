"use strict";

import { db } from "../../db";
import { eq } from "drizzle-orm";
import { esimAccessPackages, type Provider } from "@shared/schema";
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
import { storage } from "../../storage";
import { syncEsimAccessPackages } from "./sync";
import {
  createEsimAccessOrder,
  getEsimAccessOrderStatus,
  getEsimAccessUsageData,
  getEsimAccessTopupPackages,
  purchaseEsimAccessTopup,
  cancelEsimAccessEsim,
} from "./orders";
import {
  makeEsimAccessRequest,
  validateEsimAccessWebhook,
  parseEsimAccessWebhookPayload
} from "./api";
import { storage } from "server/storage";

export class EsimAccessService extends BaseProviderService {
  private readonly rateLimit = { requestsPerHour: 28800, requestsPerSecond: 8 };

  constructor(provider: Provider) {
    super(provider);
  }

  private getAccessCode(): string {
    return this.getCredential("ESIM_ACCESS_CLIENT_ID");
  }

  private getSecretKey(): string {
    return this.getCredential("ESIM_ACCESS_CLIENT_SECRET");
  }

  async syncPackages(): Promise<{
    success: boolean;
    packagesSynced: number;
    packagesUpdated: number;
    packagesRemoved: number;
    errorMessage?: string;
  }> {
    this.ensureEnabled();
    return syncEsimAccessPackages(this.provider, this.getAccessCode(), this.getSecretKey());
  }

  async createOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse> {
    this.ensureEnabled();
    // console.log('EsimAccessService.createOrder called with request:', request , 'using accessCode:', this.getAccessCode() , 'and secretKey:', this.getSecretKey());
    return createEsimAccessOrder(request, this.getAccessCode(), this.getSecretKey());
  }

  async getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus> {
    return getEsimAccessOrderStatus(providerOrderId, this.getAccessCode(), this.getSecretKey());
  }

  async getUsageData(iccid: string): Promise<ProviderUsageData> {
    const getOrder = await storage.getOrderByIccid(iccid);

    const providerOrderId = getOrder?.providerOrderId
      ? getOrder.providerOrderId.slice(1) // remove first character
      : undefined;

    return getEsimAccessUsageData(
      providerOrderId ?? iccid, // use providerOrderId if exists, else iccid
      this.getAccessCode(),
      this.getSecretKey()
    );
  }

  async getTopupPackages(iccidOrPackageId: string): Promise<ProviderTopupPackage[]> {
    return getEsimAccessTopupPackages(iccidOrPackageId, this.getAccessCode(), this.getSecretKey());
  }

  async purchaseTopup(request: ProviderTopupRequest): Promise<ProviderTopupResponse> {
    return purchaseEsimAccessTopup(request, this.getAccessCode(), this.getSecretKey());
  }

  async validateWebhook(payload: string | object, signature?: string): Promise<WebhookValidationResult> {
    const secretKey = this.provider.webhookSecret || this.getSecretKey();
    return validateEsimAccessWebhook(payload, signature, secretKey);
  }

  async parseWebhookPayload(payload: object): Promise<ProviderWebhookPayload> {
    return parseEsimAccessWebhookPayload(payload);
  }

  getSyncRateLimit(): ProviderRateLimit {
    return {
      requestsPerHour: this.rateLimit.requestsPerHour,
      requestsPerSecond: this.rateLimit.requestsPerSecond,
    };
  }

  async getPackageById(packageId: string): Promise<ProviderPackageData | null> {
    try {
      const pkg = await db.query.esimAccessPackages.findFirst({
        where: eq(esimAccessPackages.esimAccessId, packageId),
      });

      if (!pkg) return null;

      return {
        providerPackageId: pkg.esimAccessId,
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
      await makeEsimAccessRequest(
        '/api/v1/open/balance/query',
        'POST',
        {},
        this.getAccessCode(),
        this.getSecretKey()
      );

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
    return {
      success: false,
      approved: false,
      status: "not_supported",
      errorMessage: "eSIM Access does not support refunds via API - use cancel instead or contact support",
    };
  }

  async cancelOrder(request: ProviderCancelRequest): Promise<ProviderCancelResponse> {
    this.ensureEnabled();
    if (request.iccid) {
      return cancelEsimAccessEsim(request.iccid, this.getAccessCode(), this.getSecretKey());
    }
    return {
      success: false,
      status: "failed",
      errorMessage: "ICCID is required to cancel an eSIM Access order",
    };
  }

  supportsRefunds(): boolean {
    return false;
  }

  supportsCancellation(): boolean {
    return true;
  }
}

export * from "./types";