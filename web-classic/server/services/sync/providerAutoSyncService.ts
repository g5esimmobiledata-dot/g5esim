"use strict";

import { db } from "../../db";
import { providers } from "@shared/schema";
import { and, eq, or } from "drizzle-orm";

export class ProviderAutoSyncService {
    async syncAll() {
        // Fetch all providers that should be synced
        const providerList = await db.query.providers.findMany({
            where: and(
                eq(providers.enabled, true),
                or(
                    eq(providers.slug, "airalo"),
                    eq(providers.slug, "esim-access"),
                    eq(providers.slug, "esim-go"),
                    eq(providers.slug, "maya"),
                    eq(providers.slug, "airhub")
                )
            ),
        });

        if (!providerList || providerList.length === 0) {
            return {
                success: false,
                message: "No enabled providers found for auto sync",
                providers: [],
                packageSelection: null,
            };
        }

        const { providerFactory } = await import("../../providers/provider-factory");
        const { unifiedPackagesSyncService } = await import("../sync/unified-packages-sync");

        const results = [];
        let syncedAnyProvider = false;

        for (const provider of providerList) {
            if (!provider.enabled) {
                results.push({
                    provider: provider.slug,
                    success: false,
                    message: "Provider disabled, skipping",
                });
                continue;
            }

            try {
                // Load provider service
                const service = await providerFactory.getServiceById(provider.id);

                // Run sync
                const syncResult = await service.syncPackages();

                // Update last sync timestamp
                await db.update(providers)
                    .set({ lastSyncAt: new Date() })
                    .where(eq(providers.id, provider.id));

                // Sync unified packages
                if (syncResult.success) {
                    await unifiedPackagesSyncService.syncProviderPackages(provider.slug);
                    syncedAnyProvider = true;
                }

                results.push({
                    provider: provider.slug,
                    success: syncResult.success,
                    packagesSynced: syncResult.packagesSynced,
                    packagesUpdated: syncResult.packagesUpdated,
                    packagesRemoved: syncResult.packagesRemoved,
                    errorMessage: syncResult.errorMessage || null,
                });

            } catch (err: any) {
                results.push({
                    provider: provider.slug,
                    success: false,
                    message: err.message,
                });
            }
        }

        // Clear service cache after all syncs
        providerFactory.clearCache();

        let packageSelection = null;
        if (syncedAnyProvider) {
            const { priceComparisonService } = await import("../packages/price-comparison");
            const { autoPackageSelectionService } = await import("../packages/auto-package-selection");

            const priceComparison = await priceComparisonService.runPriceComparison();
            const autoSelection = await autoPackageSelectionService.runAutoSelection();
            packageSelection = {
                totalPackages: priceComparison.totalPackages,
                bestPricePackages: priceComparison.bestPricePackages,
                packagesEnabled: autoSelection.packagesEnabled,
                packagesDisabled: autoSelection.packagesDisabled,
                errors: [...priceComparison.errors, ...autoSelection.errors],
            };
        }

        return {
            success: true,
            message: "Auto sync completed",
            providers: results,
            packageSelection,
        };
    }
}

export const providerAutoSyncService = new ProviderAutoSyncService();
