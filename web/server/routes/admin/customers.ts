"use strict";

import { Router, type Request, type Response } from "express";
import { storage } from "../../storage";
import { db } from "../../db";
import { asyncHandler } from "../../lib/asyncHandler";
import { NotFoundError } from "../../lib/errors";
import { requireAdmin } from "../../lib/middleware";
import { logger } from "../../lib/logger";
import * as ApiResponse from "../../utils/response";
import {
  kycDocuments,
  platformSettings,
  providers,
  rateTableAssignments,
  rateTablePrices,
  resellerPackagePrices,
  resellerProviderSettings,
  unifiedPackages,
  users,
  walletTransactions,
} from "@shared/schema";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import {
  normalizeUserModuleOverrideSettings,
  normalizeUserModuleOverrides,
  ROLE_OPTIONS_VERSION,
  USER_MODULE_OPTIONS_SETTING_PREFIX,
  type RoleOptionRole,
} from "@shared/roleOptions";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { providerFactory } from "../../providers";
import { generateInstallationEmail, sendEmail } from "../../email";
import { getPackageBasePriceUsd, normalizeResellerSubdomainInput } from "../../helpers/packagePricing";
import { applyRateTableToUser, ensureRateTables, getRateAssignmentForUser } from "../../utils/rateTables";
import { ensureKycControls } from "../../utils/kycControls";
import { getVoucherLimitForUser, saveVoucherLimitForUser } from "../../utils/voucherLimits";
import { getStoredRoleOptionsConfig } from "../../utils/roleOptionsConfig";
import { getSecurityConfig, saveSecurityConfig } from "../../services/security-service";
import { queueAdminAlert } from "../../services/admin-alert-service";
import {
  getSenderIdLimitStatus,
  saveUserSenderIdLimit,
} from "../../services/sender-id-limit-service";

const router = Router();

const money = (value: number) => value.toFixed(2);

const addBalanceSchema = z.object({
  amount: z.coerce.number().positive().max(100000),
  description: z.string().max(500).optional(),
});

const changePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const changeEmailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

const statusSchema = z.object({
  status: z.enum(["active", "inactive", "deactivated"]),
});

const customerRoleSchema = z.enum(["customer", "agent", "reseller"]);
const accountModeSchema = z.enum(["live", "sandbox", "demo"]);

const createCustomerSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  name: z.string().max(120).optional().nullable(),
  password: z.string().trim().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  role: customerRoleSchema.default("customer"),
  accountMode: accountModeSchema.optional(),
  rateTableId: z.string().optional().nullable(),
  kycVerificationRequired: z.coerce.boolean().default(true),
  modules: z.record(z.boolean()).optional().default({}),
  mobileModules: z.record(z.boolean()).optional(),
});

const roleSchema = z.object({
  role: customerRoleSchema,
});

const loginAsCustomerSchema = z.object({
  role: customerRoleSchema.optional(),
});

const customerSecuritySchema = z.object({
  twoFactorEnabled: z.coerce.boolean().optional(),
  otpEmailEnabled: z.coerce.boolean().optional(),
  otpPhoneEnabled: z.coerce.boolean().optional(),
});

function publicCustomerSecurity(user: Awaited<ReturnType<typeof storage.getUser>>) {
  const config = getSecurityConfig(user);
  return {
    twoFactorEnabled: config.twoFactorEnabled,
    otpEmailEnabled: config.otpEmailEnabled,
    otpPhoneEnabled: config.otpPhoneEnabled,
    authenticatorConfigured: Boolean(config.totpSecret),
  };
}

const customerModulesSchema = z.object({
  modules: z.record(z.boolean()).default({}),
  mobileModules: z.record(z.boolean()).optional(),
});

type CustomerRole = z.infer<typeof customerRoleSchema>;
type AccountMode = z.infer<typeof accountModeSchema>;

const customerRoleLabels: Record<CustomerRole, string> = {
  customer: "User",
  agent: "Agent",
  reseller: "Reseller",
};

const loginAsCustomerRedirects: Record<CustomerRole, string> = {
  customer: "/account/dashboard",
  agent: "/account/dashboard",
  reseller: "/account/dashboard",
};

function normalizeAccountMode(role: CustomerRole, mode?: AccountMode | string | null): AccountMode {
  if (role === "agent" || role === "reseller") {
    return mode === "sandbox" ? "sandbox" : "live";
  }
  return mode === "demo" ? "demo" : "live";
}

function moduleRoleKey(role: CustomerRole): RoleOptionRole | null {
  if (role === "agent") return "agent";
  if (role === "reseller") return "reseller";
  return "user";
}

async function saveCustomerModuleOverrides(
  userId: string,
  role: CustomerRole,
  modules: Record<string, boolean>,
  mobileModules: Record<string, boolean> | undefined,
  adminId: string | null,
) {
  const moduleRole = moduleRoleKey(role);
  if (!moduleRole) return;

  const normalizedModules = normalizeUserModuleOverrides(moduleRole, modules);
  const normalizedMobileModules = normalizeUserModuleOverrides(moduleRole, mobileModules ?? modules);
  const value = JSON.stringify({
    version: ROLE_OPTIONS_VERSION,
    role: moduleRole,
    modules: normalizedModules,
    mobileModules: normalizedMobileModules,
  });

  await db
    .insert(platformSettings)
    .values({
      key: `${USER_MODULE_OPTIONS_SETTING_PREFIX}${userId}`,
      value,
      description: `Module access overrides for ${role} ${userId}`,
      category: "modules",
      updatedBy: adminId,
    })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: {
        value,
        description: `Module access overrides for ${role} ${userId}`,
        category: "modules",
        updatedAt: new Date(),
        updatedBy: adminId,
      },
    });

  const [customer] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  queueAdminAlert("services_modules", {
    title: "Customer Services/Modules Updated",
    message: `Module access was updated for ${customer?.email || userId}.`,
    actionPath: `/admin/customers`,
    metadata: {
      userId,
      customerEmail: customer?.email || null,
      customerName: customer?.name || null,
      role,
      modules: normalizedModules,
      mobileModules: normalizedMobileModules,
      adminId,
    },
  });
}

