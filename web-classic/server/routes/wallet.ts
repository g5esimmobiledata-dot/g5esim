import { Router } from "express";
import { and, count, desc, eq, or, sql } from "drizzle-orm";
import { db } from "server/db";
import { requireAuth } from "server/middleware/auth";
import {
  currencyRates,
  paymentGateways,
  resellerPaymentSettings,
  supportedCurrency,
  users,
  voucherCodes,
  voucherUsage,
  walletTransactions,
} from "@shared/schema";
import { initStripePayment } from "server/helpers/payments/stripe";
import { initPaypalPayment } from "server/helpers/payments/paypal";
import {
  initNowPaymentsPayment,
  verifyNowPaymentsIpnSignature,
  verifyNowPaymentsPayment,
} from "server/helpers/payments/nowpayments";
import {
  initCryptomusPayment,
  verifyCryptomusPayment,
  verifyCryptomusWebhookSignature,
} from "server/helpers/payments/cryptomus";
import {
  initAyaMerchantPayment,
  verifyAyaMerchantPayment,
} from "server/helpers/payments/ayamerchant";
import verifyStripe from "server/helpers/payments/verify/stripe";
import verifyPaypal from "server/helpers/payments/verify/paypal";
import { storage } from "server/storage";
import {
  generateVoucherCode,
  generateVoucherQrCode,
  getNextVoucherSerialNumbers,
  getNextVoucherSeriesCode,
  normalizeVoucherCode as normalizeFormattedVoucherCode,
  voucherQrNeedsRefresh,
} from "server/utils/voucher";
import {
  ensureResellerPaymentSettingsTable,
  normalizePaypalEmail,
} from "server/utils/resellerPaymentSettings";
import { getRequestPricingRole } from "server/helpers/packagePricing";
import { ensurePaymentGatewayOwnershipColumn } from "server/utils/paymentGatewayOwnership";
import {
  getSandboxDemoSettings,
  isSandboxDemoModeForUser,
  isSandboxEnabledForRole,
} from "server/utils/sandboxDemo";
import { getVoucherLimitForUser } from "server/utils/voucherLimits";

const router = Router();
const SUPPORTED_WALLET_PROVIDERS = new Set(["stripe", "paypal", "nowpayments", "cryptomus", "ayamerchant"]);

function getRequestBaseUrl(req: any) {
  const forwardedProto = req.get?.("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.get?.("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol || "http";
  const host = forwardedHost || req.get?.("host") || `localhost:${process.env.PORT || 5000}`;
  return `${protocol}://${host}`;
}

router.use(async (_req, _res, next) => {
  try {
    await ensurePaymentGatewayOwnershipColumn();
    next();
  } catch (error) {
    next(error);
  }
});

function toMoney(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : NaN;
}

function money(value: number): string {
  return value.toFixed(2);
}

function normalizeCurrency(value: unknown): string {
  return String(value || "USD").trim().toUpperCase();
}

function normalizeVoucherCode(value: unknown): string {
  return normalizeFormattedVoucherCode(value);
}

async function getEnabledGatewayForCurrency(
  gatewayId: string,
  currencyCode: string,
  ownerResellerId?: string | null,
) {
  const [gateway] = await db
    .select()
    .from(paymentGateways)
    .where(and(eq(paymentGateways.id, gatewayId), eq(paymentGateways.isEnabled, true)));

  if (!gateway) {
    return { error: "Selected payment gateway is disabled or unavailable" as const };
  }

  if (gateway.resellerId && gateway.resellerId !== ownerResellerId) {
    return { error: "Selected payment gateway is unavailable for this storefront" as const };
  }

  if (!ownerResellerId && gateway.resellerId) {
    return { error: "Selected payment gateway is only available on its reseller storefront" as const };
  }

  if (!SUPPORTED_WALLET_PROVIDERS.has(gateway.provider)) {
    return { error: "Wallet top-up currently supports Stripe card payments, PayPal, AYAMERCHANT, and USDT crypto payments" as const };
  }

  const [currency] = await db
    .select({ id: currencyRates.id })
    .from(currencyRates)
    .where(eq(currencyRates.code, currencyCode));

  if (!currency) {
    return { error: `Unsupported currency: ${currencyCode}` as const };
  }

  const [supported] = await db
    .select({ id: supportedCurrency.id })
    .from(supportedCurrency)
    .where(
      and(
        eq(supportedCurrency.paymentGatewayId, gateway.id),
        eq(supportedCurrency.currencyId, currency.id),
      ),
    );

  if (!supported) {
    return { error: `${gateway.displayName} does not support ${currencyCode}` as const };
  }

  return { gateway };
}

async function completeWalletTopup({
  transaction,
  userId,
  expectedAmount,
  providerPaymentId,
  verification,
}: {
  transaction: typeof walletTransactions.$inferSelect;
  userId: string;
  expectedAmount: number;
  providerPaymentId: string;
  verification: Record<string, any>;
}) {
  const result = await db.transaction(async (tx) => {
    const [currentTransaction] = await tx
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.id, transaction.id));

    if (!currentTransaction) throw new Error("Wallet transaction not found");
    if (currentTransaction.status === "completed") {
      return { transaction: currentTransaction, balance: currentTransaction.balanceAfter, credited: false };
    }
    if (currentTransaction.status !== "pending") {
      throw new Error(`Wallet top-up is ${currentTransaction.status}`);
    }

    const [user] = await tx.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    const balanceBefore = toMoney(user.walletBalance || "0.00");
    const balanceAfter = balanceBefore + expectedAmount;

    await tx
      .update(users)
      .set({ walletBalance: money(balanceAfter), updatedAt: new Date() })
      .where(eq(users.id, userId));

    const [completed] = await tx
      .update(walletTransactions)
      .set({
        status: "completed",
        balanceBefore: money(balanceBefore),
        balanceAfter: money(balanceAfter),
        providerPaymentId: String(verification.referenceId || providerPaymentId),
        referenceId: String(verification.referenceId || providerPaymentId),
        metadata: {
          ...((currentTransaction.metadata as Record<string, unknown>) || {}),
          verificationMetadata: verification.metadata || {},
        },
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(walletTransactions.id, currentTransaction.id))
      .returning();

    return { transaction: completed, balance: money(balanceAfter), credited: true };
  });

  if (result.credited) {
    await storage.createNotification({
      userId,
      type: "wallet",
      title: "Wallet top-up successful",
      message: `$${money(expectedAmount)} was added to your wallet.`,
      read: false,
      metadata: { transactionId: result.transaction.id },
    });
  }

  return result;
}

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const transactions = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, req.userId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(10);

    return res.json({
      success: true,
      data: {
        balance: user.walletBalance || "0.00",
        currency: "USD",
        transactions,
      },
    });
  } catch (error: any) {
    console.error("Wallet fetch error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load wallet" });
  }
});

