import { Router, type Request, type Response } from "express";
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "server/db";
import { requireAdmin } from "server/lib/middleware";
import * as ApiResponse from "server/utils/response";
import { resellerCustomerLinks, sipRateGroups, sipRegistrationProfiles, sipTariffs, users } from "@shared/schema";
import {
  ensureSipCommercialSchema,
  normalizeSipFeatureSettings,
  publicSipRateGroup,
  publicSipRegistrationProfile,
  publicSipTariff,
} from "server/services/sip-commercial-service";

const router = Router();

const tariffTypeSchema = z.enum(["internal", "international"]);
const statusSchema = z.enum(["active", "inactive"]);
const moneySchema = z.preprocess(
  (value) => String(value ?? "0").trim() || "0",
  z.string().regex(/^\d+(\.\d{1,4})?$/, "Use a valid amount"),
);
const secondsSchema = z.preprocess(
  (value) => Number(value || 60),
  z.number().int().min(1).max(3600),
);

const tariffSchema = z.object({
  name: z.string().trim().min(2, "Tariff name is required"),
  tariffType: tariffTypeSchema,
  description: z.string().trim().optional().default(""),
  currency: z.string().trim().min(3).max(3).default("USD"),
  connectionFee: moneySchema.default("0.0000"),
  ratePerMinute: moneySchema.default("0.0000"),
  billingIncrementSeconds: secondsSchema.default(60),
  status: statusSchema.default("active"),
  metadata: z.record(z.any()).optional().default({}),
});

const tariffBulkSchema = z.object({
  rows: z.array(tariffSchema).min(1).max(5000),
});

const profileSchema = z.object({
  name: z.string().trim().min(2, "Profile name is required"),
  description: z.string().trim().optional().default(""),
  status: statusSchema.default("active"),
  isDefault: z.boolean().default(false),
  metadata: z.record(z.any()).optional().default({}),
});

const rateGroupSchema = z.object({
  name: z.string().trim().min(2, "Rate Group name is required"),
  description: z.string().trim().optional().default(""),
  status: statusSchema.default("active"),
  metadata: z.record(z.any()).optional().default({}),
});

const rateGroupAssigneeRoleSchema = z.enum(["agent", "reseller"]);

function trim(value: unknown) {
  return String(value || "").trim();
}

router.get("/sip-tariffs", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureSipCommercialSchema();
    const search = trim(req.query.search);
    const tariffType = trim(req.query.tariffType || "all");
    const kind = trim(req.query.kind);
    const parentTariffId = trim(req.query.parentTariffId);
    const page = Math.max(1, Number(req.query.page || 1) || 1);
    const requestedLimit = Number(req.query.limit || 0) || 0;
    const limit = requestedLimit > 0 ? Math.min(5000, Math.max(1, requestedLimit)) : 0;
    const conditions: any[] = [];
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(or(
        ilike(sipTariffs.name, pattern),
        ilike(sipTariffs.description, pattern),
        sql`${sipTariffs.metadata}->>'destination' ILIKE ${pattern}`,
        sql`${sipTariffs.metadata}->>'prefix' ILIKE ${pattern}`,
        sql`${sipTariffs.metadata}->>'country' ILIKE ${pattern}`,
      ));
    }
    if (tariffType !== "all") {
      conditions.push(eq(sipTariffs.tariffType, tariffType));
    }
    if (kind) {
      conditions.push(sql`${sipTariffs.metadata}->>'kind' = ${kind}`);
    }
    if (parentTariffId) {
      conditions.push(sql`${sipTariffs.metadata}->>'parentTariffId' = ${parentTariffId}`);
    }
    const whereClause = conditions.length ? and(...conditions) : undefined;

    const baseQuery = db
      .select()
      .from(sipTariffs)
      .where(whereClause)
      .orderBy(asc(sipTariffs.tariffType), asc(sipTariffs.name));

    if (limit > 0) {
      const [totalRow] = await db
        .select({ total: count() })
        .from(sipTariffs)
        .where(whereClause);
      const rows = await baseQuery.limit(limit).offset((page - 1) * limit);
      return ApiResponse.success(res, "SIP Tariffs Fetched Successfully", {
        data: rows.map(publicSipTariff),
        pagination: {
          page,
          limit,
          total: Number(totalRow?.total || 0),
          totalPages: Math.ceil(Number(totalRow?.total || 0) / limit),
        },
      });
    }

    const rows = await baseQuery;
    return ApiResponse.success(res, "SIP Tariffs Fetched Successfully", { data: rows.map(publicSipTariff) });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed To Fetch SIP Tariffs");
  }
});