async function getCustomerModuleSettings(userId: string, role: CustomerRole) {
  const moduleRole = moduleRoleKey(role);
  if (!moduleRole) return null;

  const config = await getStoredRoleOptionsConfig();
  const defaults = normalizeUserModuleOverrides(moduleRole, config.roles[moduleRole].modules);
  const mobileDefaults = normalizeUserModuleOverrides(moduleRole, config.roles[moduleRole].mobileModules);

  const [saved] = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, `${USER_MODULE_OPTIONS_SETTING_PREFIX}${userId}`))
    .limit(1);

  let overrides: Record<string, boolean> = {};
  let mobileOverrides: Record<string, boolean> = {};
  if (saved?.value) {
    try {
      const parsed = JSON.parse(saved.value);
      const normalizedOverrides = normalizeUserModuleOverrideSettings(moduleRole, parsed);
      overrides = normalizedOverrides.modules;
      mobileOverrides = normalizedOverrides.mobileModules;
    } catch (error: any) {
      logger.warn("Failed to parse customer module overrides", {
        userId,
        error: error?.message,
      });
    }
  }

  return {
    role: moduleRole,
    modules: { ...defaults, ...overrides },
    mobileModules: { ...mobileDefaults, ...mobileOverrides },
    defaults,
    mobileDefaults,
  };
}

function getCustomerRole(value?: string | null): CustomerRole {
  return value === "agent" || value === "reseller" ? value : "customer";
}

function getLoginAsTokenSecret() {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET or SESSION_SECRET is required for Login as customer");
  }
  return secret;
}

function getRequestBaseUrl(req: Request) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedHost = req.headers["x-forwarded-host"];
  const protocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto?.split(",")[0]?.trim() || req.protocol;
  const host = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost?.split(",")[0]?.trim() || req.get("host") || `localhost:${process.env.PORT || 5000}`;
  return `${protocol}://${host}`;
}

const assignRateSchema = z.object({
  rateTableId: z.string().min(1, "Rate table is required"),
});

const rejectKycSchema = z.object({
  reason: z.string().trim().min(1, "Rejection reason is required").max(1000),
});

const resellerStorefrontSchema = z.object({
  subdomain: z.string().optional().nullable(),
  storeName: z.string().max(120).optional().nullable(),
  isActive: z.coerce.boolean().optional(),
});

const resellerProviderSchema = z.object({
  isEnabled: z.coerce.boolean(),
});

const resellerRetailMarkupSchema = z.object({
  markupPercent: z.coerce.number().min(0, "Markup must be a positive percentage").max(10000),
});

const applyPackageSchema = z.object({
  packageId: z.string().min(1),
  sendEmail: z.coerce.boolean().default(true),
});

const refundWalletTransactionSchema = z.object({
  amount: z.coerce.number().positive().max(100000).optional(),
  reason: z.string().trim().min(1, "Refund reason is required").max(300),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const voucherLimitSchema = z.object({
  limit: z.coerce.number().min(0, "Voucher limit must be zero or higher").max(10000000),
});

type WalletTransactionRow = typeof walletTransactions.$inferSelect;

const walletDebitTypes = new Set(["purchase_debit", "voucher_debit", "refund_debit"]);
const walletRefundTypes = ["refund", "refund_debit"];

function toMoneyNumber(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function getWalletTransactionMovement(transaction: WalletTransactionRow) {
  const balanceBefore = toMoneyNumber(transaction.balanceBefore);
  const balanceAfter = toMoneyNumber(transaction.balanceAfter);
  const movement = Math.round((balanceAfter - balanceBefore) * 100) / 100;
  return Number.isFinite(movement) ? movement : 0;
}

function isWalletDebitTransaction(transaction: WalletTransactionRow) {
  const movement = getWalletTransactionMovement(transaction);
  if (movement < 0) return true;
  if (movement > 0) return false;
  return walletDebitTypes.has(transaction.type);
}

function getWalletTransactionRefundBase(transaction: WalletTransactionRow) {
  const movementAmount = Math.abs(getWalletTransactionMovement(transaction));
  if (movementAmount > 0) return movementAmount;
  return Math.abs(toMoneyNumber(transaction.amount));
}

router.get(
  "/",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search as string | undefined;
    const kycStatus = req.query.kycStatus as string | undefined;
    const status = req.query.status as string | undefined;
    const role = req.query.role as string | undefined;

    const customers = await storage.getUsersWithPagination(
      page,
      limit,
      search,
      kycStatus,
      status,
      role
    );

    return ApiResponse.success(
      res,
      "Customers fetched successfully",
      customers
    );
  })
);

router.post(
  "/",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    await ensureRateTables();
    await ensureKycControls();
    const {
      email,
      name,
      password,
      role,
      accountMode,
      rateTableId,
      kycVerificationRequired,
      modules,
      mobileModules,
    } = createCustomerSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await storage.getUserByEmail(normalizedEmail);
    if (existingUser) {
      return ApiResponse.badRequest(res, "Email already exists in the system");
    }

    const normalizedPassword = password?.trim();
    const hashedPassword = normalizedPassword
      ? await bcrypt.hash(normalizedPassword, 10)
      : null;

    const user = await storage.createUser({
      email: normalizedEmail,
      name: name?.trim() || null,
      hashedPassword,
      passwordSetAt: hashedPassword ? new Date() : null,
      role,
      accountMode: normalizeAccountMode(role, accountMode),
      kycStatus: "pending",
      kycVerificationRequired,
    });

    let rateAssignment = null;
    if (rateTableId && (role === "agent" || role === "reseller")) {
      rateAssignment = await applyRateTableToUser(user.id, rateTableId, req.session.adminId || null);
    }
    await saveCustomerModuleOverrides(user.id, role, modules, mobileModules, req.session.adminId || null);

    logger.info("Customer created by admin", {
      customerId: user.id,
      adminId: req.session.adminId,
      role,
      rateTableId: rateTableId || null,
      modulesConfigured: true,
    });

    return ApiResponse.created(
      res,
      `${role === "customer" ? "User" : role[0].toUpperCase() + role.slice(1)} created successfully`,
      { ...user, rateAssignment },
    );
  })
);