router.get("/transactions", requireAuth, async (req: any, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 25), 100);
    const transactions = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, req.userId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit);

    return res.json({ success: true, data: transactions });
  } catch (error: any) {
    console.error("Wallet transactions error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load transactions" });
  }
});

router.get("/vouchers", requireAuth, async (req: any, res) => {
  try {
    const vouchers = await db
      .select()
      .from(voucherCodes)
      .where(eq(voucherCodes.createdByUser, req.userId))
      .orderBy(desc(voucherCodes.createdAt))
      .limit(50);
    const baseUrl = getRequestBaseUrl(req);
    const vouchersWithCurrentQr = await Promise.all(
      vouchers.map(async (voucher) => {
        if (!voucherQrNeedsRefresh(voucher)) return voucher;

        const qr = await generateVoucherQrCode(voucher.code, baseUrl);
        await db
          .update(voucherCodes)
          .set({ qrCode: qr.qrCode, qrPayload: qr.payload, updatedAt: new Date() })
          .where(eq(voucherCodes.id, voucher.id));

        return { ...voucher, qrCode: qr.qrCode, qrPayload: qr.payload };
      }),
    );

    return res.json({ success: true, data: vouchersWithCurrentQr });
  } catch (error: any) {
    console.error("Wallet vouchers fetch error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load vouchers" });
  }
});

router.get("/voucher-limit", requireAuth, async (req: any, res) => {
  try {
    const limit = await getVoucherLimitForUser(req.userId);
    return res.json({
      success: true,
      data: {
        limit: limit.limit.toFixed(2),
        used: limit.used.toFixed(2),
        remaining: limit.remaining === null ? null : limit.remaining.toFixed(2),
        unlimited: limit.unlimited,
        applies: limit.user?.role === "agent" || limit.user?.role === "reseller",
      },
    });
  } catch (error: any) {
    console.error("Wallet voucher limit fetch error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load voucher limit" });
  }
});

