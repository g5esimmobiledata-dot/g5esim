"use strict";

/**
 * Destination/Country Sync Service
 * 
 * Extracts and syncs countries/destinations from all provider API responses.
 */

import { db } from "../../db";
import { destinations, airaloPackages, esimAccessPackages, esimGoPackages } from "@shared/schema";
import { eq, sql, isNull } from "drizzle-orm";
import { storage } from "../../storage";
import { airaloAPI } from "../airalo/airalo-sdk";

interface DestinationSyncResult {
  success: boolean;
  destinationsCreated: number;
  destinationsUpdated: number;
  errors: string[];
}

interface CountryData {
  name: string;
  slug: string;
  countryCode: string;
  image?: string;
  flagEmoji?: string;
}

function normalizeIsoCountryCode(value: unknown): string | null {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function getCountryFlagEmoji(countryCode: string): string {
  const normalized = normalizeIsoCountryCode(countryCode);
  if (!normalized) return '';
  const codePoints = normalized
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Sync destinations from Airalo API
 */
export async function syncDestinationsFromAiralo(): Promise<DestinationSyncResult> {
  console.log("🔄 Syncing destinations from Airalo API...");
  const errors: string[] = [];
  let destinationsCreated = 0;
  let destinationsUpdated = 0;

  try {
    const response = await airaloAPI.getCountries();

    if (!response.data || !Array.isArray(response.data)) {
      return {
        success: false,
        destinationsCreated: 0,
        destinationsUpdated: 0,
        errors: ["No data received from Airalo countries API"],
      };
    }

    const countriesData = response.data as any[];
    const existingDestinations = await storage.getAllDestinations();
    const destBySlug = new Map(existingDestinations.map(d => [d.slug, d]));
    const destByCode = new Map(existingDestinations.map(d => [d.countryCode.toUpperCase(), d]));

    console.log(`  Found ${countriesData.length} countries from Airalo`);

    for (const country of countriesData) {
      const countryCode = normalizeIsoCountryCode(country.country_code);
      if (!countryCode || !country.title) continue;

      const slug = country.slug || countryCode.toLowerCase();
      const flagEmoji = getCountryFlagEmoji(countryCode);

      const existingDest = destBySlug.get(slug) || destByCode.get(countryCode);

      if (existingDest) {
        await db
          .update(destinations)
          .set({
            name: country.title,
            image: country.image?.url || existingDest.image,
            airaloId: country.slug,
            flagEmoji: flagEmoji || existingDest.flagEmoji,
            updatedAt: new Date(),
          })
          .where(eq(destinations.id, existingDest.id));
        destinationsUpdated++;
      } else {
        await storage.createDestination({
          slug,
          name: country.title,
          countryCode,
          image: country.image?.url,
          airaloId: country.slug,
          flagEmoji,
          isTerritory: false,
        });
        destinationsCreated++;
      }
    }

    console.log(`✅ Airalo destination sync complete: ${destinationsCreated} created, ${destinationsUpdated} updated`);

    return {
      success: true,
      destinationsCreated,
      destinationsUpdated,
      errors,
    };
  } catch (error: any) {
    console.error("❌ Airalo destination sync failed:", error.message);
    errors.push(error.message);
    return {
      success: false,
      destinationsCreated,
      destinationsUpdated,
      errors,
    };
  }
}

/**
 * Extract unique destinations from eSIM Go packages
 */
export async function syncDestinationsFromEsimGo(): Promise<DestinationSyncResult> {
  console.log("🔄 Syncing destinations from eSIM Go packages...");
  const errors: string[] = [];
  let destinationsCreated = 0;
  let destinationsUpdated = 0;

  try {
    const result = await db.execute(sql`
      SELECT DISTINCT unnest(coverage) as country_code 
      FROM esim_go_packages 
      WHERE coverage IS NOT NULL AND array_length(coverage, 1) > 0
    `);

    const countryCodes = new Set<string>();
    for (const row of (result.rows as any[]) || []) {
      const countryCode = normalizeIsoCountryCode(row.country_code);
      if (countryCode) {
        countryCodes.add(countryCode);
      }
    }

    console.log(`  Found ${countryCodes.size} unique country codes from eSIM Go packages`);

    const existingDestinations = await storage.getAllDestinations();
    const destByCode = new Map(existingDestinations.map(d => [d.countryCode.toUpperCase(), d]));

    for (const countryCode of Array.from(countryCodes)) {
      if (destByCode.has(countryCode)) continue;

      const flagEmoji = getCountryFlagEmoji(countryCode);
      const slug = countryCode.toLowerCase();

      await storage.createDestination({
        slug,
        name: countryCode,
        countryCode,
        flagEmoji,
        isTerritory: false,
      });
      destinationsCreated++;
    }

    console.log(`✅ eSIM Go destination sync complete: ${destinationsCreated} created`);

    return {
      success: true,
      destinationsCreated,
      destinationsUpdated,
      errors,
    };
  } catch (error: any) {
    console.error("❌ eSIM Go destination sync failed:", error.message);
    errors.push(error.message);
    return {
      success: false,
      destinationsCreated,
      destinationsUpdated,
      errors,
    };
  }
}

/**
 * Extract unique destinations from eSIM Access packages
 */
export async function syncDestinationsFromEsimAccess(): Promise<DestinationSyncResult> {
  console.log("🔄 Syncing destinations from eSIM Access packages...");
  const errors: string[] = [];
  let destinationsCreated = 0;
  let destinationsUpdated = 0;

  try {
    const result = await db.execute(sql`
      SELECT DISTINCT unnest(coverage) as country_code 
      FROM esim_access_packages 
      WHERE coverage IS NOT NULL AND array_length(coverage, 1) > 0
    `);

    const countryCodes = new Set<string>();
    for (const row of (result.rows as any[]) || []) {
      const countryCode = normalizeIsoCountryCode(row.country_code);
      if (countryCode) {
        countryCodes.add(countryCode);
      }
    }

    console.log(`  Found ${countryCodes.size} unique country codes from eSIM Access packages`);

    const existingDestinations = await storage.getAllDestinations();
    const destByCode = new Map(existingDestinations.map(d => [d.countryCode.toUpperCase(), d]));

    for (const countryCode of Array.from(countryCodes)) {
      if (destByCode.has(countryCode)) continue;

      const flagEmoji = getCountryFlagEmoji(countryCode);
      const slug = countryCode.toLowerCase();

      await storage.createDestination({
        slug,
        name: countryCode,
        countryCode,
        flagEmoji,
        isTerritory: false,
      });
      destinationsCreated++;
    }

    console.log(`✅ eSIM Access destination sync complete: ${destinationsCreated} created`);

    return {
      success: true,
      destinationsCreated,
      destinationsUpdated,
      errors,
    };
  } catch (error: any) {
    console.error("❌ eSIM Access destination sync failed:", error.message);
    errors.push(error.message);
    return {
      success: false,
      destinationsCreated,
      destinationsUpdated,
      errors,
    };
  }
}

/**
 * Extract unique destinations from Maya packages
 */
export async function syncDestinationsFromMaya(): Promise<DestinationSyncResult> {
  console.log("🔄 Syncing destinations from Maya packages...");
  const errors: string[] = [];
  let destinationsCreated = 0;
  let destinationsUpdated = 0;

  try {
    const result = await db.execute(sql`
      SELECT DISTINCT unnest(coverage) as country_code 
      FROM maya_packages 
      WHERE coverage IS NOT NULL AND array_length(coverage, 1) > 0
    `);

    const countryCodes = new Set<string>();
    for (const row of (result.rows as any[]) || []) {
      const countryCode = normalizeIsoCountryCode(row.country_code);
      if (countryCode) {
        countryCodes.add(countryCode);
      }
    }

    console.log(`  Found ${countryCodes.size} unique country codes from Maya packages`);

    const existingDestinations = await storage.getAllDestinations();
    const destByCode = new Map(existingDestinations.map(d => [d.countryCode.toUpperCase(), d]));

    for (const countryCode of Array.from(countryCodes)) {
      if (destByCode.has(countryCode)) continue;

      const flagEmoji = getCountryFlagEmoji(countryCode);
      const slug = countryCode.toLowerCase();

      await storage.createDestination({
        slug,
        name: countryCode,
        countryCode,
        flagEmoji,
        isTerritory: false,
      });
      destinationsCreated++;
    }

    console.log(`✅ Maya destination sync complete: ${destinationsCreated} created`);

    return {
      success: true,
      destinationsCreated,
      destinationsUpdated,
      errors,
    };
  } catch (error: any) {
    console.error("❌ Maya destination sync failed:", error.message);
    errors.push(error.message);
    return {
      success: false,
      destinationsCreated,
      destinationsUpdated,
      errors,
    };
  }
}

/**
 * Update packages with correct destinationId references
 */
export async function linkPackagesToDestinations(): Promise<{ success: boolean; packagesLinked: number }> {
  console.log("🔗 Linking packages to destinations...");

  try {
    const allDestinations = await storage.getAllDestinations();
    const destByCode = new Map(allDestinations.map(d => [d.countryCode.toUpperCase(), d]));

    let packagesLinked = 0;

    // Link Airalo packages
    const airaloResult = await db.execute(sql`
      SELECT id, coverage FROM airalo_packages 
      WHERE destination_id IS NULL AND coverage IS NOT NULL AND array_length(coverage, 1) = 1
    `);

    for (const pkg of (airaloResult.rows as any[]) || []) {
      if (pkg.coverage && pkg.coverage.length === 1) {
        const countryCode = normalizeIsoCountryCode(pkg.coverage[0]);
        if (!countryCode) continue;

        const dest = destByCode.get(countryCode);
        if (dest) {
          await db.execute(sql`
            UPDATE airalo_packages SET destination_id = ${dest.id} WHERE id = ${pkg.id}
          `);
          packagesLinked++;
        }
      }
    }

    // Link eSIM Access packages
    const esimAccessResult = await db.execute(sql`
      SELECT id, coverage FROM esim_access_packages 
      WHERE destination_id IS NULL AND coverage IS NOT NULL AND array_length(coverage, 1) = 1
    `);

    for (const pkg of (esimAccessResult.rows as any[]) || []) {
      if (pkg.coverage && pkg.coverage.length === 1) {
        const countryCode = normalizeIsoCountryCode(pkg.coverage[0]);
        if (!countryCode) continue;

        const dest = destByCode.get(countryCode);
        if (dest) {
          await db.execute(sql`
            UPDATE esim_access_packages SET destination_id = ${dest.id} WHERE id = ${pkg.id}
          `);
          packagesLinked++;
        }
      }
    }

    // Link eSIM Go packages  
    const esimGoResult = await db.execute(sql`
      SELECT id, coverage FROM esim_go_packages 
      WHERE destination_id IS NULL AND coverage IS NOT NULL AND array_length(coverage, 1) = 1
    `);

    for (const pkg of (esimGoResult.rows as any[]) || []) {
      if (pkg.coverage && pkg.coverage.length === 1) {
        const countryCode = normalizeIsoCountryCode(pkg.coverage[0]);
        if (!countryCode) continue;

        const dest = destByCode.get(countryCode);
        if (dest) {
          await db.execute(sql`
            UPDATE esim_go_packages SET destination_id = ${dest.id} WHERE id = ${pkg.id}
          `);
          packagesLinked++;
        }
      }
    }

    // Link Maya packages
    const mayaResult = await db.execute(sql`
      SELECT id, coverage FROM maya_packages 
      WHERE destination_id IS NULL AND coverage IS NOT NULL AND array_length(coverage, 1) = 1
    `);

    for (const pkg of (mayaResult.rows as any[]) || []) {
      if (pkg.coverage && pkg.coverage.length === 1) {
        const countryCode = normalizeIsoCountryCode(pkg.coverage[0]);
        if (!countryCode) continue;

        const dest = destByCode.get(countryCode);
        if (dest) {
          await db.execute(sql`
            UPDATE maya_packages SET destination_id = ${dest.id} WHERE id = ${pkg.id}
          `);
          packagesLinked++;
        }
      }
    }

    console.log(`✅ Linked ${packagesLinked} packages to destinations`);

    return { success: true, packagesLinked };
  } catch (error: any) {
    console.error("❌ Failed to link packages to destinations:", error.message);
    return { success: false, packagesLinked: 0 };
  }
}

/**
 * Run full destination sync pipeline
 */
export async function runFullDestinationSync(): Promise<{
  success: boolean;
  destinationsCreated: number;
  destinationsUpdated: number;
  packagesLinked: number;
  errors: string[];
}> {
  console.log("🔄 Running full destination sync pipeline...");
  const errors: string[] = [];

  // Step 1: Sync from Airalo API
  // const airaloResult = await syncDestinationsFromAiralo();
  // if (!airaloResult.success) {
  //   errors.push(...airaloResult.errors);
  // }

  // Step 2: Extract from eSIM Go packages
  const esimGoResult = await syncDestinationsFromEsimGo();
  if (!esimGoResult.success) {
    errors.push(...esimGoResult.errors);
  }

  // Step 3: Extract from eSIM Access packages
  const esimAccessResult = await syncDestinationsFromEsimAccess();
  if (!esimAccessResult.success) {
    errors.push(...esimAccessResult.errors);
  }

  // Step 4: Extract from Maya packages
  const mayaResult = await syncDestinationsFromMaya();
  if (!mayaResult.success) {
    errors.push(...mayaResult.errors);
  }

  // Step 5: Link packages to destinations
  const linkResult = await linkPackagesToDestinations();

  const totalCreated = esimGoResult.destinationsCreated + esimAccessResult.destinationsCreated + mayaResult.destinationsCreated;
  const totalUpdated = esimGoResult.destinationsUpdated + esimAccessResult.destinationsUpdated + mayaResult.destinationsUpdated;

  console.log(`✅ Full destination sync complete: ${totalCreated} created, ${totalUpdated} updated, ${linkResult.packagesLinked} packages linked`);

  return {
    success: errors.length === 0,
    destinationsCreated: totalCreated,
    destinationsUpdated: totalUpdated,
    packagesLinked: linkResult.packagesLinked,
    errors,
  };
}

export const destinationSyncService = {
  // syncFromAiralo: syncDestinationsFromAiralo,
  syncFromEsimGo: syncDestinationsFromEsimGo,
  syncFromEsimAccess: syncDestinationsFromEsimAccess,
  syncFromMaya: syncDestinationsFromMaya,
  linkPackages: linkPackagesToDestinations,
  runFullSync: runFullDestinationSync,
};
