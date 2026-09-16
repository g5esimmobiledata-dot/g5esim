"use strict";

import { Router, Request, Response } from "express";
import { db } from "../../db";
import { storage } from "../../storage";
import { voucherCodes, voucherUsage, walletTransactions, orders, users } from "@shared/schema";
import { eq, desc, sql, and, gte, lte, count, sum, or } from "drizzle-orm";
import { requireAdmin } from "../../lib/middleware";
import { z } from "zod";
import {
  getVoucherExportDocument,
  type VoucherExportFormat,
} from "../../services/voucher-export-service";
import {
  generateVoucherCode,
  generateVoucherQrCode,
  getNextVoucherSerialNumbers,
  getNextVoucherSeriesCode,
  normalizeVoucherCode,
  voucherQrNeedsRefresh,
} from "../../utils/voucher";

const router = Router();

function getRequestBaseUrl(req: Request) {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol || "http";
  const host = forwardedHost || req.get("host") || `localhost:${process.env.PORT || 5000}`;
  return `${protocol}://${host}`;
}

const optionalNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().positive().optional().nullable()
);

const optionalIntNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().int().positive().optional().nullable()
);

const quantityNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? 1 : val),
  z.coerce.number().int().min(1).max(200)
);

const assignmentRoleSchema = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? "all" : val),
  z.enum(["all", "agent", "reseller"])
);

const optionalString = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.string().trim().optional().nullable()
);

const optionalVoucherCode = z.preprocess(
  (val) => {
    const normalized = normalizeVoucherCode(val);
    return normalized || undefined;
  },
  z.string().regex(/^\d{4}-\d{4}-\d{4}-\d{4}$/, "Voucher code must be 16 digits formatted as 0000-0000-0000-0000").optional()
);

const voucherExportFormatSchema = z.enum(["pdf", "word", "excel"]);

// For required date fields - accept any date string and convert to ISO
const requiredDateString = z.string().min(1, "Date is required").transform((val) => {
  const date = new Date(val);
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date format");
  }
  return date.toISOString();
});

const createVoucherSchema = z.object({
  code: optionalVoucherCode,
  batchName: optionalString,
  assignedRole: assignmentRoleSchema.default("all"),
  assignedUserId: optionalString,
  type: z.enum(["percentage", "fixed", "wallet_credit"]),
  value: z.coerce.number().positive(),
  description: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().optional()
  ),
  minPurchaseAmount: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 0 : val),
    z.coerce.number().min(0)
  ),
  maxDiscountAmount: optionalNumber,
  maxUses: optionalIntNumber,
  perUserLimit: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 1 : val),
    z.coerce.number().int().positive()
  ),
  validFrom: requiredDateString,
  validUntil: requiredDateString,
  targetCountries: z.array(z.string()).optional(),
  targetRegions: z.array(z.string()).optional(),
  targetPackages: z.array(z.string()).optional(),
  firstTimeOnly: z.preprocess(
    (val) => val === undefined ? undefined : (val === true || val === "true"),
    z.boolean().optional().default(false)
  ),
  isStackable: z.preprocess(
    (val) => val === undefined ? undefined : (val === true || val === "true"),
    z.boolean().optional().default(false)
  ),
  status: z.enum(["active", "inactive"]).optional().default("active"),
  quantity: quantityNumber.optional().default(1),
});

// Update schema without defaults - allows partial updates without overwriting existing values
const updateVoucherSchema = z.object({
  type: z.enum(["percentage", "fixed", "wallet_credit"]).optional(),
  value: z.coerce.number().positive().optional(),
  description: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().optional()
  ),
  minPurchaseAmount: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number().min(0).optional()
  ),
  maxDiscountAmount: optionalNumber,
  maxUses: optionalIntNumber,
  perUserLimit: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number().int().positive().optional()
  ),
  validFrom: z.string().min(1).transform((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) throw new Error("Invalid date format");
    return date.toISOString();
  }).optional(),
  validUntil: z.string().min(1).transform((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) throw new Error("Invalid date format");
    return date.toISOString();
  }).optional(),
  targetCountries: z.array(z.string()).optional(),
  targetRegions: z.array(z.string()).optional(),
  targetPackages: z.array(z.string()).optional(),
  firstTimeOnly: z.preprocess(
    (val) => val === undefined ? undefined : (val === true || val === "true"),
    z.boolean().optional()
  ),
  isStackable: z.preprocess(
    (val) => val === undefined ? undefined : (val === true || val === "true"),
    z.boolean().optional()
  ),
  status: z.enum(["active", "inactive"]).optional(),
});