router.post("/vouchers", requireAuth, async (req: any, res) => {
  try {
    const amount = toMoney(req.body.amount);
    if (!Number.isFinite(amount) || amount < 1) {
      return res.status(400).json({ success: false, message: "Minimum voucher amount is 1.00" });
    }

    if (amount > 10000) {
      return res.status(400).json({ success: false, message: "Maximum voucher amount is 10,000.00" });
    }

    let code = normalizeVoucherCode(req.body.code);
    if (code && !/^\d{4}-\d{4}-\d{4}-\d{4}$/.test(code)) {
      return res.status(400).json({ success: false, message: "Voucher code must be 16 digits formatted as 0000-0000-0000-0000" });
    }

    if (!code) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const generated = generateVoucherCode();
        const [existing] = await db.select({ id: voucherCodes.id }).from(voucherCodes).where(
          or(eq(voucherCodes.code, generated), eq(voucherCodes.code, generated.replace(/-/g, ""))),
        );
        if (!existing) {
          code = generated;
          break;
        }
      }
    }

    if (!code) {
      return res.status(500).json({ success: false, message: "Could not generate a unique voucher code" });
    }

    const [existing] = await db.select({ id: voucherCodes.id }).from(voucherCodes).where(
      or(eq(voucherCodes.code, code), eq(voucherCodes.code, code.replace(/-/g, ""))),
    );
    if (existing) {
      return res.status(400).json({ success: false, message: "Voucher code already exists" });
    }

    const qr = await generateVoucherQrCode(code, getRequestBaseUrl(req));
    const seriesCode = await getNextVoucherSeriesCode();
    const [serialNumber] = await getNextVoucherSerialNumbers(1);
    const expiresAt = req.body.validUntil ? new Date(req.body.validUntil) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      return res.status(400).json({ success: false, message: "Voucher expiry must be a future date" });
    }

    const voucherLimit = await getVoucherLimitForUser(req.userId);
    if (!voucherLimit.user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (
      (voucherLimit.user.role === "agent" || voucherLimit.user.role === "reseller") &&
      !voucherLimit.unlimited &&
      voucherLimit.used + amount > voucherLimit.limit + 0.001
    ) {
      return res.status(400).json({
        success: false,
        message: `Voucher limit exceeded. Remaining limit is ${money(Math.max(voucherLimit.limit - voucherLimit.used, 0))} USD.`,
        data: {
          limit: money(voucherLimit.limit),
          used: money(voucherLimit.used),
          remaining: money(Math.max(voucherLimit.limit - voucherLimit.used, 0)),
        },
      });
    }

    const result = await db.transaction(async (tx) => {
      const [updatedUser] = await tx
        .update(users)
        .set({
          walletBalance: sql`${users.walletBalance}::numeric - ${amount}`,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, req.userId), sql`${users.walletBalance}::numeric >= ${amount}`))
        .returning();

      if (!updatedUser) {
        throw new Error("Insufficient wallet balance to generate this voucher");
      }

      const balanceAfter = toMoney(updatedUser.walletBalance || "0.00");
      const balanceBefore = balanceAfter + amount;

      const [voucher] = await tx
        .insert(voucherCodes)
        .values({
          seriesCode,
          serialNumber,
          code,
          type: "wallet_credit",
          value: money(amount),
          minPurchaseAmount: "0.00",
          maxUses: 1,
          perUserLimit: 1,
          validFrom: new Date(),
          validUntil: expiresAt,
          status: "active",
          description: req.body.description || "User generated wallet top-up voucher",
          createdByUser: req.userId,
          qrCode: qr.qrCode,
          qrPayload: qr.payload,
        })
        .returning();

      const [transaction] = await tx
        .insert(walletTransactions)
        .values({
          userId: req.userId,
          type: "voucher_debit",
          status: "completed",
          amount: money(amount),
          currency: "USD",
          balanceBefore: money(balanceBefore),
          balanceAfter: money(balanceAfter),
          provider: "voucher",
          voucherId: voucher.id,
          referenceId: voucher.code,
          description: `Generated wallet voucher ${voucher.code}`,
          metadata: { voucherCode: voucher.code, qrPayload: qr.payload },
          completedAt: new Date(),
        })
        .returning();

      return { voucher, transaction, balance: money(balanceAfter) };
    });

    await storage.createNotification({
      userId: req.userId,
      type: "wallet",
      title: "Voucher generated",
      message: `${money(amount)} USD was moved from your wallet into voucher ${code}.`,
      read: false,
      metadata: { voucherId: result.voucher.id, transactionId: result.transaction.id },
    });

    return res.status(201).json({
      success: true,
      message: "Voucher generated successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Wallet voucher generate error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to generate voucher" });
  }
});

router.post("/redeem-voucher", requireAuth, async (req: any, res) => {
  try {
    const code = normalizeVoucherCode(req.body.code);
    if (!code) {
      return res.status(400).json({ success: false, message: "Voucher code is required" });
    }

    const [voucher] = await db
      .select()
      .from(voucherCodes)
      .where(or(eq(voucherCodes.code, code), eq(voucherCodes.code, code.replace(/-/g, ""))));

    if (!voucher) {
      return res.status(404).json({ success: false, message: "Invalid voucher code" });
    }

    const now = new Date();
    if (voucher.status !== "active" || now < voucher.validFrom || now > voucher.validUntil) {
      return res.status(400).json({ success: false, message: "This voucher is not active or has expired" });
    }

    if (voucher.maxUses && voucher.currentUses >= voucher.maxUses) {
      return res.status(400).json({ success: false, message: "This voucher has reached its usage limit" });
    }

    const voucherType = voucher.type.toLowerCase();
    if (voucherType !== "wallet_credit") {
      return res.status(400).json({
        success: false,
        message: "Only wallet credit vouchers can be redeemed into wallet balance",
      });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.userId));
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (voucher.assignedUserId && voucher.assignedUserId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "This voucher is assigned to another account",
      });
    }

    if (voucher.assignedRole && voucher.assignedRole !== "all" && currentUser.role !== voucher.assignedRole) {
      return res.status(403).json({
        success: false,
        message: `This voucher is only available for ${voucher.assignedRole === "agent" ? "Agent" : "Reseller"} accounts`,
      });
    }

    const [usage] = await db
      .select({ total: count() })
      .from(voucherUsage)
      .where(and(eq(voucherUsage.voucherId, voucher.id), eq(voucherUsage.userId, req.userId)));

    if (voucher.perUserLimit && Number(usage?.total || 0) >= voucher.perUserLimit) {
      return res.status(400).json({ success: false, message: "You have already used this voucher" });
    }

    const amount = toMoney(voucher.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Voucher has an invalid wallet amount" });
    }

    const result = await db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, req.userId));
      if (!user) throw new Error("User not found");

      const balanceBefore = toMoney(user.walletBalance || "0.00");
      const balanceAfter = balanceBefore + amount;

      await tx
        .update(users)
        .set({ walletBalance: money(balanceAfter), updatedAt: new Date() })
        .where(eq(users.id, req.userId));

      const voucherUpdateWhere = voucher.maxUses
        ? and(eq(voucherCodes.id, voucher.id), sql`${voucherCodes.currentUses} < ${voucher.maxUses}`)
        : eq(voucherCodes.id, voucher.id);

      const [updatedVoucher] = await tx
        .update(voucherCodes)
        .set({ currentUses: sql`${voucherCodes.currentUses} + 1`, updatedAt: new Date() })
        .where(voucherUpdateWhere)
        .returning();

      if (!updatedVoucher) {
        throw new Error("This voucher has reached its usage limit");
      }

      await tx.insert(voucherUsage).values({
        voucherId: voucher.id,
        userId: req.userId,
        discountAmount: money(amount),
      });

      const [transaction] = await tx
        .insert(walletTransactions)
        .values({
          userId: req.userId,
          type: "voucher_redeem",
          status: "completed",
          amount: money(amount),
          currency: "USD",
          balanceBefore: money(balanceBefore),
          balanceAfter: money(balanceAfter),
          provider: "voucher",
          voucherId: voucher.id,
          referenceId: voucher.code,
          description: `Wallet credit from voucher ${voucher.code}`,
          metadata: { voucherCode: voucher.code },
          completedAt: new Date(),
        })
        .returning();

      return {
        balance: money(balanceAfter),
        transaction,
        voucher: {
          id: updatedVoucher.id,
          code: updatedVoucher.code,
          type: updatedVoucher.type,
          value: updatedVoucher.value,
          status: updatedVoucher.status,
          seriesCode: updatedVoucher.seriesCode,
          serialNumber: updatedVoucher.serialNumber,
          currentUses: updatedVoucher.currentUses,
          maxUses: updatedVoucher.maxUses,
          validUntil: updatedVoucher.validUntil,
        },
      };
    });

    await storage.createNotification({
      userId: req.userId,
      type: "wallet",
      title: "Wallet credited",
      message: `$${money(amount)} was added to your wallet.`,
      read: false,
      metadata: { voucherId: voucher.id, transactionId: result.transaction.id },
    });

    if (voucher.createdByUser && voucher.createdByUser !== req.userId) {
      await storage.createNotification({
        userId: voucher.createdByUser,
        type: "wallet",
        title: "Voucher redeemed",
        message: `Voucher ${voucher.code} was redeemed for $${money(amount)}.`,
        read: false,
        metadata: { voucherId: voucher.id, redeemedBy: req.userId },
      });
    }

    return res.json({
      success: true,
      message: "Voucher redeemed successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Wallet voucher redeem error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to redeem voucher" });
  }
});

