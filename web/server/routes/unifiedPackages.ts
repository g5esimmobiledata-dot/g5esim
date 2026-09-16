"use strict";

import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { asyncHandler } from "../lib/asyncHandler";
import { NotFoundError } from "../lib/errors";
import { unifiedPackages, platformSettings, providers, destinations, regions } from "@shared/schema";
import { eq, and, ilike, asc, desc, sql, or, isNotNull, gt, ne, inArray, notInArray } from "drizzle-orm";
import * as ApiResponse from "../utils/response";
import {
  getDisplayPackagePrice,
  getRequestPricingRole,
  getResellerDisabledProviderIds,
  getResellerPackagePriceMap,
  getResellerProviderSettingsMap,
  getResellerSellingPriceForPackage,
  isProviderEnabledForReseller,
} from "../helpers/packagePricing";
import { resellerProviderDisplayName } from "@shared/providerNames";

const router = Router();

function publicPackageBase(pkg: any) {
  const { wholesalePrice, resellerPrice, ...safePackage } = pkg;
  return safePackage;
}

function providerDisplayNameForAccount(isReseller: boolean, slug?: string | null, name?: string | null) {
  return isReseller ? resellerProviderDisplayName(slug, name) : name || "Unknown";
}




/**
 * GET /api/unified-packages/global
 * Get enabled packages for the global region (auto-selected best prices)
 */
router.get("/global", async (req: Request, res: Response) => {
  try {
    const requestedCurrency = req.query.currency as string || "USD";
    const { userId, isReseller, priceType } = await getRequestPricingRole(req);

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;

    // Filters
    const sort = (req.query.sort as string) || null;
    const filterUnlimited = req.query.isUnlimited === "true";
    const filterBestPrice = req.query.isBestPrice === "true";
    const filterPopular = req.query.isPopular === "true";
    const filterDataPack = req.query.dataPack === "true";
    const filterVoicePack = req.query.voicePack === "true";
    const filterSmsPack = req.query.smsPack === "true";
    const filterVoiceAndDataPack = req.query.voiceAndDataPack === "true";
    const filterVoiceAndSmsPack = req.query.voiceAndSmsPack === "true";
    const filterDataAndSmsPack = req.query.dataAndSmsPack === "true";
    const filterVoiceAndDataAndSmsPack = req.query.voiceAndDataAndSmsPack === "true";

    // Get region
    const globalRegion = await db.query.regions.findFirst({
      where: sql`LOWER(name) = 'global'`,
    });

    if (!globalRegion) {
      return ApiResponse.success(res, "Global Packages fetched successfully", {
        region: null,
        packages: [],
        pagination: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        counts: {
          total: 0,
          regional: 0,
        }
      });
    }

    // Get enabled providers
    const enabledProviders = await db.select({ id: providers.id }).from(providers).where(eq(providers.enabled, true));
    const disabledProviderIds = await getResellerDisabledProviderIds(isReseller ? userId : null);
    const enabledProviderIds = enabledProviders
      .map(p => p.id)
      .filter((providerId) => !disabledProviderIds.includes(providerId));

    if (enabledProviderIds.length === 0) {
      return ApiResponse.success(res, "Global Packages fetched successfully", {
        region: globalRegion,
        packages: [],
        pagination: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        counts: {
          total: 0,
          regional: 0,
        }
      });
    }

    // ======================================
    // WHERE CONDITIONS
    // ======================================
    const whereClauses: any[] = [
      eq(unifiedPackages.isEnabled, true),
      eq(unifiedPackages.regionId, globalRegion.id),
      inArray(unifiedPackages.providerId, enabledProviderIds),
    ];

    if (filterUnlimited) whereClauses.push(eq(unifiedPackages.isUnlimited, true));
    if (filterBestPrice) whereClauses.push(eq(unifiedPackages.isBestPrice, true));
    if (filterPopular) whereClauses.push(eq(unifiedPackages.isPopular, true));

    if (filterDataPack) {
      whereClauses.push(
        and(
          eq(unifiedPackages.voiceMinutes, 0),
          eq(unifiedPackages.smsCount, 0)
        )
      );
    }

    if (filterVoicePack) {
      whereClauses.push(
        and(
          eq(unifiedPackages.dataMb, 0),
          eq(unifiedPackages.smsCount, 0)
        )
      );
    }

    if (filterSmsPack) {
      whereClauses.push(
        and(
          eq(unifiedPackages.voiceMinutes, 0),
          eq(unifiedPackages.dataMb, 0)
        )
      );
    }

    if (filterVoiceAndDataPack) {
      whereClauses.push(
        and(
          eq(unifiedPackages.smsCount, 0)
        )
      );
    }

    if (filterVoiceAndSmsPack) {
      whereClauses.push(
        and(
          eq(unifiedPackages.dataMb, 0)
        )
      );
    }

    if (filterDataAndSmsPack) {
      whereClauses.push(
        and(
          eq(unifiedPackages.voiceMinutes, 0)
        )
      );
    }

    if (filterVoiceAndDataAndSmsPack) {
      whereClauses.push(
        and(
          ne(unifiedPackages.voiceMinutes, 0),
          ne(unifiedPackages.dataMb, 0),
          ne(unifiedPackages.smsCount, 0)
        )
      );
    }

    // ======================================
    // ORDERING
    // ======================================
    let orderBy: any = sql`NULL`;

    if (sort === "priceLowToHigh") {
      orderBy = asc(unifiedPackages.retailPrice);
    } else if (sort === "priceHighToLow") {
      orderBy = desc(unifiedPackages.retailPrice);
    } else {
      orderBy = [
        desc(unifiedPackages.isPopular),
        desc(unifiedPackages.isRecommended),
        desc(unifiedPackages.isBestValue),
        asc(unifiedPackages.retailPrice),
      ];
    }

    // ======================================
    // COUNT (for pagination)
    // ======================================
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(unifiedPackages)
      .where(and(...whereClauses));

    // ======================================
    // FETCH WITH PROVIDER + REGION
    // ======================================
    const packages = await db.query.unifiedPackages.findMany({
      where: () => and(...whereClauses),
      with: {
        provider: true,
        region: true,
      },
      orderBy,
      limit,
      offset,
    });
    const resellerPriceMap = await getResellerPackagePriceMap(
      isReseller ? userId : null,
      packages.map((pkg) => pkg.id),
    );

    // ======================================
    // FORMAT RESPONSE
    // ======================================
    const currencies = await storage.getCurrencies();
    const formattedPackages = packages.map((pkg: any) => {
      const provider = pkg.provider || null;
      const resellerSellingPrice = isReseller
        ? getResellerSellingPriceForPackage(pkg.id, resellerPriceMap)
        : undefined;
      if (resellerSellingPrice === null) return null;

      const retailPrice = getDisplayPackagePrice(pkg, isReseller, requestedCurrency, currencies, resellerSellingPrice);

      return {
        id: pkg.id,
        slug: pkg.slug,
        title: pkg.title,

        dataAmount: pkg.dataAmount,
        dataMb: pkg.dataMb,

        validity: pkg.validity,
        validityDays: pkg.validityDays,

        price: retailPrice.toFixed(2),
        retailPrice: retailPrice.toFixed(2),
        priceType,
        currency: requestedCurrency,

        type: pkg.type,

        isUnlimited: pkg.isUnlimited,
        isBestPrice: pkg.isBestPrice,
        isPopular: pkg.isPopular,
        isRecommended: pkg.isRecommended,
        isBestValue: pkg.isBestValue,
        isEnabled: pkg.isEnabled,

        providerId: pkg.providerId,
        providerName: providerDisplayNameForAccount(isReseller, provider?.slug, provider?.name),
        providerSlug: provider?.slug || "unknown",

        operator: pkg.operator,
        operatorImage: pkg.operatorImage,
        coverage: pkg.coverage,

        packageGroupKey: pkg.packageGroupKey,

        countryCode: pkg.countryCode,
        countryName: pkg.countryName,

        regionId: pkg.regionId,
        region: pkg.region,

        voiceMinutes: pkg.voiceMinutes,
        smsCount: pkg.smsCount,
      };
    }).filter(Boolean);

    return ApiResponse.success(res, "Global Packages fetched successfully", {
      region: globalRegion,
      packages: formattedPackages,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        hasNextPage: offset + limit < count,
        hasPrevPage: page > 1,
      },
      counts: {
        total: count,
        regional: formattedPackages.length,
      }
    });

  } catch (error: any) {
    console.error("Error fetching global packages:", error);
    return ApiResponse.serverError(res, error.message);
  }
});






