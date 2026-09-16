"use strict";

import { Router, type Request, type Response } from "express";
import { and, count, desc, eq, or, sql, sum } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { voucherCodes, voucherUsage, walletTransactions, users } from "@shared/schema";
import {
  generateVoucherCode,
  generateVoucherQrCode,
  getNextVoucherSerialNumbers,
  getNextVoucherSeriesCode,
  normalizeVoucherCode,
  voucherQrNeedsRefresh,
} from "../utils/voucher";
import { getVoucherLimitForUser } from "../utils/voucherLimits";
import {
  getVoucherExportDocument,
  type VoucherExportFormat,
} from "../services/voucher-export-service";

const router = Router();

function getRequestBaseUrl(req: Request) {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol || "http";
  const host = forwardedHost || req.get("host") || `localhost:${process.env.PORT || 5000}`;
  return `${protocol}://${host}`;
}

const optionalIntNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().int().positive().optional().nullable(),
);

const quantityNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? 1 : val),
  z.coerce.number().int().min(1).max(200),
);

const optionalString = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.string().trim().optional().nullable(),
);

const optionalVoucherCode = z.preprocess(
  (val) => {
    const normalized = normalizeVoucherCode(val);
    return normalized || undefined;
  },
  z
    .string()
    .regex(/^\d{4}-\d{4}-\d{4}-\d{4}$/, "Voucher code must be 16 digits formatted as 0000-0000-0000-0000")
    .optional(),
);

const requiredDateString = z.string().min(1, "Date is required").transform((val) => {
  const date = new Date(val);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date format");
  }
  return date.toISOString();
});

const createAccountVoucherSchema = z.object({
  code: optionalVoucherCode,
  batchName: optionalString,
  assignedRole: z.enum(["all", "agent", "reseller"]).default("all"),
  type: z.enum(["wallet_credit"]).default("wallet_credit"),
  value: z.coerce.number().positive(),
  description: z.preprocess((val) => (val === "" ? undefined : val), z.string().optional()),
  maxUses: optionalIntNumber.default(1),
  perUserLimit: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 1 : val),
    z.coerce.number().int().positive(),
  ),
  validFrom: requiredDateString,
  validUntil: requiredDateString,
  status: z.enum(["active", "inactive"]).optional().default("active"),
  quantity: quantityNumber.optional().default(1),
});

const voucherExportFormatSchema = z.enum(["pdf", "word", "excel"]);

function money(value: number) {
  return value.toFixed(2);
}

function toMoneyNumber(value: unknown) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

async function requireVoucherIssuer(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return null;
  }

  const user = await storage.getUser(userId);
  if (!user) {
    res.status(401).json({ success: false, message: "User not found" });
    return null;
  }

  if (user.role !== "agent" && user.role !== "reseller") {
    res.status(403).json({ success: false, message: "Batch voucher tools are available for Agent and Reseller accounts" });
    return null;
  }

  return user;
}