router.get(
  "/:id/wallet-transactions",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await storage.getUser(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const transactions = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, customer.id))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit);

    const transactionIds = transactions.map((transaction) => transaction.id);
    const refundRows = transactionIds.length
      ? await db
        .select({
          referenceId: walletTransactions.referenceId,
          total: sql<string>`COALESCE(SUM(ABS(${walletTransactions.amount}::numeric)), 0)`,
        })
        .from(walletTransactions)
        .where(
          and(
            inArray(walletTransactions.referenceId, transactionIds),
            inArray(walletTransactions.type, walletRefundTypes),
            eq(walletTransactions.status, "completed"),
          ),
        )
        .groupBy(walletTransactions.referenceId)
      : [];

    const refundTotals = new Map(
      refundRows
        .filter((row) => row.referenceId)
        .map((row) => [row.referenceId as string, toMoneyNumber(row.total)]),
    );

    return ApiResponse.success(res, "Customer wallet transactions fetched successfully", {
      balance: customer.walletBalance || "0.00",
      currency: "USD",
      transactions: transactions.map((transaction) => {
        const refundedAmount = refundTotals.get(transaction.id) || 0;
        const refundableAmount = Math.max(getWalletTransactionRefundBase(transaction) - refundedAmount, 0);
        return {
          ...transaction,
          refundedAmount: money(refundedAmount),
          refundableAmount: money(refundableAmount),
          refundDirection: isWalletDebitTransaction(transaction) ? "credit" : "debit",
        };
      }),
    });
  }),
);

router.post(
  "/wallet-transactions/:transactionId/refund",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const payload = refundWalletTransactionSchema.parse(req.body);
    const transactionId = req.params.transactionId;

    try {
      const result = await db.transaction(async (tx) => {
        const [originalTransaction] = await tx
          .select()
          .from(walletTransactions)
          .where(eq(walletTransactions.id, transactionId))
          .limit(1);

        if (!originalTransaction) {
          throw new Error("Wallet transaction not found");
        }

        if (walletRefundTypes.includes(originalTransaction.type)) {
          throw new Error("Refund transactions cannot be refunded again");
        }

        if (originalTransaction.status !== "completed") {
          throw new Error(`Only completed transactions can be refunded. Current status: ${originalTransaction.status}`);
        }

        const [customer] = await tx
          .select()
          .from(users)
          .where(eq(users.id, originalTransaction.userId))
          .limit(1);

        if (!customer) {
          throw new Error("Customer not found");
        }

        const [{ total = "0" } = { total: "0" }] = await tx
          .select({
            total: sql<string>`COALESCE(SUM(ABS(${walletTransactions.amount}::numeric)), 0)`,
          })
          .from(walletTransactions)
          .where(
            and(
              eq(walletTransactions.referenceId, originalTransaction.id),
              inArray(walletTransactions.type, walletRefundTypes),
              eq(walletTransactions.status, "completed"),
            ),
          );

        const baseAmount = getWalletTransactionRefundBase(originalTransaction);
        const alreadyRefunded = toMoneyNumber(total);
        const remainingAmount = Math.max(baseAmount - alreadyRefunded, 0);
        const refundAmount = toMoneyNumber(payload.amount ?? remainingAmount);

        if (remainingAmount <= 0) {
          throw new Error("This wallet transaction has already been fully refunded");
        }

        if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
          throw new Error("Refund amount must be greater than zero");
        }

        if (refundAmount > remainingAmount + 0.001) {
          throw new Error(`Refund amount cannot exceed remaining refundable amount of $${money(remainingAmount)}`);
        }

        const originalWasDebit = isWalletDebitTransaction(originalTransaction);
        const balanceBefore = toMoneyNumber(customer.walletBalance || "0.00");
        const balanceAfter = originalWasDebit
          ? balanceBefore + refundAmount
          : balanceBefore - refundAmount;

        if (balanceAfter < -0.001) {
          throw new Error("Customer wallet balance is too low to reverse this credit transaction");
        }

        const [updatedUser] = await tx
          .update(users)
          .set({
            walletBalance: money(balanceAfter),
            updatedAt: new Date(),
          })
          .where(eq(users.id, customer.id))
          .returning();

        const [refundTransaction] = await tx
          .insert(walletTransactions)
          .values({
            userId: customer.id,
            type: originalWasDebit ? "refund" : "refund_debit",
            status: "completed",
            amount: money(refundAmount),
            currency: originalTransaction.currency || "USD",
            balanceBefore: money(balanceBefore),
            balanceAfter: money(balanceAfter),
            provider: "admin",
            referenceId: originalTransaction.id,
            description: originalWasDebit
              ? `Refund for ${originalTransaction.description || originalTransaction.type}`
              : `Reversal for ${originalTransaction.description || originalTransaction.type}`,
            metadata: {
              refundType: "wallet_transaction",
              originalTransactionId: originalTransaction.id,
              originalTransactionType: originalTransaction.type,
              reason: payload.reason,
              notes: payload.notes || null,
              adminId: req.session.adminId,
              direction: originalWasDebit ? "credit" : "debit",
            },
            completedAt: new Date(),
          })
          .returning();

        return {
          user: updatedUser,
          originalTransaction,
          refundTransaction,
          refundedAmount: money(refundAmount),
          direction: originalWasDebit ? "credit" : "debit",
        };
      });

      try {
        await storage.createNotification({
          userId: result.user.id,
          type: "wallet",
          title: "Wallet transaction refunded",
          message:
            result.direction === "credit"
              ? `$${result.refundedAmount} has been credited to your wallet by support.`
              : `$${result.refundedAmount} has been reversed from your wallet by support.`,
          read: false,
          metadata: {
            transactionId: result.originalTransaction.id,
            refundTransactionId: result.refundTransaction.id,
            adminId: req.session.adminId,
          },
        });
      } catch (notificationError: any) {
        logger.warn("Failed to create wallet refund notification", {
          transactionId,
          error: notificationError.message,
        });
      }

      queueAdminAlert("charges_fees", {
        title: "Wallet Transaction Refunded",
        message: `Wallet transaction ${result.originalTransaction.id} was refunded for $${result.refundedAmount}.`,
        actionPath: "/admin/transactions",
        metadata: {
          userId: result.user.id,
          customerEmail: result.user.email,
          originalTransactionId: result.originalTransaction.id,
          refundTransactionId: result.refundTransaction.id,
          amount: result.refundedAmount,
          direction: result.direction,
          adminId: req.session.adminId || null,
        },
      });

      logger.info("Wallet transaction refunded by admin", {
        transactionId,
        refundTransactionId: result.refundTransaction.id,
        adminId: req.session.adminId,
        amount: result.refundedAmount,
      });

      return ApiResponse.success(res, "Wallet transaction refunded successfully", result);
    } catch (error: any) {
      const message = error?.message || "Failed to refund wallet transaction";
      if (message.includes("not found")) {
        return ApiResponse.notFound(res, message);
      }
      return ApiResponse.badRequest(res, message);
    }
  }),
);


