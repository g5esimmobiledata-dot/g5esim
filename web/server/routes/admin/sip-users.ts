"use strict";

import { Router, type Request, type Response } from "express";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "server/db";
import { requireAdmin } from "server/lib/middleware";
import * as ApiResponse from "server/utils/response";
import { userSipAccounts, users, userVirtualNumbers, virtualNumberInventory } from "@shared/schema";
import {
  ensureSipCommercialSchema,
  getDefaultSipRegistrationProfile,
  getSipRegistrationProfileById,
  mergeSipFeatureSettings,
} from "server/services/sip-commercial-service";
import {
  ensureUserSipSchema,
  getOrCreateUserSipAccount,
  testUserSipAccountConnection,
} from "server/services/user-sip-service";

const router = Router();

const statusSchema = z.enum(["active", "inactive", "suspended"]);
const providerSchema = z.enum(["external_sip", "custom_sip", "freepbx", "astpp", "local"]);
const transportSchema = z.enum(["udp", "tcp", "tls"]);
const billingModeSchema = z.enum(["free", "paid"]);
const portSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return undefined;
    return Number(value);
  },
  z.number().int().min(1).max(65535).optional(),
);

const sipUserFeatureModuleKeys = [
  "voicemailEnabled",
  "pbxEnabled",
  "callForwardEnabled",
  "doNotDisturbEnabled",
  "callbackEnabled",
  "conferenceCallEnabled",
  "clearEnabled",
  "callerIdEnabled",
  "callRecordingEnabled",
  "ringGroupEnabled",
  "chatEnabled",
  "traceMeEnabled",
  "faxEnabled",
] as const;

const createSipUserSchema = z.object({
  userId: z.string().trim().min(1, "User is required"),
  registrationProfileId: z.string().trim().optional(),
  username: z.string().trim().optional(),
  password: z.string().trim().optional(),
  domain: z.string().trim().optional(),
  uri: z.string().trim().optional(),
  status: statusSchema.default("active"),
  provider: providerSchema.default("external_sip"),
  sipProviderId: z.string().trim().optional(),
  transport: transportSchema.default("udp"),
  port: portSchema,
  outboundProxy: z.string().trim().optional(),
  allowInternalCalls: z.boolean().optional(),
  internalBillingMode: billingModeSchema.optional(),
  internalTariffId: z.string().trim().optional(),
  allowInternationalCalls: z.boolean().optional(),
  internationalTariffId: z.string().trim().optional(),
  voicemailEnabled: z.boolean().optional(),
  pbxEnabled: z.boolean().optional(),
  callForwardEnabled: z.boolean().optional(),
  doNotDisturbEnabled: z.boolean().optional(),
  callbackEnabled: z.boolean().optional(),
  conferenceCallEnabled: z.boolean().optional(),
  clearEnabled: z.boolean().optional(),
  callerIdEnabled: z.boolean().optional(),
  callRecordingEnabled: z.boolean().optional(),
  ringGroupEnabled: z.boolean().optional(),
  chatEnabled: z.boolean().optional(),
  traceMeEnabled: z.boolean().optional(),
  faxEnabled: z.boolean().optional(),
  allocatedNumberId: z.string().trim().optional(),
  receiveInternationalCalls: z.boolean().optional(),
  receiveInternationalBillingMode: billingModeSchema.optional(),
  receiveInternationalTariffId: z.string().trim().optional(),
});