router.post("/sip-tariffs/bulk", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureSipCommercialSchema();
    const payload = tariffBulkSchema.parse(req.body);
    const rows = await db.insert(sipTariffs).values(payload.rows).returning({ id: sipTariffs.id });
    return ApiResponse.created(res, "SIP Tariffs Imported Successfully", { inserted: rows.length });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(res, error.errors[0]?.message || "Invalid SIP Tariff Bulk Payload", error.errors);
    }
    return ApiResponse.serverError(res, error.message || "Failed To Import SIP Tariffs");
  }
});

router.get("/sip-tariffs/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureSipCommercialSchema();
    const [row] = await db.select().from(sipTariffs).where(eq(sipTariffs.id, req.params.id)).limit(1);
    if (!row) return ApiResponse.notFound(res, "SIP Tariff Not Found");
    return ApiResponse.success(res, "SIP Tariff Fetched Successfully", { tariff: publicSipTariff(row) });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed To Fetch SIP Tariff");
  }
});

router.post("/sip-tariffs", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureSipCommercialSchema();
    const payload = tariffSchema.parse(req.body);
    const [row] = await db.insert(sipTariffs).values(payload).returning();
    return ApiResponse.created(res, "SIP Tariff Created Successfully", { tariff: publicSipTariff(row) });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(res, error.errors[0]?.message || "Invalid SIP Tariff Payload", error.errors);
    }
    return ApiResponse.serverError(res, error.message || "Failed To Create SIP Tariff");
  }
});

router.patch("/sip-tariffs/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureSipCommercialSchema();
    const payload = tariffSchema.partial().parse(req.body);
    const [row] = await db
      .update(sipTariffs)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(sipTariffs.id, req.params.id))
      .returning();
    if (!row) return ApiResponse.notFound(res, "SIP Tariff Not Found");
    return ApiResponse.success(res, "SIP Tariff Updated Successfully", { tariff: publicSipTariff(row) });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(res, error.errors[0]?.message || "Invalid SIP Tariff Payload", error.errors);
    }
    return ApiResponse.serverError(res, error.message || "Failed To Update SIP Tariff");
  }
});

router.delete("/sip-tariffs", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureSipCommercialSchema();
    const payload = z.object({ ids: z.array(z.string().trim().min(1)).min(1) }).parse(req.body);
    await db.delete(sipTariffs).where(or(
      inArray(sipTariffs.id, payload.ids),
      inArray(sql<string>`${sipTariffs.metadata}->>'parentTariffId'`, payload.ids),
    ));
    return ApiResponse.success(res, "SIP Tariffs Deleted Successfully", { deleted: payload.ids.length });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(res, error.errors[0]?.message || "Invalid SIP Tariff Delete Payload", error.errors);
    }
    return ApiResponse.serverError(res, error.message || "Failed To Delete SIP Tariffs");
  }
});

router.delete("/sip-tariffs/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureSipCommercialSchema();
    await db.delete(sipTariffs).where(eq(sipTariffs.id, req.params.id));
    return ApiResponse.success(res, "SIP Tariff Deleted Successfully", { id: req.params.id });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed To Delete SIP Tariff");
  }
});

