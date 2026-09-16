"use strict";

/**
 * Region Sync Service
 * 
 * Extracts and syncs regions from provider API responses.
 * Regions are multi-country package groupings (e.g., "Europe", "Asia Pacific").
 */

import { db } from "../../db";
import { regions, unifiedPackages, providers } from "@shared/schema";
import { eq, sql, isNull, and } from "drizzle-orm";
import { storage } from "../../storage";
import { airaloAPI } from "../airalo/airalo-sdk";
import type { AiraloCountryData, AiraloOperator } from "../airalo/types";

interface RegionSyncResult {
  success: boolean;
  regionsCreated: number;
  regionsUpdated: number;
  errors: string[];
}

/**
 * Determine if an Airalo entry is a region (multi-country) vs a single country
 * Regions typically have:
 * - Empty or missing country_code
 * - Multiple coverages in their operators
 * - Slugs like "europe", "asia", "global", etc.
 */
function isRegionalEntry(entry: AiraloCountryData): boolean {
  // If no country_code, it's likely a region
  if (!entry.country_code || entry.country_code === '') {
    return true;
  }

  // Check if the slug matches common regional patterns
  const regionalSlugs = [
    'europe', 'asia', 'africa', 'americas', 'oceania', 'middle-east',
    'caribbean', 'global', 'world', 'latin-america', 'south-america',
    'north-america', 'central-america', 'southeast-asia', 'south-asia',
    'east-asia', 'west-africa', 'east-africa', 'central-africa',
    'southern-africa', 'north-africa', 'gulf', 'scandinavia', 'balkans',
    'european-union', 'apac', 'emea', 'latam'
  ];

  const slugLower = entry.slug.toLowerCase();
  if (regionalSlugs.some(r => slugLower.includes(r))) {
    return true;
  }

  // Check operators' coverages - if any operator covers multiple countries, it's regional
  for (const operator of entry.operators || []) {
    if (operator.coverages && operator.coverages.length > 1) {
      return true;
    }
  }

  return false;
}

/**
 * Extract coverage country codes from an Airalo operator
 */
function extractCoverageCodes(operators: AiraloOperator[]): string[] {
  const countryCodes = new Set<string>();

  for (const operator of operators || []) {
    for (const coverage of operator.coverages || []) {
      if (coverage.code) {
        countryCodes.add(coverage.code.toUpperCase());
      }
    }
  }

  return Array.from(countryCodes);
}

/**
 * Sync regions from Airalo dedicated regions endpoint
 */
export async function syncRegionsFromAiraloRegionsAPI(): Promise<RegionSyncResult> {
  console.log("🔄 Syncing regions from Airalo regions API...");
  const errors: string[] = [];
  let regionsCreated = 0;
  let regionsUpdated = 0;

  try {
    const response = await airaloAPI.getRegions();

    if (!response.data || !Array.isArray(response.data)) {
      console.log("  No regions data from Airalo regions API, trying packages fallback...");
      return syncRegionsFromAiraloPackages();
    }

    const regionsData = response.data as any[];
    const existingRegions = await storage.getAllRegions();
    const regionsBySlug = new Map(existingRegions.map(r => [r.slug, r]));

    console.log(`  Found ${regionsData.length} regions from Airalo regions API`);

    for (const region of regionsData) {
      if (!region.slug || !region.title) continue;

      const coverageCountries = region.countries?.map((c: any) => c.country_code?.toUpperCase()).filter(Boolean) || [];

      const existingRegion = regionsBySlug.get(region.slug);

      if (existingRegion) {
        await db
          .update(regions)
          .set({
            name: region.title,
            image: region.image?.url || existingRegion.image,
            airaloId: region.slug,
            countries: coverageCountries.length > 0 ? coverageCountries : existingRegion.countries,
            updatedAt: new Date(),
          })
          .where(eq(regions.id, existingRegion.id));
        regionsUpdated++;
      } else {
        await storage.createRegion({
          slug: region.slug,
          name: region.title,
          image: region.image?.url,
          airaloId: region.slug,
          countries: coverageCountries,
        });
        regionsCreated++;
      }
    }

    console.log(`✅ Airalo regions API sync complete: ${regionsCreated} created, ${regionsUpdated} updated`);

    return {
      success: true,
      regionsCreated,
      regionsUpdated,
      errors,
    };
  } catch (error: any) {
    console.error("❌ Airalo regions API sync failed:", error.message);
    errors.push(error.message);
    return {
      success: false,
      regionsCreated,
      regionsUpdated,
      errors,
    };
  }
}