const updateSipUserSchema = z.object({
  registrationProfileId: z.string().trim().optional(),
  username: z.string().trim().optional(),
  password: z.string().trim().optional(),
  domain: z.string().trim().optional(),
  uri: z.string().trim().optional(),
  status: statusSchema.optional(),
  provider: providerSchema.optional(),
  sipProviderId: z.string().trim().optional(),
  transport: transportSchema.optional(),
  port: portSchema,
  outboundProxy: z.string().trim().optional(),
  allowInternalCalls: z.boolean().optional(),
  internalBillingMode: billingModeSchema.optional(),
  internalTariffId: z.string().trim().optional(),
  allowInternationalCalls: z.boolean().optional(),
  internationalTariffId: z.string().trim().optional(),
  voicemailEnabled: z.boolean().optional(),
  pbxEnabled: z.boolean().optional(),
  callForwardEnabled: z.boolean().optional(),
  doNotDisturbEnabled: z.boolean().optional(),
  callbackEnabled: z.boolean().optional(),
  conferenceCallEnabled: z.boolean().optional(),
  clearEnabled: z.boolean().optional(),
  callerIdEnabled: z.boolean().optional(),
  callRecordingEnabled: z.boolean().optional(),
  ringGroupEnabled: z.boolean().optional(),
  chatEnabled: z.boolean().optional(),
  traceMeEnabled: z.boolean().optional(),
  faxEnabled: z.boolean().optional(),
  allocatedNumberId: z.string().trim().optional(),
  receiveInternationalCalls: z.boolean().optional(),
  receiveInternationalBillingMode: billingModeSchema.optional(),
  receiveInternationalTariffId: z.string().trim().optional(),
});

function trim(value: unknown) {
  return String(value || "").trim();
}

function normalizeDomain(value: string) {
  const raw = trim(value).replace(/^sips?:/i, "");
  const withoutParams = raw.split(";")[0] || raw;
  const withoutUser = withoutParams.includes("@")
    ? withoutParams.split("@").pop() || withoutParams
    : withoutParams;
  return withoutUser.replace(/^\/+/, "").split("/")[0].trim();
}

function buildSipUri(username: string, domain: string, uri?: string) {
  const explicitUri = trim(uri);
  if (explicitUri) return explicitUri;
  return `sip:${username}@${domain}`;
}

function hasManualCredentials(payload: z.infer<typeof createSipUserSchema>) {
  return Boolean(trim(payload.username) || trim(payload.password) || trim(payload.domain) || trim(payload.uri));
}

function validateManualCredentials(username: string, password: string, domain: string) {
  if (!username || !password || !domain) {
    return "Username, password, and domain are required for manual SIP users.";
  }
  if (!/^[A-Za-z0-9_.-]{2,64}$/.test(username)) {
    return "SIP username can only contain letters, numbers, dots, underscores, or dashes.";
  }
  if (password.length < 4) {
    return "SIP password must be at least 4 characters.";
  }
  if (/\s/.test(domain)) {
    return "SIP domain can not contain spaces.";
  }
  return null;
}

function featureOverrides(payload: Record<string, any>) {
  const overrides: Record<string, any> = {};
  [
    "allowInternalCalls",
    "internalBillingMode",
    "internalTariffId",
    "allowInternationalCalls",
    "internationalTariffId",
    "sipProviderId",
    ...sipUserFeatureModuleKeys,
    "allocatedNumberId",
    "receiveInternationalCalls",
    "receiveInternationalBillingMode",
    "receiveInternationalTariffId",
  ].forEach((key) => {
    if (payload[key] !== undefined) {
      overrides[key] = payload[key];
    }
  });
  return overrides;
}

async function buildSipFeatureMetadata(payload: Record<string, any>, existingMetadata: Record<string, any> = {}) {
  const explicitProfileId = trim(payload.registrationProfileId);
  const existingProfileId = trim(existingMetadata.registrationProfileId);
  const profile = explicitProfileId
    ? await getSipRegistrationProfileById(explicitProfileId)
    : existingProfileId
      ? await getSipRegistrationProfileById(existingProfileId)
      : await getDefaultSipRegistrationProfile();

  return mergeSipFeatureSettings(profile, {
    ...existingMetadata,
    ...featureOverrides(payload),
    registrationProfileId: explicitProfileId || existingProfileId || profile?.id || null,
    registrationProfileName: profile?.name || existingMetadata.registrationProfileName || "",
  });
}