router.post("/sandbox/topup", requireAuth, async (req: any, res) => {
  try {
    const sandboxSettings = await getSandboxDemoSettings();
    const sandboxMode = await isSandboxDemoModeForUser(req.userId);
    if (!sandboxMode || !sandboxSettings.walletTopupEnabled) {
      return res.status(403).json({
        success: false,
        message: "Sandbox wallet top-up is not enabled",
      });
    }

    const amount = toMoney(req.body.amount);
    if (!Number.isFinite(amount) || amount < 1) {
      return res.status(400).json({ success: false, message: "Minimum sandbox top-up amount is 1.00" });
    }

    if (amount > sandboxSettings.maxWalletTopupAmount) {
      return res.status(400).json({
        success: false,
        message: `Maximum sandbox top-up amount is ${money(sandboxSettings.maxWalletTopupAmount)}`,
      });
    }

    const sandboxReference = `SANDBOX-WALLET-${Date.now()}`;
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, req.userId));
      if (!user) throw new Error("User not found");

      const balanceBefore = toMoney(user.walletBalance || "0.00");
      const balanceAfter = balanceBefore + amount;

      const [updatedUser] = await tx
        .update(users)
        .set({ walletBalance: money(balanceAfter), updatedAt: new Date() })
        .where(eq(users.id, req.userId))
        .returning();

      const [transaction] = await tx
        .insert(walletTransactions)
        .values({
          userId: req.userId,
          type: "sandbox_topup",
          status: "completed",
          amount: money(amount),
          currency: "USD",
          balanceBefore: money(balanceBefore),
          balanceAfter: money(balanceAfter),
          provider: "sandbox",
          providerPaymentId: sandboxReference,
          referenceId: sandboxReference,
          description: "Sandbox demo wallet top-up",
          metadata: {
            sandbox: true,
            demoMode: true,
            note: "Developer test funds. No payment processor was charged.",
          },
          completedAt: new Date(),
        })
        .returning();

      return { user: updatedUser, transaction, balance: money(balanceAfter) };
    });

    await storage.createNotification({
      userId: req.userId,
      type: "wallet",
      title: "Sandbox funds added",
      message: `$${money(amount)} in test funds was added to your wallet.`,
      read: false,
      metadata: { transactionId: result.transaction.id, sandbox: true },
    });

    return res.status(201).json({
      success: true,
      message: "Sandbox funds added",
      data: {
        balance: result.balance,
        transaction: result.transaction,
      },
    });
  } catch (error: any) {
    console.error("Sandbox wallet top-up error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to add sandbox funds" });
  }
});

