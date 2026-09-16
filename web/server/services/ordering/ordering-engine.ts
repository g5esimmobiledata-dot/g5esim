import { db } from "../../db";
import { providers, orders } from "@shared/schema";
import { eq } from "drizzle-orm";
import { providerFactory } from "../../providers/provider-factory";
import { getProviderSpecificPackageId, resolvePackage } from "../packages/package-resolver";
import { marginCalculator } from "./margin-calculator";
import { providerSelector } from "./provider-selector";
import { queueAdminAlert } from "../admin-alert-service";
import {
  createSandboxEsimDetails,
  isSandboxDemoModeForRole,
  isSandboxDemoModeForUser,
} from "../../utils/sandboxDemo";
import type {
  OrderRequest,
  OrderResult,
  EsimDetails,
  FailoverAttempt,
} from "./types";

export class OrderingEngine {
  async createOrder(request: OrderRequest): Promise<OrderResult> {
    const attempts: FailoverAttempt[] = [];

    const packageInfo = await resolvePackage(request.unifiedPackageId);
    console.log("CHECKKKKK PACKAGEEE INFOOOOOOO", packageInfo)
    if (!packageInfo) {
      return {
        success: false,
        failoverUsed: false,
        attempts,
        error: "Package not found",
        errorCode: "PACKAGE_NOT_FOUND",
      };
    }

    const providerId = packageInfo.providerId;
    if (!providerId) {
      return {
        success: false,
        failoverUsed: false,
        attempts,
        error: "No provider associated with package",
        errorCode: "NO_PROVIDER",
      };
    }

    const unitWholesalePrice = parseFloat(packageInfo.wholesalePrice);
    const unitRetailPrice = parseFloat(packageInfo.price);
    const totalWholesalePrice = unitWholesalePrice * request.quantity;
    const totalRetailPrice = unitRetailPrice * request.quantity;

    const sandboxMode = request.userId
      ? await isSandboxDemoModeForUser(request.userId)
      : await isSandboxDemoModeForRole(request.customerRole);

    if (sandboxMode) {
      const sandboxOrder = await createSandboxEsimDetails(request.orderId || request.partnerReference || request.unifiedPackageId);
      const sandboxAttempt: FailoverAttempt = {
        providerId: providerId || "sandbox",
        providerName: "Sandbox Demo",
        timestamp: new Date().toISOString(),
        success: true,
        responseTimeMs: 0,
        margin: {
          wholesalePrice: 0,
          retailPrice: totalRetailPrice,
          marginPercent: 100,
          minimumRequired: 0,
          passed: true,
        },
      };

      return {
        success: true,
        orderId: sandboxOrder.providerOrderId,
        providerOrderId: sandboxOrder.providerOrderId,
        esimDetails: [sandboxOrder.simDetails],
        failoverUsed: false,
        originalProviderId: providerId,
        finalProviderId: providerId,
        attempts: [sandboxAttempt],
        totalWholesalePrice: 0,
        totalRetailPrice,
      };
    }

    const isEnabled = await providerSelector.isProviderEnabled(providerId);
    if (!isEnabled) {
      return {
        success: false,
        failoverUsed: false,
        attempts,
        error: "Provider is disabled",
        errorCode: "PROVIDER_DISABLED",
      };
    }

    const provider = await db.query.providers.findFirst({
      where: eq(providers.id, providerId),
    });

    const minMargin = await marginCalculator.getProviderMinMargin(providerId);
    const marginCalc = marginCalculator.validateMargin(
      totalWholesalePrice,
      totalRetailPrice,
      minMargin
    );

    if (!marginCalc.passed) {
      return {
        success: false,
        failoverUsed: false,
        attempts,
        error: `Margin requirement not met: ${marginCalc.marginPercent}% < ${minMargin}%`,
        errorCode: "MARGIN_NOT_MET",
      };
    }

    let primaryProviderPackageId = packageInfo.slug || packageInfo.airaloId || "";
    if (packageInfo.providerPackageTable && packageInfo.providerPackageId) {
      primaryProviderPackageId =
        (await getProviderSpecificPackageId(packageInfo.providerPackageTable, packageInfo.providerPackageId)) ||
        packageInfo.providerPackageId;
    }

    const primaryResult = await this.attemptWithProvider(
      providerId,
      provider?.name || "Unknown",
      primaryProviderPackageId,
      request,
      marginCalc
    );

    attempts.push(primaryResult.attempt);

    if (primaryResult.success) {
      const result: OrderResult = {
        success: true,
        orderId: primaryResult.orderId,
        providerOrderId: primaryResult.providerOrderId,
        esimDetails: primaryResult.esimDetails,
        failoverUsed: false,
        originalProviderId: providerId,
        finalProviderId: providerId,
        attempts,
        totalWholesalePrice,
        totalRetailPrice,
      };

      if (request.orderId) {
        await this.persistFailoverData(request.orderId, result);
      }

      queueAdminAlert("esim_order", {
        title: "New eSIM Data Order",
        message: `eSIM order for ${request.customerEmail} completed with ${provider?.name || "primary provider"}.`,
        actionPath: "/admin/orders",
        metadata: {
          orderId: request.orderId || null,
          providerOrderId: result.providerOrderId || result.orderId || null,
          customerEmail: request.customerEmail,
          packageId: request.packageId,
          unifiedPackageId: request.unifiedPackageId,
          quantity: request.quantity,
          totalRetailPrice,
          totalWholesalePrice,
          providerId,
          providerName: provider?.name || null,
          source: request.source,
        },
      });

      return result;
    }

    const settings = await marginCalculator.getFailoverSettings();
    if (!settings.enabled) {
      return {
        success: false,
        failoverUsed: false,
        originalProviderId: providerId,
        attempts,
        error: primaryResult.error,
        errorCode: primaryResult.errorCode,
        totalWholesalePrice,
        totalRetailPrice,
      };
    }

    const alternatives = await providerSelector.findAlternativePackages(
      request.unifiedPackageId,
      providerId,
      totalRetailPrice
    );

    if (alternatives.length === 0) {
      await this.notifyAdminOnFailure(request, attempts);
      return {
        success: false,
        failoverUsed: true,
        originalProviderId: providerId,
        attempts,
        error: "All providers failed or no alternatives available",
        errorCode: "ALL_PROVIDERS_FAILED",
        totalWholesalePrice,
        totalRetailPrice,
      };
    }

    for (const candidate of alternatives) {
      const candidateTotalWholesale = candidate.wholesalePrice * request.quantity;
      const candidateMargin = marginCalculator.validateMargin(
        candidateTotalWholesale,
        totalRetailPrice,
        candidate.minMarginPercent
      );

      if (!candidateMargin.passed) {
        attempts.push({
          providerId: candidate.providerId,
          providerName: candidate.providerName,
          timestamp: new Date().toISOString(),
          success: false,
          error: `Margin too low: ${candidateMargin.marginPercent}% < ${candidate.minMarginPercent}%`,
          errorCode: "MARGIN_NOT_MET",
          responseTimeMs: 0,
          margin: candidateMargin,
        });
        continue;
      }

      const result = await this.attemptWithProvider(
        candidate.providerId,
        candidate.providerName,
        candidate.providerPackageId,
        request,
        candidateMargin
      );

      

      attempts.push(result.attempt);

      if (result.success) {
        const orderResult: OrderResult = {
          success: true,
          orderId: result.orderId,
          providerOrderId: result.providerOrderId,
          esimDetails: result.esimDetails,
          failoverUsed: true,
          originalProviderId: providerId,
          finalProviderId: candidate.providerId,
          attempts,
          totalWholesalePrice: candidateTotalWholesale,
          totalRetailPrice,
        };

        if (request.orderId) {
          await this.persistFailoverData(request.orderId, orderResult);
        }

        queueAdminAlert("esim_order", {
          title: "New eSIM Data Order",
          message: `eSIM order for ${request.customerEmail} completed via failover provider ${candidate.providerName}.`,
          actionPath: "/admin/orders",
          metadata: {
            orderId: request.orderId || null,
            providerOrderId: orderResult.providerOrderId || orderResult.orderId || null,
            customerEmail: request.customerEmail,
            packageId: request.packageId,
            unifiedPackageId: request.unifiedPackageId,
            quantity: request.quantity,
            totalRetailPrice,
            totalWholesalePrice: candidateTotalWholesale,
            originalProviderId: providerId,
            finalProviderId: candidate.providerId,
            finalProviderName: candidate.providerName,
            failoverUsed: true,
            source: request.source,
          },
        });

        await this.notifyAdminOnFailover(request, providerId, candidate.providerId, candidate.providerName, attempts);

        return orderResult;
      }
    }

    await this.notifyAdminOnFailure(request, attempts);

    return {
      success: false,
      failoverUsed: true,
      originalProviderId: providerId,
      attempts,
      error: "All providers failed",
      errorCode: "ALL_PROVIDERS_FAILED",
      totalWholesalePrice,
      totalRetailPrice,
    };
  }

