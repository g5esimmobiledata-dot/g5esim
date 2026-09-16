"use strict";

import { Router, type Request, type Response } from "express";
import { storage } from "../../storage";
import { asyncHandler } from "../../lib/asyncHandler";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { requireAdmin } from "../../lib/middleware";
import { logger } from "../../lib/logger";
import * as ApiResponse from "../../utils/response";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { unifiedPackages } from "@shared/schema";

const router = Router();
const REMOVED_PROVIDER_SLUGS = new Set(["data-plans", "telna"]);

function isActiveEsimProvider(slug?: string | null) {
  return !REMOVED_PROVIDER_SLUGS.has(String(slug || "").toLowerCase());
}

router.get(
  "/",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const providers = (await storage.getAllProviders()).filter((provider) =>
        isActiveEsimProvider(provider.slug)
      );
      // Get package counts for each provider
      const providersWithCounts = await Promise.all(
        providers.map(async (provider) => {
          const packageCount = await db.query.unifiedPackages.findMany({
            where: eq(unifiedPackages.providerId, provider.id),
          });

          return {
            ...provider,
            totalPackages: packageCount.length,
          };
        })
      );

      ApiResponse.success(res, "Providers retrieved successfully", providersWithCounts);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  })
);

router.post(
  "/",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { name, slug, apiBaseUrl, enabled, pricingMargin } = req.body;

    if (!name || !slug) {
      return ApiResponse.badRequest(res, "Name and slug are required");
    }

    if (!isActiveEsimProvider(slug)) {
      return ApiResponse.badRequest(res, "This provider has been moved to the Telna project");
    }

    const provider = await storage.createProvider({
      name,
      slug,
      apiBaseUrl: apiBaseUrl || "",
      enabled: enabled ?? true,
      pricingMargin: pricingMargin || "0",
    });

    logger.info("Provider created", {
      providerId: provider.id,
      adminId: req.session.adminId,
    });

    return ApiResponse.created(res, "Provider created successfully", { provider });
  })
);

router.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const {
      name,
      apiBaseUrl,
      enabled,
      pricingMargin,
      isPreferred,
      syncIntervalMinutes,
    } = req.body;

    const provider = await storage.updateProvider(req.params.id, {
      name,
      apiBaseUrl,
      enabled,
      pricingMargin,
      isPreferred,
      syncIntervalMinutes,
    });

    if (!provider) {
      return ApiResponse.notFound(res, "Provider not found");
    }

    logger.info("Provider updated", {
      providerId: req.params.id,
      adminId: req.session.adminId,
    });

    return ApiResponse.success(res, "Provider updated successfully", provider);
  })
);

router.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const provider = await storage.getProviderById(req.params.id);
    if (!provider) {
      return ApiResponse.notFound(res, "Provider not found");
    }

    logger.info("Provider deleted", {
      providerId: req.params.id,
      adminId: req.session.adminId,
    });

    return ApiResponse.success(res, "Provider deleted successfully");
  })
);

router.post(
  "/:id/health",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const provider = await storage.getProviderById(req.params.id);
    if (!provider) {
      return ApiResponse.notFound(res, "Provider not found");
    }
    if (!isActiveEsimProvider(provider.slug)) {
      return ApiResponse.badRequest(res, "This provider has been moved to the Telna project");
    }

    const { providerFactory } = await import("../../providers/provider-factory");
    const service = await providerFactory.getServiceById(provider.id);
    const health = await service.healthCheck();

    return ApiResponse.success(res, "Provider health check completed", {
      providerId: provider.id,
      providerSlug: provider.slug,
      ...health,
    });
  })
);

