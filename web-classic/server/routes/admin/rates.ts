import { Router, type Request, type Response } from "express";
import { and, asc, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAdmin } from "../../lib/middleware";
import * as ApiResponse from "../../utils/response";
import {
  providers,
  rateTableAssignments,
  rateTablePrices,
  rateTables,
  unifiedPackages,
  users,
} from "@shared/schema";
import {
  applyRateTableToUser,
  ensureRateTables,
  getPackageProviderCost,
  upsertRateTablePricesFromPackages,
} from "../../utils/rateTables";

const router = Router();

router.use(async (_req, _res, next) => {
  try {
    await ensureRateTables();
    next();
  } catch (error) {
    next(error);
  }
});

const createRateSchema = z.object({
  name: z.string().trim().min(1, "Rate table name is required").max(120),
  description: z.string().trim().max(500).optional().nullable(),
  marginPercent: z.coerce.number().min(0).max(10000).default(0),
});

const updatePackageRateSchema = z.object({
  sellingPrice: z.coerce.number().positive().optional(),
  isEnabled: z.coerce.boolean().optional(),
});

const marginSchema = z.object({
  marginPercent: z.coerce.number().min(0).max(10000),
});

const assignSchema = z.object({
  customerId: z.string().min(1),
});

function money(value: number) {
  return value.toFixed(2);
}

function marginFromPrices(cost: number, sellingPrice: number) {
  if (!Number.isFinite(cost) || cost <= 0) return "0.00";
  return (((sellingPrice - cost) / cost) * 100).toFixed(2);
}

async function rateSummaryRows() {
  const rates = await db
    .select()
    .from(rateTables)
    .where(isNull(rateTables.ownerUserId))
    .orderBy(desc(rateTables.updatedAt));
  if (rates.length === 0) return [];

  const priceCounts = await db
    .select({
      rateTableId: rateTablePrices.rateTableId,
      packages: count(),
      enabledPackages: sql<number>`COUNT(*) FILTER (WHERE ${rateTablePrices.isEnabled} = true)::int`,
    })
    .from(rateTablePrices)
    .groupBy(rateTablePrices.rateTableId);

  const assignmentCounts = await db
    .select({
      rateTableId: rateTableAssignments.rateTableId,
      assignedCustomers: count(),
    })
    .from(rateTableAssignments)
    .groupBy(rateTableAssignments.rateTableId);

  const countsByRate = new Map(priceCounts.map((row) => [row.rateTableId, row]));
  const assignmentsByRate = new Map(assignmentCounts.map((row) => [row.rateTableId, row]));

  return rates.map((rate) => ({
    ...rate,
    packages: Number(countsByRate.get(rate.id)?.packages || 0),
    enabledPackages: Number(countsByRate.get(rate.id)?.enabledPackages || 0),
    assignedCustomers: Number(assignmentsByRate.get(rate.id)?.assignedCustomers || 0),
  }));
}

router.get(
  "/",
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    return ApiResponse.success(res, "Rate tables fetched successfully", {
      rates: await rateSummaryRows(),
    });
  }),
);

router.post(
  "/",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createRateSchema.parse(req.body);
    const now = new Date();

    const [rate] = await db
      .insert(rateTables)
      .values({
        name: parsed.name,
        description: parsed.description || null,
        defaultMarginPercent: parsed.marginPercent.toFixed(2),
        createdBy: req.session.adminId || null,
        ownerUserId: null,
        ownerType: "admin",
        updatedAt: now,
      })
      .returning();

    const packageCount = await upsertRateTablePricesFromPackages(rate.id, parsed.marginPercent);

    return ApiResponse.created(res, "Rate table created successfully", {
      ...rate,
      packages: packageCount,
      enabledPackages: packageCount,
      assignedCustomers: 0,
    });
  }),
);

router.get(
  "/:id/packages",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const rateTableId = req.params.id;
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(Math.max(1, Number(req.query.limit || 25)), 100);
    const search = String(req.query.search || "").trim();
    const offset = (page - 1) * limit;

    const [rate] = await db
      .select()
      .from(rateTables)
      .where(and(eq(rateTables.id, rateTableId), isNull(rateTables.ownerUserId)))
      .limit(1);
    if (!rate) return ApiResponse.notFound(res, "Rate table not found");

    const filters = [eq(rateTablePrices.rateTableId, rateTableId)];
    if (search) {
      const pattern = `%${search}%`;
      filters.push(
        or(
          ilike(unifiedPackages.title, pattern),
          ilike(unifiedPackages.countryName, pattern),
          ilike(providers.name, pattern),
        )!,
      );
    }

    const where = and(...filters);

    const [totalRow] = await db
      .select({ total: count() })
      .from(rateTablePrices)
      .innerJoin(unifiedPackages, eq(rateTablePrices.packageId, unifiedPackages.id))
      .leftJoin(providers, eq(unifiedPackages.providerId, providers.id))
      .where(where);

    const packages = await db
      .select({
        id: rateTablePrices.id,
        packageId: rateTablePrices.packageId,
        costPrice: rateTablePrices.costPrice,
        sellingPrice: rateTablePrices.sellingPrice,
        marginPercent: rateTablePrices.marginPercent,
        isEnabled: rateTablePrices.isEnabled,
        packageTitle: unifiedPackages.title,
        dataAmount: unifiedPackages.dataAmount,
        validity: unifiedPackages.validity,
        countryName: unifiedPackages.countryName,
        type: unifiedPackages.type,
        providerName: providers.name,
        providerCost: unifiedPackages.wholesalePrice,
        retailPrice: unifiedPackages.retailPrice,
      })
      .from(rateTablePrices)
      .innerJoin(unifiedPackages, eq(rateTablePrices.packageId, unifiedPackages.id))
      .leftJoin(providers, eq(unifiedPackages.providerId, providers.id))
      .where(where)
      .orderBy(asc(providers.name), asc(unifiedPackages.countryName), asc(unifiedPackages.dataMb))
      .limit(limit)
      .offset(offset);

    return ApiResponse.success(res, "Rate Packages fetched successfully", {
      rate,
      packages,
      pagination: {
        page,
        limit,
        total: Number(totalRow?.total || 0),
        totalPages: Math.ceil(Number(totalRow?.total || 0) / limit),
      },
    });
  }),
);