router.get("/sip-rate-group-assignees", requireAdmin, async (req: Request, res: Response) => {
  try {
    const role = rateGroupAssigneeRoleSchema.parse(trim(req.query.role || "reseller"));
    const search = trim(req.query.search);
    const conditions: any[] = [
      eq(users.role, role),
      eq(users.isDeleted, false),
    ];

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(users.email, pattern),
          ilike(users.name, pattern),
          ilike(users.phone, pattern),
          sql`${users.displayUserId}::text ILIKE ${pattern}`,
        ),
      );
    }

    const accountRows = await db
      .select({
        id: users.id,
        displayUserId: users.displayUserId,
        email: users.email,
        name: users.name,
        phone: users.phone,
        role: users.role,
        isBlocked: users.isBlocked,
        resellerStoreName: users.resellerStoreName,
        resellerSubdomain: users.resellerSubdomain,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(asc(users.name), asc(users.email))
      .limit(300);

    const accountIds = accountRows.map((account) => account.id);
    const linkRows = accountIds.length
      ? await db
        .select({
          customerId: resellerCustomerLinks.customerId,
          ownerId: resellerCustomerLinks.resellerId,
        })
        .from(resellerCustomerLinks)
        .where(inArray(resellerCustomerLinks.customerId, accountIds))
      : [];

    const ownerIds = [...new Set(linkRows.map((link) => link.ownerId).filter(Boolean))];
    const ownerRows = ownerIds.length
      ? await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
        })
        .from(users)
        .where(inArray(users.id, ownerIds))
      : [];

    const linkByCustomerId = new Map(linkRows.map((link) => [link.customerId, link]));
    const ownerById = new Map(ownerRows.map((owner) => [owner.id, owner]));

    const accounts = accountRows.map((account) => {
      const link = linkByCustomerId.get(account.id);
      const owner = link?.ownerId ? ownerById.get(link.ownerId) : null;
      const displayName = account.name || account.resellerStoreName || account.email || `UID${account.displayUserId}`;
      const label = account.email && account.email !== displayName ? `${displayName} - ${account.email}` : displayName;
      const ownerName = owner?.name || owner?.email || "";

      return {
        id: account.id,
        displayUserId: account.displayUserId,
        email: account.email,
        name: account.name,
        phone: account.phone,
        role: account.role,
        isBlocked: account.isBlocked,
        resellerStoreName: account.resellerStoreName,
        resellerSubdomain: account.resellerSubdomain,
        label,
        parentId: owner?.id || null,
        parentName: ownerName,
        parentEmail: owner?.email || null,
        parentRole: owner?.role || null,
        hierarchyLabel: ownerName ? `Sub Account Under ${ownerName}` : "Main Admin Account",
      };
    });

    return ApiResponse.success(res, "SIP Rate Group Assignees Fetched Successfully", { accounts });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(res, error.errors[0]?.message || "Invalid Rate Group Assignee Query", error.errors);
    }
    return ApiResponse.serverError(res, error.message || "Failed To Fetch Rate Group Assignees");
  }
});

router.get("/sip-rate-groups", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureSipCommercialSchema();
    const search = trim(req.query.search);
    const conditions: any[] = [];
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(or(ilike(sipRateGroups.name, pattern), ilike(sipRateGroups.description, pattern)));
    }

    const rows = await db
      .select()
      .from(sipRateGroups)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(sipRateGroups.name));

    return ApiResponse.success(res, "SIP Rate Groups Fetched Successfully", { data: rows.map(publicSipRateGroup) });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed To Fetch SIP Rate Groups");
  }
});

router.get("/sip-rate-groups/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureSipCommercialSchema();
    const [row] = await db.select().from(sipRateGroups).where(eq(sipRateGroups.id, req.params.id)).limit(1);
    if (!row) return ApiResponse.notFound(res, "SIP Rate Group Not Found");
    return ApiResponse.success(res, "SIP Rate Group Fetched Successfully", { rateGroup: publicSipRateGroup(row) });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed To Fetch SIP Rate Group");
  }
});

router.post("/sip-rate-groups", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureSipCommercialSchema();
    const payload = rateGroupSchema.parse(req.body);
    const [row] = await db.insert(sipRateGroups).values(payload).returning();
    return ApiResponse.created(res, "SIP Rate Group Created Successfully", { rateGroup: publicSipRateGroup(row) });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(res, error.errors[0]?.message || "Invalid SIP Rate Group Payload", error.errors);
    }
    return ApiResponse.serverError(res, error.message || "Failed To Create SIP Rate Group");
  }
});

router.post("/sip-rate-groups/duplicate", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureSipCommercialSchema();
    const payload = z.object({ ids: z.array(z.string().trim().min(1)).min(1) }).parse(req.body);
    const rows = await db.select().from(sipRateGroups).where(inArray(sipRateGroups.id, payload.ids));
    if (rows.length === 0) return ApiResponse.notFound(res, "SIP Rate Group Not Found");

    const copies = rows.map((row) => ({
      name: `${row.name} Copy`,
      description: row.description || "",
      status: row.status,
      metadata: row.metadata || {},
    }));
    const created = await db.insert(sipRateGroups).values(copies).returning();
    return ApiResponse.created(res, "SIP Rate Groups Duplicated Successfully", { data: created.map(publicSipRateGroup) });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(res, error.errors[0]?.message || "Invalid SIP Rate Group Duplicate Payload", error.errors);
    }
    return ApiResponse.serverError(res, error.message || "Failed To Duplicate SIP Rate Groups");
  }
});

