import { storage } from "../../storage";
import { db } from "../../db";
import { unifiedPackages } from "@shared/schema";
import { sql, eq } from "drizzle-orm";
import { packageNormalizer, NormalizedPackageData } from "./package-normalizer";

interface PackageComparison {
  comparisonKey: string; // Normalized key for grouping comparable packages
  packages: {
    id: string;
    providerId: string;
    providerName: string;
    retailPrice: string;
    destinationId: string | null;
    regionId: string | null;
    normalized: NormalizedPackageData;
  }[];
}

/**
 * Price comparison service
 * Compares package prices across all enabled providers and marks best prices
 */
export class PriceComparisonService {
  /**
   * Run full price comparison across all unified packages
   * Marks the cheapest package for each destination/data/validity combination as best_price
   */
  async runPriceComparison(): Promise<{
    totalPackages: number;
    bestPricePackages: number;
    errors: string[];
  }> {
    console.log("💰 Starting price comparison across all providers...");
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Get all unified packages
      const allPackages = await db.query.unifiedPackages.findMany({
        with: {
          provider: true,
        },
      });

      if (allPackages.length === 0) {
        console.log("📦 No packages found for price comparison");
        return { totalPackages: 0, bestPricePackages: 0, errors: [] };
      }

      console.log(`📦 Comparing prices for ${allPackages.length} packages...`);

      // Group packages by normalized comparison keys
      const packageGroups = new Map<string, PackageComparison>();

      for (const pkg of allPackages) {
        // Create normalized package data from stored normalized fields
        const normalized: NormalizedPackageData = {
          dataMb: pkg.dataMb,
          validityDays: pkg.validityDays,
          voiceMinutes: pkg.voiceMinutes || 0,
          smsCount: pkg.smsCount || 0,
        };

        // Create comparison key using normalized data
        const comparisonKey = packageNormalizer.createComparisonKey(
          pkg.destinationId,
          pkg.regionId,
          normalized
        );

        if (!packageGroups.has(comparisonKey)) {
          packageGroups.set(comparisonKey, {
            comparisonKey,
            packages: [],
          });
        }

        packageGroups.get(comparisonKey)!.packages.push({
          id: pkg.id,
          providerId: pkg.providerId,
          providerName: (pkg as any).provider?.name || "Unknown",
          retailPrice: pkg.retailPrice,
          destinationId: pkg.destinationId,
          regionId: pkg.regionId,
          normalized,
        });
      }

      console.log(`   Grouped into ${packageGroups.size} unique package combinations`);

      // Reset all is_best_price flags first
      await db.update(unifiedPackages)
        .set({ isBestPrice: false });

      // Find best price for each group
      let bestPriceCount = 0;
      const bestPricePackageIds: string[] = [];

      for (const [groupKey, group] of Array.from(packageGroups.entries())) {
        if (group.packages.length === 0) continue;

        // Sort by retail price (lowest first)
        const sorted = group.packages.sort((a: typeof group.packages[0], b: typeof group.packages[0]) =>
          parseFloat(a.retailPrice) - parseFloat(b.retailPrice)
        );

        // The first package has the best price
        const bestPackage = sorted[0];
        bestPricePackageIds.push(bestPackage.id);
        bestPriceCount++;

        // Log if there are multiple providers offering this package
        if (sorted.length > 1) {
          const priceDiff = parseFloat(sorted[sorted.length - 1].retailPrice) - parseFloat(bestPackage.retailPrice);
          if (priceDiff > 0.01) {
            const dataMbStr = bestPackage.normalized.dataMb === null ? 'Unlimited' : `${bestPackage.normalized.dataMb}MB`;
            // console.log(`   💡 Price difference found for ${dataMbStr} / ${bestPackage.normalized.validityDays}d:`);
            // console.log(`      Best: ${bestPackage.providerName} at $${bestPackage.retailPrice}`);
            // console.log(`      Others: ${sorted.slice(1).map((p: typeof sorted[0]) => `${p.providerName} $${p.retailPrice}`).join(', ')}`);
          }
        }
      }

      // Update best price flags in batches
      if (bestPricePackageIds.length > 0) {
        // Drizzle doesn't support IN clause with update, so we'll do individual updates
        // For better performance, we could use raw SQL
        for (const pkgId of bestPricePackageIds) {
          await db.update(unifiedPackages)
            .set({ isBestPrice: true })
            .where(eq(unifiedPackages.id, pkgId));
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Price comparison complete in ${duration}s`);
      console.log(`   📊 Total packages: ${allPackages.length}`);
      console.log(`   🏆 Best price packages: ${bestPriceCount}`);

      return {
        totalPackages: allPackages.length,
        bestPricePackages: bestPriceCount,
        errors,
      };

    } catch (error: any) {
      console.error("❌ Price comparison failed:", error.message);
      errors.push(error.message);
      return { totalPackages: 0, bestPricePackages: 0, errors };
    }
  }

  /**
   * Run price comparison for specific destination/region
   * Useful for incremental updates after provider sync
   */
  async runPriceComparisonForDestination(destinationId?: string, regionId?: string): Promise<void> {
    try {
      const target = destinationId ? `destination ${destinationId}` : `region ${regionId}`;
      console.log(`💰 Running price comparison for ${target}...`);

      // Get packages for this destination/region
      let packages;
      if (destinationId) {
        packages = await db.query.unifiedPackages.findMany({
          where: eq(unifiedPackages.destinationId, destinationId),
          with: { provider: true },
        });
      } else if (regionId) {
        packages = await db.query.unifiedPackages.findMany({
          where: eq(unifiedPackages.regionId, regionId),
          with: { provider: true },
        });
      } else {
        return;
      }

      if (packages.length === 0) {
        return;
      }

      // Group by data amount + validity
      const groups = new Map<string, typeof packages>();
      for (const pkg of packages) {
        const key = `${pkg.dataAmount}:${pkg.validity}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(pkg);
      }

      // Reset is_best_price for these packages
      for (const pkg of packages) {
        await db.update(unifiedPackages)
          .set({ isBestPrice: false })
          .where(eq(unifiedPackages.id, pkg.id));
      }

      // Find best price for each group
      for (const [_key, group] of Array.from(groups.entries())) {
        const sorted = group.sort((a: typeof group[0], b: typeof group[0]) =>
          parseFloat(a.retailPrice) - parseFloat(b.retailPrice)
        );

        const bestPackage = sorted[0];
        await db.update(unifiedPackages)
          .set({ isBestPrice: true })
          .where(eq(unifiedPackages.id, bestPackage.id));
      }

      console.log(`   ✅ Updated ${packages.length} packages for ${target}`);
    } catch (error: any) {
      console.error(`❌ Price comparison failed for destination/region:`, error.message);
    }
  }

  /**
   * Get price comparison statistics
   */
  async getStatistics(): Promise<{
    totalPackages: number;
    bestPricePackages: number;
    packagesByProvider: Record<string, number>;
    bestPriceByProvider: Record<string, number>;
  }> {
    const allPackages = await db.query.unifiedPackages.findMany({
      with: { provider: true },
    });

    const stats = {
      totalPackages: allPackages.length,
      bestPricePackages: allPackages.filter(p => p.isBestPrice).length,
      packagesByProvider: {} as Record<string, number>,
      bestPriceByProvider: {} as Record<string, number>,
    };

    for (const pkg of allPackages) {
      const providerName = (pkg as any).provider?.name || "Unknown";
      stats.packagesByProvider[providerName] = (stats.packagesByProvider[providerName] || 0) + 1;

      if (pkg.isBestPrice) {
        stats.bestPriceByProvider[providerName] = (stats.bestPriceByProvider[providerName] || 0) + 1;
      }
    }

    return stats;
  }
}

// Export singleton instance
export const priceComparisonService = new PriceComparisonService();