async function assignAllocatedNumber({
  userId,
  inventoryId,
  previousVirtualNumberId,
}: {
  userId: string;
  inventoryId?: string | null;
  previousVirtualNumberId?: string | null;
}) {
  const id = trim(inventoryId);
  if (!id) return null;

  const [item] = await db
    .select()
    .from(virtualNumberInventory)
    .where(eq(virtualNumberInventory.id, id))
    .limit(1);
  if (!item) {
    throw new Error("Selected DID number was not found.");
  }
  if (item.status !== "available" && item.assignedUserId !== userId) {
    throw new Error("Selected DID number is not available.");
  }

  let linkedNumberId = item.assignedVirtualNumberId || previousVirtualNumberId || null;
  if (!linkedNumberId) {
    const [linkedNumber] = await db
      .insert(userVirtualNumbers)
      .values({
        userId,
        provider: item.provider || "vonage",
        msisdn: item.msisdn,
        countryCode: item.countryCode,
        status: "active",
        capabilities: {
          voice: true,
          inbound: true,
          outbound: true,
          sip: true,
        },
        metadata: {
          source: "sip_user_allocate_number",
          inventoryId: item.id,
        },
      })
      .returning();
    linkedNumberId = linkedNumber.id;
  }

  await db
    .update(virtualNumberInventory)
    .set({
      status: "assigned",
      assignedUserId: userId,
      assignedVirtualNumberId: linkedNumberId,
      updatedAt: new Date(),
    })
    .where(eq(virtualNumberInventory.id, item.id));

  return {
    allocatedNumberId: item.id,
    allocatedMsisdn: item.msisdn,
    allocatedVirtualNumberId: linkedNumberId,
    allocatedCountryCode: item.countryCode,
  };
}

function publicSipAccount(row: {
  account: typeof userSipAccounts.$inferSelect;
  user: Pick<typeof users.$inferSelect, "id" | "displayUserId" | "email" | "name" | "phone" | "role" | "isBlocked" | "isDeleted">;
}) {
  const metadata = (row.account.metadata as Record<string, any>) || {};
  return {
    id: row.account.id,
    userId: row.account.userId,
    username: row.account.username,
    password: row.account.password,
    domain: row.account.domain,
    uri: row.account.uri,
    status: row.account.status,
    provider: metadata.provider || "local",
    sipProviderId: metadata.sipProviderId || "",
    transport: metadata.transport || "udp",
    port: metadata.port || null,
    outboundProxy: metadata.outboundProxy || metadata.proxy || "",
    registrationProfileId: metadata.registrationProfileId || null,
    registrationProfileName: metadata.registrationProfileName || "",
    allowInternalCalls: metadata.allowInternalCalls !== false,
    internalBillingMode: metadata.internalBillingMode || "free",
    internalTariffId: metadata.internalTariffId || "",
    allowInternationalCalls: metadata.allowInternationalCalls !== false,
    internationalTariffId: metadata.internationalTariffId || "",
    voicemailEnabled: metadata.voicemailEnabled === true,
    pbxEnabled: metadata.pbxEnabled === true,
    callForwardEnabled: metadata.callForwardEnabled === true,
    doNotDisturbEnabled: metadata.doNotDisturbEnabled === true,
    callbackEnabled: metadata.callbackEnabled === true,
    conferenceCallEnabled: metadata.conferenceCallEnabled === true,
    clearEnabled: metadata.clearEnabled !== false,
    callerIdEnabled: metadata.callerIdEnabled === true,
    callRecordingEnabled: metadata.callRecordingEnabled === true,
    ringGroupEnabled: metadata.ringGroupEnabled === true,
    chatEnabled: metadata.chatEnabled === true,
    traceMeEnabled: metadata.traceMeEnabled === true,
    faxEnabled: metadata.faxEnabled === true,
    allocatedNumberId: metadata.allocatedNumberId || "",
    allocatedMsisdn: metadata.allocatedMsisdn || "",
    receiveInternationalCalls: metadata.receiveInternationalCalls === true,
    receiveInternationalBillingMode: metadata.receiveInternationalBillingMode || "free",
    receiveInternationalTariffId: metadata.receiveInternationalTariffId || "",
    connectionStatus: metadata.connectionStatus || "unknown",
    connectionMessage: metadata.connectionMessage || "Connection has not been tested yet.",
    connectionCheckedAt: metadata.connectionCheckedAt || null,
    metadata,
    createdAt: row.account.createdAt,
    updatedAt: row.account.updatedAt,
    user: {
      id: row.user.id,
      displayUserId: row.user.displayUserId,
      email: row.user.email,
      name: row.user.name,
      phone: row.user.phone,
      role: row.user.role,
      isBlocked: row.user.isBlocked,
      isDeleted: row.user.isDeleted,
    },
  };
}

