"use strict";

import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import { airaloTopups, airaloPackages, type Provider, type InsertAiraloTopup } from "@shared/schema";
import { airaloAPI } from "./airalo-sdk";
import type { AiraloCountryData, AiraloOperator, AiraloPackageData } from "./types";
import { resolveAiraloSlug, AIRALO_REGION_SLUG_ALIASES } from "./slug-mappings";
import { storage } from "../../storage";
import crypto from "crypto";

function generateDataHash(data: Record<string, any>): string {
  const normalized = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash("md5").update(normalized).digest("hex");
}

function generateTopupSlug(
  location: string,
  data: string,
  validity: number,
  operator: string | null | undefined
): string {
  const safeOperator = operator || "default";
  const slugParts = [
    "topup",
    (location || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    (data || "0gb").toLowerCase().replace(/[^a-z0-9]+/g, ""),
    `${validity || 0}days`,
    safeOperator.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  ];
  return slugParts.join("-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function syncAiraloTopups(provider: Provider): Promise<{
  success: boolean;
  topupsSynced: number;
  topupsUpdated: number;
  topupsSkipped: number;
  errorMessage?: string;
}> {
  try {
    console.log("[Airalo Topup Sync] Fetching all packages including topups...");
    const response = await airaloAPI.getPackages();

    if (!response.data || !Array.isArray(response.data)) {
      return {
        success: false,
        topupsSynced: 0,
        topupsUpdated: 0,
        topupsSkipped: 0,
        errorMessage: "No data received from Airalo SDK",
      };
    }

    const countriesData = response.data as AiraloCountryData[];
    const pricingMargin = parseFloat(provider.pricingMargin || "50");

    const allDestinations = await storage.getAllDestinations();
    const allRegions = await storage.getAllRegions();
    const destinationsBySlug = new Map(allDestinations.map((d) => [d.slug, d]));
    const regionsBySlug = new Map(allRegions.map((r) => [r.slug, r]));

    const existingTopups = await db.select().from(airaloTopups);
    const existingByAiraloId = new Map(existingTopups.map((t) => [t.airaloId, t]));
    
    // Load all base packages for parent matching by operator + destination
    const allBasePackages = await db.select().from(airaloPackages);
    // Create composite key: operator|destinationId|regionId
    const basePackagesByKey = new Map<string, typeof allBasePackages[0]>();
    for (const pkg of allBasePackages) {
      if (pkg.operator) {
        const key = `${pkg.operator.toLowerCase()}|${pkg.destinationId || ''}|${pkg.regionId || ''}`;
        // Keep first match (oldest package) for each key
        if (!basePackagesByKey.has(key)) {
          basePackagesByKey.set(key, pkg);
        }
      }
    }

    let topupsSynced = 0;
    let topupsUpdated = 0;
    let topupsSkipped = 0;

    for (const country of countriesData) {
      if (!country.operators) continue;

      for (const operator of country.operators) {
        if (!operator.packages) continue;

        for (const pkg of operator.packages) {
          if (pkg.type !== "topup") continue;
          if (!pkg.id) {
            topupsSkipped++;
            continue;
          }

          const topupData = await prepareTopupData(
            provider,
            country,
            operator,
            pkg,
            destinationsBySlug,
            regionsBySlug,
            pricingMargin,
            basePackagesByKey
          );

          if (!topupData) {
            topupsSkipped++;
            continue;
          }

          const dataHash = generateDataHash({
            title: topupData.title,
            dataAmount: topupData.dataAmount,
            validity: topupData.validity,
            airaloPrice: topupData.airaloPrice,
            price: topupData.price,
          });

          const existing = existingByAiraloId.get(pkg.id);

          if (existing) {
            if (existing.dataHash !== dataHash) {
              await db
                .update(airaloTopups)
                .set({
                  ...topupData,
                  dataHash,
                  updatedAt: new Date(),
                })
                .where(eq(airaloTopups.id, existing.id));
              topupsUpdated++;
            } else {
              topupsSkipped++;
            }
          } else {
            await db.insert(airaloTopups).values({
              ...topupData,
              dataHash,
            });
            topupsSynced++;
          }
        }
      }
    }

    console.log(
      `[Airalo Topup Sync] Complete: ${topupsSynced} new, ${topupsUpdated} updated, ${topupsSkipped} unchanged`
    );

    return {
      success: true,
      topupsSynced,
      topupsUpdated,
      topupsSkipped,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Airalo Topup Sync] Error:", errorMessage);

    return {
      success: false,
      topupsSynced: 0,
      topupsUpdated: 0,
      topupsSkipped: 0,
      errorMessage,
    };
  }
}

async function prepareTopupData(
  provider: Provider,
  countryData: AiraloCountryData,
  operator: AiraloOperator,
  pkg: AiraloPackageData,
  destinationsBySlug: Map<string, any>,
  regionsBySlug: Map<string, any>,
  pricingMargin: number,
  basePackagesByKey: Map<string, any>
): Promise<InsertAiraloTopup | null> {
  if (!pkg.id) return null;

  let destinationId: string | null = null;
  let regionId: string | null = null;
  let locationName = countryData.title;

  const resolved = resolveAiraloSlug(countryData.slug, destinationsBySlug, regionsBySlug);
  if (resolved.destinationId) {
    destinationId = resolved.destinationId;
  } else if (resolved.regionId) {
    regionId = resolved.regionId;
    const region =
      regionsBySlug.get(countryData.slug) ||
      regionsBySlug.get(AIRALO_REGION_SLUG_ALIASES[countryData.slug]);
    locationName = region?.name || operator.title || countryData.title;
  }

  const dataDisplay = pkg.data || `${Math.round((pkg.amount || 0) / 1024)}GB`;
  const baseSlug = generateTopupSlug(locationName, dataDisplay, pkg.day, operator.title);
  const slug = `${baseSlug}-${pkg.id}`;

  const airaloPrice = parseFloat((pkg.net_price || pkg.price || 0).toString());
  const sellingPrice = airaloPrice * (1 + pricingMargin / 100);
  
  // Find parent package by matching operator + destination/region
  let parentPackageId: string | null = null;
  const parentOperator = operator.title || null;
  if (parentOperator) {
    // Try exact match with operator + destination/region
    const key = `${parentOperator.toLowerCase()}|${destinationId || ''}|${regionId || ''}`;
    const parentPkg = basePackagesByKey.get(key);
    if (parentPkg) {
      parentPackageId = parentPkg.id;
    }
  }

  return {
    providerId: provider.id,
    airaloId: pkg.id,
    parentPackageId,
    parentOperator,
    destinationId,
    regionId,
    slug,
    title: pkg.title || `${dataDisplay} Top-up`,
    dataAmount: dataDisplay,
    validity: pkg.day || 0,
    airaloPrice: airaloPrice.toFixed(2),
    price: sellingPrice.toFixed(2),
    currency: "USD",
    type: operator.type || "local",
    operator: operator.title,
    operatorImage: operator.image?.url,
    isUnlimited: pkg.is_unlimited || false,
    active: true,
  };
}