router.get(
  "/:id/voucher-limit",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const voucherLimit = await getVoucherLimitForUser(req.params.id);
    if (!voucherLimit.user) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    return ApiResponse.success(res, "Voucher limit fetched successfully", {
      customerId: voucherLimit.user.id,
      role: voucherLimit.user.role,
      limit: money(voucherLimit.limit),
      used: money(voucherLimit.used),
      remaining: voucherLimit.remaining === null ? null : money(voucherLimit.remaining),
      unlimited: voucherLimit.unlimited,
      applies: voucherLimit.user.role === "agent" || voucherLimit.user.role === "reseller",
    });
  }),
);

router.post(
  "/:id/voucher-limit",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { limit } = voucherLimitSchema.parse(req.body);
    const customer = await storage.getUser(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }
    if (customer.role !== "agent" && customer.role !== "reseller") {
      return ApiResponse.badRequest(res, "Voucher limits can be set for Agent or Reseller accounts");
    }

    const voucherLimit = await saveVoucherLimitForUser(customer.id, limit);

    logger.info("Customer voucher limit updated by admin", {
      customerId: customer.id,
      adminId: req.session.adminId,
      limit: money(voucherLimit.limit),
    });

    return ApiResponse.success(res, "Voucher limit saved successfully", {
      customerId: customer.id,
      role: customer.role,
      limit: money(voucherLimit.limit),
      used: money(voucherLimit.used),
      remaining: voucherLimit.remaining === null ? null : money(voucherLimit.remaining),
      unlimited: voucherLimit.unlimited,
    });
  }),
);

router.get(
  "/:id/modules",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await storage.getUser(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    const role = getCustomerRole(customer.role);
    const settings = await getCustomerModuleSettings(customer.id, role);
    if (!settings) {
      return ApiResponse.badRequest(res, "Modules can be set for User, Agent, or Reseller accounts");
    }

    return ApiResponse.success(res, "Customer modules fetched successfully", {
      customerId: customer.id,
      role: settings.role,
      modules: settings.modules,
      mobileModules: settings.mobileModules,
      defaults: settings.defaults,
      mobileDefaults: settings.mobileDefaults,
    });
  }),
);

router.put(
  "/:id/modules",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { modules, mobileModules } = customerModulesSchema.parse(req.body);
    const customer = await storage.getUser(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    const role = getCustomerRole(customer.role);
    const settings = await getCustomerModuleSettings(customer.id, role);
    if (!settings) {
      return ApiResponse.badRequest(res, "Modules can be set for User, Agent, or Reseller accounts");
    }

    await saveCustomerModuleOverrides(customer.id, role, modules, mobileModules, req.session.adminId || null);
    const updatedSettings = await getCustomerModuleSettings(customer.id, role);

    logger.info("Customer module access updated by admin", {
      customerId: customer.id,
      role,
      adminId: req.session.adminId,
    });

    return ApiResponse.success(res, "Customer modules saved successfully", {
      customerId: customer.id,
      role: updatedSettings?.role || settings.role,
      modules: updatedSettings?.modules || settings.modules,
      mobileModules: updatedSettings?.mobileModules || settings.mobileModules,
    });
  }),
);

router.get(
  "/:id/sender-id-limit",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await storage.getUser(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    const status = await getSenderIdLimitStatus(customer.id);
    return ApiResponse.success(res, "Sender ID limit fetched successfully", {
      customerId: customer.id,
      role: getCustomerRole(customer.role),
      ...status,
    });
  }),
);

router.put(
  "/:id/sender-id-limit",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await storage.getUser(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    try {
      const status = await saveUserSenderIdLimit(
        customer.id,
        req.body?.limit,
        req.session.adminId || null,
      );

      logger.info("Customer Sender ID limit updated by admin", {
        customerId: customer.id,
        adminId: req.session.adminId,
        limit: status.overrideLimit,
        effectiveLimit: status.effectiveLimit,
      });

      return ApiResponse.success(res, "Sender ID limit saved successfully", {
        customerId: customer.id,
        role: getCustomerRole(customer.role),
        ...status,
      });
    } catch (error: any) {
      return ApiResponse.badRequest(res, error?.message || "Failed to save Sender ID limit");
    }
  }),
);


router.get(
  "/:id",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await storage.getUserWithDetails(req.params.id);
    if (!user) {
      return ApiResponse.notFound(res, "Customer not found");
    }
    return ApiResponse.success(res, "Customer fetched successfully", user);
  })
);

router.get(
  "/:id/rate",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await storage.getUser(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    const assignment = await getRateAssignmentForUser(customer.id);
    return ApiResponse.success(res, "Customer rate assignment fetched successfully", assignment);
  }),
);

router.post(
  "/:id/rate",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { rateTableId } = assignRateSchema.parse(req.body);
    const customer = await storage.getUser(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }
    if (customer.role !== "agent" && customer.role !== "reseller") {
      return ApiResponse.badRequest(res, "Rate tables can be assigned to Agent or Reseller accounts");
    }

    const assignment = await applyRateTableToUser(customer.id, rateTableId, req.session.adminId || null);
    return ApiResponse.success(res, "Rate table assigned successfully", assignment);
  }),
);

