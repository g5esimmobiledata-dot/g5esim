/**
 * Platform Settings Admin Routes
 * 
 * Endpoints for managing package selection mode, OpenAI integration,
 * and other platform-wide configuration settings.
 */

import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { platformSettings, unifiedPackages } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import * as ApiResponse from "../../utils/response";
import { packageAutoSelector } from "../../services/packages/package-auto-selector";
import { maskApiKey } from "../../utils/encryption";
import { regionSyncService } from "../../services/sync/region-sync";

const router = Router();

/**
 * GET /api/admin/platform-settings
 * Get all platform settings
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const settings = await db.select().from(platformSettings);
    
    // Convert to a more usable format
    const settingsMap: Record<string, any> = {};
    for (const setting of settings) {
      settingsMap[setting.key] = {
        value: setting.value,
        description: setting.description,
        category: setting.category,
        updatedAt: setting.updatedAt,
      };
    }
    
    return ApiResponse.success(res, "Platform settings retrieved", settingsMap);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

/**
 * GET /api/admin/platform-settings/:key
 * Get a specific platform setting
 */
router.get("/:key", async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    const setting = await db.query.platformSettings.findFirst({
      where: eq(platformSettings.key, key),
    });
    
    if (!setting) {
      return ApiResponse.notFound(res, `Setting '${key}' not found`);
    }
    
    return ApiResponse.success(res, "Setting retrieved", setting);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

/**
 * PUT /api/admin/platform-settings/:key
 * Update a platform setting
 */
router.put("/:key", async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const adminId = (req as any).admin?.id;
    
    if (value === undefined) {
      return ApiResponse.badRequest(res, "Value is required");
    }
    
    // Check if setting exists
    const existing = await db.query.platformSettings.findFirst({
      where: eq(platformSettings.key, key),
    });
    
    if (!existing) {
      return ApiResponse.notFound(res, `Setting '${key}' not found`);
    }
    
    // Update the setting
    const [updated] = await db
      .update(platformSettings)
      .set({
        value: String(value),
        updatedAt: new Date(),
        updatedBy: adminId,
      })
      .where(eq(platformSettings.key, key))
      .returning();
    
    // Handle special actions based on setting key
    if (key === "package_selection_mode") {
      if (value === "auto") {
        // Run auto-selection when switching to auto mode
        await packageAutoSelector.runAutoSelection();
      }
    }
    
    return ApiResponse.success(res, `Setting '${key}' updated`, updated);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

/**
 * POST /api/admin/platform-settings/run-auto-selection
 * Manually trigger package auto-selection
 */
router.post("/run-auto-selection", async (req: Request, res: Response) => {
  try {
    const result = await packageAutoSelector.runAutoSelection();
    
    if (result.success) {
      return ApiResponse.success(res, "Auto-selection completed", result);
    } else {
      return ApiResponse.serverError(res, result.errors.join(", "));
    }
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

/**
 * POST /api/admin/platform-settings/enable-all-packages
 * Enable all packages (for marketplace mode or testing)
 */
router.post("/enable-all-packages", async (req: Request, res: Response) => {
  try {
    const result = await packageAutoSelector.enableAllPackages();
    
    if (result.success) {
      return ApiResponse.success(res, "All Packages enabled", result);
    } else {
      return ApiResponse.serverError(res, "Failed to enable all Packages");
    }
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

/**
 * PUT /api/admin/packages/:id/toggle
 * Toggle a specific package's enabled status
 */
router.put("/packages/:id/toggle", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    
    if (typeof enabled !== "boolean") {
      return ApiResponse.badRequest(res, "enabled must be a boolean");
    }
    
    const success = await packageAutoSelector.togglePackage(id, enabled);
    
    if (success) {
      return ApiResponse.success(res, `Package ${enabled ? "enabled" : "disabled"}`, { id, enabled });
    } else {
      return ApiResponse.serverError(res, "Failed to toggle package");
    }
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

/**
 * DELETE /api/admin/packages/:id/manual-override
 * Clear manual override for a package (let auto-selection manage it)
 */
router.delete("/packages/:id/manual-override", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = await packageAutoSelector.clearManualOverride(id);
    
    if (success) {
      return ApiResponse.success(res, "Manual override cleared", { id });
    } else {
      return ApiResponse.serverError(res, "Failed to clear manual override");
    }
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

/**
 * GET /api/admin/platform-settings/openai-status
 * Check if OpenAI API key is configured and get AI selection status
 */
router.get("/openai-status", async (req: Request, res: Response) => {
  try {
    const { openAIService } = await import("../../services/ai/openai-service");
    await openAIService.refreshFromStoredKey();
    
    const envApiKey = process.env.OPENAI_API_KEY?.trim() || "";
    const storedApiKey = !envApiKey
      ? (await db.query.platformSettings.findFirst({
          where: eq(platformSettings.key, "openai_api_key"),
        }))?.value?.trim() || ""
      : "";
    const apiKey = envApiKey || storedApiKey;
    const isConfigured = apiKey.length > 10 || openAIService.isReady();
    const isReady = openAIService.isReady();
    
    const aiEnabledSetting = await db.query.platformSettings.findFirst({
      where: eq(platformSettings.key, "ai_selection_enabled"),
    });
    const aiEnabled = aiEnabledSetting?.value === "true";
    
    const weights = {
      price: 50,
      quality: 30,
      provider: 20,
    };
    
    const weightSettings = await db.query.platformSettings.findMany({
      where: (ps, { inArray }) => inArray(ps.key, [
        "ai_price_weight",
        "ai_quality_weight",
        "ai_provider_weight"
      ]),
    });
    
    for (const s of weightSettings) {
      const val = parseInt(s.value, 10);
      if (!isNaN(val)) {
        if (s.key === "ai_price_weight") weights.price = val;
        if (s.key === "ai_quality_weight") weights.quality = val;
        if (s.key === "ai_provider_weight") weights.provider = val;
      }
    }
    
    const usage = openAIService.getUsageStats();
    
    return ApiResponse.success(res, "OpenAI status retrieved", {
      isConfigured,
      isReady,
      maskedKey: apiKey ? maskApiKey(apiKey) : null,
      aiEnabled,
      weights,
      usage: {
        totalRequests: usage.totalRequests,
        totalTokens: usage.totalTokens,
        estimatedCost: Math.round(usage.estimatedCost * 100) / 100,
        errors: usage.errors,
        lastRequestAt: usage.lastRequestAt,
      },
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

/**
 * POST /api/admin/platform-settings/ai-test
 * Test OpenAI connection
 */
router.post("/ai-test", async (req: Request, res: Response) => {
  try {
    const { openAIService } = await import("../../services/ai/openai-service");
    const result = await openAIService.testConnection();
    
    if (result.success) {
      return ApiResponse.success(res, "OpenAI connection successful", {
        latencyMs: result.latencyMs,
      });
    } else {
      return ApiResponse.badRequest(res, result.message);
    }
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

/**
 * POST /api/admin/platform-settings/ai-settings
 * Update AI selection settings
 */
router.post("/ai-settings", async (req: Request, res: Response) => {
  try {
    const { enabled, priceWeight, qualityWeight, providerWeight } = req.body;
    const adminId = (req as any).admin?.id;
    
    const updates: Array<{ key: string; value: string }> = [];
    
    if (typeof enabled === "boolean") {
      updates.push({ key: "ai_selection_enabled", value: enabled.toString() });
    }
    
    if (typeof priceWeight === "number" && priceWeight >= 0 && priceWeight <= 100) {
      updates.push({ key: "ai_price_weight", value: priceWeight.toString() });
    }
    
    if (typeof qualityWeight === "number" && qualityWeight >= 0 && qualityWeight <= 100) {
      updates.push({ key: "ai_quality_weight", value: qualityWeight.toString() });
    }
    
    if (typeof providerWeight === "number" && providerWeight >= 0 && providerWeight <= 100) {
      updates.push({ key: "ai_provider_weight", value: providerWeight.toString() });
    }
    
    for (const update of updates) {
      const existing = await db.query.platformSettings.findFirst({
        where: eq(platformSettings.key, update.key),
      });
      
      if (existing) {
        await db
          .update(platformSettings)
          .set({ value: update.value, updatedAt: new Date(), updatedBy: adminId })
          .where(eq(platformSettings.key, update.key));
      } else {
        await db.insert(platformSettings).values({
          key: update.key,
          value: update.value,
          category: "ai",
          description: `AI setting: ${update.key}`,
          updatedBy: adminId,
        });
      }
    }
    
    if (enabled) {
      await packageAutoSelector.runAutoSelection();
    }
    
    return ApiResponse.success(res, "AI settings updated", { updates });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

/**
 * POST /api/admin/platform-settings/ai-run-selection
 * Manually trigger AI-enhanced package selection
 */
router.post("/ai-run-selection", async (req: Request, res: Response) => {
  try {
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
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

/**
 * POST /api/admin/platform-settings/ai-reset-usage
 * Reset AI usage statistics
 */
router.post("/ai-reset-usage", async (req: Request, res: Response) => {
  try {
    const { openAIService } = await import("../../services/ai/openai-service");
    openAIService.resetUsageStats();
    
    return ApiResponse.success(res, "AI usage statistics reset");
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

/**
 * GET /api/admin/platform-settings/package-stats
 * Get package statistics for admin dashboard
 */
router.get("/package-stats", async (req: Request, res: Response) => {
  try {
    // Get total packages
    const [totalResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(unifiedPackages);
    
    // Get enabled packages
    const [enabledResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(unifiedPackages)
      .where(eq(unifiedPackages.isEnabled, true));
    
    // Get packages with manual override
    const [manualResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(unifiedPackages)
      .where(eq(unifiedPackages.manualOverride, true));
    
    // Get unique package groups
    const groupsResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT package_group_key)::int` })
      .from(unifiedPackages);
    
    // Get marketplace mode status
    const marketplaceSetting = await db.query.platformSettings.findFirst({
      where: eq(platformSettings.key, "marketplace_mode"),
    });
    
    const selectionModeSetting = await db.query.platformSettings.findFirst({
      where: eq(platformSettings.key, "package_selection_mode"),
    });
    
    return ApiResponse.success(res, "Package statistics retrieved", {
      totalPackages: totalResult.count,
      enabledPackages: enabledResult.count,
      manualOverridePackages: manualResult.count,
      uniquePackageGroups: groupsResult[0]?.count || 0,
      marketplaceMode: marketplaceSetting?.value === "true",
      selectionMode: selectionModeSetting?.value || "auto",
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

/**
 * POST /api/admin/platform-settings/sync-regions
 * Trigger a full region sync from providers
 */
router.post("/sync-regions", async (req: Request, res: Response) => {
  try {
    console.log("📍 Admin triggered region sync");
    
    const result = await regionSyncService.runFullSync();
    
    if (result.success) {
      return ApiResponse.success(res, "Region sync completed successfully", {
        regionsCreated: result.regionsCreated,
        regionsUpdated: result.regionsUpdated,
        packagesLinked: result.packagesLinked,
      });
    } else {
      return ApiResponse.success(res, "Region sync completed with errors", {
        regionsCreated: result.regionsCreated,
        regionsUpdated: result.regionsUpdated,
        packagesLinked: result.packagesLinked,
        errors: result.errors,
      });
    }
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

export default router;
