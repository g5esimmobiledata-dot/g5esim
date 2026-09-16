"use strict";

import { db } from "../../db";
import { eq, sql } from "drizzle-orm";
import {
  esimGoPackages,
  destinations,
  regions,
  type Provider,
} from "@shared/schema";
import { makeEsimGoRequest } from "./api";
import type { EsimGoCatalogueResponse, EsimGoBundle } from "./types";

const PER_PAGE = 100;

async function fetchAllBundles(apiKey: string): Promise<EsimGoBundle[]> {
  const allBundles: EsimGoBundle[] = [];
  let page = 1;
  let hasMore = true;

  console.log("[eSIM Go Sync] Starting paginated fetch of all bundles...");

  while (hasMore) {
    const response = await makeEsimGoRequest<EsimGoCatalogueResponse>(
      `/catalogue?page=${page}&perPage=${PER_PAGE}`,
      "GET",
      undefined,
      apiKey
    );

    const bundles = response?.bundles;

    if (!bundles || !Array.isArray(bundles) || bundles.length === 0) {
      hasMore = false;
      console.log(`[eSIM Go Sync] Page ${page}: No more bundles, stopping pagination`);
    } else {
      allBundles.push(...bundles);
      console.log(`[eSIM Go Sync] Page ${page}: Fetched ${bundles.length} bundles (total: ${allBundles.length})`);

      if (bundles.length < PER_PAGE) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  console.log(`[eSIM Go Sync] Pagination complete. Total bundles fetched: ${allBundles.length}`);
  return allBundles;
}

function formatDataAmount(dataMb: number): string {
  if (dataMb >= 1024) {
    const gb = dataMb / 1024;
    return gb % 1 === 0 ? `${gb}GB` : `${gb.toFixed(1)}GB`;
  }
  return `${dataMb}MB`;
}

export async function syncEsimGoPackages(
  provider: Provider,
  apiKey: string
): Promise<{
  success: boolean;
  packagesSynced: number;
  packagesUpdated: number;
  packagesRemoved: number;
  errorMessage?: string;
}> {
  try {
    const apiBundles = await fetchAllBundles(apiKey);

    console.log("[eSIM Go Sync] Fetched all bundles");
    console.log('apiBundles.length: ' + apiBundles.length + " bundles fetched");

    if (apiBundles.length === 0) {
      return {
        success: false,
        packagesSynced: 0,
        packagesUpdated: 0,
        packagesRemoved: 0,
        errorMessage: "No bundles received from eSIM Go API",
      };
    }

    let packagesSynced = 0;
    let packagesUpdated = 0;
    let skipped = 0;

    for (const bundle of apiBundles) {
      let dataAmountMb = bundle.dataAmount;
      let validity = bundle.duration;

      if (!dataAmountMb && bundle.name) {
        const nameMatch = bundle.name.match(/esim_(\d+(?:\.\d+)?)(MB|GB)_(\d+)D_/i);
        if (nameMatch) {
          const value = parseFloat(nameMatch[1]);
          const unit = nameMatch[2].toUpperCase();
          dataAmountMb = unit === "GB" ? value * 1024 : value;
          if (!validity) {
            validity = parseInt(nameMatch[3], 10);
          }
        }
      }

      if (bundle.unlimited) {
        dataAmountMb = dataAmountMb || 999999;
      }

      if (!dataAmountMb || !validity || validity <= 0 || !bundle.price || bundle.price <= 0) {
        skipped++;
        continue;
      }

      const coverage = bundle.countries.map((c) => c.iso);

      if (coverage.length === 0) {
        skipped++;
        continue;
      }

      const type =
        coverage.length > 10
          ? "global"
          : coverage.length > 1
            ? "regional"
            : "local";

      let destinationId: string | null = null;
      let regionId: string | null = null;

      if (coverage.length === 1) {
        const destination = await db.query.destinations.findFirst({
          where: eq(destinations.countryCode, coverage[0]),
        });
        destinationId = destination?.id || null;
      }

        const region =
          coverage.length === 1
            ? await db.query.regions.findFirst({
              where: sql`${coverage[0]} = ANY(${regions.countries})`,
            })
            : await db.query.regions.findFirst({
              where: sql`
                ${regions.countries} && ARRAY[
                  ${sql.join(
                    coverage.map((code) => sql`${code}`),
                    sql`, `
                  )}
                ]::text[]
              `,
            });

      regionId = region?.id || null;

      const existing = await db.query.esimGoPackages.findFirst({
        where: eq(esimGoPackages.esimGoId, bundle.name),
      });

      const dataAmountFormatted = formatDataAmount(dataAmountMb);

      let voiceCredits = 0;
      let smsCredits = 0;
      if (bundle.allowances) {
        for (const allowance of bundle.allowances) {
          if (allowance.type === "VOICE" && allowance.unit === "MINS") {
            voiceCredits = allowance.unlimited ? 9999 : allowance.amount;
          }
          if (allowance.type === "SMS" && allowance.unit === "SMS") {
            smsCredits = allowance.unlimited ? 9999 : allowance.amount;
          }
        }
      }

      const packageData = {
        providerId: provider.id,
        esimGoId: bundle.name,
        destinationId,
        regionId,
        slug: bundle.name.toLowerCase(),
        title: `${dataAmountFormatted} - ${validity} Days - ${coverage.join(", ")}`,
        dataAmount: dataAmountFormatted,
        validity,
        wholesalePrice: bundle.price.toString(),
        currency: "USD",
        type,
        operator: null,
        operatorImage: null,
        coverage,
        voiceCredits,
        smsCredits,
        isUnlimited: bundle.unlimited || false,
        updatedAt: new Date(),
      };

      if (existing) {
        await db
          .update(esimGoPackages)
          .set(packageData)
          .where(eq(esimGoPackages.id, existing.id));
        packagesUpdated++;
      } else {
        await db.insert(esimGoPackages).values(packageData);
        packagesSynced++;
      }
    }

    console.log(`[eSIM Go Sync] Complete: ${packagesSynced} new, ${packagesUpdated} updated, ${skipped} skipped`);

    return {
      success: true,
      packagesSynced,
      packagesUpdated,
      packagesRemoved: 0,
    };
  } catch (error) {
    console.error("[eSIM Go Sync] Error:", error);
    return {
      success: false,
      packagesSynced: 0,
      packagesUpdated: 0,
      packagesRemoved: 0,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
