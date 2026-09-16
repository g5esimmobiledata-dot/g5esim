"use strict";

import { db } from "../../db";
import { eq, sql } from "drizzle-orm";
import {
  esimAccessPackages,
  destinations,
  regions,
  type Provider,
} from "@shared/schema";
import { makeEsimAccessRequest, formatDataAmount } from "./api";
import type { EsimAccessPackageListResponse } from "./types";

export async function syncEsimAccessPackages(
  provider: Provider,
  accessCode: string,
  secretKey: string
): Promise<{
  success: boolean;
  packagesSynced: number;
  packagesUpdated: number;
  packagesRemoved: number;
  errorMessage?: string;
}> {
  try {
    const response =
      await makeEsimAccessRequest<EsimAccessPackageListResponse>(
        "/api/v1/open/package/list",
        "POST",
        { type: "BASE" },
        accessCode,
        secretKey
      );

    const apiPackages = response.obj.packageList;

    let packagesSynced = 0;
    let packagesUpdated = 0;

    for (const apiPkg of apiPackages) {
      const wholesalePrice = apiPkg.price / 10000;

      // -----------------------------
      // Country codes
      // -----------------------------
      const countryCodes = apiPkg.location
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      const isGlobal = apiPkg.location.startsWith("!GL");
      const isRegional =
        !isGlobal && (countryCodes.length > 1 || apiPkg.location.startsWith("!RG"));

      const type = isGlobal
        ? "global"
        : isRegional
        ? "regional"
        : "local";

      // -----------------------------
      // Operator
      // -----------------------------
      const operator =
        apiPkg.locationNetworkList?.[0]?.operatorList?.[0]?.operatorName ||
        null;

      const rawOperatorImage =
        apiPkg.locationNetworkList?.[0]?.locationLogo || null;

      let operatorImage: string | null = null;
      if (rawOperatorImage) {
        operatorImage = rawOperatorImage.startsWith("http")
          ? rawOperatorImage
          : rawOperatorImage.startsWith("/img/")
          ? `https://static.redteago.com${rawOperatorImage}`
          : rawOperatorImage;
      }

      // -----------------------------
      // Destination / Region resolve
      // -----------------------------
      let destinationId: string | null = null;
      let regionId: string | null = null;

      // --------------------
      // LOCAL
      // --------------------
      if (type === "local" && countryCodes.length === 1) {
        const dest = await db.query.destinations.findFirst({
          where: eq(destinations.countryCode, countryCodes[0]),
        });
        destinationId = dest?.id || null;
      }

      // --------------------
      // REGIONAL / GLOBAL
      // --------------------
      if (type === "regional" || type === "global") {
        const region =
          countryCodes.length === 1
            ? await db.query.regions.findFirst({
                where: sql`${countryCodes[0]} = ANY(${regions.countries})`,
              })
            : await db.query.regions.findFirst({
                where: sql`
                  ${regions.countries} && ARRAY[
                    ${sql.join(
                      countryCodes.map(code => sql`${code}`),
                      sql`, `
                    )}
                  ]::text[]
                `,
              });

        regionId = region?.id || null;
      }

      // -----------------------------
      // Package data
      // -----------------------------
      const existing = await db.query.esimAccessPackages.findFirst({
        where: eq(esimAccessPackages.esimAccessId, apiPkg.packageCode),
      });

      const packageData = {
        providerId: provider.id,
        esimAccessId: apiPkg.packageCode,
        destinationId,
        regionId,
        slug: apiPkg.slug,
        title: apiPkg.name,
        dataAmount: formatDataAmount(apiPkg.volume),
        validity: apiPkg.duration,
        wholesalePrice: wholesalePrice.toString(),
        currency: apiPkg.currencyCode,
        type,
        operator,
        operatorImage,
        coverage: countryCodes,
        voiceCredits: 0,
        smsCredits: apiPkg.smsStatus > 0 ? 100 : 0,
        isUnlimited: apiPkg.dataType === 4,
        updatedAt: new Date(),
      };

      if (existing) {
        await db
          .update(esimAccessPackages)
          .set(packageData)
          .where(eq(esimAccessPackages.id, existing.id));
        packagesUpdated++;
      } else {
        await db.insert(esimAccessPackages).values(packageData);
        packagesSynced++;
      }
    }

    return {
      success: true,
      packagesSynced,
      packagesUpdated,
      packagesRemoved: 0,
    };
  } catch (error) {
    return {
      success: false,
      packagesSynced: 0,
      packagesUpdated: 0,
      packagesRemoved: 0,
      errorMessage:
        error instanceof Error ? error.message : "Unknown error",
    };
  }
}