/**
 * Sync regions from Airalo packages API (fallback)
 */
export async function syncRegionsFromAiraloPackages(): Promise<RegionSyncResult> {
  console.log("🔄 Syncing regions from Airalo packages API...");
  const errors: string[] = [];
  let regionsCreated = 0;
  let regionsUpdated = 0;

  try {
    const response = await airaloAPI.getPackages({ limit: 1000 });

    if (!response.data || !Array.isArray(response.data)) {
      return {
        success: false,
        regionsCreated: 0,
        regionsUpdated: 0,
        errors: ["No data received from Airalo API"],
      };
    }

    const entriesData = response.data as AiraloCountryData[];
    const existingRegions = await storage.getAllRegions();
    const regionsBySlug = new Map(existingRegions.map(r => [r.slug, r]));

    // Filter to only regional entries
    const regionalEntries = entriesData.filter(isRegionalEntry);
    console.log(`  Found ${regionalEntries.length} regional entries from Airalo`);

    for (const entry of regionalEntries) {
      const coverageCountries = extractCoverageCodes(entry.operators);

      const existingRegion = regionsBySlug.get(entry.slug);

      if (existingRegion) {
        // Update existing region
        await db
          .update(regions)
          .set({
            name: entry.title,
            image: entry.image?.url || existingRegion.image,
            airaloId: entry.slug,
            countries: coverageCountries,
            updatedAt: new Date(),
          })
          .where(eq(regions.id, existingRegion.id));
        regionsUpdated++;
      } else {
        // Create new region
        await storage.createRegion({
          slug: entry.slug,
          name: entry.title,
          image: entry.image?.url,
          airaloId: entry.slug,
          countries: coverageCountries,
        });
        regionsCreated++;
      }
    }

    console.log(`✅ Region sync complete: ${regionsCreated} created, ${regionsUpdated} updated`);

    return {
      success: true,
      regionsCreated,
      regionsUpdated,
      errors,
    };
  } catch (error: any) {
    console.error("❌ Region sync failed:", error.message);
    errors.push(error.message);
    return {
      success: false,
      regionsCreated,
      regionsUpdated,
      errors,
    };
  }
}

/**
 * Extract unique regions from existing unified packages
 * This is a fallback method when provider APIs don't expose region endpoints
 */
export async function syncRegionsFromUnifiedPackages(): Promise<RegionSyncResult> {
  console.log("🔄 Syncing regions from unified packages...");
  const errors: string[] = [];
  let regionsCreated = 0;
  let regionsUpdated = 0;

  try {
    // Get all regional packages that have type='regional' but no regionId
    const regionalPackages = await db.query.unifiedPackages.findMany({
      where: (up, { eq }) => eq(up.type, 'regional'),
    });

    console.log(`  Found ${regionalPackages.length} regional packages`);

    // Group packages by their countryName (which for regional packages is the region name)
    const regionMap = new Map<string, {
      name: string;
      slug: string;
      coverage: string[];
    }>();

    for (const pkg of regionalPackages) {
      if (!pkg.countryName) continue;

      const regionSlug = pkg.slug?.split('-')[0] || pkg.countryName.toLowerCase().replace(/\s+/g, '-');

      if (!regionMap.has(regionSlug)) {
        regionMap.set(regionSlug, {
          name: pkg.countryName,
          slug: regionSlug,
          coverage: [],
        });
      }

      // Add coverage countries
      const regionData = regionMap.get(regionSlug)!;
      if (pkg.coverage && Array.isArray(pkg.coverage)) {
        for (const code of pkg.coverage) {
          if (!regionData.coverage.includes(code)) {
            regionData.coverage.push(code);
          }
        }
      }
    }

    console.log(`  Extracted ${regionMap.size} unique regions`);

    const existingRegions = await storage.getAllRegions();
    const regionsBySlug = new Map(existingRegions.map(r => [r.slug, r]));

    for (const [slug, data] of Array.from(regionMap.entries())) {
      const existingRegion = regionsBySlug.get(slug);

      if (existingRegion) {
        // Update existing region with coverage
        await db
          .update(regions)
          .set({
            countries: data.coverage,
            updatedAt: new Date(),
          })
          .where(eq(regions.id, existingRegion.id));
        regionsUpdated++;
      } else {
        // Create new region
        await storage.createRegion({
          slug: data.slug,
          name: data.name,
          countries: data.coverage,
        });
        regionsCreated++;
      }
    }

    console.log(`✅ Region sync from packages complete: ${regionsCreated} created, ${regionsUpdated} updated`);

    return {
      success: true,
      regionsCreated,
      regionsUpdated,
      errors,
    };
  } catch (error: any) {
    console.error("❌ Region sync from packages failed:", error.message);
    errors.push(error.message);
    return {
      success: false,
      regionsCreated,
      regionsUpdated,
      errors,
    };
  }
}