router.get("/vouchers", requireAdmin, async (req: Request, res: Response) => {
  try {
    const allVouchers = await db
      .select()
      .from(voucherCodes)
      .orderBy(desc(voucherCodes.createdAt));
    const baseUrl = getRequestBaseUrl(req);
    const vouchersWithCurrentQr = await Promise.all(
      allVouchers.map(async (voucher) => {
        if (!voucherQrNeedsRefresh(voucher)) return voucher;

        const qr = await generateVoucherQrCode(voucher.code, baseUrl);
        await db
          .update(voucherCodes)
          .set({ qrCode: qr.qrCode, qrPayload: qr.payload, updatedAt: new Date() })
          .where(eq(voucherCodes.id, voucher.id));

        return { ...voucher, qrCode: qr.qrCode, qrPayload: qr.payload };
      }),
    );

    const activeCount = vouchersWithCurrentQr.filter((v) => v.status === "active").length;

    const usageStats = await db
      .select({
        totalUsage: count(voucherUsage.id),
        totalDiscount: sum(voucherUsage.discountAmount),
      })
      .from(voucherUsage);

    res.json({
      success: true,
      vouchers: vouchersWithCurrentQr,
      statistics: {
        totalVouchers: vouchersWithCurrentQr.length,
        activeVouchers: activeCount,
        totalUsage: Number(usageStats[0]?.totalUsage || 0),
        totalDiscount: Number(usageStats[0]?.totalDiscount || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    res.status(500).json({ success: false, message: "Failed to fetch vouchers" });
  }
});

router.get("/vouchers/logs", requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 500), 1), 5000);
    const usageLogs = await db
      .select({
        id: voucherUsage.id,
        voucherId: voucherUsage.voucherId,
        userId: voucherUsage.userId,
        orderId: voucherUsage.orderId,
        discountAmount: voucherUsage.discountAmount,
        usedAt: voucherUsage.usedAt,
        voucherCode: voucherCodes.code,
        voucherType: voucherCodes.type,
        voucherValue: voucherCodes.value,
        voucherStatus: voucherCodes.status,
        voucherCurrentUses: voucherCodes.currentUses,
        voucherMaxUses: voucherCodes.maxUses,
        voucherSeriesCode: voucherCodes.seriesCode,
        voucherSerialNumber: voucherCodes.serialNumber,
        voucherBatchName: voucherCodes.batchName,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role,
        userDisplayId: users.displayUserId,
        displayOrderId: orders.displayOrderId,
      })
      .from(voucherUsage)
      .leftJoin(voucherCodes, eq(voucherUsage.voucherId, voucherCodes.id))
      .leftJoin(users, eq(voucherUsage.userId, users.id))
      .leftJoin(orders, eq(voucherUsage.orderId, orders.id))
      .orderBy(desc(voucherUsage.usedAt))
      .limit(limit);

    const walletRedeemLogs = await db
      .select({
        id: walletTransactions.id,
        voucherId: walletTransactions.voucherId,
        userId: walletTransactions.userId,
        orderId: sql<string | null>`NULL`,
        discountAmount: walletTransactions.amount,
        usedAt: sql<Date>`COALESCE(${walletTransactions.completedAt}, ${walletTransactions.createdAt})`,
        voucherCode: voucherCodes.code,
        voucherType: voucherCodes.type,
        voucherValue: voucherCodes.value,
        voucherStatus: voucherCodes.status,
        voucherCurrentUses: voucherCodes.currentUses,
        voucherMaxUses: voucherCodes.maxUses,
        voucherSeriesCode: voucherCodes.seriesCode,
        voucherSerialNumber: voucherCodes.serialNumber,
        voucherBatchName: voucherCodes.batchName,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role,
        userDisplayId: users.displayUserId,
        displayOrderId: sql<number | null>`NULL`,
      })
      .from(walletTransactions)
      .leftJoin(voucherCodes, eq(walletTransactions.voucherId, voucherCodes.id))
      .leftJoin(users, eq(walletTransactions.userId, users.id))
      .where(eq(walletTransactions.type, "voucher_redeem"))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit);

    const usageKeys = new Set(
      usageLogs.map((log) => `${log.voucherId || ""}:${log.userId || ""}:${Number(log.discountAmount || 0).toFixed(2)}`),
    );
    const logs = [
      ...usageLogs,
      ...walletRedeemLogs
        .filter((log) => !usageKeys.has(`${log.voucherId || ""}:${log.userId || ""}:${Number(log.discountAmount || 0).toFixed(2)}`))
        .map((log) => ({
          ...log,
          id: `wallet-${log.id}`,
        })),
    ]
      .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
      .slice(0, limit);

    const [summary] = await db
      .select({
        totalRedemptions: count(voucherUsage.id),
        totalRedeemedValue: sum(voucherUsage.discountAmount),
      })
      .from(voucherUsage);
    const [walletSummary] = await db
      .select({
        totalRedemptions: count(walletTransactions.id),
        totalRedeemedValue: sum(walletTransactions.amount),
      })
      .from(walletTransactions)
      .where(eq(walletTransactions.type, "voucher_redeem"));

    res.json({
      success: true,
      data: {
        logs,
        summary: {
          totalRedemptions: logs.length,
          totalRedeemedValue: logs.reduce((total, log) => total + Number(log.discountAmount || 0), 0)
            || Number(summary?.totalRedeemedValue || 0)
            || Number(walletSummary?.totalRedeemedValue || 0),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching voucher logs:", error);
    res.status(500).json({ success: false, message: "Failed to fetch voucher logs" });
  }
});

router.get("/vouchers/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [voucher] = await db.select().from(voucherCodes).where(eq(voucherCodes.id, id));

    if (!voucher) {
      return res.status(404).json({ success: false, message: "Voucher not found" });
    }

    res.json({ success: true, voucher });
  } catch (error) {
    console.error("Error fetching voucher:", error);
    res.status(500).json({ success: false, message: "Failed to fetch voucher" });
  }
});

