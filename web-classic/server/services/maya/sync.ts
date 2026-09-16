"use strict";

import crypto from "crypto";
import { db } from "../../db";
import { mayaPackages, destinations, countryCodeMappings } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { getMayaProducts } from "./api-client";
import { determineMayaPackageType, formatDataAmount } from "./types";
import type { MayaProductsResponse, MayaProduct } from "./types";
import type { Provider } from "@shared/schema";
import { storage } from "../../storage";

interface CountryCodeLookup {
  internalCode: string;
  countryName: string;
}

function getCountryFlagEmoji(countryCode: string): string | null {
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return null;
  }
}

function generateDataHash(product: MayaProduct): string {
  const hashData = {
    uid: product.uid,
    name: product.name,
    countries: product.countries_enabled?.sort().join(",") || "",
    dataMb: product.data_quota_mb,
    validity: product.validity_days,
    price: product.wholesale_price_usd,
    policyId: product.policy_id,
  };
  return crypto.createHash("md5").update(JSON.stringify(hashData)).digest("hex");
}

function generateSlug(product: MayaProduct): string {
  const name = product.name.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `maya-${name}-${product.uid.substring(0, 8)}`;
}

export async function syncMayaPackages(
  provider: Provider,
  apiKey: string,
  apiSecret: string
): Promise<{
  success: boolean;
  packagesSynced: number;
  packagesUpdated: number;
  packagesRemoved: number;
  errorMessage?: string;
}> {
  console.log("[Maya Sync] Starting package sync...");

  let synced = 0;
  let updated = 0;
  let removed = 0;

  try {
    const response = await getMayaProducts(apiKey, apiSecret) as MayaProductsResponse;

    if (!response.products || !Array.isArray(response.products)) {
      console.warn("[Maya Sync] No products returned from API");
      return {
        success: true,
        packagesSynced: 0,
        packagesUpdated: 0,
        packagesRemoved: 0,
      };
    }

    console.log(`[Maya Sync] Fetched ${response.products.length} products from Maya API`);
    // show at most 10 items
    // console.log(response.products.slice(0, 10));

    // Load all destinations for country code lookup (using internal 2-letter codes)
    const allDestinations = await db.select().from(destinations);
    const destByCode = new Map(allDestinations.map(d => [d.countryCode.toUpperCase(), d]));

    // Load country code mappings for external to internal code conversion
    const allMappings = await db.select().from(countryCodeMappings);
    const codeMapping = new Map<string, CountryCodeLookup>();
    for (const mapping of allMappings) {
      codeMapping.set(mapping.externalCode.toUpperCase(), {
        internalCode: mapping.internalCode,
        countryName: mapping.countryName,
      });
    }

    const existingPackages = await db.select().from(mayaPackages);
    const existingByUid = new Map(existingPackages.map(p => [p.mayaId, p]));
    const processedUids = new Set<string>();

    // Collect unique country codes that need destinations
    const missingInternalCodes = new Set<string>();
    const externalToInternalMap = new Map<string, { internalCode: string; countryName: string }>();

    console.log('response.products', response.products[0]);

    for (const product of response.products) {
      if (product.countries_enabled?.length === 1) {
        const externalCode = product.countries_enabled[0].toUpperCase();

        // Look up the mapping to get internal 2-letter code
        const mapping = codeMapping.get(externalCode);
        // console.log('externalCode', externalCode);
        // console.log('mapping', mapping);
        // return
        if (mapping) {
          externalToInternalMap.set(externalCode, mapping);
          // Check if destination exists for the INTERNAL code
          if (!destByCode.has(mapping.internalCode.toUpperCase())) {
            missingInternalCodes.add(mapping.internalCode.toUpperCase());
          }
        } else {
          // No mapping found - assume it's already a 2-letter code
          externalToInternalMap.set(externalCode, {
            internalCode: externalCode,
            countryName: externalCode
          });
          if (!destByCode.has(externalCode)) {
            missingInternalCodes.add(externalCode);
          }
        }
      }
    }

    // Create missing destinations using proper names and 2-letter codes
    if (missingInternalCodes.size > 0) {
      console.log(`[Maya Sync] Creating ${missingInternalCodes.size} missing destinations...`);
      for (const internalCode of Array.from(missingInternalCodes)) {
        try {
          // Find the country name from any external code that maps to this internal code
          let countryName = internalCode;
          for (const [, mapping] of Array.from(externalToInternalMap.entries())) {
            if (mapping.internalCode.toUpperCase() === internalCode) {
              countryName = mapping.countryName;
              break;
            }
          }

          const flagEmoji = getCountryFlagEmoji(internalCode);
          const slug = countryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

          const newDest = await storage.createDestination({
            slug,
            name: countryName,
            countryCode: internalCode,
            flagEmoji,
            isTerritory: false,
          });
          destByCode.set(internalCode.toUpperCase(), newDest);
          console.log(`[Maya Sync] Created destination: ${countryName} (${internalCode})`);
        } catch (err) {
          // Destination might already exist, try to fetch it
          const existing = await db.select().from(destinations).where(eq(destinations.countryCode, internalCode)).limit(1);
          if (existing.length > 0) {
            destByCode.set(internalCode.toUpperCase(), existing[0]);
          }
        }
      }
    }

    // Helper function to normalize a country code to internal 2-letter format
    // Returns null if code cannot be normalized to ISO2 format
    const normalizeCountryCode = (externalCode: string): string | null => {
      const upper = externalCode.toUpperCase();
      const mapping = codeMapping.get(upper);
      if (mapping) {
        return mapping.internalCode.toUpperCase();
      }
      // No mapping found - only accept if it's already a 2-letter code
      if (upper.length === 2) {
        return upper;
      }
      // Cannot normalize - log warning and return null
      console.warn(`[Maya Sync] Cannot normalize code "${upper}" - no mapping and not 2 letters. Package will be skipped.`);
      return null;
    };

    let skipped = 0;

    for (const product of response.products) {
      processedUids.add(product.uid);

      // Normalize ALL country codes in coverage to internal 2-letter format
      // Skip packages with any unmapped non-ISO2 codes
      const rawCoverage = product.countries_enabled || [];
      const normalizedCoverage: string[] = [];
      let hasInvalidCode = false;

      for (const code of rawCoverage) {
        const normalized = normalizeCountryCode(code);
        if (normalized === null) {
          hasInvalidCode = true;
          break;
        }
        normalizedCoverage.push(normalized);
      }

      if (hasInvalidCode) {
        console.warn(`[Maya Sync] Skipping package "${product.name}" (${product.uid}) due to unmapped country codes`);
        skipped++;
        continue;
      }

      const dataHash = generateDataHash(product);
      const existing = existingByUid.get(product.uid);

      const packageType = determineMayaPackageType(product.countries_enabled);
      const dataAmount = formatDataAmount(product.data_quota_mb);
      const wholesalePrice = parseFloat(product.wholesale_price_usd) || 0;

      // Map destination for local packages (single country) using internal code
      let destinationId: string | null = null;
      if (packageType === "local" && normalizedCoverage.length === 1) {
        const internalCode = normalizedCoverage[0];
        const dest = destByCode.get(internalCode);
        if (dest) {
          destinationId = dest.id;
        }
      }

      // Maya API doesn't provide carrier info, use consistent default
      const operator = "Maya Mobile";

      if (existing) {
        // Update if hash changed OR if destination/operator/dataAmount need fixing
        const needsFieldUpdate =
          existing.operator !== "Maya Mobile" ||
          existing.dataAmount !== dataAmount ||
          existing.destinationId !== destinationId ||
          JSON.stringify(existing.coverage) !== JSON.stringify(normalizedCoverage);


        // console.log("---- Checking package ----");
        // console.log("UID:", product.uid);
        // console.log("Existing hash:", existing?.dataHash);
        // console.log("New hash:", dataHash);
        // console.log("Destination changed?", existing?.destinationId !== destinationId);
        // console.log("Coverage changed?", JSON.stringify(existing?.coverage) !== JSON.stringify(normalizedCoverage));



        if (existing.dataHash === dataHash) {
          await db.update(mayaPackages)
            .set({
              title: product.name,
              dataAmount,
              dataMb: product.data_quota_mb,
              dataBytes: product.data_quota_bytes,
              validity: (Number(product.validity_days) - 1),
              wholesalePrice: wholesalePrice.toFixed(2),
              policyId: product.policy_id,
              policyName: product.policy_name,
              coverage: normalizedCoverage,
              type: packageType,
              destinationId,
              operator,
              rrpUsd: product.rrp_usd,
              rrpEur: product.rrp_eur,
              rrpGbp: product.rrp_gbp,
              dataHash,
              updatedAt: new Date(),
            })
            .where(eq(mayaPackages.id, existing.id));
          updated++;
        }
      } else {
        await db.insert(mayaPackages).values({
          providerId: provider.id,
          mayaId: product.uid,
          slug: generateSlug(product),
          title: product.name,
          dataAmount,
          dataMb: product.data_quota_mb,
          dataBytes: product.data_quota_bytes,
          validity: (Number(product.validity_days) - 1),
          wholesalePrice: wholesalePrice.toFixed(2),
          currency: "USD",
          policyId: product.policy_id,
          policyName: product.policy_name,
          coverage: normalizedCoverage,
          type: packageType,
          destinationId,
          operator,
          rrpUsd: product.rrp_usd,
          rrpEur: product.rrp_eur,
          rrpGbp: product.rrp_gbp,
          isUnlimited: false,
          active: true,
          dataHash,
        });
        synced++;
      }
    }

    for (const existing of existingPackages) {
      if (!processedUids.has(existing.mayaId)) {
        await db.update(mayaPackages)
          .set({ active: false, updatedAt: new Date() })
          .where(eq(mayaPackages.id, existing.id));
        removed++;
      }
    }

    console.log(`[Maya Sync] Complete - Synced: ${synced}, Updated: ${updated}, Removed: ${removed}, Skipped: ${skipped}`);

    return {
      success: true,
      packagesSynced: synced,
      packagesUpdated: updated,
      packagesRemoved: removed,
    };
  } catch (error) {
    console.error("[Maya Sync] Error:", error);
    return {
      success: false,
      packagesSynced: synced,
      packagesUpdated: updated,
      packagesRemoved: removed,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