/**
 * Update regional packages with correct regionId references
 */
export async function linkPackagesToRegions(): Promise<{ success: boolean; packagesLinked: number }> {
  console.log("🔗 Linking regional packages to regions...");

  try {
    const allRegions = await storage.getAllRegions();
    const regionsBySlug = new Map(allRegions.map(r => [r.slug, r]));
    const regionsByName = new Map(allRegions.map(r => [r.name.toLowerCase(), r]));

    // Get regional packages without regionId
    const unlinkedPackages = await db.query.unifiedPackages.findMany({
      where: (up, { eq, isNull, and }) => and(
        eq(up.type, 'regional'),
        isNull(up.regionId)
      ),
    });

    console.log(`  Found ${unlinkedPackages.length} unlinked regional packages`);

    let packagesLinked = 0;

    for (const pkg of unlinkedPackages) {
      let region = null;

      // Try to match by countryName (which is the region name for regional packages)
      if (pkg.countryName) {
        region = regionsByName.get(pkg.countryName.toLowerCase());
      }

      // Try to match by slug prefix
      if (!region && pkg.slug) {
        const slugParts = pkg.slug.split('-');
        for (let i = 1; i <= slugParts.length; i++) {
          const potentialSlug = slugParts.slice(0, i).join('-');
          region = regionsBySlug.get(potentialSlug);
          if (region) break;
        }
      }

      if (region) {
        await db
          .update(unifiedPackages)
          .set({
            regionId: region.id,
            updatedAt: new Date(),
          })
          .where(eq(unifiedPackages.id, pkg.id));
        packagesLinked++;
      }
    }

    console.log(`✅ Linked ${packagesLinked} packages to regions`);

    return {
      success: true,
      packagesLinked,
    };
  } catch (error: any) {
    console.error("❌ Failed to link packages to regions:", error.message);
    return {
      success: false,
      packagesLinked: 0,
    };
  }
}

/**
 * Run full region sync pipeline
 */
export async function runFullRegionSync(): Promise<{
  success: boolean;
  regionsCreated: number;
  regionsUpdated: number;
  packagesLinked: number;
  errors: string[];
}> {
  console.log("🔄 Running full region sync pipeline...");
  const errors: string[] = [];

  // Step 1: Try to sync from Airalo regions API
  // const airaloResult = await syncRegionsFromAiraloRegionsAPI();
  // if (!airaloResult.success) {
  //   errors.push(...airaloResult.errors);
  // }

  // Step 2: Also try from Airalo packages for additional regions
  const airaloPackagesResult = await syncRegionsFromAiraloPackages();
  if (!airaloPackagesResult.success) {
    errors.push(...airaloPackagesResult.errors);
  }

  // Step 3: Fallback - extract regions from existing unified packages
  const packageResult = await syncRegionsFromUnifiedPackages();
  if (!packageResult.success) {
    errors.push(...packageResult.errors);
  }

  // Step 4: Link packages to regions
  const linkResult = await linkPackagesToRegions();

  const totalCreated = airaloPackagesResult.regionsCreated + packageResult.regionsCreated;
  const totalUpdated = airaloPackagesResult.regionsUpdated + packageResult.regionsUpdated;

  console.log(`✅ Full region sync complete: ${totalCreated} created, ${totalUpdated} updated, ${linkResult.packagesLinked} packages linked`);

  return {
    success: errors.length === 0,
    regionsCreated: totalCreated,
    regionsUpdated: totalUpdated,
    packagesLinked: linkResult.packagesLinked,
    errors,
  };
}

export const regionSyncService = {
  // syncFromAiralo: syncRegionsFromAiraloRegionsAPI, // Backwards compatible alias
  syncFromAiraloRegionsAPI: syncRegionsFromAiraloRegionsAPI,
  syncFromAiraloPackages: syncRegionsFromAiraloPackages,
  syncFromPackages: syncRegionsFromUnifiedPackages,
  linkPackages: linkPackagesToRegions,
  runFullSync: runFullRegionSync,
};
