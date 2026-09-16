"use strict";

import { Router, type Request, type Response } from "express";
import { and, asc, desc, eq, ilike, inArray, notInArray, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { requireAdmin } from "../../lib/middleware";
import {
  destinations,
  providers,
  regions,
  resellerPackagePrices,
  unifiedPackages,
} from "@shared/schema";
import * as ApiResponse from "../../utils/response";

const router = Router();

const REMOVED_PROVIDER_SLUGS = ["data-plans", "telna"];

type PackageRow = {
  pkg: typeof unifiedPackages.$inferSelect;
  provider: typeof providers.$inferSelect;
  destination: typeof destinations.$inferSelect | null;
  region: typeof regions.$inferSelect | null;
};

type ResellerStats = {
  count: number;
  min: string | null;
  max: string | null;
};

router.use(requireAdmin);

function parsePositiveInt(value: unknown, fallback: number, max = 10000) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function parseBooleanParam(value: unknown): boolean | null {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return null;
}

function normalizeMoney(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed.toFixed(2);
}

function normalizeCoverage(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return undefined;
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function isLegacyPackagesRoute(req: Request) {
  return req.baseUrl.endsWith("/packages");
}

function isLegacyArrayRequest(req: Request) {
  if (!isLegacyPackagesRoute(req)) return false;
  return Object.keys(req.query).length === 0;
}

function isAvailablePackagesRequest(req: Request) {
  return isLegacyPackagesRoute(req) && !isLegacyArrayRequest(req);
}

function buildListWhere(req: Request) {
  const whereClauses: any[] = [
    notInArray(providers.slug, REMOVED_PROVIDER_SLUGS),
  ];

  if (isAvailablePackagesRequest(req)) {
    whereClauses.push(eq(unifiedPackages.isEnabled, true));
    whereClauses.push(eq(providers.enabled, true));
  }

  const search = String(req.query.search || "").trim();
  if (search) {
    const pattern = `%${search}%`;
    whereClauses.push(or(
      eq(unifiedPackages.id, search),
      ilike(unifiedPackages.title, pattern),
      ilike(unifiedPackages.slug, pattern),
      ilike(unifiedPackages.providerPackageId, pattern),
      ilike(unifiedPackages.dataAmount, pattern),
      ilike(unifiedPackages.operator, pattern),
      ilike(unifiedPackages.countryName, pattern),
      ilike(destinations.name, pattern),
      ilike(destinations.countryCode, pattern),
      ilike(regions.name, pattern),
      ilike(providers.name, pattern),
      ilike(providers.slug, pattern),
    ));
  }

  const providerSlug = typeof req.query.provider === "string" ? req.query.provider : undefined;
  if (providerSlug && providerSlug !== "all") {
    whereClauses.push(eq(providers.slug, providerSlug));
  }

  const providerId = typeof req.query.providerId === "string" ? req.query.providerId : undefined;
  if (providerId && providerId !== "all") {
    whereClauses.push(eq(unifiedPackages.providerId, providerId));
  }

  const destinationId =
    typeof req.query.destinationId === "string"
      ? req.query.destinationId
      : typeof req.query.destination === "string"
        ? req.query.destination
        : undefined;
  if (destinationId && destinationId !== "all") {
    whereClauses.push(eq(unifiedPackages.destinationId, destinationId));
  }

  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  if (type && type !== "all") {
    whereClauses.push(eq(unifiedPackages.type, type));
  }

  const isBestPrice = parseBooleanParam(req.query.isBestPrice);
  if (isBestPrice !== null) whereClauses.push(eq(unifiedPackages.isBestPrice, isBestPrice));

  if (parseBooleanParam(req.query.isUnlimited)) whereClauses.push(eq(unifiedPackages.isUnlimited, true));
  if (parseBooleanParam(req.query.isPopular)) whereClauses.push(eq(unifiedPackages.isPopular, true));

  if (parseBooleanParam(req.query.dataPack)) {
    whereClauses.push(and(eq(unifiedPackages.voiceMinutes, 0), eq(unifiedPackages.smsCount, 0)));
  }
  if (parseBooleanParam(req.query.voicePack)) {
    whereClauses.push(and(eq(unifiedPackages.dataMb, 0), eq(unifiedPackages.smsCount, 0)));
  }
  if (parseBooleanParam(req.query.smsPack)) {
    whereClauses.push(and(eq(unifiedPackages.voiceMinutes, 0), eq(unifiedPackages.dataMb, 0)));
  }
  if (parseBooleanParam(req.query.voiceAndDataPack)) {
    whereClauses.push(eq(unifiedPackages.smsCount, 0));
  }
  if (parseBooleanParam(req.query.voiceAndSmsPack)) {
    whereClauses.push(eq(unifiedPackages.dataMb, 0));
  }
  if (parseBooleanParam(req.query.dataAndSmsPack)) {
    whereClauses.push(eq(unifiedPackages.voiceMinutes, 0));
  }
  if (parseBooleanParam(req.query.voiceAndDataAndSmsPack)) {
    whereClauses.push(sql`${unifiedPackages.voiceMinutes} <> 0`);
    whereClauses.push(sql`${unifiedPackages.dataMb} <> 0`);
    whereClauses.push(sql`${unifiedPackages.smsCount} <> 0`);
  }

  const airhubPlanFilters: any[] = [];
  if (parseBooleanParam(req.query.airhubPremiumPlan)) {
    airhubPlanFilters.push(or(
      ilike(unifiedPackages.title, "%premium%"),
      ilike(unifiedPackages.slug, "%premium%"),
    ));
  }
  if (parseBooleanParam(req.query.airhubStandardPlan)) {
    airhubPlanFilters.push(or(
      ilike(unifiedPackages.title, "%standard%"),
      ilike(unifiedPackages.slug, "%standard%"),
    ));
  }
  if (parseBooleanParam(req.query.airhubLifetimePlan)) {
    airhubPlanFilters.push(or(
      ilike(unifiedPackages.title, "%lifetime%"),
      ilike(unifiedPackages.slug, "%lifetime%"),
    ));
  }
  if (airhubPlanFilters.length > 0) {
    whereClauses.push(eq(providers.slug, "airhub"));
    whereClauses.push(or(...airhubPlanFilters));
  }

  return and(...whereClauses);
}

function buildOrderBy(req: Request) {
  const sort = typeof req.query.sort === "string" ? req.query.sort : "default";
  if (sort === "priceLowToHigh") return [asc(unifiedPackages.retailPrice), asc(unifiedPackages.title)];
  if (sort === "priceHighToLow") return [desc(unifiedPackages.retailPrice), asc(unifiedPackages.title)];

  return [
    desc(unifiedPackages.isEnabled),
    desc(unifiedPackages.isPopular),
    desc(unifiedPackages.isBestValue),
    asc(providers.name),
    asc(unifiedPackages.countryName),
    asc(unifiedPackages.dataMb),
    asc(unifiedPackages.retailPrice),
  ];
}

async function getResellerStats(packageIds: string[]) {
  if (packageIds.length === 0) return new Map<string, ResellerStats>();

  const rows = await db
    .select({
      packageId: resellerPackagePrices.packageId,
      count: sql<number>`count(*)::int`,
      min: sql<string | null>`min(${resellerPackagePrices.sellingPrice})`,
      max: sql<string | null>`max(${resellerPackagePrices.sellingPrice})`,
    })
    .from(resellerPackagePrices)
    .where(inArray(resellerPackagePrices.packageId, packageIds))
    .groupBy(resellerPackagePrices.packageId);

  return new Map(rows.map((row) => [
    row.packageId,
    { count: Number(row.count) || 0, min: row.min, max: row.max },
  ]));
}

function formatPackage(row: PackageRow, resellerStats: Map<string, ResellerStats>) {
  const { pkg, provider, destination, region } = row;
  const stats = resellerStats.get(pkg.id);
  const destinationCode = destination?.countryCode || pkg.countryCode || null;

  return {
    ...pkg,
    active: pkg.isEnabled,
    airaloId: pkg.providerPackageId,
    airaloPrice: pkg.wholesalePrice,
    externalProviderPackageId: pkg.providerPackageId,
    providerCost: pkg.wholesalePrice,
    providerPrice: pkg.wholesalePrice,
    price: pkg.retailPrice,
    providerSlug: provider.slug,
    providerName: provider.name,
    provider: {
      id: provider.id,
      name: provider.name,
      slug: provider.slug,
    },
    destinationName: destination?.name || pkg.countryName || null,
    destinationFlag: destination?.flagEmoji || null,
    destinationCountryCode: destinationCode,
    destination: destination
      ? {
        id: destination.id,
        name: destination.name,
        slug: destination.slug,
        countryCode: destination.countryCode,
        flagEmoji: destination.flagEmoji,
        image: destination.image,
      }
      : null,
    regionName: region?.name || null,
    region: region
      ? {
        id: region.id,
        name: region.name,
        slug: region.slug,
      }
      : null,
    resellerSellingCount: stats?.count || 0,
    resellerSellingMin: stats?.min || null,
    resellerSellingMax: stats?.max || null,
  };
}

async function fetchPackageRows(req: Request, usePagination: boolean) {
  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, isLegacyArrayRequest(req) ? 10000 : 50);
  const offset = (page - 1) * limit;
  const whereCondition = buildListWhere(req);
  const orderBy = buildOrderBy(req);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(unifiedPackages)
    .innerJoin(providers, eq(unifiedPackages.providerId, providers.id))
    .leftJoin(destinations, eq(unifiedPackages.destinationId, destinations.id))
    .leftJoin(regions, eq(unifiedPackages.regionId, regions.id))
    .where(whereCondition);

  let query = db
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
    .orderBy(...orderBy);

  if (usePagination) {
    query = query.limit(limit).offset(offset) as typeof query;
  } else {
    query = query.limit(limit) as typeof query;
  }

  const rows = await query;
  const resellerStats = await getResellerStats(rows.map((row) => row.pkg.id));
  const data = rows.map((row) => formatPackage(row, resellerStats));
  const total = Number(count) || 0;

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getStats() {
  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      enabled: sql<number>`count(*) filter (where ${unifiedPackages.isEnabled} = true)::int`,
      global: sql<number>`count(*) filter (where ${unifiedPackages.type} = 'global')::int`,
      bestPrice: sql<number>`count(*) filter (where ${unifiedPackages.isBestPrice} = true)::int`,
      manualOverride: sql<number>`count(*) filter (where ${unifiedPackages.manualOverride} = true)::int`,
    })
    .from(unifiedPackages)
    .innerJoin(providers, eq(unifiedPackages.providerId, providers.id))
    .where(notInArray(providers.slug, REMOVED_PROVIDER_SLUGS));

  return {
    total: Number(stats?.total) || 0,
    enabled: Number(stats?.enabled) || 0,
    global: Number(stats?.global) || 0,
    bestPrice: Number(stats?.bestPrice) || 0,
    manualOverride: Number(stats?.manualOverride) || 0,
  };
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const legacyArray = isLegacyArrayRequest(req);
    const result = await fetchPackageRows(req, !legacyArray);

    if (legacyArray) {
      return res.json(result.data);
    }

    return res.json({
      data: result.data,
      pagination: result.pagination,
      stats: await getStats(),
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.get("/export", async (req: Request, res: Response) => {
  try {
    const result = await fetchPackageRows(
      { ...req, query: { ...req.query, limit: "10000" } } as Request,
      false,
    );
    const headers = [
      "id",
      "provider",
      "providerPackageId",
      "title",
      "country",
      "region",
      "type",
      "dataAmount",
      "validity",
      "providerCost",
      "retailPrice",
      "resellerPrice",
      "currency",
      "enabled",
    ];

    const rows = result.data.map((pkg) => [
      pkg.id,
      pkg.providerName,
      pkg.providerPackageId,
      pkg.title,
      pkg.destinationName || pkg.countryName || "",
      pkg.regionName || "",
      pkg.type,
      pkg.dataAmount,
      pkg.validity,
      pkg.providerCost,
      pkg.retailPrice,
      pkg.resellerPrice || "",
      pkg.currency,
      pkg.isEnabled,
    ]);

    const csv = [
      headers.map(csvCell).join(","),
      ...rows.map((row) => row.map(csvCell).join(",")),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="unified-packages-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(csv);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.post("/bulk-pricing", async (req: Request, res: Response) => {
  try {
    const retailMarkup = req.body.retailMarkupPercent === undefined || req.body.retailMarkupPercent === ""
      ? null
      : Number(req.body.retailMarkupPercent);
    const resellerMarkup = req.body.resellerMarkupPercent === undefined || req.body.resellerMarkupPercent === ""
      ? null
      : Number(req.body.resellerMarkupPercent);
    const resellerSellingMarkup = req.body.resellerSellingMarkupPercent === undefined || req.body.resellerSellingMarkupPercent === ""
      ? null
      : Number(req.body.resellerSellingMarkupPercent);

    for (const value of [retailMarkup, resellerMarkup, resellerSellingMarkup]) {
      if (value !== null && (!Number.isFinite(value) || value < 0)) {
        return ApiResponse.badRequest(res, "Markup values must be positive numbers");
      }
    }

    const rows = await db
      .select({ id: unifiedPackages.id, wholesalePrice: unifiedPackages.wholesalePrice })
      .from(unifiedPackages)
      .innerJoin(providers, eq(unifiedPackages.providerId, providers.id))
      .where(notInArray(providers.slug, REMOVED_PROVIDER_SLUGS));

    let updated = 0;
    for (const row of rows) {
      const wholesale = Number(row.wholesalePrice);
      if (!Number.isFinite(wholesale)) continue;

      const updateData: Partial<typeof unifiedPackages.$inferInsert> = { updatedAt: new Date() };
      if (retailMarkup !== null) {
        updateData.retailPrice = (wholesale * (1 + retailMarkup / 100)).toFixed(2);
      }
      if (resellerMarkup !== null) {
        updateData.resellerPrice = (wholesale * (1 + resellerMarkup / 100)).toFixed(2);
      }

      if (Object.keys(updateData).length > 1) {
        await db.update(unifiedPackages).set(updateData).where(eq(unifiedPackages.id, row.id));
        updated++;
      }
    }

    let resellerSellingUpdated = 0;
    if (resellerSellingMarkup !== null) {
      const packageRows = await db
        .select({
          id: unifiedPackages.id,
          wholesalePrice: unifiedPackages.wholesalePrice,
          retailPrice: unifiedPackages.retailPrice,
          resellerPrice: unifiedPackages.resellerPrice,
        })
        .from(unifiedPackages)
        .innerJoin(providers, eq(unifiedPackages.providerId, providers.id))
        .where(notInArray(providers.slug, REMOVED_PROVIDER_SLUGS));

      for (const pkg of packageRows) {
        const base = Number(pkg.resellerPrice || pkg.retailPrice || pkg.wholesalePrice);
        if (!Number.isFinite(base)) continue;
        const result = await db
          .update(resellerPackagePrices)
          .set({
            sellingPrice: (base * (1 + resellerSellingMarkup / 100)).toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(resellerPackagePrices.packageId, pkg.id))
          .returning({ id: resellerPackagePrices.id });
        resellerSellingUpdated += result.length;
      }
    }

    return ApiResponse.success(res, "Bulk pricing updated", { updated, resellerSellingUpdated });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.post("/bulk-status", async (req: Request, res: Response) => {
  try {
    const { providerSlug, isEnabled } = req.body;
    if (typeof providerSlug !== "string" || !providerSlug) {
      return ApiResponse.badRequest(res, "providerSlug is required");
    }
    if (typeof isEnabled !== "boolean") {
      return ApiResponse.badRequest(res, "isEnabled must be a boolean");
    }
    if (REMOVED_PROVIDER_SLUGS.includes(providerSlug)) {
      return ApiResponse.badRequest(res, "This provider has been moved out of the eSIM project");
    }

    const provider = await db.query.providers.findFirst({
      where: eq(providers.slug, providerSlug),
    });
    if (!provider) return ApiResponse.notFound(res, "Provider not found");

    const result = await db
      .update(unifiedPackages)
      .set({ isEnabled, manualOverride: true, updatedAt: new Date() })
      .where(eq(unifiedPackages.providerId, provider.id))
      .returning({ id: unifiedPackages.id });

    return ApiResponse.success(res, "Provider package status updated", {
      providerName: provider.name,
      providerSlug: provider.slug,
      isEnabled,
      updated: result.length,
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.post("/import", async (req: Request, res: Response) => {
  try {
    const csv = String(req.body.csv || "");
    if (!csv.trim()) return ApiResponse.badRequest(res, "csv is required");

    const [headerLine, ...lines] = csv.split(/\r?\n/).filter((line) => line.trim());
    const headers = headerLine.split(",").map((header) => header.trim().replace(/^"|"$/g, ""));
    const idIndex = headers.findIndex((header) => ["id", "packageId", "package_id"].includes(header));
    const retailIndex = headers.findIndex((header) => ["retailPrice", "retail_price", "price"].includes(header));
    const providerCostIndex = headers.findIndex((header) => ["providerCost", "provider_cost", "wholesalePrice", "wholesale_price"].includes(header));
    const resellerIndex = headers.findIndex((header) => ["resellerPrice", "reseller_price"].includes(header));

    if (idIndex < 0) return ApiResponse.badRequest(res, "CSV must include an id column");

    let updated = 0;
    let skipped = 0;
    for (const line of lines) {
      const cells = line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
      const id = cells[idIndex];
      if (!id) {
        skipped++;
        continue;
      }

      const updateData: Partial<typeof unifiedPackages.$inferInsert> = { updatedAt: new Date() };
      const retailPrice = retailIndex >= 0 ? normalizeMoney(cells[retailIndex]) : undefined;
      const wholesalePrice = providerCostIndex >= 0 ? normalizeMoney(cells[providerCostIndex]) : undefined;
      const resellerPrice = resellerIndex >= 0 ? normalizeMoney(cells[resellerIndex]) : undefined;

      if (retailPrice !== undefined) updateData.retailPrice = retailPrice;
      if (wholesalePrice !== undefined) updateData.wholesalePrice = wholesalePrice;
      if (resellerPrice !== undefined) updateData.resellerPrice = resellerPrice;

      if (Object.keys(updateData).length <= 1) {
        skipped++;
        continue;
      }

      const result = await db
        .update(unifiedPackages)
        .set(updateData)
        .where(eq(unifiedPackages.id, id))
        .returning({ id: unifiedPackages.id });

      if (result.length > 0) updated++;
      else skipped++;
    }

    return ApiResponse.success(res, "Package prices imported", { updated, skipped });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.put("/:id/flags", async (req: Request, res: Response) => {
  try {
    const updateData: Partial<typeof unifiedPackages.$inferInsert> = { updatedAt: new Date() };
    const flagMap: Record<string, keyof typeof unifiedPackages.$inferInsert> = {
      active: "isEnabled",
      isEnabled: "isEnabled",
      isPopular: "isPopular",
      isTrending: "isTrending",
      isRecommended: "isRecommended",
      isBestValue: "isBestValue",
    };

    for (const [inputKey, columnKey] of Object.entries(flagMap)) {
      if (typeof req.body[inputKey] === "boolean") {
        (updateData as any)[columnKey] = req.body[inputKey];
      }
    }

    const [pkg] = await db
      .update(unifiedPackages)
      .set(updateData)
      .where(eq(unifiedPackages.id, req.params.id))
      .returning();

    if (!pkg) return ApiResponse.notFound(res, "Package not found");
    return ApiResponse.success(res, "Package flags updated", pkg);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.put("/:id/custom", async (req: Request, res: Response) => {
  try {
    const [pkg] = await db
      .update(unifiedPackages)
      .set({
        customImage: String(req.body.customImage || ""),
        customDescription: String(req.body.customDescription || ""),
        updatedAt: new Date(),
      })
      .where(eq(unifiedPackages.id, req.params.id))
      .returning();

    if (!pkg) return ApiResponse.notFound(res, "Package not found");
    return ApiResponse.success(res, "Package custom fields updated", pkg);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const updateData: Partial<typeof unifiedPackages.$inferInsert> = { updatedAt: new Date() };

    const textFields = ["title", "dataAmount", "type", "operator", "customImage", "customDescription"] as const;
    for (const field of textFields) {
      if (req.body[field] !== undefined) (updateData as any)[field] = String(req.body[field]);
    }

    const numberFields = ["validity"] as const;
    for (const field of numberFields) {
      if (req.body[field] !== undefined) {
        const value = Number(req.body[field]);
        if (Number.isFinite(value)) (updateData as any)[field] = value;
      }
    }

    const boolFields = [
      "isEnabled",
      "manualOverride",
      "isPopular",
      "isTrending",
      "isRecommended",
      "isBestValue",
      "isUnlimited",
    ] as const;
    for (const field of boolFields) {
      if (typeof req.body[field] === "boolean") (updateData as any)[field] = req.body[field];
    }

    const wholesalePrice = normalizeMoney(req.body.wholesalePrice ?? req.body.providerCost);
    const retailPrice = normalizeMoney(req.body.retailPrice);
    const resellerPrice = normalizeMoney(req.body.resellerPrice);
    if (wholesalePrice !== undefined) updateData.wholesalePrice = wholesalePrice;
    if (retailPrice !== undefined) updateData.retailPrice = retailPrice;
    if (resellerPrice !== undefined) updateData.resellerPrice = resellerPrice;

    const coverage = normalizeCoverage(req.body.coverage);
    if (coverage !== undefined) updateData.coverage = coverage;

    const [pkg] = await db
      .update(unifiedPackages)
      .set(updateData)
      .where(eq(unifiedPackages.id, req.params.id))
      .returning();

    if (!pkg) return ApiResponse.notFound(res, "Package not found");

    const resellerSellingPrice = normalizeMoney(req.body.resellerSellingPrice);
    let resellerSellingUpdated = 0;
    if (resellerSellingPrice !== undefined) {
      const result = await db
        .update(resellerPackagePrices)
        .set({ sellingPrice: resellerSellingPrice, updatedAt: new Date() })
        .where(eq(resellerPackagePrices.packageId, req.params.id))
        .returning({ id: resellerPackagePrices.id });
      resellerSellingUpdated = result.length;
    }

    return ApiResponse.success(res, "Package updated", { package: pkg, resellerSellingUpdated });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const [deleted] = await db
      .delete(unifiedPackages)
      .where(eq(unifiedPackages.id, req.params.id))
      .returning({ id: unifiedPackages.id });

    if (!deleted) return ApiResponse.notFound(res, "Package not found");
    return ApiResponse.success(res, "Package deleted", deleted);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const [row] = await db
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
      .where(and(
        eq(unifiedPackages.id, req.params.id),
        notInArray(providers.slug, REMOVED_PROVIDER_SLUGS),
      ))
      .limit(1);

    if (!row) return ApiResponse.notFound(res, "Package not found");
    const stats = await getResellerStats([row.pkg.id]);
    return res.json({ data: formatPackage(row, stats) });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

export default router;