  private async persistFailoverData(
    orderId: string,
    result: OrderResult
  ): Promise<void> {
    try {
      await db
        .update(orders)
        .set({
          originalProviderId: result.originalProviderId,
          finalProviderId: result.finalProviderId,
          failoverAttempts: result.attempts,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));
    } catch (error) {
      console.error("Failed to persist failover data:", error);
    }
  }

  private async attemptWithProvider(
    providerId: string,
    providerName: string,
    providerPackageId: string,
    request: OrderRequest,
    margin: ReturnType<typeof marginCalculator.validateMargin>
  ): Promise<{
    success: boolean;
    orderId?: string;
    providerOrderId?: string;
    esimDetails?: EsimDetails[];
    error?: string;
    errorCode?: string;
    attempt: FailoverAttempt;
  }> {
    const startTime = Date.now();

    try {
      const providerService = await providerFactory.getServiceById(providerId);

      console.log("Provider service created for providerId:", JSON.stringify(providerService, null, 2));
      console.log("TX_ID SENT TO PROVIDER:", request.transactionId, providerPackageId);

      const orderResult = await providerService.createOrder({
        packageId: providerPackageId,
        quantity: request.quantity,
        transactionId: request.transactionId,
        customerRef: request.partnerReference
      });

      console.log("Order result:", JSON.stringify(orderResult, null, 2));

      const responseTimeMs = Date.now() - startTime;

      if (orderResult.success) {
        const esimDetails: EsimDetails[] = [];

        if (orderResult.iccid) {
          esimDetails.push({
            iccid: orderResult.iccid,
            qrCode: orderResult.qrCode,
            qrCodeUrl: orderResult.qrCodeUrl,
            smdpAddress: orderResult.smdpAddress,
            activationCode: orderResult.activationCode,
          });
        }

        return {
          success: true,
          orderId: orderResult.providerOrderId,
          providerOrderId: orderResult.providerOrderId,
          esimDetails,
          attempt: {
            providerId,
            providerName,
            timestamp: new Date().toISOString(),
            success: true,
            responseTimeMs,
            margin,
          },
        };
      }

      return {
        success: false,
        error: orderResult.errorMessage || "Provider order failed",
        errorCode: "PROVIDER_ERROR",
        attempt: {
          providerId,
          providerName,
          timestamp: new Date().toISOString(),
          success: false,
          error: orderResult.errorMessage || "Provider order failed",
          errorCode: "PROVIDER_ERROR",
          responseTimeMs,
          margin,
        },
      };
    } catch (error: any) {
      const responseTimeMs = Date.now() - startTime;

      return {
        success: false,
        error: error.message || "Unknown error",
        errorCode: "EXCEPTION",
        attempt: {
          providerId,
          providerName,
          timestamp: new Date().toISOString(),
          success: false,
          error: error.message || "Unknown error",
          errorCode: "EXCEPTION",
          responseTimeMs,
          margin,
        },
      };
    }
  }