router.get("/vouchers/:id/download/:format", requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = voucherExportFormatSchema.safeParse(req.params.format);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Unsupported voucher export format" });
    }

    const { id } = req.params;
    let [voucher] = await db.select().from(voucherCodes).where(eq(voucherCodes.id, id));

    if (!voucher) {
      return res.status(404).json({ success: false, message: "Voucher not found" });
    }

    const baseUrl = getRequestBaseUrl(req);
    if (voucherQrNeedsRefresh(voucher)) {
      const qr = await generateVoucherQrCode(voucher.code, baseUrl);
      [voucher] = await db
        .update(voucherCodes)
        .set({ qrCode: qr.qrCode, qrPayload: qr.payload, updatedAt: new Date() })
        .where(eq(voucherCodes.id, voucher.id))
        .returning();
    }

    const issuerUser = voucher.createdByUser ? await storage.getUser(voucher.createdByUser) : null;
    const document = await getVoucherExportDocument({
      voucher,
      format: parsed.data as VoucherExportFormat,
      baseUrl,
      issuerUser,
    });

    res.setHeader("Content-Type", document.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${document.filename}"`);
    res.setHeader("Cache-Control", "no-store");
    return res.send(document.buffer);
  } catch (error) {
    console.error("Error downloading voucher:", error);
    return res.status(500).json({ success: false, message: "Failed to download voucher" });
  }
});

router.get("/vouchers/:id/usage", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const usage = await db
      .select({
        id: voucherUsage.id,
        voucherId: voucherUsage.voucherId,
        userId: voucherUsage.userId,
        orderId: voucherUsage.orderId,
        discountAmount: voucherUsage.discountAmount,
        usedAt: voucherUsage.usedAt,
      })
      .from(voucherUsage)
      .where(eq(voucherUsage.voucherId, id))
      .orderBy(desc(voucherUsage.usedAt));

    res.json({ success: true, usage });
  } catch (error) {
    console.error("Error fetching voucher usage:", error);
    res.status(500).json({ success: false, message: "Failed to fetch voucher usage" });
  }
});