router.post(
  "/:id/login-as",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { role: requestedRole } = loginAsCustomerSchema.parse(req.body || {});
    const customer = await storage.getUser(req.params.id);
    if (!customer || customer.isDeleted) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    if (customer.isBlocked) {
      return ApiResponse.badRequest(res, "Cannot login as a deactivated customer");
    }

    const role = getCustomerRole(customer.role);
    if (requestedRole && requestedRole !== role) {
      return ApiResponse.badRequest(
        res,
        `This Account is a ${customerRoleLabels[role]}. Use Login as ${customerRoleLabels[role]}.`,
      );
    }

    const adminId = req.session.adminId!;
    const token = jwt.sign(
      {
        type: "admin_login_as_customer",
        customerId: customer.id,
        adminId,
        role,
      },
      getLoginAsTokenSecret(),
      { expiresIn: "5m" },
    );
    const loginUrl = new URL("/api/auth/admin-login-as", getRequestBaseUrl(req));
    loginUrl.searchParams.set("token", token);

    logger.info("Admin generated customer login link", {
      adminId,
      customerId: customer.id,
      role,
    });

    return ApiResponse.success(res, `Login as ${customerRoleLabels[role]} link ready`, {
      loginUrl: loginUrl.toString(),
      redirectTo: loginAsCustomerRedirects[role],
      expiresInSeconds: 300,
      role,
      user: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        role,
      },
    });
  }),
);

function normalizeKycDocumentPath(filePath?: string | null) {
  if (!filePath) return "";
  let relativePath = filePath.replace(/\\/g, "/");
  if (relativePath.includes("uploads/kyc/")) {
    relativePath = `/uploads/kyc/${relativePath.split("uploads/kyc/")[1]}`;
  } else if (!relativePath.startsWith("/")) {
    relativePath = `/${relativePath}`;
  }
  return relativePath;
}

router.get(
  "/:id/kyc",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    await ensureKycControls();
    const customer = await storage.getUser(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    const documents = await storage.getKycDocumentsByUser(customer.id);

    return ApiResponse.success(res, "Customer KYC review fetched successfully", {
      customer,
      documents: documents.map((document) => ({
        ...document,
        filePath: normalizeKycDocumentPath(document.filePath),
      })),
    });
  }),
);

router.post(
  "/:id/kyc/approve",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    await ensureKycControls();
    const customer = await storage.getUser(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    if (["approved", "verified"].includes(customer.kycStatus)) {
      return ApiResponse.badRequest(res, "Already Approved");
    }

    await db
      .update(kycDocuments)
      .set({ status: "approved", rejectionReason: null })
      .where(eq(kycDocuments.userId, customer.id));

    const user = await storage.updateUser(customer.id, {
      kycStatus: "approved",
      kycReviewedAt: new Date(),
      kycReviewedBy: req.session.adminId || null,
      kycRejectionReason: null,
    });

    await storage.createNotification({
      userId: customer.id,
      type: "kyc_approved",
      title: "KYC Approved",
      message: "Your KYC verification has been Approved.",
      metadata: { approvedWithoutDocument: true },
    });

    logger.info("Customer KYC Approved by Admin", {
      customerId: customer.id,
      adminId: req.session.adminId,
    });

    return ApiResponse.success(res, "KYC Approved successfully", user);
  }),
);

router.post(
  "/:id/kyc/reject",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { reason } = rejectKycSchema.parse(req.body);
    const customer = await storage.getUser(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    const [latestDocument] = await db
      .select()
      .from(kycDocuments)
      .where(eq(kycDocuments.userId, customer.id))
      .orderBy(desc(kycDocuments.createdAt))
      .limit(1);

    if (latestDocument) {
      await storage.updateKycDocument(latestDocument.id, {
        status: "rejected",
        rejectionReason: reason,
      });
    }

    const user = await storage.updateUser(customer.id, {
      kycStatus: "rejected",
      kycRejectionReason: reason,
      kycReviewedAt: new Date(),
      kycReviewedBy: req.session.adminId || null,
    });

    await storage.createNotification({
      userId: customer.id,
      type: "kyc_rejected",
      title: "KYC Rejected",
      message: `Your KYC verification was rejected. Reason: ${reason}`,
      metadata: latestDocument ? { documentId: latestDocument.id, reason } : { reason },
    });

    logger.info("Customer KYC rejected by admin", {
      customerId: customer.id,
      adminId: req.session.adminId,
    });

    return ApiResponse.success(res, "KYC rejected successfully", user);
  }),
);

router.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    await ensureKycControls();
    const { name, email, phone, address, kycStatus, isBlocked, role, accountMode, kycVerificationRequired } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (kycStatus !== undefined) updates.kycStatus = kycStatus;
    if (isBlocked !== undefined) updates.isBlocked = isBlocked;
    if (role !== undefined) updates.role = role;
    if (accountMode !== undefined || role !== undefined) {
      const currentCustomer = await storage.getUser(req.params.id);
      const nextRole = getCustomerRole(role || currentCustomer?.role);
      const parsedMode = accountMode === undefined ? currentCustomer?.accountMode : accountModeSchema.parse(accountMode);
      updates.accountMode = normalizeAccountMode(nextRole, parsedMode);
    }
    if (kycVerificationRequired !== undefined) {
      updates.kycVerificationRequired =
        kycVerificationRequired === true || kycVerificationRequired === "true";
    }

    const user = await storage.updateUser(req.params.id, updates as any);

    if (!user) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    logger.info("Customer updated by admin", {
      customerId: req.params.id,
      adminId: req.session.adminId,
    });

    return ApiResponse.success(res, "Customer updated successfully", user);
  })
);

router.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await storage.getUser(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    await storage.deleteUser(req.params.id);

    logger.info("Customer deleted by admin", {
      customerId: req.params.id,
      adminId: req.session.adminId,
    });

    return ApiResponse.success(res, "Customer deleted successfully", {
      id: req.params.id,
      isDeleted: true,
    });
  })
);

