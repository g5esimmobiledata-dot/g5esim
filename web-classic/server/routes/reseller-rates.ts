import { Router } from "express";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "server/db";
import { requireAuth } from "server/middleware/auth";
import { storage } from "server/storage";
import {
  providers,
  rateTableAssignments,
  rateTablePrices,
  rateTables,
  resellerCustomerLinks,
  unifiedPackages,
  users,
} from "@shared/schema";
import {
  applyRateTableToUser,
  ensureRateTables,
  upsertRateTablePricesFromResellerCost,
} from "server/utils/rateTables";
import {
  resellerProviderAliasSlugsForSearch,
  resellerProviderDisplayName,
} from "@shared/providerNames";

const router = Router();

const createRateSchema = z.object({
  name: z.string().trim().min(1, "Rate table name is required").max(120),
  description: z.string().trim().max(500).optional().nullable(),
  marginPercent: z.coerce.number().min(0).max(10000).default(0),
});

const marginSchema = z.object({
  marginPercent: z.coerce.number().min(0).max(10000),
});

const updatePackageRateSchema = z.object({
  sellingPrice: z.coerce.number().positive().optional(),
  isEnabled: z.coerce.boolean().optional(),
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

async function requireReseller(req: any, res: any, next: any) {
  try {
    const user = await storage.getUser(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role !== "reseller" && user.role !== "agent") {
      return res.status(403).json({ success: false, message: "Reseller or Agent access required" });
    }

    req.reseller = user;
    return next();
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Reseller auth failed" });
  }
}

router.use(async (_req, _res, next) => {
  try {
    await ensureRateTables();
    next();
  } catch (error) {
    next(error);
  }
});

async function getOwnedRate(resellerId: string, rateTableId: string) {
  const [rate] = await db
    .select()
    .from(rateTables)
    .where(and(eq(rateTables.id, rateTableId), eq(rateTables.ownerUserId, resellerId)))
    .limit(1);

  return rate || null;
}

async function getManagedRateAccount(resellerId: string, customerId: string) {
  const [row] = await db
    .select({ customer: users })
    .from(resellerCustomerLinks)
    .innerJoin(users, eq(resellerCustomerLinks.customerId, users.id))
    .where(and(eq(resellerCustomerLinks.resellerId, resellerId), eq(resellerCustomerLinks.customerId, customerId)))
    .limit(1);

  if (!row || !["agent", "reseller"].includes(row.customer.role)) {
    return null;
  }

  return row.customer;
}

async function rateSummaryRows(resellerId: string) {
  const rates = await db
    .select()
    .from(rateTables)
    .where(eq(rateTables.ownerUserId, resellerId))
    .orderBy(desc(rateTables.updatedAt));

  if (rates.length === 0) return [];

  const priceCounts = await db
    .select({
      rateTableId: rateTablePrices.rateTableId,
      packages: count(),
      enabledPackages: sql<number>`COUNT(*) FILTER (WHERE ${rateTablePrices.isEnabled} = true)::int`,
    })
    .from(rateTablePrices)
    .innerJoin(unifiedPackages, eq(rateTablePrices.packageId, unifiedPackages.id))
    .innerJoin(providers, eq(unifiedPackages.providerId, providers.id))
    .where(and(eq(providers.enabled, true), eq(unifiedPackages.isEnabled, true)))
    .groupBy(rateTablePrices.rateTableId);

  const assignmentCounts = await db
    .select({
      rateTableId: rateTableAssignments.rateTableId,
      assignedCustomers: count(),
    })
    .from(rateTableAssignments)
    .innerJoin(resellerCustomerLinks, eq(rateTableAssignments.userId, resellerCustomerLinks.customerId))
    .where(eq(resellerCustomerLinks.resellerId, resellerId))
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

router.get("/", requireAuth, requireReseller, async (req: any, res) => {
  try {
    return res.json({
      success: true,
      message: "Reseller rate tables fetched successfully",
      data: { rates: await rateSummaryRows(req.userId) },
    });
  } catch (error: any) {
    console.error("Reseller rates fetch error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load rates" });
  }
});

router.post("/", requireAuth, requireReseller, async (req: any, res) => {
  try {
    const parsed = createRateSchema.parse(req.body);
    const now = new Date();

    const [rate] = await db
      .insert(rateTables)
      .values({
        name: parsed.name,
        description: parsed.description || null,
        defaultMarginPercent: parsed.marginPercent.toFixed(2),
        ownerUserId: req.userId,
        ownerType: "reseller",
        updatedAt: now,
      })
      .returning();

    const packageCount = await upsertRateTablePricesFromResellerCost(rate.id, req.userId, parsed.marginPercent);

    return res.status(201).json({
      success: true,
      message: "Rate table created successfully",
      data: {
        ...rate,
        packages: packageCount,
        enabledPackages: packageCount,
        assignedCustomers: 0,
      },
    });
  } catch (error: any) {
    console.error("Reseller rate create error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to create rate table" });
  }
});

router.get("/assignable-accounts", requireAuth, requireReseller, async (req: any, res) => {
  try {
    const accounts = await db
      .select({
        id: users.id,
        displayUserId: users.displayUserId,
        name: users.name,
        email: users.email,
        role: users.role,
        isBlocked: users.isBlocked,
        isDeleted: users.isDeleted,
        rateTableId: rateTableAssignments.rateTableId,
        rateName: rateTables.name,
      })
      .from(resellerCustomerLinks)
      .innerJoin(users, eq(resellerCustomerLinks.customerId, users.id))
      .leftJoin(rateTableAssignments, eq(rateTableAssignments.userId, users.id))
      .leftJoin(rateTables, eq(rateTableAssignments.rateTableId, rateTables.id))
      .where(and(
        eq(resellerCustomerLinks.resellerId, req.userId),
        or(eq(users.role, "agent"), eq(users.role, "reseller"))!,
      ))
      .orderBy(desc(resellerCustomerLinks.createdAt));

    return res.json({
      success: true,
      message: "Assignable accounts fetched successfully",
      data: { accounts },
    });
  } catch (error: any) {
    console.error("Reseller assignable accounts error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load assignable accounts" });
  }
});