router.post("/topup/init", requireAuth, async (req: any, res) => {
  let walletTransactionId: string | null = null;

  try {
    const amount = toMoney(req.body.amount);
    const currency = normalizeCurrency(req.body.currency);
    const gatewayId = String(req.body.gatewayId || "");

    if (!Number.isFinite(amount) || amount < 1) {
      return res.status(400).json({ success: false, message: "Minimum wallet top-up amount is 1.00" });
    }

    if (amount > 10000) {
      return res.status(400).json({ success: false, message: "Maximum wallet top-up amount is 10,000.00" });
    }

    if (!gatewayId) {
      return res.status(400).json({ success: false, message: "Payment gateway is required" });
    }

    const pricingRole = await getRequestPricingRole(req);
    const ownerResellerId = pricingRole.source === "storefront" ? pricingRole.resellerId : null;
    const gatewayResult = await getEnabledGatewayForCurrency(gatewayId, currency, ownerResellerId);
    if ("error" in gatewayResult) {
      return res.status(400).json({ success: false, message: gatewayResult.error });
    }

    const gateway = gatewayResult.gateway;
    const user = await storage.getUser(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const sandboxSettings = await getSandboxDemoSettings();
    if (isSandboxEnabledForRole(sandboxSettings, user.role)) {
      return res.status(403).json({
        success: false,
        message: "Sandbox mode is active. Use sandbox wallet test funds instead of a live wallet top-up.",
      });
    }

    let resellerPaypalEmail = "";
    if (gateway.provider === "paypal" && user.role === "reseller") {
      await ensureResellerPaymentSettingsTable();
      const submittedPaypalEmail = normalizePaypalEmail(req.body.paypalEmail);

      if (submittedPaypalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submittedPaypalEmail)) {
        return res.status(400).json({ success: false, message: "Enter a valid PayPal email address" });
      }

      const [existingSettings] = await db
        .select()
        .from(resellerPaymentSettings)
        .where(eq(resellerPaymentSettings.resellerId, req.userId))
        .limit(1);

      resellerPaypalEmail = submittedPaypalEmail || existingSettings?.paypalEmail || "";
      if (!resellerPaypalEmail) {
        return res.status(400).json({
          success: false,
          message: "Add your PayPal email before using PayPal wallet top-up",
        });
      }

      if (submittedPaypalEmail && submittedPaypalEmail !== existingSettings?.paypalEmail) {
        await db
          .insert(resellerPaymentSettings)
          .values({
            resellerId: req.userId,
            paypalEmail: submittedPaypalEmail,
          })
          .onConflictDoUpdate({
            target: resellerPaymentSettings.resellerId,
            set: {
              paypalEmail: submittedPaypalEmail,
              updatedAt: new Date(),
            },
          });
      }
    }

    const balanceBefore = toMoney(user.walletBalance || "0.00");
    const [pendingTransaction] = await db
      .insert(walletTransactions)
      .values({
        userId: req.userId,
        type: "payment_topup",
        status: "pending",
        amount: money(amount),
        currency,
        balanceBefore: money(balanceBefore),
        balanceAfter: money(balanceBefore),
        provider: gateway.provider,
        paymentGatewayId: gateway.id,
        description: `Wallet top-up via ${gateway.displayName}`,
        metadata: {
          gatewayId: gateway.id,
          displayName: gateway.displayName,
          ...(resellerPaypalEmail ? { resellerPaypalEmail } : {}),
        },
      })
      .returning();

    walletTransactionId = pendingTransaction.id;

    let result: any;
    const metadata = {
      type: "wallet_topup" as const,
      walletTransactionId: pendingTransaction.id,
      amount: money(amount),
      currency,
      ...(resellerPaypalEmail ? { resellerPaypalEmail } : {}),
    };

    if (gateway.provider === "stripe") {
      result = await initStripePayment({
        secretKey: gateway.secretKey!,
        amount,
        currency,
        packageId: "wallet",
        quantity: 1,
        orderId: pendingTransaction.id,
        userId: req.userId,
        metadata,
      });

      await db
        .update(walletTransactions)
        .set({
          providerPaymentId: result.paymentIntentId,
          referenceId: result.paymentIntentId,
          updatedAt: new Date(),
        })
        .where(eq(walletTransactions.id, pendingTransaction.id));

      return res.json({
        success: true,
        message: "Wallet top-up initialized",
        data: {
          transactionId: pendingTransaction.id,
          payment: {
            provider: "stripe",
            clientSecret: result.clientSecret,
            paymentIntentId: result.paymentIntentId,
            publicKey: gateway.publicKey,
            amount,
            currency,
          },
        },
      });
    }

    if (gateway.provider === "paypal") {
      const rawReturnUrl = typeof req.body.returnUrl === "string" && req.body.returnUrl.startsWith("http")
        ? req.body.returnUrl
        : `${getRequestBaseUrl(req)}/wallet-topup-return`;
      const rawCancelUrl = typeof req.body.cancelUrl === "string" && req.body.cancelUrl.startsWith("http")
        ? req.body.cancelUrl
        : `${getRequestBaseUrl(req)}/wallet-topup-cancel`;
      const paypalReturnUrl = new URL(rawReturnUrl);
      paypalReturnUrl.searchParams.set("walletProvider", "paypal");
      paypalReturnUrl.searchParams.set("walletTransactionId", pendingTransaction.id);
      const paypalCancelUrl = new URL(rawCancelUrl);
      paypalCancelUrl.searchParams.set("walletProvider", "paypal");
      paypalCancelUrl.searchParams.set("walletTransactionId", pendingTransaction.id);

      result = await initPaypalPayment({
        clientId: gateway.publicKey!,
        secretKey: gateway.secretKey!,
        mode: (gateway.config as any)?.mode || "sandbox",
        amount,
        currency,
        packageId: "wallet",
        quantity: 1,
        userId: req.userId,
        metadata,
        returnUrl: paypalReturnUrl.toString(),
        cancelUrl: paypalCancelUrl.toString(),
      });

      await db
        .update(walletTransactions)
        .set({
          providerPaymentId: result.orderId,
          referenceId: result.orderId,
          updatedAt: new Date(),
        })
        .where(eq(walletTransactions.id, pendingTransaction.id));

      return res.json({
        success: true,
        message: "Wallet top-up initialized",
        data: {
          transactionId: pendingTransaction.id,
          payment: {
            provider: "paypal",
            orderId: result.orderId,
            approvalUrl: result.approvalUrl,
            publicKey: gateway.publicKey,
            config: gateway.config,
            amount,
            currency,
          },
        },
      });
    }

    if (gateway.provider === "ayamerchant") {
      const walletPath = typeof req.body.walletPath === "string" && req.body.walletPath.startsWith("/")
        ? req.body.walletPath
        : "/account/wallet";
      const returnUrl = new URL(`${getRequestBaseUrl(req)}${walletPath}`);
      returnUrl.searchParams.set("walletProvider", "ayamerchant");
      returnUrl.searchParams.set("walletTransactionId", pendingTransaction.id);
      returnUrl.searchParams.set("orderId", pendingTransaction.id);

      result = await initAyaMerchantPayment({
        gateway: gateway as any,
        amount,
        currency,
        txRef: pendingTransaction.id,
        email: user.email,
        name: user.name || user.email,
        phone: (user as any).phone || "",
        description: `Wallet top-up ${pendingTransaction.id}`,
        metadata: {
          ...metadata,
          userId: req.userId,
        },
        returnUrl: returnUrl.toString(),
      });

      await db
        .update(walletTransactions)
        .set({
          providerPaymentId: result.txRef,
          referenceId: result.txRef,
          metadata: {
            ...((pendingTransaction.metadata as Record<string, unknown>) || {}),
            ayamerchant: {
              txRef: result.txRef,
              checkoutUrl: result.checkoutUrl,
            },
          },
          updatedAt: new Date(),
        })
        .where(eq(walletTransactions.id, pendingTransaction.id));

      return res.json({
        success: true,
        message: "AYAMERCHANT wallet top-up initialized",
        data: {
          transactionId: pendingTransaction.id,
          payment: {
            provider: "ayamerchant",
            orderId: result.txRef,
            redirectUrl: result.redirectUrl,
            amount,
            currency,
          },
        },
      });
    }

    if (gateway.provider === "nowpayments") {
      result = await initNowPaymentsPayment({
        gateway: gateway as any,
        amount,
        currency,
        walletTransactionId: pendingTransaction.id,
        userId: req.userId,
        req,
      });

      const { raw, userId: _userId, ...payment } = result;

      await db
        .update(walletTransactions)
        .set({
          providerPaymentId: result.paymentId,
          referenceId: result.paymentId,
          metadata: {
            ...((pendingTransaction.metadata as Record<string, unknown>) || {}),
            nowpayments: {
              paymentId: result.paymentId,
              paymentStatus: result.paymentStatus,
              payAddress: result.payAddress,
              payAmount: result.payAmount,
              payCurrency: result.payCurrency,
              network: result.network,
              priceAmount: result.priceAmount,
              priceCurrency: result.priceCurrency,
              purchaseId: result.purchaseId,
            },
          },
          updatedAt: new Date(),
        })
        .where(eq(walletTransactions.id, pendingTransaction.id));

      return res.json({
        success: true,
        message: "USDT wallet top-up initialized",
        data: {
          transactionId: pendingTransaction.id,
          payment,
        },
      });
    }

    if (gateway.provider === "cryptomus") {
      result = await initCryptomusPayment({
        gateway: gateway as any,
        amount,
        currency,
        walletTransactionId: pendingTransaction.id,
        userId: req.userId,
        req,
      });

      const { raw, userId: _userId, ...payment } = result;

      await db
        .update(walletTransactions)
        .set({
          providerPaymentId: result.paymentId,
          referenceId: result.paymentId,
          metadata: {
            ...((pendingTransaction.metadata as Record<string, unknown>) || {}),
            cryptomus: {
              paymentId: result.paymentId,
              paymentStatus: result.paymentStatus,
              payAddress: result.payAddress,
              payAmount: result.payAmount,
              payCurrency: result.payCurrency,
              network: result.network,
              priceAmount: result.priceAmount,
              priceCurrency: result.priceCurrency,
              orderId: result.orderId,
              paymentUrl: result.paymentUrl,
            },
          },
          updatedAt: new Date(),
        })
        .where(eq(walletTransactions.id, pendingTransaction.id));

      return res.json({
        success: true,
        message: "Cryptomus USDT wallet top-up initialized",
        data: {
          transactionId: pendingTransaction.id,
          payment,
        },
      });
    }

    return res.status(400).json({ success: false, message: "Unsupported wallet payment provider" });
  } catch (error: any) {
    console.error("Wallet top-up init error:", error);

    if (walletTransactionId) {
      await db
        .update(walletTransactions)
        .set({ status: "failed", description: error.message || "Payment initialization failed", updatedAt: new Date() })
        .where(eq(walletTransactions.id, walletTransactionId));
    }

    return res.status(500).json({ success: false, message: error.message || "Failed to initialize wallet top-up" });
  }
});