router.patch(
  "/:id/role",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { role } = roleSchema.parse(req.body);

    const user = await storage.updateUser(req.params.id, { role, accountMode: "live" } as any);

    if (!user) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    logger.info("Customer role changed by admin", {
      customerId: req.params.id,
      adminId: req.session.adminId,
      role,
    });

    return ApiResponse.success(
      res,
      role === "reseller"
        ? "Customer is now a reseller"
        : role === "agent"
          ? "Customer is now an agent"
          : "Customer is now a regular user",
      user,
    );
  })
);

router.patch(
  "/:id/reseller-storefront",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { subdomain: rawSubdomain, storeName, isActive } = resellerStorefrontSchema.parse(req.body);
    const customer = await storage.getUser(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }
    if (customer.role !== "reseller") {
      return ApiResponse.badRequest(res, "Customer must be a reseller before assigning a storefront subdomain");
    }

    const isClearing = rawSubdomain !== undefined && String(rawSubdomain || "").trim() === "";
    const subdomain = rawSubdomain !== undefined
      ? normalizeResellerSubdomainInput(rawSubdomain)
      : customer.resellerSubdomain;

    if (rawSubdomain !== undefined && !subdomain && !isClearing) {
      return ApiResponse.badRequest(res, "Enter a valid subdomain using letters, numbers, and hyphens only");
    }

    if (subdomain) {
      const existing = await db.query.users.findFirst({
        where: and(eq(users.resellerSubdomain, subdomain), ne(users.id, customer.id)),
      });
      if (existing) {
        return res.status(409).json({ success: false, message: "This subdomain is already used by another reseller" });
      }
    }

    const user = await storage.updateUser(customer.id, {
      resellerSubdomain: isClearing ? null : subdomain,
      resellerStoreName: (storeName || customer.resellerStoreName || customer.name || customer.email).trim(),
      resellerStoreActive: Boolean((isActive ?? true) && subdomain && !isClearing),
    });

    return ApiResponse.success(res, "Reseller storefront updated successfully", user);
  })
);

router.get(
  "/:id/reseller-providers",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await storage.getUser(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }
    if (customer.role !== "reseller") {
      return ApiResponse.badRequest(res, "Customer must be a reseller before assigning provider Access");
    }

    const providerRows = await db
      .select()
      .from(providers)
      .where(eq(providers.enabled, true))
      .orderBy(asc(providers.name));

    const settingRows = await db
      .select()
      .from(resellerProviderSettings)
      .where(eq(resellerProviderSettings.resellerId, customer.id));
    const settingsByProvider = new Map(settingRows.map((setting) => [setting.providerId, setting]));

    const providerSummaries = await Promise.all(
      providerRows.map(async (provider) => {
        const setting = settingsByProvider.get(provider.id);
        const [stats] = await db
          .select({
            totalPackages: sql<number>`COUNT(${unifiedPackages.id})::int`,
            activePackages: sql<number>`COUNT(*) FILTER (WHERE ${unifiedPackages.isEnabled} = true AND COALESCE(${resellerPackagePrices.isEnabled}, true) = true)::int`,
            customPrices: sql<number>`COUNT(${resellerPackagePrices.id})::int`,
            resellerPriceFrom: sql<string>`MIN(COALESCE(${unifiedPackages.resellerPrice}::numeric, ${unifiedPackages.retailPrice}::numeric))`,
          })
          .from(unifiedPackages)
          .leftJoin(
            resellerPackagePrices,
            and(
              eq(resellerPackagePrices.packageId, unifiedPackages.id),
              eq(resellerPackagePrices.resellerId, customer.id),
            ),
          )
          .where(eq(unifiedPackages.providerId, provider.id));

        const isEnabled = setting?.isEnabled ?? true;
        return {
          providerId: provider.id,
          id: provider.id,
          name: provider.name,
          slug: provider.slug,
          isEnabled,
          platformEnabled: Boolean(provider.enabled),
          totalPackages: Number(stats?.totalPackages || 0),
          activePackages: isEnabled ? Number(stats?.activePackages || 0) : 0,
          customPrices: Number(stats?.customPrices || 0),
          resellerPriceFrom: stats?.resellerPriceFrom ? Number(stats.resellerPriceFrom).toFixed(2) : null,
          updatedAt: setting?.updatedAt || provider.updatedAt,
        };
      }),
    );

    return ApiResponse.success(res, "Reseller provider settings fetched successfully", {
      providers: providerSummaries,
    });
  }),
);

router.patch(
  "/:id/reseller-providers/:providerId",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { isEnabled } = resellerProviderSchema.parse(req.body);
    const customer = await storage.getUser(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }
    if (customer.role !== "reseller") {
      return ApiResponse.badRequest(res, "Customer must be a reseller before assigning provider Access");
    }

    const provider = await db.query.providers.findFirst({
      where: eq(providers.id, req.params.providerId),
    });
    if (!provider) {
      return ApiResponse.notFound(res, "Provider not found");
    }
    if (!provider.enabled && isEnabled) {
      return ApiResponse.badRequest(res, "This provider is disabled by admin");
    }

    const now = new Date();
    await db
      .insert(resellerProviderSettings)
      .values({
        resellerId: customer.id,
        providerId: provider.id,
        isEnabled,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [resellerProviderSettings.resellerId, resellerProviderSettings.providerId],
        set: {
          isEnabled,
          updatedAt: now,
        },
      });

    return ApiResponse.success(res, "Reseller provider updated successfully", {
      providerId: provider.id,
      isEnabled,
      platformEnabled: Boolean(provider.enabled),
    });
  }),
);

