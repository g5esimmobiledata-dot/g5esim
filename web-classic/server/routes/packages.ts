"use strict";

import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { asyncHandler } from "../lib/asyncHandler";
import { NotFoundError } from "../lib/errors";
import { db } from "../db";
import { orders, providers, unifiedPackages, reviews, users, insertReviewSchema, referralProgram, referrals, referralSettings, insertReferralProgramSchema, insertReferralSchema, insertReferralSettingsSchema, blogPosts, regions, resellerPackagePrices } from "@shared/schema";
import { eq, and, desc, sql, inArray, notInArray } from "drizzle-orm";
import * as ApiResponse from "../utils/response";
import { getPackageBasePriceUsd, getRequestPricingRole, getResellerDisabledProviderIds } from "../helpers/packagePricing";

const router = Router();

type ResellerPriceRow = typeof resellerPackagePrices.$inferSelect;

function publicAiraloPackage(pkg: any) {
  const { airaloPrice, ...safePackage } = pkg;
  return safePackage;
}

function parseMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

async function getResellerPriceMap(
  isReseller: boolean,
  userId: string | null,
  packageIds: string[],
): Promise<Map<string, ResellerPriceRow>> {
  if (!isReseller || !userId || packageIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select()
    .from(resellerPackagePrices)
    .where(and(
      eq(resellerPackagePrices.resellerId, userId),
      inArray(resellerPackagePrices.packageId, packageIds),
    ));

  return new Map(rows.map((row) => [row.packageId, row]));
}

function getHomepagePackagePrice(
  pkg: { id: string; resellerPrice?: unknown; retailPrice?: unknown; wholesalePrice?: unknown },
  isReseller: boolean,
  resellerPriceMap: Map<string, ResellerPriceRow>,
): string | null {
  const resellerPrice = resellerPriceMap.get(pkg.id);
  if (isReseller) {
    if (resellerPrice?.isEnabled === false) return null;
    const customSellingPrice = parseMoney(resellerPrice?.sellingPrice);
    if (customSellingPrice !== null) return customSellingPrice.toFixed(2);
  }

  return getPackageBasePriceUsd(pkg as any, isReseller).toFixed(2);
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const packages = await storage.getAllPackages();

    const marginSetting = await storage.getSettingByKey("pricing_margin");
    const marginPercent = marginSetting ? parseFloat(marginSetting.value) : 0;

    const packagesWithDestinations = await Promise.all(
      packages.map(async (pkg) => {
        const airaloPrice = pkg.airaloPrice ? parseFloat(pkg.airaloPrice) : parseFloat(pkg.price);
        const customerPrice = airaloPrice * (1 + marginPercent / 100);
        const safePackage = publicAiraloPackage(pkg);

        const packageWithPrice = {
          ...safePackage,
          price: customerPrice.toFixed(2),
        };

        if (pkg.destinationId) {
          const destination = await storage.getDestinationById(pkg.destinationId);
          return { ...packageWithPrice, destination };
        }
        return packageWithPrice;
      })
    );

    return ApiResponse.success(res, "Packages fetched successfully", packagesWithDestinations);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.get("/featured", async (req: Request, res: Response) => {
  try {
    const packages = await storage.getFeaturedPackages();
    const { userId, isReseller, priceType } = await getRequestPricingRole(req);
    const disabledProviderIds = await getResellerDisabledProviderIds(isReseller ? userId : null);
    const resellerPriceMap = await getResellerPriceMap(
      isReseller,
      userId,
      packages.map((pkg) => pkg.id),
    );

    const packagesWithDestinations = await Promise.all(
      packages.map(async (pkg) => {
        if (disabledProviderIds.includes(pkg.providerId)) return null;
        let destination = null;
        let region = null;
        if (pkg.destinationId) {
          destination = await storage.getDestinationById(pkg.destinationId);
        }
        if (pkg.regionId) {
          region = await storage.getRegionById(pkg.regionId);
        }
        const sellingPrice = getHomepagePackagePrice(pkg, isReseller, resellerPriceMap);
        if (!sellingPrice) return null;
        return {
          id: pkg.id,
          title: pkg.title,
          slug: pkg.slug,
          dataAmount: pkg.dataAmount,
          validity: pkg.validityDays || pkg.validity,
          retailPrice: sellingPrice,
          price: sellingPrice,
          publicRetailPrice: pkg.retailPrice,
          priceType,
          currency: pkg.currency || 'USD',
          destinationId: pkg.destinationId,
          regionId: pkg.regionId,
          destination: destination
            ? {
              id: destination.id,
              name: destination.name,
              countryCode: destination.countryCode,
              slug: destination.slug,
            }
            : null,
          region: region
            ? {
              id: region.id,
              name: region.name,
              slug: region.slug,
            }
            : null,
        };
      }),
    );

    ApiResponse.success(res, 'Packages retrieved successfully', packagesWithDestinations.filter(Boolean));
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/complete", async (req: Request, res: Response) => {
  try {
    const { userId, isReseller, priceType } = await getRequestPricingRole(req);
    const disabledProviderIds = await getResellerDisabledProviderIds(isReseller ? userId : null);
    const whereClauses: any[] = [
      eq(unifiedPackages.isEnabled, true),
      sql`${unifiedPackages.voiceMinutes} > 0`,
      sql`${unifiedPackages.smsCount} > 0`,
      sql`${unifiedPackages.dataMb} > 0`,
    ];
    if (disabledProviderIds.length > 0) {
      whereClauses.push(notInArray(unifiedPackages.providerId, disabledProviderIds));
    }
    // Get packages that have all 3 features: Data, Voice, and SMS
    const completePackages = await db.query.unifiedPackages.findMany({
      where: and(...whereClauses),
      orderBy: [desc(unifiedPackages.salesCount)],
      limit: 8,
    });
    const resellerPriceMap = await getResellerPriceMap(
      isReseller,
      userId,
      completePackages.map((pkg) => pkg.id),
    );

    const packagesWithDestinations = await Promise.all(
      completePackages.map(async (pkg) => {
        let destination = null;
        if (pkg.destinationId) {
          destination = await storage.getDestinationById(pkg.destinationId);
        }
        const sellingPrice = getHomepagePackagePrice(pkg, isReseller, resellerPriceMap);
        if (!sellingPrice) return null;
        return {
          id: pkg.id,
          title: pkg.title,
          slug: pkg.slug,
          dataAmount: pkg.dataAmount,
          validity: pkg.validity,
          retailPrice: sellingPrice,
          price: sellingPrice,
          publicRetailPrice: pkg.retailPrice,
          priceType,
          voiceMinutes: pkg.voiceMinutes,
          smsCount: pkg.smsCount,
          destinationId: pkg.destinationId,
          regionId: pkg.regionId,
          destination,
        };
      })
    );

    return ApiResponse.success(res, "Complete Packages fetched successfully", packagesWithDestinations.filter(Boolean));
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.get("/global-old", async (req: Request, res: Response) => {
  try {
    const { userId, isReseller, priceType } = await getRequestPricingRole(req);
    const disabledProviderIds = await getResellerDisabledProviderIds(isReseller ? userId : null);
    const globalRegion = await db.query.regions.findFirst({
      where: sql`LOWER(name) = 'global'`,
    });

    if (!globalRegion) {
      return ApiResponse.success(res, "Global Packages fetched successfully", []);
    }

    const whereClauses: any[] = [
        eq(unifiedPackages.regionId, globalRegion.id),
        eq(unifiedPackages.isEnabled, true)
    ];
    if (disabledProviderIds.length > 0) {
      whereClauses.push(notInArray(unifiedPackages.providerId, disabledProviderIds));
    }

    const globalPackages = await db.query.unifiedPackages.findMany({
      where: and(...whereClauses),
      limit: 12,
      orderBy: [desc(unifiedPackages.salesCount)],
    });

    const formattedPackages = globalPackages.map(pkg => {
      const sellingPrice = getPackageBasePriceUsd(pkg, isReseller).toFixed(2);
      return ({
      id: pkg.id,
      title: pkg.title,
      dataAmount: pkg.dataAmount,
      validity: pkg.validity,
      retailPrice: sellingPrice,
      price: sellingPrice,
      publicRetailPrice: pkg.retailPrice,
      priceType,
      slug: pkg.slug,
    });
    });

    return ApiResponse.success(res, "Global Packages fetched successfully", formattedPackages);
  } catch (error: any) {
    console.error("Error fetching global packages:", error);
    return ApiResponse.serverError(res, error.message);
  }
});




router.get("/global", async (req: Request, res: Response) => {
  try {
    const { userId, isReseller, priceType } = await getRequestPricingRole(req);
    const disabledProviderIds = await getResellerDisabledProviderIds(isReseller ? userId : null);

    const globalRegion = await db.query.regions.findFirst({
      where: sql`LOWER(${regions.slug}) IN ('global', 'world') OR LOWER(${regions.name}) = 'global'`
    });
    const whereClauses: any[] = [
      eq(unifiedPackages.isEnabled, true),
      globalRegion
        ? eq(unifiedPackages.regionId, globalRegion.id)
        : sql`LOWER(${unifiedPackages.type}) = 'global'`,
    ];
    if (disabledProviderIds.length > 0) {
      whereClauses.push(notInArray(unifiedPackages.providerId, disabledProviderIds));
    }

    const globalPackages = await db.query.unifiedPackages.findMany({
      where: and(...whereClauses),
      limit: 12,
      orderBy: [desc(unifiedPackages.salesCount), sql`CAST(${unifiedPackages.retailPrice} AS DECIMAL) ASC`],
    });
    const resellerPriceMap = await getResellerPriceMap(
      isReseller,
      userId,
      globalPackages.map((pkg) => pkg.id),
    );

    const formattedPackages = globalPackages.map(pkg => {
      const sellingPrice = getHomepagePackagePrice(pkg, isReseller, resellerPriceMap);
      if (!sellingPrice) return null;
      return ({
      id: pkg.id,
      title: pkg.title,
      dataAmount: pkg.dataAmount,
      validity: pkg.validity,
      retailPrice: sellingPrice,
      price: sellingPrice,
      publicRetailPrice: pkg.retailPrice,
      priceType,
      slug: pkg.slug,
    });
    });

    return ApiResponse.success(
      res,
      "Global Packages fetched successfully",
      formattedPackages.filter(Boolean)
    );

  } catch (error: any) {
    console.error("Error fetching global packages:", error);
    return ApiResponse.serverError(res, error.message);
  }
});

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const packagesResult = await db.execute(sql`SELECT COUNT(*) as count FROM unified_packages WHERE is_enabled = true`);
    const destinationsResult = await db.execute(sql`SELECT COUNT(*) as count FROM destinations WHERE active = true`);

    const totalPackages = Number(packagesResult.rows[0]?.count) || 0;
    const totalDestinations = Number(destinationsResult.rows[0]?.count) || 0;

    return ApiResponse.success(res, "Package stats fetched successfully", {
      totalPackages,
      totalDestinations,
    });
  } catch (error: any) {
    console.error("Error fetching package stats:", error);
    return ApiResponse.serverError(res, error.message);
  }
});

router.get("/slug/:slug", async (req: Request, res: Response) => {
  try {
    const pkg = await storage.getPackageBySlug(req.params.slug);
    if (!pkg) {
      return ApiResponse.notFound(res, "Package not found");
    }

    let destination;
    if (pkg.destinationId) {
      destination = await storage.getDestinationById(pkg.destinationId);
    }

    return ApiResponse.success(res, "Package fetched successfully", { ...publicAiraloPackage(pkg), destination });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const pkg = await storage.getPackageById(req.params.id);
    if (!pkg) {
      return ApiResponse.notFound(res, "Package not found");
    }

    let destination;
    if (pkg.destinationId) {
      destination = await storage.getDestinationById(pkg.destinationId);
    }

    return ApiResponse.success(res, "Package fetched successfully", { ...publicAiraloPackage(pkg), destination });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.get("/:packageId/reviews", async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;
    const { rating, page = "1" } = req.query;
    const limit = 20;
    const offset = (parseInt(page as string) - 1) * limit;

    let whereConditions: any[] = [
      eq(reviews.packageId, packageId),
      eq(reviews.isApproved, true),
    ];

    if (rating) {
      whereConditions.push(eq(reviews.rating, parseInt(rating as string)));
    }

    const reviewsData = await db.query.reviews.findMany({
      where: and(...whereConditions),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      limit,
      offset,
      orderBy: [desc(reviews.createdAt)],
    });

    const total = await db.select({ count: sql<number>`count(*)` })
      .from(reviews)
      .where(and(...whereConditions));

    return ApiResponse.successWithPagination(
      res,
      "Reviews fetched successfully",
      { reviews: reviewsData },
      {
        page: parseInt(page as string),
        limit,
        total: total[0]?.count || 0,
      }
    );
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.get("/:packageId/review-stats", async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;

    const stats = await db.select({
      rating: reviews.rating,
      count: sql<number>`count(*)`,
    })
      .from(reviews)
      .where(and(
        eq(reviews.packageId, packageId),
        eq(reviews.isApproved, true)
      ))
      .groupBy(reviews.rating);

    const total = stats.reduce((acc, s) => acc + s.count, 0);
    const average = total > 0
      ? stats.reduce((acc, s) => acc + (s.rating * s.count), 0) / total
      : 0;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    stats.forEach(s => {
      distribution[s.rating] = s.count;
    });

    return ApiResponse.success(res, "Review stats fetched successfully", {
      average: Math.round(average * 10) / 10,
      total,
      distribution,
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

export default router;