router.post("/topup/confirm", requireAuth, async (req: any, res) => {
  try {
    const providerType = String(req.body.providerType || "").toLowerCase();
    const walletTransactionId = String(req.body.walletTransactionId || "");
    const providerPaymentId =
      req.body.paymentIntentId ||
      req.body.orderId ||
      req.body.paymentId ||
      req.body.providerPaymentId;

    if (!providerType || (!providerPaymentId && !walletTransactionId)) {
      return res.status(400).json({ success: false, message: "Payment confirmation data is missing" });
    }

    let [transaction] = walletTransactionId
      ? await db
          .select()
          .from(walletTransactions)
          .where(and(eq(walletTransactions.id, walletTransactionId), eq(walletTransactions.userId, req.userId)))
      : await db
          .select()
          .from(walletTransactions)
          .where(
            and(
              eq(walletTransactions.providerPaymentId, String(providerPaymentId)),
              eq(walletTransactions.userId, req.userId),
            ),
          );

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Wallet top-up transaction not found" });
    }

    const resolvedProviderPaymentId = String(providerPaymentId || transaction.providerPaymentId || "");
    if (!resolvedProviderPaymentId) {
      return res.status(400).json({ success: false, message: "Payment provider reference is missing" });
    }

    if (transaction.status === "completed") {
      return res.json({
        success: true,
        message: "Wallet top-up already completed",
        data: { transaction, balance: transaction.balanceAfter },
      });
    }

    if (transaction.status !== "pending") {
      return res.status(400).json({ success: false, message: `Wallet top-up is ${transaction.status}` });
    }

    const [gateway] = await db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.id, transaction.paymentGatewayId!));

    if (!gateway || gateway.provider !== providerType) {
      return res.status(400).json({ success: false, message: "Payment gateway mismatch" });
    }

    const verification =
      providerType === "stripe"
        ? await verifyStripe({ paymentIntentId: resolvedProviderPaymentId }, gateway)
        : providerType === "paypal"
          ? await verifyPaypal({ orderId: resolvedProviderPaymentId }, gateway)
          : providerType === "nowpayments"
            ? await verifyNowPaymentsPayment({ gateway: gateway as any, paymentId: resolvedProviderPaymentId })
            : providerType === "cryptomus"
              ? await verifyCryptomusPayment({ gateway: gateway as any, paymentId: resolvedProviderPaymentId, orderId: transaction.id })
              : providerType === "ayamerchant"
                ? await verifyAyaMerchantPayment({ gateway: gateway as any, txRef: resolvedProviderPaymentId || transaction.id })
                : { success: false, message: "Unsupported wallet payment provider" };

    if (!verification.success) {
      if (providerType === "nowpayments" || providerType === "cryptomus") {
        const failed = Boolean((verification as any).finalFailure);
        const metadataKey = providerType === "cryptomus" ? "cryptomus" : "nowpayments";
        await db
          .update(walletTransactions)
          .set({
            status: failed ? "failed" : "pending",
            description: failed ? (verification.message || "Crypto payment failed") : transaction.description,
            metadata: {
              ...((transaction.metadata as Record<string, unknown>) || {}),
              [metadataKey]: {
                ...(((transaction.metadata as any)?.[metadataKey] as Record<string, unknown>) || {}),
                paymentStatus: (verification as any).status,
                verificationMetadata: (verification as any).metadata || {},
              },
            },
            updatedAt: new Date(),
          })
          .where(eq(walletTransactions.id, transaction.id));

        return res.status(failed ? 400 : 202).json({
          success: false,
          message: verification.message || "Crypto payment is not completed yet",
          data: {
            transactionId: transaction.id,
            paymentStatus: (verification as any).status || "waiting",
            provider: providerType,
          },
        });
      }

      return res.status(400).json(verification);
    }

    const expectedAmount = toMoney(transaction.amount);
    const paidAmount = toMoney((verification as any).amount);
    const paidCurrency = normalizeCurrency((verification as any).currency);

    if (paidCurrency !== transaction.currency.toUpperCase()) {
      return res.status(400).json({ success: false, message: "Payment currency does not match wallet top-up" });
    }

    if (paidAmount + 0.005 < expectedAmount) {
      return res.status(400).json({ success: false, message: "Payment amount is less than wallet top-up amount" });
    }

    const result = await completeWalletTopup({
      transaction,
      userId: req.userId,
      expectedAmount,
      providerPaymentId: resolvedProviderPaymentId,
      verification: verification as Record<string, any>,
    });

    return res.json({
      success: true,
      message: "Wallet top-up successful",
      data: result,
    });
  } catch (error: any) {
    console.error("Wallet top-up confirm error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to confirm wallet top-up" });
  }
});