router.post(
  "/:id/reseller-prices/bulk-markup",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { markupPercent } = resellerRetailMarkupSchema.parse(req.body);
    const customer = await storage.getUser(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }
    if (customer.role !== "reseller") {
      return ApiResponse.badRequest(res, "Customer must be a reseller before applying reseller retail pricing");
    }

    const providerSettingsJoin = and(
      eq(resellerProviderSettings.providerId, unifiedPackages.providerId),
      eq(resellerProviderSettings.resellerId, customer.id),
    );
    const assignedRatePriceJoin = and(
      eq(rateTablePrices.rateTableId, rateTableAssignments.rateTableId),
      eq(rateTablePrices.packageId, unifiedPackages.id),
    );

    const packageRows = await db
      .select({
        id: unifiedPackages.id,
        resellerPrice: unifiedPackages.resellerPrice,
        retailPrice: unifiedPackages.retailPrice,
        wholesalePrice: unifiedPackages.wholesalePrice,
        assignedRatePrice: rateTablePrices,
      })
      .from(unifiedPackages)
      .leftJoin(providers, eq(unifiedPackages.providerId, providers.id))
      .leftJoin(resellerProviderSettings, providerSettingsJoin)
      .leftJoin(rateTableAssignments, eq(rateTableAssignments.userId, customer.id))
      .leftJoin(rateTablePrices, assignedRatePriceJoin)
      .where(and(
        eq(providers.enabled, true),
        eq(unifiedPackages.isEnabled, true),
        sql`COALESCE(${resellerProviderSettings.isEnabled}, true) = true`,
        sql`COALESCE(${rateTablePrices.isEnabled}, true) = true`,
      ));

    const now = new Date();
    const values = packageRows.map((pkg) => {
      const resellerCost = Number(pkg.assignedRatePrice?.sellingPrice || pkg.resellerPrice || pkg.retailPrice || pkg.wholesalePrice || 0);
      const sellingPrice = (resellerCost * (1 + markupPercent / 100)).toFixed(2);
      return {
        resellerId: customer.id,
        packageId: pkg.id,
        sellingPrice,
        markupPercent: markupPercent.toFixed(2),
        isEnabled: true,
        updatedAt: now,
      };
    });

    const chunkSize = 500;
    for (let index = 0; index < values.length; index += chunkSize) {
      await db
        .insert(resellerPackagePrices)
        .values(values.slice(index, index + chunkSize))
        .onConflictDoUpdate({
          target: [resellerPackagePrices.resellerId, resellerPackagePrices.packageId],
          set: {
            sellingPrice: sql`excluded.selling_price`,
            markupPercent: markupPercent.toFixed(2),
            updatedAt: now,
          },
        });
    }

    return ApiResponse.success(res, "Reseller retail prices updated successfully", {
      resellerId: customer.id,
      updated: values.length,
      markupPercent,
    });
  }),
);

