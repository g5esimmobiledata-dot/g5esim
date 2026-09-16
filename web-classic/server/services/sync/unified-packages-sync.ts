import { db } from "../../db";
import {
  unifiedPackages,
  providers,
  airaloPackages,
  esimAccessPackages,
  esimGoPackages,
  mayaPackages,
  airhubPackages,
  destinations,
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { packageNormalizer } from "../packages/package-normalizer";
import {
  extractCountryCodeFromAiraloSlug,
  extractCountryCodeFromEsimGoPackage,
  extractCountryCodeFromEsimAccessPackage,
  extractCountryCodeFromMayaPackage,
  generatePackageGroupKey,
} from "../../utils/countryCodeMapping";

/**
 * Service to sync packages from provider-specific tables to unified_packages
 * This creates a consolidated customer-facing catalog with calculated retail prices
 */
const SYNCABLE_PROVIDER_SLUGS = new Set(["airalo", "esim-access", "esim-go", "maya", "airhub"]);

export class UnifiedPackagesSyncService {
  /**
   * Sync packages from a specific provider's table to unified_packages
   * @param providerSlug Provider slug (airalo, esim-access, esim-go)
   */
  async syncProviderPackages(providerSlug: string): Promise<{
    success: boolean;
    packagesSynced: number;
    packagesUpdated: number;
    packagesRemoved: number;
    errors: string[];
  }> {
    console.log(`📋 Syncing ${providerSlug} packages to unified catalog...`);
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Get provider info
      const provider = await db.query.providers.findFirst({
        where: eq(providers.slug, providerSlug),
      });

      if (!provider) {
        throw new Error(`Provider ${providerSlug} not found`);
      }

      // Get provider's profit margin
      const profitMarginPercent = parseFloat(provider.pricingMargin || "0");

      // Determine which provider table to sync from
      let providerPackages: any[] = [];
      let providerPackageTable = "";

      if (providerSlug === "airalo") {
        providerPackageTable = "airalo_packages";
        providerPackages = await db.select().from(airaloPackages);
      } else if (providerSlug === "esim-access") {
        providerPackageTable = "esim_access_packages";
        providerPackages = await db.select().from(esimAccessPackages);
      } else if (providerSlug === "esim-go") {
        providerPackageTable = "esim_go_packages";
        providerPackages = await db.select().from(esimGoPackages);
      } else if (providerSlug === "maya") {
        providerPackageTable = "maya_packages";
        providerPackages = await db.select().from(mayaPackages);
      } else if (providerSlug === "airhub") {
        providerPackageTable = "airhub_packages";
        providerPackages = await db.select().from(airhubPackages);
      } else {
        throw new Error(`Unknown provider slug: ${providerSlug}`);
      }

      console.log(`   Found ${providerPackages.length} packages in ${providerPackageTable}`);

      // Build destination lookup map: countryCode -> destinationId
      const allDestinations = await db.select().from(destinations);
      const countryToDestinationMap = new Map<string, string>();
      const countryNameByCode = new Map<string, string>();
      allDestinations.forEach(d => {
        const code = d.countryCode.toUpperCase();
        countryToDestinationMap.set(code, d.id);
        countryNameByCode.set(code, d.name);
      });

      let packagesSynced = 0;
      let packagesUpdated = 0;

      // console.log("check working0")

      for (const pkg of providerPackages) {
        // console.log("check working1")
        // Map provider-specific cost field to wholesale price
        // Airalo uses 'airaloPrice', others use 'wholesalePrice'
        let wholesalePriceRaw: any;
        if (providerSlug === "airalo") {
          wholesalePriceRaw = pkg.airaloPrice || pkg.price; // Fallback to price if airaloPrice is null
        } else {
          wholesalePriceRaw = pkg.wholesalePrice;
        }

        // Normalize to string and validate
        const wholesalePriceValue = wholesalePriceRaw?.toString().trim();

        // Skip package if wholesale price is missing or invalid (but allow "0")
        if (!wholesalePriceValue && wholesalePriceValue !== '0') {
          console.warn(`⚠️  [${providerSlug}] Skipping package ${pkg.id} (${pkg.title}): Missing wholesale price`);
          errors.push(`[${providerSlug}] Package ${pkg.id} skipped: Missing wholesale price`);
          continue;
        }

        const wholesalePrice = parseFloat(wholesalePriceValue);

        // Validate parsed value is a valid number
        if (isNaN(wholesalePrice) || wholesalePrice < 0) {
          console.warn(`⚠️  [${providerSlug}] Skipping package ${pkg.id} (${pkg.title}): Invalid wholesale price "${wholesalePriceValue}"`);
          errors.push(`[${providerSlug}] Package ${pkg.id} skipped: Invalid wholesale price "${wholesalePriceValue}"`);
          continue;
        }

        const retailPrice = wholesalePrice * (1 + profitMarginPercent / 100);

        // Normalize package data for cross-provider comparison
        const normalized = packageNormalizer.normalizePackageData({
          dataAmount: pkg.dataAmount,
          validity: pkg.validity,
          voiceCredits: pkg.voiceCredits,
          smsCredits: pkg.smsCredits,
          isUnlimited: pkg.isUnlimited,
        });

        // Extract country code based on provider for local packages
        let countryCode: string | null = null;
        let countryName: string | null = null;
        // console.log("check working2")
        if (pkg.type === "local") {
          if (providerSlug === "airalo") {
            const result = extractCountryCodeFromAiraloSlug(pkg.slug);
            countryCode = result.code;
            countryName = result.name;
          } else if (providerSlug === "esim-go") {
            const result = extractCountryCodeFromEsimGoPackage(
              pkg.slug,
              pkg.coverage as string[] | undefined
            );
            countryCode = result.code;
            countryName = result.name;
          } else if (providerSlug === "esim-access") {
            const result = extractCountryCodeFromEsimAccessPackage(
              pkg.slug,
              pkg.coverage as string[] | undefined
            );
            countryCode = result.code;
            countryName = result.name;
          } else if (providerSlug === "maya") {
            const result = extractCountryCodeFromMayaPackage(
              pkg.slug,
              pkg.coverage as string[] | undefined
            );
            countryCode = result.code;
            countryName = result.name;
          } else if (providerSlug === "airhub") {
            const coverage = pkg.coverage as string[] | undefined;
            if (coverage?.length === 1) {
              countryCode = coverage[0].toUpperCase();
              countryName = countryNameByCode.get(countryCode) || countryCode;
            }
          }
        }

        // Get destination ID from country code
        const resolvedDestinationId = countryCode
          ? countryToDestinationMap.get(countryCode) || pkg.destinationId
          : pkg.destinationId;

        // Generate package group key for matching same packages across providers
        const packageGroupKey = countryCode
          ? generatePackageGroupKey(countryCode, normalized.dataMb, normalized.validityDays)
          : null;

        // For Maya, use mayaId (the Maya API product UID), for others use the internal table id
        const providerPackageId =
          providerSlug === "maya" ? pkg.mayaId :
          pkg.id;

        // Check if package already exists in unified_packages
        const existing = await db.query.unifiedPackages.findFirst({
          where: sql`${unifiedPackages.providerPackageTable} = ${providerPackageTable} AND ${unifiedPackages.providerPackageId} = ${providerPackageId}`,
        });

        // console.log("check working3", pkg)


        const unifiedPackageData = {
          providerId: provider.id,
          // packageImage: image,
          providerPackageTable,
          providerPackageId,
          destinationId: resolvedDestinationId,
          regionId: pkg.regionId,
          slug: pkg.slug,
          title: pkg.title,
          dataAmount: pkg.dataAmount,
          validity: pkg.validity,
          type: pkg.type,
          wholesalePrice: wholesalePriceValue,
          retailPrice: retailPrice.toFixed(2),
          currency: pkg.currency || "USD",
          operator: pkg.operator,
          operatorImage: pkg.operatorImage,
          coverage: pkg.coverage,
          voiceCredits: pkg.voiceCredits || 0,
          smsCredits: pkg.smsCredits || 0,
          isUnlimited: pkg.isUnlimited || false,
          // Normalized fields for comparison
          dataMb: normalized.dataMb,
          validityDays: normalized.validityDays,
          voiceMinutes: normalized.voiceMinutes,
          smsCount: normalized.smsCount,
          // Country/region identification for package matching
          countryCode,
          countryName,
          packageGroupKey,
          updatedAt: new Date(),
        };

        if (existing) {
          // Update existing package
          await db.update(unifiedPackages)
            .set(unifiedPackageData)
            .where(eq(unifiedPackages.id, existing.id));
          packagesUpdated++;
        } else {
          // Create new package
          await db.insert(unifiedPackages).values(unifiedPackageData);
          packagesSynced++;
        }
      }

      // Remove packages from unified_packages that no longer exist in provider table
      const packagesRemoved = await this.removeOrphanedPackages(providerSlug, providerPackageTable);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Unified ${providerSlug} sync complete in ${duration}s`);
      console.log(`   📦 ${packagesSynced} new, ${packagesUpdated} updated, ${packagesRemoved} removed`);

      return {
        success: true,
        packagesSynced,
        packagesUpdated,
        packagesRemoved,
        errors,
      };
    } catch (error: any) {
      console.error(`❌ Unified ${providerSlug} sync failed:`, error.message);
      errors.push(error.message);
      return {
        success: false,
        packagesSynced: 0,
        packagesUpdated: 0,
        packagesRemoved: 0,
        errors,
      };
    }
  }

  /**
   * Remove packages from unified_packages that no longer exist in provider table
   */
  private async removeOrphanedPackages(providerSlug: string, providerPackageTable: string): Promise<number> {
    try {
      // Get all unified packages for this provider
      const unifiedPkgs = await db.select().from(unifiedPackages)
        .where(eq(unifiedPackages.providerPackageTable, providerPackageTable));

      // Get all provider package IDs
      let providerPackageIds: string[] = [];

      if (providerSlug === "airalo") {
        const pkgs = await db.select({ id: airaloPackages.id }).from(airaloPackages);
        providerPackageIds = pkgs.map(p => p.id);
      } else if (providerSlug === "esim-access") {
        const pkgs = await db.select({ id: esimAccessPackages.id }).from(esimAccessPackages);
        providerPackageIds = pkgs.map(p => p.id);
      } else if (providerSlug === "esim-go") {
        const pkgs = await db.select({ id: esimGoPackages.id }).from(esimGoPackages);
        providerPackageIds = pkgs.map(p => p.id);
      } else if (providerSlug === "maya") {
        const pkgs = await db.select({ mayaId: mayaPackages.mayaId }).from(mayaPackages);
        providerPackageIds = pkgs.map(p => p.mayaId);
      } else if (providerSlug === "airhub") {
        const pkgs = await db.select({ id: airhubPackages.id }).from(airhubPackages);
        providerPackageIds = pkgs.map(p => p.id);
      }

      // Find orphaned packages
      const orphaned = unifiedPkgs.filter(up => !providerPackageIds.includes(up.providerPackageId));

      // Delete orphaned packages
      for (const pkg of orphaned) {
        await db.delete(unifiedPackages).where(eq(unifiedPackages.id, pkg.id));
      }

      return orphaned.length;
    } catch (error: any) {
      console.error(`⚠️  Failed to remove orphaned packages for ${providerSlug}:`, error.message);
      return 0;
    }
  }

  /**
   * Sync all providers' packages to unified_packages
   */
  async syncAllProviders(): Promise<{
    success: boolean;
    totalSynced: number;
    totalUpdated: number;
    totalRemoved: number;
    errors: string[];
  }> {
    console.log("📋 Syncing all providers to unified catalog...");

    const allErrors: string[] = [];
    let totalSynced = 0;
    let totalUpdated = 0;
    let totalRemoved = 0;

    // Get all enabled providers
    const enabledProviders = (await db.select().from(providers)
      .where(eq(providers.enabled, true)))
      .filter((provider) => SYNCABLE_PROVIDER_SLUGS.has(provider.slug));

    for (const provider of enabledProviders) {
      const result = await this.syncProviderPackages(provider.slug);
      totalSynced += result.packagesSynced;
      totalUpdated += result.packagesUpdated;
      totalRemoved += result.packagesRemoved;
      allErrors.push(...result.errors);
    }

    return {
      success: allErrors.length === 0,
      totalSynced,
      totalUpdated,
      totalRemoved,
      errors: allErrors,
    };
  }
}

export const unifiedPackagesSyncService = new UnifiedPackagesSyncService();
