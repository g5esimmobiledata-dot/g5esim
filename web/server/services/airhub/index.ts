"use strict";

import { eq } from "drizzle-orm";
import { db } from "../../db";
import { airhubPackages, type Provider } from "@shared/schema";
import { BaseProviderService } from "../../providers/provider-interface";
import type {
  ProviderCancelRequest,
  ProviderCancelResponse,
  ProviderOrderRequest,
  ProviderOrderResponse,
  ProviderOrderStatus,
  ProviderPackageData,
  ProviderRateLimit,
  ProviderRefundRequest,
  ProviderRefundResponse,
  ProviderTopupPackage,
  ProviderTopupRequest,
  ProviderTopupResponse,
  ProviderUsageData,
  ProviderWebhookPayload,
  WebhookValidationResult,
} from "../../providers/provider-interface";
import { getAirhubPartnerCode, getAirhubToken, makeAirhubRequest, parseAirhubWebhookPayload } from "./api";
import { syncAirhubPackages } from "./sync";
import {
  createAirhubOrder,
  getAirhubOrderStatus,
  getAirhubTopupPackages,
  getAirhubUsageData,
  purchaseAirhubTopup,
} from "./orders";

export class AirhubService extends BaseProviderService {
  private readonly rateLimit = { requestsPerHour: 1000, requestsPerSecond: 2 };

  private getUsername(): string {
    return this.getCredential("AIRHUB_USERNAME");
  }

  private getPassword(): string {
    return this.getCredential("AIRHUB_PASSWORD");
  }

  private async getPartnerCode(): Promise<number> {
    return getAirhubPartnerCode(this.getUsername(), this.getPassword());
  }

  private async getToken(): Promise<string> {
    return getAirhubToken(this.getUsername(), this.getPassword());
  }

  async syncPackages() {
    this.ensureEnabled();
    return syncAirhubPackages(this.provider, await this.getToken(), await this.getPartnerCode());
  }

  async createOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse> {
    this.ensureEnabled();
    return createAirhubOrder(request, await this.getToken(), await this.getPartnerCode());
  }

  async getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus> {
    return getAirhubOrderStatus(providerOrderId, await this.getToken(), await this.getPartnerCode());
  }

  async getUsageData(iccid: string): Promise<ProviderUsageData> {
    return getAirhubUsageData(iccid);
  }

  async getTopupPackages(iccidOrPackageId: string): Promise<ProviderTopupPackage[]> {
    return getAirhubTopupPackages(await this.getToken(), iccidOrPackageId);
  }

  async purchaseTopup(request: ProviderTopupRequest): Promise<ProviderTopupResponse> {
    return purchaseAirhubTopup(request, await this.getToken(), await this.getPartnerCode());
  }

  async validateWebhook(payload: string | object): Promise<WebhookValidationResult> {
    return { isValid: !!payload };
  }

  async parseWebhookPayload(payload: object): Promise<ProviderWebhookPayload> {
    return parseAirhubWebhookPayload(payload);
  }

  getSyncRateLimit(): ProviderRateLimit {
    return this.rateLimit;
  }

  async getPackageById(packageId: string): Promise<ProviderPackageData | null> {
    const pkg = await db.query.airhubPackages.findFirst({
      where: eq(airhubPackages.airhubId, packageId),
    });
    if (!pkg) return null;
    return {
      providerPackageId: pkg.airhubId,
      slug: pkg.slug,
      title: pkg.title,
      dataAmount: pkg.dataAmount,
      validity: pkg.validity,
      wholesalePrice: Number.parseFloat(pkg.wholesalePrice),
      currency: pkg.currency,
      type: pkg.type as "local" | "regional" | "global",
      operator: pkg.operator || undefined,
      operatorImage: pkg.operatorImage || undefined,
      coverage: pkg.coverage || undefined,
      voiceCredits: pkg.voiceCredits || 0,
      smsCredits: pkg.smsCredits || 0,
      isUnlimited: pkg.isUnlimited,
    };
  }

  async healthCheck() {
    const startTime = Date.now();
    try {
      await makeAirhubRequest(
        `/api/ESIM/get_wallet_invidual?partnercode=${await this.getPartnerCode()}`,
        "GET",
        undefined,
        await this.getToken()
      );
      return { healthy: true, responseTime: Date.now() - startTime };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : "Airhub health check failed",
      };
    }
  }

  async requestRefund(_request: ProviderRefundRequest): Promise<ProviderRefundResponse> {
    return { success: false, approved: false, status: "not_supported", errorMessage: "Airhub refund API is not documented" };
  }

  async cancelOrder(_request: ProviderCancelRequest): Promise<ProviderCancelResponse> {
    return { success: false, status: "not_supported", errorMessage: "Airhub cancellation API is not documented" };
  }

  supportsRefunds(): boolean {
    return false;
  }

  supportsCancellation(): boolean {
    return false;
  }
}

export * from "./types";