router.post(
  "/:id/balance",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { amount, description } = addBalanceSchema.parse(req.body);
    const customerId = req.params.id;

    const result = await db.transaction(async (tx) => {
      const [customer] = await tx.select().from(users).where(eq(users.id, customerId));
      if (!customer) {
        return null;
      }

      const balanceBefore = Number(customer.walletBalance || "0");
      const balanceAfter = balanceBefore + amount;

      const [updatedUser] = await tx
        .update(users)
        .set({
          walletBalance: sql`${users.walletBalance}::numeric + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, customerId))
        .returning();

      const [transaction] = await tx
        .insert(walletTransactions)
        .values({
          userId: customerId,
          type: "adjustment",
          status: "completed",
          amount: money(amount),
          currency: "USD",
          balanceBefore: money(balanceBefore),
          balanceAfter: money(balanceAfter),
          provider: "admin",
          description: description || "Admin wallet balance adjustment",
          metadata: {
            adminId: req.session.adminId,
            action: "admin_add_balance",
          },
          completedAt: new Date(),
        })
        .returning();

      return { user: updatedUser, transaction };
    });

    if (!result) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    try {
      await storage.createNotification({
        userId: customerId,
        type: "wallet",
        title: "Wallet balance updated",
        message: `$${money(amount)} has been added to your wallet by support.`,
        read: false,
        metadata: { adminId: req.session.adminId, amount: money(amount) },
      });
    } catch (notificationError: any) {
      logger.warn("Failed to create wallet balance notification", {
        customerId,
        error: notificationError.message,
      });
    }

    queueAdminAlert("charges_fees", {
      title: "Wallet Balance Adjustment",
      message: `$${money(amount)} was added to customer wallet by admin.`,
      actionPath: "/admin/transactions",
      metadata: {
        userId: customerId,
        customerEmail: result.user.email,
        amount: money(amount),
        transactionId: result.transaction.id,
        description: result.transaction.description,
        adminId: req.session.adminId || null,
      },
    });

    logger.info("Customer wallet balance updated by admin", {
      customerId,
      adminId: req.session.adminId,
      amount,
    });

    return ApiResponse.success(res, "Balance added successfully", result);
  })
);

router.patch(
  "/:id/password",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { password } = changePasswordSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await storage.updateUser(req.params.id, {
      hashedPassword,
      passwordSetAt: new Date(),
    });

    if (!user) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    logger.info("Customer password changed by admin", {
      customerId: req.params.id,
      adminId: req.session.adminId,
    });

    return ApiResponse.success(res, "Password changed successfully", user);
  })
);

router.patch(
  "/:id/email",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = changeEmailSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();
    const customer = await storage.getUser(req.params.id);

    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    if (customer.email === normalizedEmail) {
      return ApiResponse.success(res, "Email address is already up to date", customer);
    }

    const existingUser = await storage.getUserByEmail(normalizedEmail);
    if (existingUser && existingUser.id !== customer.id) {
      return res.status(409).json({
        success: false,
        message: "Email already exists in the system",
      });
    }

    const user = await storage.updateUser(customer.id, {
      email: normalizedEmail,
    } as any);

    logger.info("Customer email changed by admin", {
      customerId: customer.id,
      adminId: req.session.adminId,
      previousEmail: customer.email,
      nextEmail: normalizedEmail,
    });

    return ApiResponse.success(res, "Email address changed successfully", user);
  })
);

router.get(
  "/:id/security",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await storage.getUser(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    return ApiResponse.success(res, "Customer security settings loaded", publicCustomerSecurity(customer));
  }),
);

router.patch(
  "/:id/security",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await storage.getUser(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    const updates = customerSecuritySchema.parse(req.body || {});
    const settings = await saveSecurityConfig(customer.id, updates);
    const updatedCustomer = await storage.getUser(customer.id);

    logger.info("Customer security settings changed by admin", {
      customerId: customer.id,
      adminId: req.session.adminId,
      twoFactorEnabled: settings.twoFactorEnabled,
      otpEmailEnabled: settings.otpEmailEnabled,
      otpPhoneEnabled: settings.otpPhoneEnabled,
    });

    return ApiResponse.success(res, "Security settings saved successfully", {
      user: updatedCustomer,
      security: publicCustomerSecurity(updatedCustomer),
    });
  }),
);

router.patch(
  "/:id/status",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = statusSchema.parse(req.body);
    const isActive = status === "active";

    const user = await storage.updateUser(
      req.params.id,
      isActive
        ? { isBlocked: false, isDeleted: false }
        : { isBlocked: true },
    );

    if (!user) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    logger.info("Customer account status changed by admin", {
      customerId: req.params.id,
      adminId: req.session.adminId,
      status,
    });

    return ApiResponse.success(
      res,
      isActive ? "Customer activated successfully" : "Customer deactivated successfully",
      user,
    );
  })
);

router.post(
  "/:id/apply-package",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { packageId, sendEmail: shouldSendEmail } = applyPackageSchema.parse(req.body);
    const customerId = req.params.id;
    const adminId = req.session.adminId!;

    const customer = await storage.getUser(customerId);
    if (!customer || customer.isDeleted) {
      return ApiResponse.notFound(res, "Customer not found");
    }

    if (customer.isBlocked) {
      return ApiResponse.badRequest(res, "Cannot apply a package to a deactivated customer");
    }

    const pkg = await storage.getUnifiedPackageById(packageId);
    if (!pkg) {
      return ApiResponse.notFound(res, "Package not found");
    }

    const provider = await storage.getProviderById(pkg.providerId);
    if (!provider) {
      return ApiResponse.notFound(res, "Provider not found");
    }

    if (!provider.enabled) {
      return ApiResponse.badRequest(res, `Provider ${provider.name} is currently disabled`);
    }

    const retailPrice = getPackageBasePriceUsd(pkg, customer.role === "reseller");
    const wholesalePrice = Number(pkg.wholesalePrice || "0");

    const order = await storage.createOrder({
      userId: customerId,
      packageId: pkg.id,
      providerId: provider.id,
      orderedBy: adminId,
      orderType: "single",
      quantity: 1,
      status: "processing",
      price: money(retailPrice),
      airaloPrice: money(wholesalePrice),
      wholesalePrice: money(wholesalePrice),
      currency: pkg.currency || "USD",
      orderCurrency: pkg.currency || "USD",
      dataAmount: pkg.dataAmount,
      validity: pkg.validity,
      installationSent: false,
      paymentMethod: "admin",
      orderSource: "admin",
    });

    try {
      const providerService = providerFactory.getService(provider);
      const orderResponse = await providerService.createOrder({
        packageId: pkg.slug,
        quantity: 1,
        transactionId: `admin-${order.id}`,
        customerRef: `Admin package for ${customer.email}`,
        customerEmail: customer.email,
      });

      if (!orderResponse.success) {
        await storage.updateOrder(order.id, {
          status: "failed",
          failureReason: orderResponse.errorMessage || "Provider order failed",
        });
        return ApiResponse.badRequest(res, orderResponse.errorMessage || "Failed to provision package");
      }

      const updatedOrder = await storage.updateOrder(order.id, {
        providerOrderId: orderResponse.providerOrderId,
        requestId: orderResponse.requestId,
        iccid: orderResponse.iccid,
        qrCode: orderResponse.qrCode,
        qrCodeUrl: orderResponse.qrCodeUrl,
        smdpAddress: orderResponse.smdpAddress,
        activationCode: orderResponse.activationCode,
        status: orderResponse.status === "completed" ? "completed" : "processing",
      });

      let installationSent = Boolean(orderResponse.providerEmailSent);
      if (shouldSendEmail && !orderResponse.providerEmailSent && orderResponse.qrCodeUrl && orderResponse.iccid) {
        try {
          const destination = pkg.destinationId ? await storage.getDestinationById(pkg.destinationId) : null;
          const installEmail = await generateInstallationEmail({
            name: customer.name || "Traveler",
            packageName: `${destination?.name ? `${destination.name} ` : ""}${pkg.dataAmount} - ${pkg.validity} Days`,
            qrCodeUrl: orderResponse.qrCodeUrl,
            iccid: orderResponse.iccid,
            activationCode: orderResponse.activationCode || "",
            smdpAddress: orderResponse.smdpAddress || "",
          });

          await sendEmail({
            to: customer.email,
            subject: installEmail.subject,
            html: installEmail.html,
          });

          await storage.updateOrder(order.id, { installationSent: true });
          installationSent = true;
        } catch (emailError: any) {
          logger.warn("Failed to send admin-applied package installation email", {
            orderId: order.id,
            customerId,
            error: emailError.message,
          });
        }
      }

      try {
        await storage.createNotification({
          userId: customerId,
          type: "purchase",
          title: "Package added to your account",
          message: `${pkg.title || pkg.dataAmount} has been added to your account by support.`,
          read: false,
          metadata: { orderId: order.id, packageId: pkg.id, adminId },
        });
      } catch (notificationError: any) {
        logger.warn("Failed to create admin-applied package notification", {
          orderId: order.id,
          customerId,
          error: notificationError.message,
        });
      }

      logger.info("Package applied to customer by admin", {
        customerId,
        adminId,
        packageId: pkg.id,
        orderId: order.id,
      });

      return ApiResponse.created(res, "Package applied successfully", {
        order: { ...updatedOrder, installationSent },
      });
    } catch (providerError: any) {
      await storage.updateOrder(order.id, {
        status: "failed",
        failureReason: providerError.message || "Provider order failed",
      });
      logger.error("Admin package application failed", {
        orderId: order.id,
        customerId,
        packageId,
        error: providerError.message,
      });
      return ApiResponse.serverError(res, providerError.message || "Failed to apply package");
    }
  })
);

router.get(
  "/:id/orders",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const orders = await storage.getOrdersByUser(req.params.id);
    return ApiResponse.success(res, "Customer Orders fetched successfully", orders);
  })
);

router.get(
  "/:id/activity",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const activities = await storage.getActivityLogsByUser(req.params.id);
    return ApiResponse.success(res, "Customer activity fetched successfully", activities);
  })
);

export default router;
