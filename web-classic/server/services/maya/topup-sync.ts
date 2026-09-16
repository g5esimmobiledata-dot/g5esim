"use strict";

import crypto from "crypto";
import { db } from "../../db";
import { mayaPackages, mayaTopups, providers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getMayaProducts } from "./api-client";
import { determineMayaPackageType, formatDataAmount } from "./types";
import type { MayaProductsResponse, MayaProduct } from "./types";
import type { Provider } from "@shared/schema";

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
  return `maya-topup-${name}-${product.uid.substring(0, 8)}`;
}

export async function syncMayaTopups(
  provider: Provider,
  apiKey = process.env.MAYA_API_KEY,
  apiSecret = process.env.MAYA_API_SECRET
): Promise<{
  success: boolean;
  topupsSynced: number;
  topupsUpdated: number;
  topupsRemoved: number;
  errorMessage?: string;
}> {
  console.log("[Maya Topup Sync] Starting topup package sync...");

  let synced = 0;
  let updated = 0;
  let removed = 0;

  if (!apiKey || !apiSecret) {
    return {
      success: false,
      topupsSynced: synced,
      topupsUpdated: updated,
      topupsRemoved: removed,
      errorMessage: "Maya credentials not configured",
    };
  }

  try {
    const response = await getMayaProducts(apiKey, apiSecret) as MayaProductsResponse;

    if (!response.products || !Array.isArray(response.products)) {
      console.warn("[Maya Topup Sync] No products returned from API");
      return {
        success: true,
        topupsSynced: 0,
        topupsUpdated: 0,
        topupsRemoved: 0,
      };
    }

    console.log(`[Maya Topup Sync] Fetched ${response.products.length} products from Maya API`);

    const basePackages = await db.select().from(mayaPackages);
    const basePackageByUid = new Map(basePackages.map(p => [p.mayaId, p]));

    const existingTopups = await db.select().from(mayaTopups);
    const existingByUid = new Map(existingTopups.map(t => [t.mayaId, t]));
    const processedUids = new Set<string>();

    for (const product of response.products) {
      processedUids.add(product.uid);

      const basePackage = basePackageByUid.get(product.uid);
      const parentPackageId = basePackage?.id || null;
      const destinationId = basePackage?.destinationId || null;
      const regionId = basePackage?.regionId || null;
      const operator = basePackage?.operator || "Maya Mobile";

      // Include parent links in the hash so we update if the base package changes
      const dataHash = generateDataHash(product) + `-${parentPackageId || 'no-parent'}-${destinationId || 'no-dest'}-${regionId || 'no-region'}`;

      const existing = existingByUid.get(product.uid);

      const packageType = determineMayaPackageType(product.countries_enabled);
      const dataAmount = formatDataAmount(product.data_quota_mb);
      const wholesalePrice = parseFloat(product.wholesale_price_usd) || 0;
      const validityDays = Number(product.validity_days) > 1 ? Number(product.validity_days) - 1 : Number(product.validity_days);

      if (existing) {
        if (existing.dataHash !== dataHash) {
          await db.update(mayaTopups)
            .set({
              title: product.name,
              dataAmount,
              parentPackageId,
              destinationId,
              regionId,
              operator,
              dataMb: product.data_quota_mb,
              validity: validityDays,
              wholesalePrice: wholesalePrice.toFixed(2),
              policyId: product.policy_id,
              policyName: product.policy_name,
              coverage: product.countries_enabled,
              type: packageType,
              dataHash,
              updatedAt: new Date(),
            })
            .where(eq(mayaTopups.id, existing.id));
          updated++;
        }
      } else {
        await db.insert(mayaTopups).values({
          providerId: provider.id,
          mayaId: product.uid,
          parentPackageId,
          destinationId,
          regionId,
          slug: generateSlug(product),
          title: product.name,
          dataAmount,
          dataMb: product.data_quota_mb,
          validity: validityDays,
          wholesalePrice: wholesalePrice.toFixed(2),
          currency: "USD",
          operator,
          policyId: product.policy_id,
          policyName: product.policy_name,
          coverage: product.countries_enabled,
          type: packageType,
          active: true,
          dataHash,
        });
        synced++;
      }
    }

    for (const existing of existingTopups) {
      if (!processedUids.has(existing.mayaId)) {
        await db.update(mayaTopups)
          .set({ active: false, updatedAt: new Date() })
          .where(eq(mayaTopups.id, existing.id));
        removed++;
      }
    }

    console.log(`[Maya Topup Sync] Complete - Synced: ${synced}, Updated: ${updated}, Removed: ${removed}`);

    return {
      success: true,
      topupsSynced: synced,
      topupsUpdated: updated,
      topupsRemoved: removed,
    };
  } catch (error) {
    console.error("[Maya Topup Sync] Error:", error);
    return {
      success: false,
      topupsSynced: synced,
      topupsUpdated: updated,
      topupsRemoved: removed,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