router.get("/assignments/:customerId", requireAuth, requireReseller, async (req: any, res) => {
  try {
    const account = await getManagedRateAccount(req.userId, req.params.customerId);
    if (!account) {
      return res.status(404).json({ success: false, message: "Agent or Sub Reseller not found" });
    }

    const [assignment] = await db
      .select({
        id: rateTableAssignments.id,
        rateTableId: rateTableAssignments.rateTableId,
        userId: rateTableAssignments.userId,
        createdAt: rateTableAssignments.createdAt,
        updatedAt: rateTableAssignments.updatedAt,
        rateName: rateTables.name,
      })
      .from(rateTableAssignments)
      .innerJoin(rateTables, eq(rateTableAssignments.rateTableId, rateTables.id))
      .where(and(eq(rateTableAssignments.userId, account.id), eq(rateTables.ownerUserId, req.userId)))
      .limit(1);

    return res.json({
      success: true,
      message: "Rate assignment fetched successfully",
      data: assignment || null,
    });
  } catch (error: any) {
    console.error("Reseller rate assignment fetch error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load rate assignment" });
  }
});

router.get("/:id/packages", requireAuth, requireReseller, async (req: any, res) => {
  try {
    const rate = await getOwnedRate(req.userId, req.params.id);
    if (!rate) {
      return res.status(404).json({ success: false, message: "Rate table not found" });
    }

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(Math.max(1, Number(req.query.limit || 25)), 100);
    const search = String(req.query.search || "").trim();
    const offset = (page - 1) * limit;

    const filters = [
      eq(rateTablePrices.rateTableId, rate.id),
      eq(providers.enabled, true),
      eq(unifiedPackages.isEnabled, true),
    ];
    if (search) {
      const pattern = `%${search}%`;
      const aliasProviderClauses = resellerProviderAliasSlugsForSearch(search).map((slug) =>
        eq(providers.slug, slug),
      );
      filters.push(
        or(
          ilike(unifiedPackages.title, pattern),
          ilike(unifiedPackages.countryName, pattern),
          ilike(providers.name, pattern),
          ...aliasProviderClauses,
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

    const packageRows = await db
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
        providerSlug: providers.slug,
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

    const packages = packageRows.map(({ providerSlug, providerName, ...pkg }) => ({
      ...pkg,
      providerSlug,
      providerName: resellerProviderDisplayName(providerSlug, providerName),
    }));

    return res.json({
      success: true,
      message: "Rate Packages fetched successfully",
      data: {
        rate,
        packages,
        pagination: {
          page,
          limit,
          total: Number(totalRow?.total || 0),
          totalPages: Math.ceil(Number(totalRow?.total || 0) / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("Reseller rate packages error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load rate packages" });
  }
});

router.post("/:id/apply-margin", requireAuth, requireReseller, async (req: any, res) => {
  try {
    const { marginPercent } = marginSchema.parse(req.body);
    const rate = await getOwnedRate(req.userId, req.params.id);
    if (!rate) {
      return res.status(404).json({ success: false, message: "Rate table not found" });
    }

    const updated = await upsertRateTablePricesFromResellerCost(rate.id, req.userId, marginPercent);
    await db
      .update(rateTables)
      .set({
        defaultMarginPercent: marginPercent.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(rateTables.id, rate.id));

    return res.json({
      success: true,
      message: "Rate table markup applied successfully",
      data: { rateTableId: rate.id, updated, marginPercent },
    });
  } catch (error: any) {
    console.error("Reseller rate margin error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to apply markup" });
  }
});

router.patch("/:id/packages/:packageId", requireAuth, requireReseller, async (req: any, res) => {
  try {
    const parsed = updatePackageRateSchema.parse(req.body);
    if (parsed.sellingPrice === undefined && parsed.isEnabled === undefined) {
      return res.status(400).json({ success: false, message: "Enter a selling price or package status" });
    }

    const rate = await getOwnedRate(req.userId, req.params.id);
    if (!rate) {
      return res.status(404).json({ success: false, message: "Rate table not found" });
    }

    const [ratePriceRow] = await db
      .select({
        ratePrice: rateTablePrices,
        providerEnabled: providers.enabled,
      })
      .from(rateTablePrices)
      .innerJoin(unifiedPackages, eq(rateTablePrices.packageId, unifiedPackages.id))
      .leftJoin(providers, eq(unifiedPackages.providerId, providers.id))
      .where(and(
        eq(rateTablePrices.rateTableId, rate.id),
        eq(rateTablePrices.packageId, req.params.packageId),
        eq(unifiedPackages.isEnabled, true),
      ))
      .limit(1);

    if (!ratePriceRow || !ratePriceRow.providerEnabled) {
      return res.status(404).json({ success: false, message: "Package rate not found" });
    }

    const ratePrice = ratePriceRow.ratePrice;

    if (parsed.sellingPrice !== undefined && parsed.sellingPrice < Number(ratePrice.costPrice)) {
      return res.status(400).json({
        success: false,
        message: `Selling price cannot be below your cost of $${Number(ratePrice.costPrice).toFixed(2)}`,
      });
    }

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

    await db.update(rateTables).set({ updatedAt: new Date() }).where(eq(rateTables.id, rate.id));

    return res.json({
      success: true,
      message: "Package rate updated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Reseller package rate update error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update package rate" });
  }
});

router.post("/:id/assign", requireAuth, requireReseller, async (req: any, res) => {
  try {
    const { customerId } = assignSchema.parse(req.body);
    const rate = await getOwnedRate(req.userId, req.params.id);
    if (!rate) {
      return res.status(404).json({ success: false, message: "Rate table not found" });
    }

    const account = await getManagedRateAccount(req.userId, customerId);
    if (!account) {
      return res.status(404).json({ success: false, message: "Agent or Sub Reseller not found" });
    }
    if (account.isDeleted || account.isBlocked) {
      return res.status(400).json({ success: false, message: "Cannot assign rates to an inactive account" });
    }

    const result = await applyRateTableToUser(account.id, rate.id, null);

    return res.json({
      success: true,
      message: "Rate table assigned successfully",
      data: { ...result, rate },
    });
  } catch (error: any) {
    console.error("Reseller rate assign error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to assign rate" });
  }
});

export default router;