function isUniqueViolation(error: any) {
  return error?.code === "23505" || String(error?.message || "").toLowerCase().includes("duplicate key");
}

router.get("/sip-users", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureUserSipSchema();
    await ensureSipCommercialSchema();

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(5, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;
    const search = trim(req.query.search);
    const status = trim(req.query.status || "all");
    const provider = trim(req.query.provider || "all");

    const conditions: any[] = [];
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(userSipAccounts.username, pattern),
          ilike(userSipAccounts.domain, pattern),
          ilike(userSipAccounts.uri, pattern),
          ilike(users.email, pattern),
          ilike(users.name, pattern),
          ilike(users.phone, pattern),
          sql`${users.displayUserId}::text ILIKE ${pattern}`,
        ),
      );
    }
    if (status !== "all") {
      conditions.push(eq(userSipAccounts.status, status));
    }
    if (provider !== "all") {
      conditions.push(sql`${userSipAccounts.metadata}->>'provider' = ${provider}`);
    }

    const whereCondition = conditions.length ? and(...conditions) : undefined;

    const [rows, totalResult] = await Promise.all([
      db
        .select({
          account: userSipAccounts,
          user: {
            id: users.id,
            displayUserId: users.displayUserId,
            email: users.email,
            name: users.name,
            phone: users.phone,
            role: users.role,
            isBlocked: users.isBlocked,
            isDeleted: users.isDeleted,
          },
        })
        .from(userSipAccounts)
        .innerJoin(users, eq(userSipAccounts.userId, users.id))
        .where(whereCondition)
        .orderBy(desc(userSipAccounts.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
        .from(userSipAccounts)
        .innerJoin(users, eq(userSipAccounts.userId, users.id))
        .where(whereCondition),
    ]);

    const total = totalResult[0]?.count || 0;
    return ApiResponse.success(res, "SIP users fetched successfully", {
      data: rows.map(publicSipAccount),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to fetch SIP users");
  }
});

router.get("/sip-users/users", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureUserSipSchema();
    await ensureSipCommercialSchema();
    const search = trim(req.query.search);
    const limit = Math.min(100, Math.max(10, Number(req.query.limit || 50)));
    const availableOnly = String(req.query.availableOnly || "false") === "true";
    const conditions: any[] = [eq(users.isDeleted, false)];

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
    if (availableOnly) {
      conditions.push(isNull(userSipAccounts.id));
    }

    const rows = await db
      .select({
        id: users.id,
        displayUserId: users.displayUserId,
        email: users.email,
        name: users.name,
        phone: users.phone,
        role: users.role,
        sipAccountId: userSipAccounts.id,
      })
      .from(users)
      .leftJoin(userSipAccounts, eq(userSipAccounts.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(users.createdAt))
      .limit(limit);

    return ApiResponse.success(res, "Users fetched successfully", { users: rows });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to fetch users");
  }
});

router.get("/sip-users/available-numbers", requireAdmin, async (req: Request, res: Response) => {
  try {
    const search = trim(req.query.search);
    const limit = Math.min(200, Math.max(20, Number(req.query.limit || 100)));
    const conditions: any[] = [eq(virtualNumberInventory.status, "available")];
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(or(ilike(virtualNumberInventory.msisdn, pattern), ilike(virtualNumberInventory.countryCode, pattern)));
    }

    const rows = await db
      .select({
        id: virtualNumberInventory.id,
        msisdn: virtualNumberInventory.msisdn,
        countryCode: virtualNumberInventory.countryCode,
        provider: virtualNumberInventory.provider,
        setupFee: virtualNumberInventory.setupFee,
        monthlyFee: virtualNumberInventory.monthlyFee,
      })
      .from(virtualNumberInventory)
      .where(and(...conditions))
      .orderBy(asc(virtualNumberInventory.countryCode), asc(virtualNumberInventory.msisdn))
      .limit(limit);

    return ApiResponse.success(res, "Available DID Numbers Fetched Successfully", { numbers: rows });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed To Fetch Available DID Numbers");
  }
});