async function buildUniqueCode(requestedCode?: string | null) {
  if (requestedCode) {
    const unformattedCode = requestedCode.replace(/-/g, "");
    const existing = await db
      .select({ id: voucherCodes.id })
      .from(voucherCodes)
      .where(or(eq(voucherCodes.code, requestedCode), eq(voucherCodes.code, unformattedCode)));
    if (existing.length > 0) {
      throw new Error("Voucher code already exists");
    }
    return requestedCode;
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = generateVoucherCode();
    const unformattedCandidate = candidate.replace(/-/g, "");
    const existing = await db
      .select({ id: voucherCodes.id })
      .from(voucherCodes)
      .where(or(eq(voucherCodes.code, candidate), eq(voucherCodes.code, unformattedCandidate)));
    if (existing.length === 0) {
      return candidate;
    }
  }

  throw new Error("Could not generate a unique voucher code");
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await requireVoucherIssuer(req, res);
    if (!user) return;

    const allVouchers = await db
      .select()
      .from(voucherCodes)
      .where(eq(voucherCodes.createdByUser, user.id))
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

    const usageStats = await db
      .select({
        totalUsage: count(voucherUsage.id),
        totalDiscount: sum(voucherUsage.discountAmount),
      })
      .from(voucherUsage)
      .leftJoin(voucherCodes, eq(voucherUsage.voucherId, voucherCodes.id))
      .where(eq(voucherCodes.createdByUser, user.id));

    return res.json({
      success: true,
      vouchers: vouchersWithCurrentQr,
      statistics: {
        totalVouchers: vouchersWithCurrentQr.length,
        activeVouchers: vouchersWithCurrentQr.filter((voucher) => voucher.status === "active").length,
        totalUsage: Number(usageStats[0]?.totalUsage || 0),
        totalDiscount: Number(usageStats[0]?.totalDiscount || 0),
      },
    });
  } catch (error: any) {
    console.error("Account voucher fetch error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch vouchers" });
  }
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await requireVoucherIssuer(req, res);
    if (!user) return;

    const parsed = createAccountVoucherSchema.parse({
      ...req.body,
      type: "wallet_credit",
    });

    const quantity = parsed.quantity || 1;
    const maxUses = parsed.maxUses || 1;
    const requestedCode = parsed.code?.trim();
    const validFrom = new Date(parsed.validFrom);
    const validUntil = new Date(parsed.validUntil);

    if (validUntil <= validFrom) {
      return res.status(400).json({ success: false, message: "End date must be after start date" });
    }

    if (parsed.perUserLimit && parsed.perUserLimit > maxUses) {
      return res.status(400).json({ success: false, message: "Per-user limit cannot exceed total uses limit" });
    }

    if (quantity > 1 && requestedCode) {
      return res.status(400).json({
        success: false,
        message: "Custom voucher code is only allowed when quantity is 1",
      });
    }

    const totalVoucherValue = Math.round(parsed.value * quantity * maxUses * 100) / 100;
    const voucherLimit = await getVoucherLimitForUser(user.id);
    if (!voucherLimit.unlimited && voucherLimit.used + totalVoucherValue > voucherLimit.limit + 0.001) {
      return res.status(400).json({
        success: false,
        message: `Voucher limit exceeded. Remaining limit is ${money(Math.max(voucherLimit.limit - voucherLimit.used, 0))} USD.`,
      });
    }

    const seenCodes = new Set<string>();
    const seriesCode = await getNextVoucherSeriesCode();
    const serialNumbers = await getNextVoucherSerialNumbers(quantity);
    const voucherValues = [];

    for (let index = 0; index < quantity; index += 1) {
      let code = await buildUniqueCode(quantity === 1 ? requestedCode : undefined);
      while (seenCodes.has(code)) {
        code = await buildUniqueCode();
      }
      seenCodes.add(code);

      const qr = await generateVoucherQrCode(code, getRequestBaseUrl(req));
      voucherValues.push({
        seriesCode,
        serialNumber: serialNumbers[index],
        batchName: parsed.batchName || null,
        assignedRole: parsed.assignedRole || "all",
        assignedUserId: null,
        code,
        type: "wallet_credit",
        value: parsed.value.toString(),
        description: parsed.description || "Agent/Reseller wallet top-up voucher",
        minPurchaseAmount: "0",
        maxDiscountAmount: null,
        maxUses,
        perUserLimit: parsed.perUserLimit,
        validFrom,
        validUntil,
        targetCountries: [],
        targetRegions: [],
        targetPackages: [],
        firstTimeOnly: false,
        isStackable: false,
        qrCode: qr.qrCode,
        qrPayload: qr.payload,
        status: parsed.status,
        createdByUser: user.id,
      });
    }

    const result = await db.transaction(async (tx) => {
      const [updatedUser] = await tx
        .update(users)
        .set({
          walletBalance: sql`${users.walletBalance}::numeric - ${totalVoucherValue}`,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, user.id), sql`${users.walletBalance}::numeric >= ${totalVoucherValue}`))
        .returning();

      if (!updatedUser) {
        throw new Error(`Insufficient wallet balance to create this batch. Required ${money(totalVoucherValue)} USD.`);
      }

      const balanceAfter = toMoneyNumber(updatedUser.walletBalance || "0.00");
      const balanceBefore = balanceAfter + totalVoucherValue;

      const createdVouchers = await tx.insert(voucherCodes).values(voucherValues).returning();
      const [transaction] = await tx
        .insert(walletTransactions)
        .values({
          userId: user.id,
          type: "voucher_debit",
          status: "completed",
          amount: money(totalVoucherValue),
          currency: "USD",
          balanceBefore: money(balanceBefore),
          balanceAfter: money(balanceAfter),
          provider: "voucher",
          referenceId: seriesCode,
          description: `Generated voucher batch ${seriesCode}`,
          metadata: {
            seriesCode,
            batchName: parsed.batchName || null,
            quantity,
            maxUses,
            value: money(parsed.value),
            voucherIds: createdVouchers.map((voucher) => voucher.id),
          },
          completedAt: new Date(),
        })
        .returning();

      return { createdVouchers, transaction, balance: money(balanceAfter) };
    });

    await storage.createNotification({
      userId: user.id,
      type: "wallet",
      title: "Voucher batch generated",
      message: `${money(totalVoucherValue)} USD was moved from your wallet into voucher batch ${seriesCode}.`,
      read: false,
      metadata: { seriesCode, transactionId: result.transaction.id },
    });

    return res.status(201).json({
      success: true,
      message: quantity === 1 ? "Voucher created" : `${quantity} vouchers created`,
      voucher: result.createdVouchers[0],
      vouchers: result.createdVouchers,
      count: result.createdVouchers.length,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation error", errors: error.errors });
    }
    if (error?.message === "Voucher code already exists") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Account voucher create error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to create voucher" });
  }
});

