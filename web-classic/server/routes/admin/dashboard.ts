"use strict";

import { Router, type Request, type Response } from "express";
import { storage } from "../../storage";
import { db } from "../../db";
import { platformSettings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAdmin } from "../../lib/middleware";
import * as ApiResponse from "../../utils/response";
import { maskApiKey } from "../../utils/encryption";
import { packageAutoSelector } from "../../services/packages/package-auto-selector";

const router = Router();

type OpenAiApiKeySource = "env" | "admin" | null;
type OpenAiBalanceSource = "credit_grants" | "manual" | "monthly_budget" | null;

interface OpenAiBalanceResponse {
  configured: boolean;
  apiKeySource: OpenAiApiKeySource;
  available: boolean;
  balanceUsd: number | null;
  totalGrantedUsd: number | null;
  totalUsedUsd: number | null;
  monthlyCostUsd: number | null;
  monthlyBudgetUsd: number | null;
  balanceSource: OpenAiBalanceSource;
  billingCostsAvailable: boolean;
  localEstimatedCostUsd: number;
  totalRequests: number;
  totalTokens: number;
  errors: number;
  lastRequestAt: string | null;
  checkedAt: string;
  message: string;
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function getOpenAiEnvKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

function getOpenAiAdminKey(): string | null {
  const key = (process.env.OPENAI_ADMIN_API_KEY || process.env.OPENAI_ADMIN_KEY || "").trim();
  return key && key.length > 0 ? key : null;
}

async function getSettingNumber(...keys: string[]): Promise<number | null> {
  for (const key of keys) {
    const envValue = process.env[key]?.trim();
    const envNumber = toFiniteNumber(envValue);
    if (envNumber !== null) return envNumber;

    const dbValue = (await storage.getSettingByKey(key.toLowerCase()))?.value?.trim();
    const dbNumber = toFiniteNumber(dbValue);
    if (dbNumber !== null) return dbNumber;
  }

  return null;
}

async function getOpenAiKey(): Promise<{ apiKey: string | null; source: OpenAiApiKeySource }> {
  const envKey = getOpenAiEnvKey();
  if (envKey) {
    return { apiKey: envKey, source: "env" };
  }

  const storedKey = (await storage.getSettingByKey("openai_api_key"))?.value?.trim();
  if (storedKey) {
    return { apiKey: storedKey, source: "admin" };
  }

  return { apiKey: null, source: null };
}

async function upsertPlatformSetting(
  key: string,
  value: string,
  category = "ai",
  description = `AI setting: ${key}`,
  adminId?: string,
) {
  const existing = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, key),
  });

  if (existing) {
    await db
      .update(platformSettings)
      .set({ value, category, description, updatedAt: new Date(), updatedBy: adminId })
      .where(eq(platformSettings.key, key));
    return;
  }

  await db.insert(platformSettings).values({
    key,
    value,
    category,
    description,
    updatedBy: adminId,
  });
}

async function getAiSettingsStatus() {
  const { openAIService } = await import("../../services/ai/openai-service");
  await openAIService.refreshFromStoredKey();

  const keyConfig = await getOpenAiKey();
  const apiKey = keyConfig.apiKey || "";
  const configured = Boolean(apiKey || openAIService.isReady());
  const source = keyConfig.source || openAIService.getApiKeySource();

  const aiEnabledSetting = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, "ai_selection_enabled"),
  });
  const aiEnabled = aiEnabledSetting?.value === "true";
  const weightSettings = await db.query.platformSettings.findMany({
    where: (ps, { inArray }) => inArray(ps.key, [
      "ai_price_weight",
      "ai_quality_weight",
      "ai_provider_weight",
    ]),
  });
  const weights = { price: 50, quality: 30, provider: 20 };

  for (const setting of weightSettings) {
    const value = Number.parseInt(setting.value, 10);
    if (!Number.isFinite(value)) continue;
    if (setting.key === "ai_price_weight") weights.price = value;
    if (setting.key === "ai_quality_weight") weights.quality = value;
    if (setting.key === "ai_provider_weight") weights.provider = value;
  }

  const usage = openAIService.getUsageStats();

  return {
    isConfigured: configured,
    isReady: openAIService.isReady(),
    maskedKey: apiKey ? maskApiKey(apiKey) : null,
    apiKeySource: source,
    aiEnabled,
    weights,
    usage: {
      totalRequests: usage.totalRequests,
      totalTokens: usage.totalTokens,
      estimatedCost: Math.round(usage.estimatedCost * 100) / 100,
      errors: usage.errors,
      lastRequestAt: usage.lastRequestAt,
    },
  };
}