  private async notifyAdminOnFailure(
    request: OrderRequest,
    attempts: FailoverAttempt[]
  ): Promise<void> {
    try {
      const attemptsSummary = attempts.map(a => ({
        provider: a.providerName,
        success: a.success,
        error: a.error,
        time: a.responseTimeMs,
      }));

      queueAdminAlert("esim_order", {
        title: "Order Failed - All Providers",
        message: `Order for ${request.customerEmail} failed. All ${attempts.length} provider(s) attempted.`,
        actionPath: "/admin/orders",
        metadata: {
          packageId: request.packageId,
          customerEmail: request.customerEmail,
          quantity: request.quantity,
          attempts: attemptsSummary,
          source: request.source,
        },
      });
    } catch (error) {
      console.error("Failed to create admin notification:", error);
    }
  }

  private async notifyAdminOnFailover(
    request: OrderRequest,
    originalProviderId: string,
    finalProviderId: string,
    finalProviderName: string,
    attempts: FailoverAttempt[]
  ): Promise<void> {
    try {
      const originalProvider = await db.query.providers.findFirst({
        where: eq(providers.id, originalProviderId),
      });

      const attemptsSummary = attempts.map(a => ({
        provider: a.providerName,
        success: a.success,
        error: a.error,
        time: a.responseTimeMs,
      }));

      const failedAttempts = attempts.filter(a => !a.success);

      queueAdminAlert("esim_order", {
        title: "Failover Used Successfully",
        message: `Order for ${request.customerEmail} completed via failover. Original: ${originalProvider?.name || originalProviderId}, Final: ${finalProviderName}. ${failedAttempts.length} provider(s) failed before success.`,
        actionPath: "/admin/orders",
        metadata: {
          packageId: request.packageId,
          customerEmail: request.customerEmail,
          quantity: request.quantity,
          originalProviderId,
          originalProviderName: originalProvider?.name,
          finalProviderId,
          finalProviderName,
          failedAttempts: failedAttempts.length,
          attempts: attemptsSummary,
          source: request.source,
        },
      });

      console.log(`[OrderingEngine] Admin notified: Failover from ${originalProvider?.name} to ${finalProviderName}`);
    } catch (error) {
      console.error("Failed to create failover notification:", error);
    }
  }
}

export const orderingEngine = new OrderingEngine();