router.get("/:id/download/:format", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await requireVoucherIssuer(req, res);
    if (!user) return;

    const parsed = voucherExportFormatSchema.safeParse(req.params.format);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Unsupported voucher export format" });
    }

    let [voucher] = await db
      .select()
      .from(voucherCodes)
      .where(and(eq(voucherCodes.id, req.params.id), eq(voucherCodes.createdByUser, user.id)));

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

    const document = await getVoucherExportDocument({
      voucher,
      format: parsed.data as VoucherExportFormat,
      baseUrl,
      issuerUser: user,
    });

    res.setHeader("Content-Type", document.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${document.filename}"`);
    res.setHeader("Cache-Control", "no-store");
    return res.send(document.buffer);
  } catch (error: any) {
    console.error("Account voucher download error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to download voucher" });
  }
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await requireVoucherIssuer(req, res);
    if (!user) return;

    const [voucher] = await db
      .select()
      .from(voucherCodes)
      .where(and(eq(voucherCodes.id, req.params.id), eq(voucherCodes.createdByUser, user.id)));

    if (!voucher) {
      return res.status(404).json({ success: false, message: "Voucher not found" });
    }

    if (voucher.currentUses > 0) {
      return res.status(400).json({ success: false, message: "Redeemed vouchers cannot be deleted" });
    }

    const refundAmount = toMoneyNumber(voucher.value) * Math.max(voucher.maxUses || 1, 1);

    await db.transaction(async (tx) => {
      const [currentUser] = await tx.select().from(users).where(eq(users.id, user.id));
      if (!currentUser) throw new Error("User not found");

      const balanceBefore = toMoneyNumber(currentUser.walletBalance || "0.00");
      const balanceAfter = balanceBefore + refundAmount;

      await tx
        .update(users)
        .set({
          walletBalance: money(balanceAfter),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      await tx.delete(voucherUsage).where(eq(voucherUsage.voucherId, voucher.id));
      await tx.delete(voucherCodes).where(eq(voucherCodes.id, voucher.id));

      await tx.insert(walletTransactions).values({
        userId: user.id,
        type: "refund",
        status: "completed",
        amount: money(refundAmount),
        currency: "USD",
        balanceBefore: money(balanceBefore),
        balanceAfter: money(balanceAfter),
        provider: "voucher",
        referenceId: voucher.code,
        description: `Refund for deleted voucher ${voucher.code}`,
        metadata: { voucherId: voucher.id, voucherCode: voucher.code, seriesCode: voucher.seriesCode },
        completedAt: new Date(),
      });
    });

    return res.json({ success: true, message: "Voucher deleted and remaining value refunded" });
  } catch (error: any) {
    console.error("Account voucher delete error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to delete voucher" });
  }
});

export default router;