async function fetchOpenAiCreditBalance(apiKey: string): Promise<{
  available: boolean;
  balanceUsd: number | null;
  totalGrantedUsd: number | null;
  totalUsedUsd: number | null;
  balanceSource: OpenAiBalanceSource;
  message: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://api.openai.com/dashboard/billing/credit_grants", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      return {
        available: false,
        balanceUsd: null,
        totalGrantedUsd: null,
        totalUsedUsd: null,
        balanceSource: null,
        message: "OpenAI is connected, but billing balance access was rejected.",
      };
    }

    if (!response.ok) {
      return {
        available: false,
        balanceUsd: null,
        totalGrantedUsd: null,
        totalUsedUsd: null,
        balanceSource: null,
        message: "OpenAI is connected, but live billing balance is unavailable.",
      };
    }

    const data = await response.json();
    const totalGrantedUsd = toFiniteNumber(data?.total_granted);
    const totalUsedUsd = toFiniteNumber(data?.total_used);
    const explicitBalanceUsd = toFiniteNumber(data?.total_available);
    const calculatedBalanceUsd =
      totalGrantedUsd !== null && totalUsedUsd !== null
        ? Math.max(0, totalGrantedUsd - totalUsedUsd)
        : null;
    const balanceUsd = explicitBalanceUsd ?? calculatedBalanceUsd;

    return {
      available: balanceUsd !== null,
      balanceUsd,
      totalGrantedUsd,
      totalUsedUsd,
      balanceSource: balanceUsd !== null ? "credit_grants" : null,
      message: balanceUsd !== null
        ? "OpenAI balance retrieved."
        : "OpenAI is connected, but live billing balance did not include a usable amount.",
    };
  } catch (error: any) {
    return {
      available: false,
      balanceUsd: null,
      totalGrantedUsd: null,
      totalUsedUsd: null,
      balanceSource: null,
      message: error?.name === "AbortError"
        ? "OpenAI is connected, but the billing balance check timed out."
        : "OpenAI is connected, but live billing balance is currently unavailable.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOpenAiMonthlyCost(apiKey: string): Promise<{
  available: boolean;
  monthlyCostUsd: number | null;
  message: string;
}> {
  const now = new Date();
  const startTime = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
  const url = new URL("https://api.openai.com/v1/organization/costs");
  url.searchParams.set("start_time", String(startTime));
  url.searchParams.set("bucket_width", "1d");
  url.searchParams.set("limit", "31");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        available: false,
        monthlyCostUsd: null,
        message: "OpenAI monthly costs are unavailable for this key.",
      };
    }

    const data = await response.json();
    const monthlyCostUsd = Array.isArray(data?.data)
      ? data.data.reduce((bucketSum: number, bucket: any) => {
          const resultSum = Array.isArray(bucket?.results)
            ? bucket.results.reduce((sum: number, result: any) => {
                const amount = toFiniteNumber(result?.amount?.value);
                return amount === null ? sum : sum + amount;
              }, 0)
            : 0;
          return bucketSum + resultSum;
        }, 0)
      : null;

    if (monthlyCostUsd === null) {
      return {
        available: false,
        monthlyCostUsd: null,
        message: "OpenAI monthly costs did not include a usable amount.",
      };
    }

    return {
      available: true,
      monthlyCostUsd: money(monthlyCostUsd),
      message: "OpenAI monthly costs retrieved.",
    };
  } catch (error: any) {
    return {
      available: false,
      monthlyCostUsd: null,
      message: error?.name === "AbortError"
        ? "OpenAI monthly costs check timed out."
        : "OpenAI monthly costs are currently unavailable.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

router.get(
  "/ai-settings/balance",
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const { openAIService } = await import("../../services/ai/openai-service");
    await openAIService.refreshFromStoredKey();

    const usage = openAIService.getUsageStats();
    const keyConfig = await getOpenAiKey();
    const serviceSource = openAIService.getApiKeySource();
    const apiKeySource = keyConfig.source || serviceSource;
    const configured = Boolean(keyConfig.apiKey || openAIService.isReady());

    let liveBalance = {
      available: false,
      balanceUsd: null as number | null,
      totalGrantedUsd: null as number | null,
      totalUsedUsd: null as number | null,
      monthlyCostUsd: null as number | null,
      monthlyBudgetUsd: null as number | null,
      balanceSource: null as OpenAiBalanceSource,
      billingCostsAvailable: false,
      message: "OpenAI API key not configured.",
    };

    const manualBalanceUsd = await getSettingNumber("OPENAI_BALANCE_USD", "OPENAI_BILLING_BALANCE_USD");
    const monthlyBudgetUsd = await getSettingNumber("OPENAI_MONTHLY_BUDGET_USD");
    const billingKey = getOpenAiAdminKey() || keyConfig.apiKey;

    if (manualBalanceUsd !== null) {
      liveBalance = {
        ...liveBalance,
        available: true,
        balanceUsd: money(manualBalanceUsd),
        balanceSource: "manual",
        message: "OpenAI balance loaded from configured balance value.",
      };
    } else if (keyConfig.apiKey) {
      const creditBalance = await fetchOpenAiCreditBalance(keyConfig.apiKey);
      liveBalance = { ...liveBalance, ...creditBalance };
    } else if (configured) {
      liveBalance.message = "OpenAI is connected, but the stored credential is not available for balance lookup.";
    }

    if ((!liveBalance.available || monthlyBudgetUsd !== null) && billingKey) {
      const monthlyCost = await fetchOpenAiMonthlyCost(billingKey);
      liveBalance.monthlyCostUsd = monthlyCost.monthlyCostUsd;
      liveBalance.monthlyBudgetUsd = monthlyBudgetUsd === null ? null : money(monthlyBudgetUsd);
      liveBalance.billingCostsAvailable = monthlyCost.available;

      if (!liveBalance.available && monthlyCost.available && monthlyBudgetUsd !== null && monthlyCost.monthlyCostUsd !== null) {
        liveBalance.available = true;
        liveBalance.balanceUsd = money(Math.max(0, monthlyBudgetUsd - monthlyCost.monthlyCostUsd));
        liveBalance.totalGrantedUsd = money(monthlyBudgetUsd);
        liveBalance.totalUsedUsd = monthlyCost.monthlyCostUsd;
        liveBalance.balanceSource = "monthly_budget";
        liveBalance.message = "OpenAI balance calculated from monthly budget minus official monthly costs.";
      } else if (!liveBalance.available && monthlyCost.available) {
        liveBalance.message = "OpenAI monthly spend loaded. Set OPENAI_MONTHLY_BUDGET_USD to show remaining balance.";
      } else if (!liveBalance.available && liveBalance.message === "OpenAI API key not configured.") {
        liveBalance.message = monthlyCost.message;
      }
    } else if (monthlyBudgetUsd !== null) {
      liveBalance.monthlyBudgetUsd = money(monthlyBudgetUsd);
    }

    const data: OpenAiBalanceResponse = {
      configured,
      apiKeySource,
      available: liveBalance.available,
      balanceUsd: liveBalance.balanceUsd,
      totalGrantedUsd: liveBalance.totalGrantedUsd,
      totalUsedUsd: liveBalance.totalUsedUsd,
      monthlyCostUsd: liveBalance.monthlyCostUsd,
      monthlyBudgetUsd: liveBalance.monthlyBudgetUsd,
      balanceSource: liveBalance.balanceSource,
      billingCostsAvailable: liveBalance.billingCostsAvailable,
      localEstimatedCostUsd: Math.round(usage.estimatedCost * 10000) / 10000,
      totalRequests: usage.totalRequests,
      totalTokens: usage.totalTokens,
      errors: usage.errors,
      lastRequestAt: usage.lastRequestAt ? usage.lastRequestAt.toISOString() : null,
      checkedAt: new Date().toISOString(),
      message: liveBalance.message,
    };

    return ApiResponse.success(res, "OpenAI balance status fetched successfully", data);
  })
);