router.get("/", async (req: Request, res: Response) => {
  try {
    res.set("Cache-Control", "private, max-age=0, no-store");

    const requestedCurrency = (req.query.currency as string) || "USD";
    const { userId, isReseller, priceType } = await getRequestPricingRole(req);

    // =========================
    // PAGINATION
    // =========================
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;

    // =========================
    // FILTERS
    // =========================
    const sort = req.query.sort as string | null;
    const filterUnlimited = req.query.isUnlimited === "true";
    const filterBestPrice = req.query.isBestPrice === "true";
    const filterPopular = req.query.isPopular === "true";
    const filterDataPack = req.query.dataPack === "true";
    const filterVoicePack = req.query.voicePack === "true";
    const filterSmsPack = req.query.smsPack === "true";
    const filterVoiceAndDataPack = req.query.voiceAndDataPack === "true";
    const filterVoiceAndSmsPack = req.query.voiceAndSmsPack === "true";
    const filterDataAndSmsPack = req.query.dataAndSmsPack === "true";
    const filterVoiceAndDataAndSmsPack = req.query.voiceAndDataAndSmsPack === "true";
    const search = (req.query.search as string)?.trim();
    const bestPriceParam = req.query.isBestPrice as string | null;
    const type = typeof req.query.type === "string" ? req.query.type : undefined;

    // console.log(req.query);

    // =========================
    // BUILD WHERE CLAUSE
    // =========================
    const whereClauses: any[] = [
      eq(unifiedPackages.isEnabled, true),
      eq(providers.enabled, true)
    ];
    const disabledProviderIds = await getResellerDisabledProviderIds(isReseller ? userId : null);
    if (disabledProviderIds.length > 0) {
      whereClauses.push(notInArray(unifiedPackages.providerId, disabledProviderIds));
    }

    if (filterUnlimited) whereClauses.push(eq(unifiedPackages.isUnlimited, true));
    if (filterBestPrice) whereClauses.push(eq(unifiedPackages.isBestPrice, true));
    if (filterPopular) whereClauses.push(eq(unifiedPackages.isPopular, true));

    if (filterDataPack) {
      whereClauses.push(
        and(
          eq(unifiedPackages.voiceMinutes, 0),
          eq(unifiedPackages.smsCount, 0)
        )
      );
    }

    if (filterVoicePack) {
      whereClauses.push(
        and(
          eq(unifiedPackages.dataMb, 0),
          eq(unifiedPackages.smsCount, 0)
        )
      );
    }

    if (filterSmsPack) {
      whereClauses.push(
        and(
          eq(unifiedPackages.voiceMinutes, 0),
          eq(unifiedPackages.dataMb, 0)
        )
      );
    }

    if (filterVoiceAndDataPack) {
      whereClauses.push(
        and(
          eq(unifiedPackages.smsCount, 0)
        )
      );
    }

    if (filterVoiceAndSmsPack) {
      whereClauses.push(
        and(
          eq(unifiedPackages.dataMb, 0)
        )
      );
    }

    if (filterDataAndSmsPack) {
      whereClauses.push(
        and(
          eq(unifiedPackages.voiceMinutes, 0)
        )
      );
    }

    if (filterVoiceAndDataAndSmsPack) {
      whereClauses.push(
        and(
          ne(unifiedPackages.voiceMinutes, 0),
          ne(unifiedPackages.dataMb, 0),
          ne(unifiedPackages.smsCount, 0)
        )
      );
    }


    if (type) {
      whereClauses.push(eq(unifiedPackages.type, type));
    }

    if (bestPriceParam === "true") {
      whereClauses.push(eq(unifiedPackages.isBestPrice, true));
    } else if (bestPriceParam === "false") {
      whereClauses.push(eq(unifiedPackages.isBestPrice, false));
    }

    if (search) {
      const searchTerm = `%${search.toLowerCase()}%`;
      whereClauses.push(
        or(
          // ✅ Search by package ID
          eq(unifiedPackages.id, search),

          // Existing text search
          sql`LOWER(${unifiedPackages.slug}) ILIKE ${searchTerm}`,
          sql`LOWER(${unifiedPackages.title}) ILIKE ${searchTerm}`,
          sql`LOWER(${destinations.name}) ILIKE ${searchTerm}`,
          sql`LOWER(${regions.name}) ILIKE ${searchTerm}`,
          sql`LOWER(${providers.name}) ILIKE ${searchTerm}`
        )
      );
    }



    const whereCondition =
      whereClauses.length > 1 ? and(...whereClauses) : whereClauses[0];

    // =========================
    // SORTING
    // =========================
    let orderBy: any[];

    if (sort === "priceLowToHigh") {
      orderBy = [asc(unifiedPackages.retailPrice)];
    } else if (sort === "priceHighToLow") {
      orderBy = [desc(unifiedPackages.retailPrice)];
    } else {
      orderBy = [
        desc(unifiedPackages.isPopular),
        desc(unifiedPackages.isBestValue),
        desc(unifiedPackages.isUnlimited),
        desc(unifiedPackages.isRecommended),
        asc(unifiedPackages.retailPrice),
      ];
    }

    // =========================
    // TOTAL COUNT (FOR PAGINATION)
    // =========================
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(unifiedPackages)
      .innerJoin(providers, eq(unifiedPackages.providerId, providers.id))
      .where(whereCondition);

    const total = Number(count);
    const totalPages = Math.ceil(total / limit);

    // =========================
    // FETCH DATA
    // =========================
    const unifiedPackagesData = await db
      .select({
        pkg: unifiedPackages,
        provider: providers,
        destination: destinations,
        region: regions,
      })
      .from(unifiedPackages)
      .innerJoin(providers, eq(unifiedPackages.providerId, providers.id))
      .leftJoin(destinations, eq(unifiedPackages.destinationId, destinations.id))
      .leftJoin(regions, eq(unifiedPackages.regionId, regions.id))
      .where(whereCondition)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    if (!unifiedPackagesData.length) {
      return ApiResponse.success(res, "No Packages found", {
        data: [],
        pagination: {
          total,
          totalPages,
          currentPage: page,
          limit,
        },
      });
    }

    // =========================
    // CURRENCY CONVERSION
    // =========================
    const currencies = await storage.getCurrencies();
    const resellerPriceMap = await getResellerPackagePriceMap(
      isReseller ? userId : null,
      unifiedPackagesData.map((row) => row.pkg.id),
    );

    const formattedPackages = unifiedPackagesData
      .map(row => {
        const { pkg, provider, destination, region } = row;
        const resellerSellingPrice = isReseller
          ? getResellerSellingPriceForPackage(pkg.id, resellerPriceMap)
          : undefined;
        if (resellerSellingPrice === null) return null;

        const retailPrice = getDisplayPackagePrice(pkg, isReseller, requestedCurrency, currencies, resellerSellingPrice);
        const safePackage = publicPackageBase(pkg);

        return {
          ...safePackage,
          price: retailPrice.toFixed(2),
          retailPrice: retailPrice.toFixed(2),
          publicRetailPrice: pkg.retailPrice,
          priceType,
          currency: requestedCurrency,

          provider: provider
            ? {
              id: provider.id,
              name: providerDisplayNameForAccount(isReseller, provider.slug, provider.name),
              slug: provider.slug,
            }
            : null,

          destination: destination
            ? {
              id: destination.id,
              name: destination.name,
              slug: destination.slug,
              countryCode: destination.countryCode,
              flagEmoji: destination.flagEmoji,
              image: destination.image
            }
            : null,

          region: region
            ? {
              id: region.id,
              name: region.name,
              slug: region.slug,
              countries: region.countries,
              image: region.image
            }
            : null,
        };
      })
      .filter(Boolean);

    // =========================
    // RESPONSE
    // =========================
    return ApiResponse.success(res, "Unified Packages fetched successfully", {
      data: formattedPackages,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error: any) {
    console.error("🔥 SERVER ERROR", error);
    return ApiResponse.serverError(res, error.message);
  }
});



// Admin API endpoint for unified packages with all filters
// router.get("/", async (req: Request, res: Response) => {
//   try {
//     // =========================
//     // PAGINATION
//     // =========================
//     const page = Math.max(parseInt(req.query.page as string) || 1, 1);
//     const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
//     const offset = (page - 1) * limit;

//     // =========================
//     // FILTERS
//     // =========================
//     const providerSlug = req.query.provider as string | null;
//     const packageType = req.query.type as string | null;
//     const bestPriceParam = req.query.isBestPrice as string | null;
//     const sort = req.query.sort as string | null;
//     const search = (req.query.search as string)?.trim();

//     // Boolean filters from public API
//     const filterUnlimited = req.query.isUnlimited === "true";
//     const filterBestPrice = req.query.isBestPrice === "true";
//     const filterPopular = req.query.isPopular === "true";

//     // Package type filters
//     const filterDataPack = req.query.dataPack === "true";
//     const filterVoicePack = req.query.voicePack === "true";
//     const filterSmsPack = req.query.smsPack === "true";
//     const filterVoiceAndDataPack = req.query.voiceAndDataPack === "true";
//     const filterVoiceAndSmsPack = req.query.voiceAndSmsPack === "true";
//     const filterDataAndSmsPack = req.query.dataAndSmsPack === "true";
//     const filterVoiceAndDataAndSmsPack = req.query.voiceAndDataAndSmsPack === "true";

//     console.log("Admin packages filters:", req.query);

//     // =========================
//     // BUILD WHERE CLAUSE
//     // =========================
//     const whereClauses: any[] = [];

//     // Provider filter
//     if (providerSlug && providerSlug !== "all") {
//       whereClauses.push(eq(providers.slug, providerSlug));
//     }

//     // Package type filter (local, regional, global)
//     if (packageType && packageType !== "all") {
//       whereClauses.push(eq(unifiedPackages.type, packageType));
//     }

//     // Best price filter (from dropdown)
//     if (bestPriceParam !== null && bestPriceParam !== "all") {
//       whereClauses.push(eq(unifiedPackages.isBestPrice, bestPriceParam === "true"));
//     }

//     // Boolean filters
//     if (filterUnlimited) {
//       whereClauses.push(eq(unifiedPackages.isUnlimited, true));
//     }

//     if (filterBestPrice) {
//       whereClauses.push(eq(unifiedPackages.isBestPrice, true));
//     }

//     if (filterPopular) {
//       whereClauses.push(eq(unifiedPackages.isPopular, true));
//     }

//     // Package composition filters (same logic as public API)
//     if (filterDataPack) {
//       whereClauses.push(
//         and(
//           eq(unifiedPackages.voiceMinutes, 0),
//           eq(unifiedPackages.smsCount, 0)
//         )
//       );
//     }

//     if (filterVoicePack) {
//       whereClauses.push(
//         and(
//           eq(unifiedPackages.dataMb, 0),
//           eq(unifiedPackages.smsCount, 0)
//         )
//       );
//     }

//     if (filterSmsPack) {
//       whereClauses.push(
//         and(
//           eq(unifiedPackages.voiceMinutes, 0),
//           eq(unifiedPackages.dataMb, 0)
//         )
//       );
//     }

//     if (filterVoiceAndDataPack) {
//       whereClauses.push(
//         and(
//           ne(unifiedPackages.voiceMinutes, 0),
//           ne(unifiedPackages.dataMb, 0),
//           eq(unifiedPackages.smsCount, 0)
//         )
//       );
//     }

//     if (filterVoiceAndSmsPack) {
//       whereClauses.push(
//         and(
//           ne(unifiedPackages.voiceMinutes, 0),
//           ne(unifiedPackages.smsCount, 0),
//           eq(unifiedPackages.dataMb, 0)
//         )
//       );
//     }

//     if (filterDataAndSmsPack) {
//       whereClauses.push(
//         and(
//           ne(unifiedPackages.dataMb, 0),
//           ne(unifiedPackages.smsCount, 0),
//           eq(unifiedPackages.voiceMinutes, 0)
//         )
//       );
//     }

//     if (filterVoiceAndDataAndSmsPack) {
//       whereClauses.push(
//         and(
//           ne(unifiedPackages.voiceMinutes, 0),
//           ne(unifiedPackages.dataMb, 0),
//           ne(unifiedPackages.smsCount, 0)
//         )
//       );
//     }

//     // Search filter
//     if (search) {
//       const searchTerm = `%${search.toLowerCase()}%`;
//       const isNumericId = !isNaN(Number(search));

//       whereClauses.push(
//         or(
//           // Search by package ID
//           isNumericId
//             ? eq(unifiedPackages.id, Number(search))
//             : sql`CAST(${unifiedPackages.id} AS TEXT) ILIKE ${searchTerm}`,

//           // Text search
//           sql`LOWER(${unifiedPackages.slug}) ILIKE ${searchTerm}`,
//           sql`LOWER(${unifiedPackages.title}) ILIKE ${searchTerm}`,
//           sql`LOWER(${destinations.name}) ILIKE ${searchTerm}`,
//           sql`LOWER(${regions.name}) ILIKE ${searchTerm}`,
//           sql`LOWER(${providers.name}) ILIKE ${searchTerm}`
//         )
//       );
//     }

//     const whereCondition =
//       whereClauses.length > 1 ? and(...whereClauses) : whereClauses.length === 1 ? whereClauses[0] : undefined;

//     // =========================
//     // SORTING
//     // =========================
//     let orderBy: any[];

//     if (sort === "priceLowToHigh") {
//       orderBy = [asc(unifiedPackages.retailPrice)];
//     } else if (sort === "priceHighToLow") {
//       orderBy = [desc(unifiedPackages.retailPrice)];
//     } else {
//       // Default sorting (same as public API)
//       orderBy = [
//         desc(unifiedPackages.isPopular),
//         desc(unifiedPackages.isBestValue),
//         desc(unifiedPackages.isUnlimited),
//         desc(unifiedPackages.isRecommended),
//         asc(unifiedPackages.retailPrice),
//       ];
//     }

//     // =========================
//     // GET STATISTICS
//     // =========================
//     const statsQuery = db
//       .select({
//         total: sql<number>`COUNT(*)`,
//         enabled: sql<number>`SUM(CASE WHEN ${unifiedPackages.isEnabled} THEN 1 ELSE 0 END)`,
//         bestPrice: sql<number>`SUM(CASE WHEN ${unifiedPackages.isBestPrice} THEN 1 ELSE 0 END)`,
//         manualOverride: sql<number>`SUM(CASE WHEN ${unifiedPackages.manualOverride} THEN 1 ELSE 0 END)`,
//       })
//       .from(unifiedPackages)
//       .leftJoin(providers, eq(unifiedPackages.providerId, providers.id))
//       .leftJoin(destinations, eq(unifiedPackages.destinationId, destinations.id))
//       .leftJoin(regions, eq(unifiedPackages.regionId, regions.id));

//     if (whereCondition) {
//       statsQuery.where(whereCondition);
//     }

//     const [stats] = await statsQuery;

//     // =========================
//     // TOTAL COUNT (FOR PAGINATION)
//     // =========================
//     const countQuery = db
//       .select({ count: sql<number>`count(*)` })
//       .from(unifiedPackages)
//       .leftJoin(providers, eq(unifiedPackages.providerId, providers.id))
//       .leftJoin(destinations, eq(unifiedPackages.destinationId, destinations.id))
//       .leftJoin(regions, eq(unifiedPackages.regionId, regions.id));

//     if (whereCondition) {
//       countQuery.where(whereCondition);
//     }

//     const [{ count }] = await countQuery;
//     const total = Number(count);
//     const totalPages = Math.ceil(total / limit);

//     // =========================
//     // FETCH DATA
//     // =========================
//     const packagesQuery = db
//       .select({
//         pkg: unifiedPackages,
//         provider: providers,
//         destination: destinations,
//         region: regions,
//       })
//       .from(unifiedPackages)
//       .leftJoin(providers, eq(unifiedPackages.providerId, providers.id))
//       .leftJoin(destinations, eq(unifiedPackages.destinationId, destinations.id))
//       .leftJoin(regions, eq(unifiedPackages.regionId, regions.id))
//       .orderBy(...orderBy)
//       .limit(limit)
//       .offset(offset);

//     if (whereCondition) {
//       packagesQuery.where(whereCondition);
//     }

//     const unifiedPackagesData = await packagesQuery;

//     // =========================
//     // FORMAT RESPONSE
//     // =========================
//     const formattedPackages = unifiedPackagesData.map((row) => {
//       const { pkg, provider, destination, region } = row;

//       return {
//         id: pkg.id,
//         providerId: provider?.id || null,
//         providerSlug: provider?.slug || null,
//         providerName: provider?.name || null,
//         providerPackageId: pkg.providerPackageId,
//         destinationId: destination?.id || null,
//         destinationName: destination?.name || null,
//         destinationFlag: destination?.flagEmoji || null,
//         destinationCountryCode: destination?.countryCode || null,
//         regionId: region?.id || null,
//         regionName: region?.name || null,
//         slug: pkg.slug,
//         title: pkg.title,
//         dataAmount: pkg.dataAmount,
//         validity: pkg.validity,
//         providerPrice: pkg.wholesalePrice,
//         price: pkg.retailPrice,
//         currency: "USD",
//         type: pkg.type,
//         operator: pkg.operator,
//         operatorImage: pkg.operatorImage,
//         coverage: pkg.coverage || [],
//         voiceCredits: pkg.voiceMinutes,
//         smsCredits: pkg.smsCount,
//         isBestPrice: pkg.isBestPrice,
//         isPopular: pkg.isPopular,
//         isTrending: pkg.isTrending,
//         isRecommended: pkg.isRecommended,
//         isBestValue: pkg.isBestValue,
//         isUnlimited: pkg.isUnlimited,
//         isEnabled: pkg.isEnabled,
//         manualOverride: pkg.manualOverride,
//         createdAt: pkg.createdAt,
//         updatedAt: pkg.updatedAt,
//       };
//     });

//     // =========================
//     // RESPONSE
//     // =========================
//     return ApiResponse.success(res, "Packages fetched successfully", {
//       data: formattedPackages,
//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages,
//       },
//       stats: {
//         total: Number(stats.total),
//         enabled: Number(stats.enabled),
//         bestPrice: Number(stats.bestPrice),
//         manualOverride: Number(stats.manualOverride),
//       },
//     });
//   } catch (error: any) {
//     console.error("🔥 Admin packages fetch error:", error);
//     return ApiResponse.serverError(res, error.message);
//   }
// });


router.get("/slug/:slug", async (req: Request, res: Response) => {
  try {
    const requestedCurrency = (req.query.currency as string) || "USD";
    const { userId, isReseller, priceType } = await getRequestPricingRole(req);

    const [pkg] = await db.query.unifiedPackages.findMany({
      where: (unifiedPackages, { eq, and }) => and(
        eq(unifiedPackages.slug, req.params.slug),
        eq(unifiedPackages.isEnabled, true)
      ),
      with: {
        provider: true,
        destination: true,
        region: true,
      },
      limit: 1,
    });

    if (!pkg || !pkg.provider || !pkg.provider.enabled) {
      return ApiResponse.notFound(res, "Package not found");
    }
    const disabledProviderIds = await getResellerDisabledProviderIds(isReseller ? userId : null);
    if (disabledProviderIds.includes(pkg.providerId)) {
      return ApiResponse.notFound(res, "Package not found");
    }

    const currencies = await storage.getCurrencies();
    const resellerPriceMap = await getResellerPackagePriceMap(isReseller ? userId : null, [pkg.id]);
    const resellerSellingPrice = isReseller
      ? getResellerSellingPriceForPackage(pkg.id, resellerPriceMap)
      : undefined;
    if (resellerSellingPrice === null) {
      return ApiResponse.notFound(res, "Package not found");
    }
    const retailPrice = getDisplayPackagePrice(pkg, isReseller, requestedCurrency, currencies, resellerSellingPrice);

    const formattedPackage = {
      id: pkg.id,
      slug: pkg.slug,
      title: pkg.title,
      dataAmount: pkg.dataAmount,
      validity: pkg.validity,
      type: pkg.type,
      price: retailPrice.toFixed(2),
      retailPrice: retailPrice.toFixed(2),
      publicRetailPrice: pkg.retailPrice,
      priceType,
      currency: requestedCurrency,
      isUnlimited: pkg.isUnlimited,
      isBestPrice: pkg.isBestPrice,
      providerId: pkg.providerId,
      providerName: providerDisplayNameForAccount(isReseller, pkg.provider.slug, pkg.provider.name),
      providerSlug: pkg.provider.slug,
      destinationId: pkg.destinationId,
      destination: pkg.destination,
      regionId: pkg.regionId,
      region: pkg.region,
      operator: pkg.operator,
      operatorImage: pkg.operatorImage,
      coverage: pkg.coverage,
      voiceCredits: pkg.voiceCredits,
      smsCredits: pkg.smsCredits,
      isPopular: pkg.isPopular,
      isTrending: pkg.isTrending,
      isRecommended: pkg.isRecommended,
      isBestValue: pkg.isBestValue,
      providerPackageTable: pkg.providerPackageTable,
      providerPackageId: pkg.providerPackageId,
      customImage: pkg.customImage,
      customDescription: pkg.customDescription,
    };

    return ApiResponse.success(res, "Package fetched successfully", formattedPackage);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});




router.get("/slug/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestedCurrency = (req.query.currency as string) || "USD";
    const { userId, isReseller, priceType } = await getRequestPricingRole(req);

    // =========================
    // FETCH PACKAGE
    // =========================
    const pkg = await db.query.unifiedPackages.findFirst({
      where: and(
        eq(unifiedPackages.id, id),
        eq(unifiedPackages.isEnabled, true)
      ),
      with: {
        provider: true,
        destination: true,
        region: true,
      },
    });

    if (!pkg || !pkg.provider || !pkg.provider.enabled) {
      return ApiResponse.notFound(res, "Package not found");
    }
    const disabledProviderIds = await getResellerDisabledProviderIds(isReseller ? userId : null);
    if (disabledProviderIds.includes(pkg.providerId)) {
      return ApiResponse.notFound(res, "Package not found");
    }

    // =========================
    // PRICE & CURRENCY FORMAT
    // =========================
    const currencies = await storage.getCurrencies();
    const provider = pkg.provider || null;
    const resellerPriceMap = await getResellerPackagePriceMap(isReseller ? userId : null, [pkg.id]);
    const resellerSellingPrice = isReseller
      ? getResellerSellingPriceForPackage(pkg.id, resellerPriceMap)
      : undefined;
    if (resellerSellingPrice === null) {
      return ApiResponse.notFound(res, "Package not found");
    }
    const retailPrice = getDisplayPackagePrice(pkg, isReseller, requestedCurrency, currencies, resellerSellingPrice);

    // =========================
    // FORMAT RESPONSE (SAME SHAPE)
    // =========================
    const formattedPackage = {
      id: pkg.id,
      slug: pkg.slug,
      title: pkg.title,

      dataAmount: pkg.dataAmount,
      dataMb: pkg.dataMb,

      validity: pkg.validity,
      validityDays: pkg.validityDays,

      price: retailPrice.toFixed(2),
      retailPrice: retailPrice.toFixed(2),
      publicRetailPrice: pkg.retailPrice,
      priceType,
      currency: requestedCurrency,
      type: pkg.type,

      isUnlimited: pkg.isUnlimited,
      isBestPrice: pkg.isBestPrice,
      isPopular: pkg.isPopular,
      isRecommended: pkg.isRecommended,
      isBestValue: pkg.isBestValue,
      isEnabled: pkg.isEnabled,

      providerId: pkg.providerId,
      providerName: providerDisplayNameForAccount(isReseller, provider?.slug, provider?.name),
      providerSlug: provider?.slug || "unknown",

      operator: pkg.operator,
      operatorImage: pkg.operatorImage,
      coverage: pkg.coverage,

      packageGroupKey: pkg.packageGroupKey,
      countryCode: pkg.countryCode,
      countryName: pkg.countryName,

      regionId: pkg.regionId,
      region: pkg.region,

      voiceMinutes: pkg.voiceMinutes,
      smsCount: pkg.smsCount,
    };

    return ApiResponse.success(res, "Package fetched successfully", formattedPackage);

  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

/**
 * GET /api/unified-packages/grouped
 * Get enabled packages grouped by package specification (country + data + validity)
 */
router.get("/grouped", async (req: Request, res: Response) => {
  try {
    const requestedCurrency = (req.query.currency as string) || "USD";
    const destinationSlug = req.query.destination as string | undefined;
    const { userId, isReseller, priceType } = await getRequestPricingRole(req);

    // Get currency conversion rates
    const currencies = await storage.getCurrencies();
    const fromCurrency = currencies.find(c => c.code === "USD");
    const toCurrency = currencies.find(c => c.code === requestedCurrency);

    // Get enabled providers
    const enabledProviders = await db.select().from(providers).where(eq(providers.enabled, true));
    const providerMap = new Map(enabledProviders.map(p => [p.id, p]));
    const providerSettingsMap = await getResellerProviderSettingsMap(isReseller ? userId : null);

    // Build query for enabled packages only (best-priced packages selected by auto-selector)
    let packagesQuery = db.query.unifiedPackages.findMany({
      where: (up: any, { eq: eqOp, and: andOp, isNotNull: isNotNullOp }: any) => {
        const conditions = [
          isNotNullOp(up.packageGroupKey),
          eqOp(up.isEnabled, true)
        ];

        // Filter by destination if provided
        if (destinationSlug) {
          conditions.push(eq(up.destinationId, destinationSlug));
        }

        return andOp(...conditions);
      },
      with: {
        provider: true,
        destination: true,
      },
    });

    const packages = await packagesQuery;

    // Filter by enabled providers
    const filteredPackages = packages.filter(pkg =>
      pkg.provider &&
      providerMap.has(pkg.providerId) &&
      isProviderEnabledForReseller(pkg.providerId, providerSettingsMap)
    );
    const resellerPriceMap = await getResellerPackagePriceMap(
      isReseller ? userId : null,
      filteredPackages.map((pkg) => pkg.id),
    );

    // Group packages by packageGroupKey
    const groupedPackages: Record<string, any> = {};

    for (const pkg of filteredPackages) {
      const groupKey = pkg.packageGroupKey;
      if (!groupKey) continue;

      // Calculate selling price with currency conversion
      const provider = providerMap.get(pkg.providerId);
      const resellerSellingPrice = isReseller
        ? getResellerSellingPriceForPackage(pkg.id, resellerPriceMap)
        : undefined;
      if (resellerSellingPrice === null) continue;
      const retailPrice = getDisplayPackagePrice(pkg, isReseller, requestedCurrency, currencies, resellerSellingPrice);

      const providerOption = {
        packageId: pkg.id,
        providerId: pkg.providerId,
        providerName: providerDisplayNameForAccount(isReseller, provider?.slug, provider?.name),
        providerSlug: provider?.slug || "unknown",
        retailPrice: retailPrice.toFixed(2),
        publicRetailPrice: pkg.retailPrice,
        priceType,
        isBestPrice: pkg.isBestPrice,
        isEnabled: pkg.isEnabled,
        operator: pkg.operator,
        operatorImage: pkg.operatorImage,
        slug: pkg.slug,
      };

      if (!groupedPackages[groupKey]) {
        // Initialize group with common package data
        groupedPackages[groupKey] = {
          packageGroupKey: groupKey,
          countryCode: pkg.countryCode,
          countryName: pkg.countryName,
          dataAmount: pkg.dataAmount,
          dataMb: pkg.dataMb,
          validity: pkg.validity,
          validityDays: pkg.validityDays,
          type: pkg.type,
          isUnlimited: pkg.isUnlimited,
          destinationId: pkg.destinationId,
          destination: pkg.destination,
          currency: requestedCurrency,
          providerOptions: [],
          bestPrice: retailPrice,
          bestPriceProviderId: pkg.providerId,
        };
      }

      // Add provider option to group
      groupedPackages[groupKey].providerOptions.push(providerOption);

      // Track best price
      if (retailPrice < groupedPackages[groupKey].bestPrice) {
        groupedPackages[groupKey].bestPrice = retailPrice;
        groupedPackages[groupKey].bestPriceProviderId = pkg.providerId;
      }
    }

    // Sort provider options by price and convert to array
    const result = Object.values(groupedPackages).map((group: any) => {
      group.providerOptions.sort((a: any, b: any) =>
        parseFloat(a.retailPrice) - parseFloat(b.retailPrice)
      );
      group.bestPrice = group.bestPrice.toFixed(2);
      return group;
    });

    // Sort groups by data amount then validity
    result.sort((a: any, b: any) => {
      if (a.dataMb !== b.dataMb) return (a.dataMb || 0) - (b.dataMb || 0);
      return a.validityDays - b.validityDays;
    });

    return ApiResponse.success(res, "Grouped Packages fetched successfully", {
      totalGroups: result.length,
      packages: result,
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

/**
 * GET /api/unified-packages/by-destination/:slug
 * Get enabled packages for a specific destination (auto-selected best prices)
 * 
 * This includes:
 * 1. Local packages (type: 'local') directly linked to this destination
 * 2. Regional packages (type: 'regional') that include this country in their coverage array
 */
router.get("/by-destination/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const requestedCurrency = (req.query.currency as string) || "USD";
    const { userId, isReseller, priceType } = await getRequestPricingRole(req);
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;

    // Filters
    const sort = (req.query.sort as string) || null;
    const filterUnlimited = req.query.isUnlimited === "true";
    const filterBestPrice = req.query.isBestPrice === "true";
    const filterPopular = req.query.isPopular === "true";
    const filterDataPack = req.query.dataPack === "true";

    // Get destination
    const destination = await storage.getDestinationBySlug(slug);
    if (!destination) return ApiResponse.notFound(res, "Destination not found");

    // Get enabled providers
    const enabledProviders = await db.select({ id: providers.id }).from(providers).where(eq(providers.enabled, true));
    const disabledProviderIds = await getResellerDisabledProviderIds(isReseller ? userId : null);
    const enabledProviderIds = enabledProviders
      .map(p => p.id)
      .filter((providerId) => !disabledProviderIds.includes(providerId));

    if (enabledProviderIds.length === 0) {
      return ApiResponse.success(res, "Destination Packages fetched successfully", {
        destination,
        packages: [],
        pagination: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        counts: {
          total: 0,
          local: 0,
          regional: 0,
        }
      });
    }

    // =========================
    // BUILD DB WHERE CONDITIONS
    // =========================
    const whereClauses: any[] = [
      eq(unifiedPackages.isEnabled, true),
      inArray(unifiedPackages.providerId, enabledProviderIds),

      // LOCAL or REGIONAL packages
      or(
        and(
          eq(unifiedPackages.type, "local"),
          eq(unifiedPackages.destinationId, destination.id)
        ),
        and(
          eq(unifiedPackages.type, "regional"),
          sql<boolean>`${unifiedPackages.coverage} @> ARRAY[${destination.countryCode}]`
        )
      )
    ];

    if (filterUnlimited) whereClauses.push(eq(unifiedPackages.isUnlimited, true));
    if (filterBestPrice) whereClauses.push(eq(unifiedPackages.isBestPrice, true));
    if (filterPopular) whereClauses.push(eq(unifiedPackages.isPopular, true));

    if (filterDataPack) {
      whereClauses.push(
        and(
          eq(unifiedPackages.voiceMinutes, 0),
          eq(unifiedPackages.smsCount, 0)
        )
      );
    }

    // =========================
    // ORDERING
    // =========================
    let orderBy: any = sql`NULL`;

    if (sort === "priceLowToHigh") {
      orderBy = asc(unifiedPackages.retailPrice);
    } else if (sort === "priceHighToLow") {
      orderBy = desc(unifiedPackages.retailPrice);
    } else {
      orderBy = [
        desc(unifiedPackages.isPopular),
        desc(unifiedPackages.isRecommended),
        desc(unifiedPackages.isBestValue),
        asc(unifiedPackages.type),
        asc(unifiedPackages.retailPrice),
      ];
    }

    // =========================
    // COUNT FOR PAGINATION
    // =========================
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(unifiedPackages)
      .where(and(...whereClauses));

    // =========================
    // FETCH DATA WITH PROVIDER
    // =========================
    const packages = await db.query.unifiedPackages.findMany({
      where: () => and(...whereClauses),
      with: {
        provider: true
      },
      orderBy: orderBy,
      limit,
      offset
    });



    // =========================
    // FORMAT RESPONSE
    // =========================
    const currencies = await storage.getCurrencies();
    const resellerPriceMap = await getResellerPackagePriceMap(
      isReseller ? userId : null,
      packages.map((pkg: any) => pkg.id),
    );
    const formattedPackages = packages.map((pkg: any) => {
      const provider = pkg.provider || null;
      const resellerSellingPrice = isReseller
        ? getResellerSellingPriceForPackage(pkg.id, resellerPriceMap)
        : undefined;
      if (resellerSellingPrice === null) return null;
      const retailPrice = getDisplayPackagePrice(pkg, isReseller, requestedCurrency, currencies, resellerSellingPrice);

      return {
        id: pkg.id,
        slug: pkg.slug,
        title: pkg.title,

        dataAmount: pkg.dataAmount,
        dataMb: pkg.dataMb,

        validity: pkg.validity,
        validityDays: pkg.validityDays,
        price: retailPrice.toFixed(2),
        retailPrice: retailPrice.toFixed(2),
        publicRetailPrice: pkg.retailPrice,
        priceType,
        currency: requestedCurrency,
        type: pkg.type,

        isUnlimited: pkg.isUnlimited,
        isBestPrice: pkg.isBestPrice,
        isPopular: pkg.isPopular,
        isRecommended: pkg.isRecommended,
        isBestValue: pkg.isBestValue,
        isEnabled: pkg.isEnabled,

        providerId: pkg.providerId,
        providerName: providerDisplayNameForAccount(isReseller, provider?.slug, provider?.name),
        providerSlug: provider?.slug || "unknown",

        operator: pkg.operator,
        operatorImage: pkg.operatorImage,
        coverage: pkg.coverage,

        packageGroupKey: pkg.packageGroupKey,
        countryCode: pkg.countryCode,
        countryName: pkg.countryName,

        regionId: pkg.regionId,
        region: pkg.region,

        voiceMinutes: pkg.voiceMinutes,
        smsCount: pkg.smsCount,
      };
    }).filter(Boolean);

    return ApiResponse.success(res, "Destination Packages fetched successfully", {
      destination,
      packages: formattedPackages,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        hasNextPage: offset + limit < count,
        hasPrevPage: page > 1,
      },
      counts: {
        total: count,
        local: packages.filter(p => p.type === "local").length,
        regional: packages.filter(p => p.type === "regional").length,
      }
    });

  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});







/**
 * GET /api/unified-packages/by-region/:slug
 * Get enabled packages for a specific region (auto-selected best prices)
 */
router.get("/by-region/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const requestedCurrency = req.query.currency as string || "USD";
    const { userId, isReseller, priceType } = await getRequestPricingRole(req);

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;

    // Filters
    const sort = (req.query.sort as string) || null;
    const filterUnlimited = req.query.isUnlimited === "true";
    const filterBestPrice = req.query.isBestPrice === "true";
    const filterPopular = req.query.isPopular === "true";
    const filterDataPack = req.query.dataPack === "true";

    // Get region
    const region = await storage.getRegionBySlug(slug);
    if (!region) return ApiResponse.notFound(res, "Region not found");

    // Get enabled providers
    const enabledProviders = await db.select({ id: providers.id }).from(providers).where(eq(providers.enabled, true));
    const disabledProviderIds = await getResellerDisabledProviderIds(isReseller ? userId : null);
    const enabledProviderIds = enabledProviders
      .map(p => p.id)
      .filter((providerId) => !disabledProviderIds.includes(providerId));

    if (enabledProviderIds.length === 0) {
      return ApiResponse.success(res, "Region Packages fetched successfully", {
        region,
        packages: [],
        pagination: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        counts: {
          total: 0,
          regional: 0,
        }
      });
    }

    // ======================================
    // WHERE CONDITIONS
    // ======================================
    const whereClauses: any[] = [
      eq(unifiedPackages.isEnabled, true),
      eq(unifiedPackages.regionId, region.id),
      inArray(unifiedPackages.providerId, enabledProviderIds),
    ];

    if (filterUnlimited) whereClauses.push(eq(unifiedPackages.isUnlimited, true));
    if (filterBestPrice) whereClauses.push(eq(unifiedPackages.isBestPrice, true));
    if (filterPopular) whereClauses.push(eq(unifiedPackages.isPopular, true));

    if (filterDataPack) {
      whereClauses.push(
        and(
          eq(unifiedPackages.voiceMinutes, 0),
          eq(unifiedPackages.smsCount, 0)
        )
      );
    }

    // ======================================
    // ORDERING
    // ======================================
    let orderBy: any = sql`NULL`;

    if (sort === "priceLowToHigh") {
      orderBy = asc(unifiedPackages.retailPrice);
    } else if (sort === "priceHighToLow") {
      orderBy = desc(unifiedPackages.retailPrice);
    } else {
      orderBy = [
        desc(unifiedPackages.isPopular),
        desc(unifiedPackages.isRecommended),
        desc(unifiedPackages.isBestValue),
        asc(unifiedPackages.retailPrice),
      ];
    }

    // ======================================
    // COUNT (for pagination)
    // ======================================
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(unifiedPackages)
      .where(and(...whereClauses));

    // ======================================
    // FETCH WITH PROVIDER + REGION
    // ======================================
    const packages = await db.query.unifiedPackages.findMany({
      where: () => and(...whereClauses),
      with: {
        provider: true,
        region: true,
      },
      orderBy,
      limit,
      offset,
    });

    // ======================================
    // FORMAT RESPONSE
    // ======================================
    const currencies = await storage.getCurrencies();
    const resellerPriceMap = await getResellerPackagePriceMap(
      isReseller ? userId : null,
      packages.map((pkg: any) => pkg.id),
    );
    const formattedPackages = packages.map((pkg: any) => {
      const provider = pkg.provider || null;
      const resellerSellingPrice = isReseller
        ? getResellerSellingPriceForPackage(pkg.id, resellerPriceMap)
        : undefined;
      if (resellerSellingPrice === null) return null;
      const retailPrice = getDisplayPackagePrice(pkg, isReseller, requestedCurrency, currencies, resellerSellingPrice);

      return {
        id: pkg.id,
        slug: pkg.slug,
        title: pkg.title,

        dataAmount: pkg.dataAmount,
        dataMb: pkg.dataMb,

        validity: pkg.validity,
        validityDays: pkg.validityDays,

        price: retailPrice.toFixed(2),
        retailPrice: retailPrice.toFixed(2),
        publicRetailPrice: pkg.retailPrice,
        priceType,
        currency: requestedCurrency,

        type: pkg.type,

        isUnlimited: pkg.isUnlimited,
        isBestPrice: pkg.isBestPrice,
        isPopular: pkg.isPopular,
        isRecommended: pkg.isRecommended,
        isBestValue: pkg.isBestValue,
        isEnabled: pkg.isEnabled,

        providerId: pkg.providerId,
        providerName: providerDisplayNameForAccount(isReseller, provider?.slug, provider?.name),
        providerSlug: provider?.slug || "unknown",

        operator: pkg.operator,
        operatorImage: pkg.operatorImage,
        coverage: pkg.coverage,

        packageGroupKey: pkg.packageGroupKey,

        countryCode: pkg.countryCode,
        countryName: pkg.countryName,

        regionId: pkg.regionId,
        region: pkg.region,

        voiceMinutes: pkg.voiceMinutes,
        smsCount: pkg.smsCount,
      };
    }).filter(Boolean);

    return ApiResponse.success(res, "Region Packages fetched successfully", {
      region,
      packages: formattedPackages,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        hasNextPage: offset + limit < count,
        hasPrevPage: page > 1,
      },
      counts: {
        total: count,
        regional: formattedPackages.length,
      }
    });

  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});




/**
 * GET /api/unified-packages/:id
 * Get a single package by its ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestedCurrency = (req.query.currency as string) || "USD";
    const { userId, isReseller, priceType } = await getRequestPricingRole(req);

    // =========================
    // FETCH PACKAGE
    // =========================
    const pkg = await db.query.unifiedPackages.findFirst({
      where: and(
        eq(unifiedPackages.id, id),
        eq(unifiedPackages.isEnabled, true)
      ),
      with: {
        provider: true,
        destination: true,
        region: true,
      },
    });

    if (!pkg || !pkg.provider || !pkg.provider.enabled) {
      return ApiResponse.notFound(res, "Package not found");
    }

    // =========================
    // PRICE & CURRENCY FORMAT
    // =========================
    const currencies = await storage.getCurrencies();
    const provider = pkg.provider || null;
    const resellerPriceMap = await getResellerPackagePriceMap(isReseller ? userId : null, [pkg.id]);
    const resellerSellingPrice = isReseller
      ? getResellerSellingPriceForPackage(pkg.id, resellerPriceMap)
      : undefined;
    if (resellerSellingPrice === null) {
      return ApiResponse.notFound(res, "Package not found");
    }

    const retailPrice = getDisplayPackagePrice(pkg, isReseller, requestedCurrency, currencies, resellerSellingPrice);

    // =========================
    // FORMAT RESPONSE
    // =========================
    const formattedPackage = {
      id: pkg.id,
      slug: pkg.slug,
      title: pkg.title,

      dataAmount: pkg.dataAmount,
      dataMb: pkg.dataMb,

      validity: pkg.validity,
      validityDays: pkg.validityDays,

      price: retailPrice.toFixed(2),
      retailPrice: retailPrice.toFixed(2),
      publicRetailPrice: pkg.retailPrice,
      priceType,
      currency: requestedCurrency,
      type: pkg.type,

      isUnlimited: pkg.isUnlimited,
      isBestPrice: pkg.isBestPrice,
      isPopular: pkg.isPopular,
      isRecommended: pkg.isRecommended,
      isBestValue: pkg.isBestValue,
      isEnabled: pkg.isEnabled,

      providerId: pkg.providerId,
        providerName: providerDisplayNameForAccount(isReseller, provider?.slug, provider?.name),
      providerSlug: provider?.slug || "unknown",

      operator: pkg.operator,
      operatorImage: pkg.operatorImage,
      coverage: pkg.coverage,

      packageGroupKey: pkg.packageGroupKey,
      countryCode: pkg.countryCode,
      countryName: pkg.countryName,

      regionId: pkg.regionId,
      region: pkg.region,

      voiceMinutes: pkg.voiceMinutes,
      smsCount: pkg.smsCount,
    };

    return ApiResponse.success(res, "Package fetched successfully", formattedPackage);

  } catch (error: any) {
    console.error("Error fetching package by ID:", error);
    return ApiResponse.serverError(res, error.message);
  }
});


export default router;