router.post(
  "/:id/apply-margin",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { marginPercent } = marginSchema.parse(req.body);
    const [rate] = await db
      .select()
      .from(rateTables)
      .where(and(eq(rateTables.id, req.params.id), isNull(rateTables.ownerUserId)))
      .limit(1);
    if (!rate) return ApiResponse.notFound(res, "Rate table not found");

    const updated = await upsertRateTablePricesFromPackages(rate.id, marginPercent);
    await db
      .update(rateTables)
      .set({
        defaultMarginPercent: marginPercent.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(rateTables.id, rate.id));

    return ApiResponse.success(res, "Rate table margin applied successfully", {
      rateTableId: rate.id,
      updated,
      marginPercent,
    });
  }),
);

router.patch(
  "/:id/packages/:packageId",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = updatePackageRateSchema.parse(req.body);
    if (parsed.sellingPrice === undefined && parsed.isEnabled === undefined) {
      return ApiResponse.badRequest(res, "Enter a selling price or package status");
    }

    const [ratePrice] = await db
      .select()
      .from(rateTablePrices)
      .where(and(eq(rateTablePrices.rateTableId, req.params.id), eq(rateTablePrices.packageId, req.params.packageId)))
      .limit(1);

    if (!ratePrice) return ApiResponse.notFound(res, "Package rate not found");

    const sellingPrice = parsed.sellingPrice !== undefined ? money(parsed.sellingPrice) : ratePrice.sellingPrice;
    const marginPercent =
      parsed.sellingPrice !== undefined
        ? marginFromPrices(Number(ratePrice.costPrice), Number(sellingPrice))
        : ratePrice.marginPercent;

    const [updated] = await db
      .update(rateTablePrices)
      .set({
        sellingPrice,
        marginPercent,
        isEnabled: parsed.isEnabled ?? ratePrice.isEnabled,
        updatedAt: new Date(),
      })
      .where(eq(rateTablePrices.id, ratePrice.id))
      .returning();

    await db.update(rateTables).set({ updatedAt: new Date() }).where(eq(rateTables.id, req.params.id));

    return ApiResponse.success(res, "Package rate updated successfully", updated);
  }),
);

router.post(
  "/:id/assign",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = assignSchema.parse(req.body);
    const [rate] = await db
      .select()
      .from(rateTables)
      .where(and(eq(rateTables.id, req.params.id), isNull(rateTables.ownerUserId)))
      .limit(1);
    if (!rate) return ApiResponse.notFound(res, "Rate table not found");

    const [customer] = await db.select().from(users).where(eq(users.id, customerId)).limit(1);
    if (!customer) return ApiResponse.notFound(res, "Customer not found");
    if (!["agent", "reseller"].includes(customer.role)) {
      return ApiResponse.badRequest(res, "Rate tables can be assigned to Agent or Reseller accounts");
    }

    const result = await applyRateTableToUser(customer.id, rate.id, req.session.adminId || null);

    return ApiResponse.success(res, "Rate table assigned successfully", {
      ...result,
      rate,
    });
  }),
);

router.get(
  "/assignments/:customerId",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const [assignment] = await db
      .select({
        id: rateTableAssignments.id,
        rateTableId: rateTableAssignments.rateTableId,
        userId: rateTableAssignments.userId,
        assignedBy: rateTableAssignments.assignedBy,
        createdAt: rateTableAssignments.createdAt,
        updatedAt: rateTableAssignments.updatedAt,
        rateName: rateTables.name,
      })
      .from(rateTableAssignments)
      .innerJoin(rateTables, eq(rateTableAssignments.rateTableId, rateTables.id))
      .where(eq(rateTableAssignments.userId, req.params.customerId))
      .limit(1);

    return ApiResponse.success(res, "Rate assignment fetched successfully", assignment || null);
  }),
);

export default router;