router.get(
  "/ai-settings/status",
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const status = await getAiSettingsStatus();
    return ApiResponse.success(res, "OpenAI status retrieved", status);
  })
);

router.post(
  "/ai-settings/update",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { enabled, priceWeight, qualityWeight, providerWeight, apiKey } = req.body || {};
    const adminId = (req as any).admin?.id;
    const updates: Array<{ key: string; value: string; secret?: boolean }> = [];

    if (typeof apiKey === "string" && apiKey.trim()) {
      const trimmedKey = apiKey.trim();
      await upsertPlatformSetting(
        "openai_api_key",
        trimmedKey,
        "ai",
        "OpenAI API key saved from admin settings",
        adminId,
      );
      const { openAIService } = await import("../../services/ai/openai-service");
      openAIService.setApiKey(trimmedKey, "admin");
      updates.push({ key: "openai_api_key", value: "***", secret: true });
    }

    if (typeof enabled === "boolean") {
      await upsertPlatformSetting("ai_selection_enabled", String(enabled), "ai", "Enable AI package selection", adminId);
      updates.push({ key: "ai_selection_enabled", value: String(enabled) });
    }

    if (typeof priceWeight === "number" && priceWeight >= 0 && priceWeight <= 100) {
      await upsertPlatformSetting("ai_price_weight", String(priceWeight), "ai", "AI price scoring weight", adminId);
      updates.push({ key: "ai_price_weight", value: String(priceWeight) });
    }

    if (typeof qualityWeight === "number" && qualityWeight >= 0 && qualityWeight <= 100) {
      await upsertPlatformSetting("ai_quality_weight", String(qualityWeight), "ai", "AI quality scoring weight", adminId);
      updates.push({ key: "ai_quality_weight", value: String(qualityWeight) });
    }

    if (typeof providerWeight === "number" && providerWeight >= 0 && providerWeight <= 100) {
      await upsertPlatformSetting("ai_provider_weight", String(providerWeight), "ai", "AI provider scoring weight", adminId);
      updates.push({ key: "ai_provider_weight", value: String(providerWeight) });
    }

    if (enabled === true) {
      await packageAutoSelector.runAutoSelection();
    }

    const status = await getAiSettingsStatus();
    return ApiResponse.success(res, "AI settings updated", { updates, status });
  })
);

router.post(
  "/ai-settings/test",
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const { openAIService } = await import("../../services/ai/openai-service");
    const result = await openAIService.testConnection();

    if (result.success) {
      return ApiResponse.success(res, "OpenAI connection successful", {
        latencyMs: result.latencyMs,
      });
    }

    return ApiResponse.badRequest(res, result.message);
  })
);

router.post(
  "/ai-settings/run-selection",
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await packageAutoSelector.runAutoSelection();
    return ApiResponse.success(res, "AI selection completed", {
      success: result.success,
      totalGroups: result.totalGroups,
      packagesEnabled: result.packagesEnabled,
      packagesDisabled: result.packagesDisabled,
      aiEnabled: result.aiEnabled,
      aiDecisions: result.aiDecisions?.slice(0, 10),
      errors: result.errors,
    });
  })
);

router.get(
  "/stats",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const timeFilter = req.query.timeFilter as "7days" | "30days" | "lifetime";
    const stats = await storage.getStats(timeFilter);
    return ApiResponse.success(res, "Dashboard stats fetched successfully", stats);
  })
);

export default router;