router.get("/sip-users/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureUserSipSchema();
    await ensureSipCommercialSchema();
    const [row] = await db
      .select({ account: userSipAccounts, user: users })
      .from(userSipAccounts)
      .innerJoin(users, eq(userSipAccounts.userId, users.id))
      .where(eq(userSipAccounts.id, req.params.id))
      .limit(1);

    if (!row) {
      return ApiResponse.notFound(res, "SIP User Not Found");
    }
    return ApiResponse.success(res, "SIP User Fetched Successfully", { account: publicSipAccount(row) });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed To Fetch SIP User");
  }
});

router.post("/sip-users", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureUserSipSchema();
    await ensureSipCommercialSchema();
    const payload = createSipUserSchema.parse(req.body);

    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user || user.isDeleted) {
      return ApiResponse.notFound(res, "User not found");
    }

    const existing = await db
      .select()
      .from(userSipAccounts)
      .where(eq(userSipAccounts.userId, payload.userId))
      .limit(1);
    if (existing.length) {
      return ApiResponse.conflict(res, "This user already has a SIP account");
    }

    if (!hasManualCredentials(payload)) {
      const account = await getOrCreateUserSipAccount(payload.userId);
      const metadata = (account.metadata as Record<string, any>) || {};
      const featureMetadata = await buildSipFeatureMetadata(payload, metadata);
      const allocatedNumber = await assignAllocatedNumber({
        userId: payload.userId,
        inventoryId: payload.allocatedNumberId,
        previousVirtualNumberId: metadata.allocatedVirtualNumberId,
      });
      const nextUsername = allocatedNumber?.allocatedMsisdn || account.username;
      const nextDomain = account.domain;
      const [updated] = await db
        .update(userSipAccounts)
        .set({
          username: nextUsername,
          uri: buildSipUri(nextUsername, nextDomain),
          status: payload.status,
          metadata: {
            ...featureMetadata,
            ...(allocatedNumber || {}),
            source: metadata.source || "auto",
            updatedByAdmin: req.session.adminId || null,
          },
          updatedAt: new Date(),
        })
        .where(eq(userSipAccounts.id, account.id))
        .returning();

      return ApiResponse.created(res, "SIP user provisioned successfully", {
        account: publicSipAccount({ account: updated || account, user }),
      });
    }

    let selectedNumber: { id: string; msisdn: string } | null = null;
    if (payload.allocatedNumberId) {
      const [inventoryItem] = await db
        .select({ id: virtualNumberInventory.id, msisdn: virtualNumberInventory.msisdn, status: virtualNumberInventory.status, assignedUserId: virtualNumberInventory.assignedUserId })
        .from(virtualNumberInventory)
        .where(eq(virtualNumberInventory.id, payload.allocatedNumberId))
        .limit(1);
      if (!inventoryItem) return ApiResponse.badRequest(res, "Selected DID number was not found.");
      if (inventoryItem.status !== "available" && inventoryItem.assignedUserId !== payload.userId) {
        return ApiResponse.badRequest(res, "Selected DID number is not available.");
      }
      selectedNumber = inventoryItem;
    }

    const username = selectedNumber?.msisdn || trim(payload.username);
    const password = trim(payload.password);
    const domain = normalizeDomain(payload.domain || "");
    const validationError = validateManualCredentials(username, password, domain);
    if (validationError) {
      return ApiResponse.badRequest(res, validationError);
    }

    const metadata = {
      provider: payload.provider,
      source: "admin",
      provisioned: true,
      transport: payload.transport,
      port: payload.port || (payload.transport === "tls" ? 5061 : 5060),
      outboundProxy: trim(payload.outboundProxy) || null,
      updatedByAdmin: req.session.adminId || null,
      note: "Admin-managed SIP identity.",
    };
    const featureMetadata = await buildSipFeatureMetadata(payload, metadata);

    const [account] = await db
      .insert(userSipAccounts)
      .values({
        userId: payload.userId,
        username,
        password,
        domain,
        uri: buildSipUri(username, domain, payload.uri),
        status: payload.status,
        metadata: featureMetadata,
      })
      .returning();

    const allocatedNumber = await assignAllocatedNumber({
      userId: payload.userId,
      inventoryId: payload.allocatedNumberId,
      previousVirtualNumberId: featureMetadata.allocatedVirtualNumberId,
    });
    const finalAccount = allocatedNumber
      ? (await db
          .update(userSipAccounts)
          .set({
            metadata: {
              ...featureMetadata,
              ...allocatedNumber,
            },
            updatedAt: new Date(),
          })
          .where(eq(userSipAccounts.id, account.id))
          .returning())[0] || account
      : account;

    return ApiResponse.created(res, "SIP user created successfully", {
      account: publicSipAccount({ account: finalAccount, user }),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(res, error.errors[0]?.message || "Invalid SIP user payload", error.errors);
    }
    if (isUniqueViolation(error)) {
      return ApiResponse.conflict(res, "SIP username or user account already exists");
    }
    return ApiResponse.serverError(res, error.message || "Failed to create SIP user");
  }
});

