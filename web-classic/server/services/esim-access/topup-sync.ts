"use strict";

import { db } from "../../db";
import { eq } from "drizzle-orm";
import {
  esimAccessTopups,
  esimAccessPackages,
  type Provider,
  type InsertEsimAccessTopup,
} from "@shared/schema";
import { makeEsimAccessRequest, formatDataAmount } from "./api";
import crypto from "crypto";

interface EsimAccessTopupListResponse {
  success: boolean;
  obj: {
    packageList: Array<{
      packageCode: string;
      slug: string;
      name: string;
      price: number;
      currencyCode: string;
      volume: number;
      duration: number;
      durationUnit: string;
      dataType?: number;
      location?: string;
      locationNetworkList?: Array<{
        locationLogo?: string;
        operatorList?: Array<{ operatorName?: string }>;
      }>;
    }>;
  };
}

function generateDataHash(data: Record<string, any>): string {
  const normalized = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash("md5").update(normalized).digest("hex");
}

/**
 * Sync eSIM Access topup packages.
 * 
 * This function fetches ALL topup packages in a single API call using { type: "TOPUP" },
 * matching the approach used for base packages. This is much more efficient than
 * making individual API calls per base package.
 */
export async function syncEsimAccessTopups(
  provider: Provider,
  accessCode: string,
  secretKey: string
): Promise<{
  success: boolean;
  topupsSynced: number;
  topupsUpdated: number;
  topupsSkipped: number;
  errorMessage?: string;
}> {
  try {
    console.log("[eSIM Access Topup Sync] Fetching ALL topup packages in single API call...");

    // Fetch ALL topup packages in one call (same approach as base package sync)
    const response = await makeEsimAccessRequest<EsimAccessTopupListResponse>(
      "/api/v1/open/package/list",
      "POST",
      { type: "TOPUP" },
      accessCode,
      secretKey
    );

    if (!response.success || !response.obj?.packageList) {
      return {
        success: false,
        topupsSynced: 0,
        topupsUpdated: 0,
        topupsSkipped: 0,
        errorMessage: "Failed to fetch topup packages from API",
      };
    }

    const apiPackages = response.obj.packageList;
    console.log(`[eSIM Access Topup Sync] Received ${apiPackages.length} topup packages from API`);

    // Get existing topups and base packages for reference
    const existingTopups = await db.select().from(esimAccessTopups);
    const existingByEsimAccessId = new Map(existingTopups.map((t) => [t.esimAccessId, t]));

    // Get base packages to link topups to their parent
    const basePackages = await db.select().from(esimAccessPackages);
    const basePackageBySlug = new Map(basePackages.map((p) => [p.slug, p]));

    let topupsSynced = 0;
    let topupsUpdated = 0;
    let topupsSkipped = 0;

    for (const apiPkg of apiPackages) {
      const wholesalePrice = apiPkg.price / 10000;
      const operator = apiPkg.locationNetworkList?.[0]?.operatorList?.[0]?.operatorName || null;

      const rawOperatorImage = apiPkg.locationNetworkList?.[0]?.locationLogo || null;
      let operatorImage: string | null = null;
      if (rawOperatorImage) {
        operatorImage = rawOperatorImage.startsWith("http")
          ? rawOperatorImage
          : rawOperatorImage.startsWith("/img/")
          ? `https://static.redteago.com${rawOperatorImage}`
          : rawOperatorImage;
      }

      // Try to find a matching base package by slug pattern
      // Topup slugs often relate to base package slugs
      const basePackageSlug = apiPkg.slug;
      const basePkg = basePackageBySlug.get(basePackageSlug);

      // Determine package type from location
      const countryCodes = apiPkg.location
        ? apiPkg.location.split(",").map((c) => c.trim()).filter(Boolean)
        : [];
      const isGlobal = apiPkg.location?.startsWith("!GL") || false;
      const isRegional = !isGlobal && (countryCodes.length > 1 || apiPkg.location?.startsWith("!RG"));
      const type = isGlobal ? "global" : isRegional ? "regional" : "local";

      const topupData: InsertEsimAccessTopup = {
        providerId: provider.id,
        esimAccessId: apiPkg.packageCode,
        basePackageCode: apiPkg.slug,
        parentPackageId: basePkg?.id || null,
        destinationId: basePkg?.destinationId || null,
        regionId: basePkg?.regionId || null,
        slug: `topup-${apiPkg.slug || apiPkg.packageCode}`,
        title: apiPkg.name,
        dataAmount: formatDataAmount(apiPkg.volume),
        validity: apiPkg.duration,
        wholesalePrice: wholesalePrice.toString(),
        currency: apiPkg.currencyCode,
        type: type,
        operator,
        operatorImage,
        isUnlimited: apiPkg.dataType === 4,
        active: true,
      };

      const dataHash = generateDataHash({
        title: topupData.title,
        dataAmount: topupData.dataAmount,
        validity: topupData.validity,
        wholesalePrice: topupData.wholesalePrice,
      });

      const existing = existingByEsimAccessId.get(apiPkg.packageCode);

      if (existing) {
        if (existing.dataHash !== dataHash) {
          await db
            .update(esimAccessTopups)
            .set({ ...topupData, dataHash, updatedAt: new Date() })
            .where(eq(esimAccessTopups.id, existing.id));
          topupsUpdated++;
        } else {
          topupsSkipped++;
        }
      } else {
        await db.insert(esimAccessTopups).values({ ...topupData, dataHash });
        topupsSynced++;
      }
    }

    console.log(
      `[eSIM Access Topup Sync] Complete: ${topupsSynced} new, ${topupsUpdated} updated, ${topupsSkipped} unchanged`
    );

    return {
      success: true,
      topupsSynced,
      topupsUpdated,
      topupsSkipped,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[eSIM Access Topup Sync] Error:", errorMessage);

    return {
      success: false,
      topupsSynced: 0,
      topupsUpdated: 0,
      topupsSkipped: 0,
      errorMessage,
    };
  }
}