router.post(
  "/:id/sync",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const provider = await storage.getProviderById(req.params.id);

      if (!provider) {
        return res.status(404).json({ success: false, message: "Provider not found" });
      }
      if (!isActiveEsimProvider(provider.slug)) {
        return res.status(400).json({ success: false, message: "This provider has been moved to the Telna project" });
      }

      if (!provider.enabled) {
        return res.status(400).json({ success: false, message: "Cannot sync a disabled provider" });
      }

      // Get provider service and trigger sync
      const { providerFactory } = await import("../../providers/provider-factory");
      const service = await providerFactory.getServiceById(provider.id);

      // Trigger the sync
      const result = await service.syncPackages();

      if (!result.success) {
        return res.status(502).json({
          success: false,
          message: result.errorMessage || `Failed to sync ${provider.name}`,
          packagesSynced: result.packagesSynced,
          packagesUpdated: result.packagesUpdated,
          packagesRemoved: result.packagesRemoved,
          errorMessage: result.errorMessage,
        });
      }

      // Clear cache to ensure fresh provider data
      providerFactory.clearCache();

      // Always trigger unified packages sync after provider sync
      // This ensures existing packages get synced to unified_packages table
      const { unifiedPackagesSyncService } = await import("../../services/sync/unified-packages-sync");
      await unifiedPackagesSyncService.syncProviderPackages(provider.slug);

      const { priceComparisonService } = await import("../../services/packages/price-comparison");
      const { autoPackageSelectionService } = await import("../../services/packages/auto-package-selection");
      await priceComparisonService.runPriceComparison();
      await autoPackageSelectionService.runAutoSelection();

      // Update last sync timestamp only after the full sync chain succeeds.
      await storage.updateProvider(provider.id, {
        lastSyncAt: new Date(),
      });

      res.json({
        message: "Sync completed successfully",
        success: true,
        packagesSynced: result.packagesSynced,
        packagesUpdated: result.packagesUpdated,
        packagesRemoved: result.packagesRemoved,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  })
);

router.post("/:id/sync-topups", requireAdmin, async (req: Request, res: Response) => {
  try {
    const provider = await storage.getProviderById(req.params.id);

    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    if (!provider.enabled) {
      return res.status(400).json({ success: false, message: "Cannot sync topups for a disabled provider" });
    }

    let result: any;

    if (provider.slug === 'airalo') {
      const { syncAiraloTopups } = await import("../../services/airalo/topup-sync");
      result = await syncAiraloTopups(provider);
    } else if (provider.slug === 'esim-access') {
      const { syncEsimAccessTopups } = await import("../../services/esim-access/topup-sync");
      // eSIM Access needs API credentials
      const accessCode = process.env.ESIM_ACCESS_CLIENT_ID;
      const secretKey = process.env.ESIM_ACCESS_CLIENT_SECRET;

      if (!accessCode || !secretKey) {
        return res.status(400).json({
          success: false,
          message: "eSIM Access credentials not configured"
        });
      }

      result = await syncEsimAccessTopups(provider, accessCode, secretKey);
    } else if (provider.slug === 'esim-go') {
      const { syncEsimGoTopups } = await import("../../services/esim-go/topup-sync");
      // eSIM Go needs API key
      const apiKey = process.env.ESIM_GO_API_KEY;

      if (!apiKey) {
        return res.status(400).json({
          success: false,
          message: "eSIM Go API key not configured"
        });
      }

      result = await syncEsimGoTopups(provider, apiKey);
    } else if (provider.slug === 'maya') {
      const { syncMayaTopups } = await import("../../services/maya/topup-sync");
      result = await syncMayaTopups(provider);
    } else {
      return res.status(400).json({
        success: false,
        message: `Topup sync not supported for ${provider.name}.`
      });
    }

    if (result.success) {
      await storage.updateProvider(provider.id, {
        lastSyncAt: new Date(),
      });
    }

    res.json({
      success: result.success,
      message: result.success ? "Topup sync completed successfully" : "Topup sync failed",
      topupsSynced: result.topupsSynced || 0,
      topupsUpdated: result.topupsUpdated || 0,
      topupsSkipped: result.topupsSkipped || 0,
      errorMessage: result.errorMessage,
    });
  } catch (error: any) {
    console.error("Topup sync error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