router.patch("/sip-users/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureUserSipSchema();
    await ensureSipCommercialSchema();
    const payload = updateSipUserSchema.parse(req.body);
    const [row] = await db
      .select({ account: userSipAccounts, user: users })
      .from(userSipAccounts)
      .innerJoin(users, eq(userSipAccounts.userId, users.id))
      .where(eq(userSipAccounts.id, req.params.id))
      .limit(1);

    if (!row) {
      return ApiResponse.notFound(res, "SIP user not found");
    }

    const previousMetadata = (row.account.metadata as Record<string, any>) || {};
    const allocatedNumber = payload.allocatedNumberId
      ? await assignAllocatedNumber({
          userId: row.account.userId,
          inventoryId: payload.allocatedNumberId,
          previousVirtualNumberId: previousMetadata.allocatedVirtualNumberId,
        })
      : null;

    const username = allocatedNumber?.allocatedMsisdn || trim(payload.username) || row.account.username;
    const password = trim(payload.password) || row.account.password;
    const domain = payload.domain !== undefined ? normalizeDomain(payload.domain) : row.account.domain;
    const validationError = validateManualCredentials(username, password, domain);
    if (validationError) {
      return ApiResponse.badRequest(res, validationError);
    }

    const transport = payload.transport || previousMetadata.transport || "udp";
    const port = payload.port ?? previousMetadata.port ?? (transport === "tls" ? 5061 : 5060);
    const outboundProxy =
      payload.outboundProxy !== undefined
        ? trim(payload.outboundProxy) || null
        : previousMetadata.outboundProxy || previousMetadata.proxy || null;
    const featureMetadata = await buildSipFeatureMetadata(payload, {
      ...previousMetadata,
      provider: payload.provider || previousMetadata.provider || "external_sip",
      source: previousMetadata.source || "admin",
      provisioned: previousMetadata.provisioned ?? true,
      transport,
      port,
      outboundProxy,
      ...(allocatedNumber || {}),
    });

    const [updated] = await db
      .update(userSipAccounts)
      .set({
        username,
        password,
        domain,
        uri: buildSipUri(username, domain, payload.uri),
        status: payload.status || row.account.status,
        metadata: {
          ...featureMetadata,
          updatedByAdmin: req.session.adminId || null,
          updatedByAdminAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(userSipAccounts.id, req.params.id))
      .returning();

    return ApiResponse.success(res, "SIP user updated successfully", {
      account: publicSipAccount({ account: updated, user: row.user }),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(res, error.errors[0]?.message || "Invalid SIP user payload", error.errors);
    }
    if (isUniqueViolation(error)) {
      return ApiResponse.conflict(res, "SIP username already exists");
    }
    return ApiResponse.serverError(res, error.message || "Failed to update SIP user");
  }
});

router.post("/sip-users/:id/test", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureUserSipSchema();
    await ensureSipCommercialSchema();
    const [account] = await db.select().from(userSipAccounts).where(eq(userSipAccounts.id, req.params.id)).limit(1);
    if (!account) {
      return ApiResponse.notFound(res, "SIP user not found");
    }
    const result = await testUserSipAccountConnection(account.userId);
    return ApiResponse.success(res, "SIP user connection test completed", result);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to test SIP user");
  }
});

export default router;