router.post("/crypto/nowpayments/ipn", async (req: any, res) => {
  try {
    const paymentId = String(req.body?.payment_id || "");
    const orderId = String(req.body?.order_id || "");

    if (!paymentId && !orderId) {
      return res.status(400).json({ success: false, message: "NOWPayments IPN is missing payment_id/order_id" });
    }

    const [transaction] = orderId
      ? await db
          .select()
          .from(walletTransactions)
          .where(or(eq(walletTransactions.id, orderId), eq(walletTransactions.providerPaymentId, paymentId)))
      : await db.select().from(walletTransactions).where(eq(walletTransactions.providerPaymentId, paymentId));

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Wallet transaction not found for NOWPayments IPN" });
    }

    const [gateway] = await db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.id, transaction.paymentGatewayId!));

    if (!gateway || gateway.provider !== "nowpayments") {
      return res.status(400).json({ success: false, message: "NOWPayments gateway mismatch" });
    }

    const signature = req.get("x-nowpayments-sig") || undefined;
    if (!verifyNowPaymentsIpnSignature(req.body, signature, gateway.webhookSecret)) {
      return res.status(401).json({ success: false, message: "Invalid NOWPayments IPN signature" });
    }

    const resolvedPaymentId = paymentId || transaction.providerPaymentId || "";
    const verification = await verifyNowPaymentsPayment({ gateway: gateway as any, paymentId: resolvedPaymentId });

    if (!verification.success) {
      const failed = Boolean((verification as any).finalFailure);
      await db
        .update(walletTransactions)
        .set({
          status: failed ? "failed" : transaction.status,
          description: failed ? (verification.message || "USDT payment failed") : transaction.description,
          metadata: {
            ...((transaction.metadata as Record<string, unknown>) || {}),
            nowpayments: {
              ...(((transaction.metadata as any)?.nowpayments as Record<string, unknown>) || {}),
              paymentStatus: (verification as any).status,
              ipnMetadata: req.body,
              verificationMetadata: (verification as any).metadata || {},
            },
          },
          updatedAt: new Date(),
        })
        .where(eq(walletTransactions.id, transaction.id));

      return res.json({
        success: true,
        message: verification.message || "NOWPayments IPN received",
        data: { paymentStatus: (verification as any).status || req.body?.payment_status || "waiting" },
      });
    }

    const expectedAmount = toMoney(transaction.amount);
    const paidAmount = toMoney((verification as any).amount);
    const paidCurrency = normalizeCurrency((verification as any).currency);

    if (paidCurrency !== transaction.currency.toUpperCase() || paidAmount + 0.005 < expectedAmount) {
      await db
        .update(walletTransactions)
        .set({
          status: "failed",
          description: "NOWPayments amount or currency mismatch",
          metadata: {
            ...((transaction.metadata as Record<string, unknown>) || {}),
            nowpayments: {
              ...(((transaction.metadata as any)?.nowpayments as Record<string, unknown>) || {}),
              ipnMetadata: req.body,
              verificationMetadata: (verification as any).metadata || {},
            },
          },
          updatedAt: new Date(),
        })
        .where(eq(walletTransactions.id, transaction.id));

      return res.status(400).json({ success: false, message: "NOWPayments amount or currency mismatch" });
    }

    const result = await completeWalletTopup({
      transaction,
      userId: transaction.userId,
      expectedAmount,
      providerPaymentId: resolvedPaymentId,
      verification: verification as Record<string, any>,
    });

    return res.json({
      success: true,
      message: "NOWPayments wallet top-up credited",
      data: result,
    });
  } catch (error: any) {
    console.error("NOWPayments wallet IPN error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to process NOWPayments IPN" });
  }
});