router.post("/vouchers", requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log("[Voucher Create] Request body:", JSON.stringify(req.body, null, 2));
    const parsed = createVoucherSchema.parse(req.body);
    console.log("[Voucher Create] Parsed data:", JSON.stringify(parsed, null, 2));
    const adminId = (req as any).admin?.id || (req as any).session?.adminId || null;
    const quantity = parsed.quantity || 1;
    const requestedCode = parsed.code?.trim();
    let assignedRole = parsed.assignedRole || "all";
    let assignedUserId = parsed.assignedUserId || null;

    const validFrom = new Date(parsed.validFrom);
    const validUntil = new Date(parsed.validUntil);
    if (validUntil <= validFrom) {
      return res.status(400).json({ success: false, message: "End date must be after start date" });
    }

    if (parsed.maxUses && parsed.perUserLimit && parsed.perUserLimit > parsed.maxUses) {
      return res.status(400).json({ success: false, message: "Per-user limit cannot exceed total uses limit" });
    }

    if (quantity > 1 && requestedCode) {
      return res.status(400).json({
        success: false,
        message: "Custom voucher code is only allowed when quantity is 1",
      });
    }

    if (assignedUserId) {
      const [assignee] = await db
        .select({
          id: users.id,
          role: users.role,
          name: users.name,
          email: users.email,
          isDeleted: users.isDeleted,
          isBlocked: users.isBlocked,
        })
        .from(users)
        .where(eq(users.id, assignedUserId));

      if (!assignee || assignee.isDeleted) {
        return res.status(400).json({ success: false, message: "Assigned Agent or Reseller was not found" });
      }

      if (assignee.isBlocked) {
        return res.status(400).json({ success: false, message: "Assigned account is blocked" });
      }

      if (assignee.role !== "agent" && assignee.role !== "reseller") {
        return res.status(400).json({ success: false, message: "Voucher batches can only be assigned to an Agent or Reseller" });
      }

      if (assignedRole !== "all" && assignee.role !== assignedRole) {
        return res.status(400).json({
          success: false,
          message: `Selected account is not a ${assignedRole === "agent" ? "Agent" : "Reseller"}`,
        });
      }

      assignedRole = assignee.role;
    }

    const buildUniqueCode = async () => {
      if (quantity === 1 && requestedCode) {
        const unformattedCode = requestedCode.replace(/-/g, "");
        const existing = await db.select().from(voucherCodes).where(
          or(eq(voucherCodes.code, requestedCode), eq(voucherCodes.code, unformattedCode)),
        );
        if (existing.length > 0) {
          throw new Error("Voucher code already exists");
        }
        return requestedCode;
      }

      for (let attempt = 0; attempt < 30; attempt += 1) {
        const candidate = generateVoucherCode();
        const unformattedCandidate = candidate.replace(/-/g, "");
        const existing = await db.select().from(voucherCodes).where(
          or(eq(voucherCodes.code, candidate), eq(voucherCodes.code, unformattedCandidate)),
        );
        if (existing.length === 0) {
          return candidate;
        }
      }

      throw new Error("Could not generate a unique voucher code");
    };

    const seenCodes = new Set<string>();
    const seriesCode = await getNextVoucherSeriesCode();
    const serialNumbers = await getNextVoucherSerialNumbers(quantity);
    const voucherValues = [];

    for (let index = 0; index < quantity; index += 1) {
      let code = await buildUniqueCode();
      while (seenCodes.has(code)) {
        code = await buildUniqueCode();
      }
      seenCodes.add(code);

      const qr = parsed.type === "wallet_credit" ? await generateVoucherQrCode(code, getRequestBaseUrl(req)) : null;
      voucherValues.push({
        seriesCode,
        serialNumber: serialNumbers[index],
        batchName: parsed.batchName || null,
        assignedRole,
        assignedUserId,
        code,
        type: parsed.type,
        value: parsed.value.toString(),
        description: parsed.description,
        minPurchaseAmount: parsed.minPurchaseAmount?.toString() || "0",
        maxDiscountAmount: parsed.maxDiscountAmount?.toString() || null,
        maxUses: parsed.maxUses,
        perUserLimit: parsed.perUserLimit,
        validFrom: new Date(parsed.validFrom),
        validUntil: new Date(parsed.validUntil),
        targetCountries: parsed.targetCountries,
        targetRegions: parsed.targetRegions,
        targetPackages: parsed.targetPackages,
        firstTimeOnly: parsed.firstTimeOnly,
        isStackable: parsed.isStackable,
        qrCode: qr?.qrCode || null,
        qrPayload: qr?.payload || null,
        status: parsed.status,
        createdBy: adminId,
      });
    }

    const createdVouchers = await db
      .insert(voucherCodes)
      .values(voucherValues)
      .returning();

    res.status(201).json({
      success: true,
      message: quantity === 1 ? "Voucher created" : `${quantity} vouchers created`,
      voucher: createdVouchers[0],
      vouchers: createdVouchers,
      count: createdVouchers.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation error", errors: error.errors });
    }
    if (error instanceof Error && error.message === "Voucher code already exists") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error instanceof Error && error.message === "Could not generate a unique voucher code") {
      return res.status(500).json({ success: false, message: error.message });
    }
    console.error("Error creating voucher:", error);
    res.status(500).json({ success: false, message: "Failed to create voucher" });
  }
});

const updateVoucherHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updateVoucherSchema.parse(req.body);

    const [existing] = await db.select().from(voucherCodes).where(eq(voucherCodes.id, id));
    if (!existing) {
      return res.status(404).json({ success: false, message: "Voucher not found" });
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (parsed.type !== undefined) updateData.type = parsed.type;
    if (parsed.value !== undefined) updateData.value = parsed.value.toString();
    if (parsed.description !== undefined) updateData.description = parsed.description;
    if (parsed.minPurchaseAmount !== undefined) updateData.minPurchaseAmount = parsed.minPurchaseAmount.toString();
    if (parsed.maxDiscountAmount !== undefined) updateData.maxDiscountAmount = parsed.maxDiscountAmount?.toString() || null;
    if (parsed.maxUses !== undefined) updateData.maxUses = parsed.maxUses;
    if (parsed.perUserLimit !== undefined) updateData.perUserLimit = parsed.perUserLimit;
    if (parsed.validFrom !== undefined) updateData.validFrom = new Date(parsed.validFrom);
    if (parsed.validUntil !== undefined) updateData.validUntil = new Date(parsed.validUntil);
    if (parsed.targetCountries !== undefined) updateData.targetCountries = parsed.targetCountries;
    if (parsed.targetRegions !== undefined) updateData.targetRegions = parsed.targetRegions;
    if (parsed.targetPackages !== undefined) updateData.targetPackages = parsed.targetPackages;
    if (parsed.firstTimeOnly !== undefined) updateData.firstTimeOnly = parsed.firstTimeOnly;
    if (parsed.isStackable !== undefined) updateData.isStackable = parsed.isStackable;
    if (parsed.status !== undefined) updateData.status = parsed.status;
    if ((parsed.type === "wallet_credit" || existing.type === "wallet_credit") && !existing.qrCode) {
      const qr = await generateVoucherQrCode(existing.code, getRequestBaseUrl(req));
      updateData.qrCode = qr.qrCode;
      updateData.qrPayload = qr.payload;
    }

    const [voucher] = await db
      .update(voucherCodes)
      .set(updateData)
      .where(eq(voucherCodes.id, id))
      .returning();

    res.json({ success: true, message: "Voucher updated", voucher });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation error", errors: error.errors });
    }
    console.error("Error updating voucher:", error);
    res.status(500).json({ success: false, message: "Failed to update voucher" });
  }
};

router.patch("/vouchers/:id", requireAdmin, updateVoucherHandler);
router.put("/vouchers/:id", requireAdmin, updateVoucherHandler);

router.delete("/vouchers/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select().from(voucherCodes).where(eq(voucherCodes.id, id));
    if (!existing) {
      return res.status(404).json({ success: false, message: "Voucher not found" });
    }

    await db.transaction(async (tx) => {
      await tx.delete(voucherUsage).where(eq(voucherUsage.voucherId, id));
      await tx.delete(voucherCodes).where(eq(voucherCodes.id, id));
    });

    res.json({ success: true, message: "Voucher deleted" });
  } catch (error) {
    console.error("Error deleting voucher:", error);
    res.status(500).json({ success: false, message: "Failed to delete voucher" });
  }
});

export default router;