router.patch("/sip-rate-groups/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureSipCommercialSchema();
    const payload = rateGroupSchema.partial().parse(req.body);
    const [row] = await db
      .update(sipRateGroups)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(sipRateGroups.id, req.params.id))
      .returning();
    if (!row) return ApiResponse.notFound(res, "SIP Rate Group Not Found");
    return ApiResponse.success(res, "SIP Rate Group Updated Successfully", { rateGroup: publicSipRateGroup(row) });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(res, error.errors[0]?.message || "Invalid SIP Rate Group Payload", error.errors);
    }
    return ApiResponse.serverError(res, error.message || "Failed To Update SIP Rate Group");
  }
});

router.delete("/sip-rate-groups", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureSipCommercialSchema();
    const payload = z.object({ ids: z.array(z.string().trim().min(1)).min(1) }).parse(req.body);
    await db.delete(sipRateGroups).where(inArray(sipRateGroups.id, payload.ids));
    return ApiResponse.success(res, "SIP Rate Groups Deleted Successfully", { deleted: payload.ids.length });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(res, error.errors[0]?.message || "Invalid SIP Rate Group Delete Payload", error.errors);
    }
    return ApiResponse.serverError(res, error.message || "Failed To Delete SIP Rate Groups");
  }
});

router.delete("/sip-rate-groups/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureSipCommercialSchema();
    await db.delete(sipRateGroups).where(eq(sipRateGroups.id, req.params.id));
    return ApiResponse.success(res, "SIP Rate Group Deleted Successfully", { id: req.params.id });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed To Delete SIP Rate Group");
  }
});

router.get("/sip-registration-profiles", requireAdmin, async (_req: Request, res: Response) => {
  try {
    await ensureSipCommercialSchema();
    const rows = await db
      .select()
      .from(sipRegistrationProfiles)
      .orderBy(desc(sipRegistrationProfiles.isDefault), asc(sipRegistrationProfiles.name));
    return ApiResponse.success(res, "SIP Registration Profiles Fetched Successfully", { data: rows.map(publicSipRegistrationProfile) });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed To Fetch SIP Registration Profiles");
  }
});

router.get("/sip-registration-profiles/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureSipCommercialSchema();
    const [row] = await db.select().from(sipRegistrationProfiles).where(eq(sipRegistrationProfiles.id, req.params.id)).limit(1);
    if (!row) return ApiResponse.notFound(res, "SIP Registration Profile Not Found");
    return ApiResponse.success(res, "SIP Registration Profile Fetched Successfully", { profile: publicSipRegistrationProfile(row) });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed To Fetch SIP Registration Profile");
  }
});

router.post("/sip-registration-profiles", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureSipCommercialSchema();
    const payload = profileSchema.parse(req.body);
    if (payload.isDefault) {
      await db.update(sipRegistrationProfiles).set({ isDefault: false, updatedAt: new Date() });
    }
    const [row] = await db
      .insert(sipRegistrationProfiles)
      .values({
        ...payload,
        metadata: normalizeSipFeatureSettings(payload.metadata),
      })
      .returning();
    return ApiResponse.created(res, "SIP Registration Profile Created Successfully", { profile: publicSipRegistrationProfile(row) });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(res, error.errors[0]?.message || "Invalid SIP Registration Profile Payload", error.errors);
    }
    return ApiResponse.serverError(res, error.message || "Failed To Create SIP Registration Profile");
  }
});

router.patch("/sip-registration-profiles/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureSipCommercialSchema();
    const payload = profileSchema.partial().parse(req.body);
    if (payload.isDefault) {
      await db
        .update(sipRegistrationProfiles)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(sql`${sipRegistrationProfiles.id} <> ${req.params.id}`);
    }
    const [row] = await db
      .update(sipRegistrationProfiles)
      .set({
        ...payload,
        metadata: payload.metadata ? normalizeSipFeatureSettings(payload.metadata) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(sipRegistrationProfiles.id, req.params.id))
      .returning();
    if (!row) return ApiResponse.notFound(res, "SIP Registration Profile Not Found");
    return ApiResponse.success(res, "SIP Registration Profile Updated Successfully", { profile: publicSipRegistrationProfile(row) });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(res, error.errors[0]?.message || "Invalid SIP Registration Profile Payload", error.errors);
    }
    return ApiResponse.serverError(res, error.message || "Failed To Update SIP Registration Profile");
  }
});

export default router;