router.post("/crypto/cryptomus/webhook", async (req: any, res) => {
  try {
    const paymentId = String(req.body?.uuid || req.body?.payment_uuid || "");
    const orderId = String(req.body?.order_id || "");

    if (!paymentId && !orderId) {
      return res.status(400).json({ success: false, message: "Cryptomus webhook is missing uuid/order_id" });
    }

    const [transaction] = orderId
      ? await db
          .select()
          .from(walletTransactions)
          .where(or(eq(walletTransactions.id, orderId), eq(walletTransactions.providerPaymentId, paymentId)))
      : await db.select().from(walletTransactions).where(eq(walletTransactions.providerPaymentId, paymentId));

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Wallet transaction not found for Cryptomus webhook" });
    }

    const [gateway] = await db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.id, transaction.paymentGatewayId!));

    if (!gateway || gateway.provider !== "cryptomus") {
      return res.status(400).json({ success: false, message: "Cryptomus gateway mismatch" });
    }

    if (!verifyCryptomusWebhookSignature(req.body, gateway as any)) {
      return res.status(401).json({ success: false, message: "Invalid Cryptomus webhook signature" });
    }

    const resolvedPaymentId = paymentId || transaction.providerPaymentId || "";
    const verification = await verifyCryptomusPayment({
      gateway: gateway as any,
      paymentId: resolvedPaymentId || undefined,
      orderId: orderId || transaction.id,
    });

    if (!verification.success) {
      const failed = Boolean((verification as any).finalFailure);
      await db
        .update(walletTransactions)
        .set({
          status: failed ? "failed" : transaction.status,
          description: failed ? (verification.message || "Cryptomus payment failed") : transaction.description,
          metadata: {
            ...((transaction.metadata as Record<string, unknown>) || {}),
            cryptomus: {
              ...(((transaction.metadata as any)?.cryptomus as Record<string, unknown>) || {}),
              paymentStatus: (verification as any).status,
              webhookMetadata: req.body,
              verificationMetadata: (verification as any).metadata || {},
            },
          },
          updatedAt: new Date(),
        })
        .where(eq(walletTransactions.id, transaction.id));

      return res.json({
        success: true,
        message: verification.message || "Cryptomus webhook received",
        data: { paymentStatus: (verification as any).status || req.body?.status || "waiting" },
      });
    }

    const expectedAmount = toMoney(transaction.amount);
    const paidAmount = toMoney((verification as any).amount);
    const paidCurrency = normalizeCurrency((verification as any).currency);

    if (paidCurrency !== transaction.currency.toUpperCase() || paidAmount + 0.005 < expectedAmount) {
      await db
        .update(walletTransactions)
        .set({
          status: "failed",
          description: "Cryptomus amount or currency mismatch",
          metadata: {
            ...((transaction.metadata as Record<string, unknown>) || {}),
            cryptomus: {
              ...(((transaction.metadata as any)?.cryptomus as Record<string, unknown>) || {}),
              webhookMetadata: req.body,
              verificationMetadata: (verification as any).metadata || {},
            },
          },
          updatedAt: new Date(),
        })
        .where(eq(walletTransactions.id, transaction.id));

      return res.status(400).json({ success: false, message: "Cryptomus amount or currency mismatch" });
    }

    const result = await completeWalletTopup({
      transaction,
      userId: transaction.userId,
      expectedAmount,
      providerPaymentId: resolvedPaymentId,
      verification: verification as Record<string, any>,
    });

    return res.json({
      success: true,
      message: "Cryptomus wallet top-up credited",
      data: result,
    });
  } catch (error: any) {
    console.error("Cryptomus wallet webhook error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to process Cryptomus webhook" });
  }
});

export default router;
