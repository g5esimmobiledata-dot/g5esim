import { Router } from "express";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "server/db";
import { requireAdmin } from "server/lib/middleware";
import * as ApiResponse from "server/utils/response";
import {
  orders,
  providers,
  topups,
  unifiedPackages,
  users,
  userVirtualNumbers,
  virtualNumberInventory,
  virtualSmsMessages,
  walletTransactions,
} from "@shared/schema";

const router = Router();

router.use(requireAdmin);

function trim(value: unknown) {
  return String(value || "").trim();
}

function moneyValue(value: unknown) {
  const parsed = Number.parseFloat(trim(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMoney(value: unknown) {
  return moneyValue(value).toFixed(2);
}

function toIsoOrNull(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getMovement(transaction: typeof walletTransactions.$inferSelect) {
  const amount = moneyValue(transaction.amount);
  const type = trim(transaction.type);
  if (["purchase_debit", "voucher_debit", "refund_debit"].includes(type)) return -Math.abs(amount);
  if (["refund", "payment_topup", "voucher_redeem", "registration_bonus", "sandbox_topup", "adjustment"].includes(type)) {
    return Math.abs(amount);
  }
  return amount;
}

function isVonageTransaction(transaction: typeof walletTransactions.$inferSelect) {
  const metadata = ((transaction.metadata as Record<string, any>) || {});
  const description = trim(transaction.description).toLowerCase();
  return (
    trim(transaction.provider).toLowerCase() === "vonage" ||
    trim(metadata.provider).toLowerCase() === "vonage" ||
    description.includes("virtual number") ||
    description.includes("vonage")
  );
}

function isVirtualNumberTransaction(transaction: typeof walletTransactions.$inferSelect, providerFilter = "") {
  const metadata = ((transaction.metadata as Record<string, any>) || {});
  const description = trim(transaction.description).toLowerCase();
  const provider = trim(metadata.provider || transaction.provider).toLowerCase();
  const isVirtual =
    Boolean(metadata.virtualNumberId || metadata.inventoryId || metadata.msisdn) ||
    ["sms", "voice", "renewal"].includes(trim(metadata.usageType).toLowerCase()) ||
    trim(metadata.chargePoint).toLowerCase().includes("voice") ||
    description.includes("virtual number");

  if (!isVirtual) return false;
  if (!providerFilter || providerFilter === "all") return true;
  return provider === providerFilter;
}

function getProviderCost(
  inventoryItem: typeof virtualNumberInventory.$inferSelect | null | undefined,
  usageType: string,
  direction: string,
  metadata: Record<string, any>,
) {
  if (metadata.providerCost !== undefined && metadata.providerCost !== null) return normalizeMoney(metadata.providerCost);
  if (!inventoryItem) return "0.00";
  if (usageType === "sms") return normalizeMoney(inventoryItem.providerSmsCost || inventoryItem.providerOutboundCost);
  if (usageType === "voice") {
    return normalizeMoney(direction === "inbound" ? inventoryItem.providerInboundCost : inventoryItem.providerVoiceCost || inventoryItem.providerOutboundCost);
  }
  if (metadata.autoRenew) {
    const months = Math.max(1, Number(metadata.billingMonths || 1));
    return normalizeMoney(moneyValue(inventoryItem.providerMonthlyCost) * months);
  }
  return "0.00";
}

router.get("/report", async (req, res) => {
  try {
    const requestedLimit = Number.parseInt(String(req.query.limit || "1000"), 10);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 1000, 1), 5000);
    const reportType = trim(req.query.type).toLowerCase();
    const providerSlug = trim(req.query.providerSlug).toLowerCase();
    const virtualProviderSlug = trim(req.query.virtualProviderSlug || req.query.provider || "vonage").toLowerCase();
    const startDate = trim(req.query.startDate) ? new Date(trim(req.query.startDate)) : null;
    const endDate = trim(req.query.endDate) ? new Date(trim(req.query.endDate)) : null;

    const [transactions, inventory, smsMessages, activeNumbers, orderRows, topupRows, providerRows] = await Promise.all([
      db
        .select({
          transaction: walletTransactions,
          userName: users.name,
          userEmail: users.email,
          userRole: users.role,
        })
        .from(walletTransactions)
        .leftJoin(users, eq(walletTransactions.userId, users.id))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(limit),
      db.select().from(virtualNumberInventory),
      db
        .select({
          message: virtualSmsMessages,
          userName: users.name,
          userEmail: users.email,
          msisdn: userVirtualNumbers.msisdn,
        })
        .from(virtualSmsMessages)
        .leftJoin(users, eq(virtualSmsMessages.userId, users.id))
        .leftJoin(userVirtualNumbers, eq(virtualSmsMessages.virtualNumberId, userVirtualNumbers.id))
        .orderBy(desc(virtualSmsMessages.createdAt))
        .limit(limit),
      db.select().from(userVirtualNumbers),
      db
        .select({
          order: orders,
          userName: users.name,
          userEmail: users.email,
          userRole: users.role,
          providerName: providers.name,
          providerSlug: providers.slug,
          packageTitle: unifiedPackages.title,
          packageWholesalePrice: unifiedPackages.wholesalePrice,
          packageRetailPrice: unifiedPackages.retailPrice,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .leftJoin(providers, eq(orders.providerId, providers.id))
        .leftJoin(unifiedPackages, eq(orders.packageId, unifiedPackages.id))
        .orderBy(desc(orders.createdAt))
        .limit(limit),
      db
        .select({
          topup: topups,
          userName: users.name,
          userEmail: users.email,
        })
        .from(topups)
        .leftJoin(users, eq(topups.userId, users.id))
        .orderBy(desc(topups.createdAt))
        .limit(limit),
      db.select().from(providers).orderBy(asc(providers.name)),
    ]);

    const inDateRange = (createdAt: Date | string | null | undefined) => {
      const date = createdAt ? new Date(createdAt) : null;
      if (!date || Number.isNaN(date.getTime())) return true;
      if (startDate && !Number.isNaN(startDate.getTime()) && date < startDate) return false;
      if (endDate && !Number.isNaN(endDate.getTime()) && date > endDate) return false;
      return true;
    };

    const inventoryById = new Map(inventory.map((item) => [item.id, item]));
    const inventoryByMsisdn = new Map(inventory.map((item) => [trim(item.msisdn), item]));
    const activeNumberById = new Map(activeNumbers.map((item) => [item.id, item]));

    const customerTransactions = transactions
      .filter(({ transaction }) => inDateRange(transaction.createdAt))
      .map(({ transaction, userName, userEmail, userRole }) => {
        const metadata = ((transaction.metadata as Record<string, any>) || {});
        const movement = getMovement(transaction);
        return {
          id: transaction.id,
          userId: transaction.userId,
          userName,
          userEmail,
          userRole,
          type: transaction.type,
          status: transaction.status,
          amount: normalizeMoney(transaction.amount),
          movement: movement.toFixed(2),
          currency: transaction.currency || "USD",
          provider: transaction.provider || metadata.provider || null,
          providerPaymentId: transaction.providerPaymentId || null,
          referenceId: transaction.referenceId || null,
          description: transaction.description || "",
          balanceBefore: normalizeMoney(transaction.balanceBefore),
          balanceAfter: normalizeMoney(transaction.balanceAfter),
          completedAt: toIsoOrNull(transaction.completedAt),
          createdAt: toIsoOrNull(transaction.createdAt) || new Date().toISOString(),
          metadata,
        };
      });

    const vonageTransactions = customerTransactions
      .filter((transaction) => {
        const original = transactions.find(({ transaction: item }) => item.id === transaction.id)?.transaction;
        return original ? isVirtualNumberTransaction(original, virtualProviderSlug) : false;
      })
      .map((transaction) => {
        const metadata = transaction.metadata || {};
        const inventoryItem =
          (metadata.inventoryId && inventoryById.get(String(metadata.inventoryId))) ||
          (metadata.msisdn && inventoryByMsisdn.get(String(metadata.msisdn))) ||
          null;
        const providerCost = getProviderCost(inventoryItem, trim(metadata.usageType), trim(metadata.direction), metadata);
        return {
          ...transaction,
          msisdn: metadata.msisdn || inventoryItem?.msisdn || transaction.referenceId || "",
          usageType: metadata.usageType || (metadata.autoRenew ? "renewal" : "virtual_number"),
          direction: metadata.direction || null,
          chargePoint: metadata.chargePoint || (metadata.autoRenew ? "auto_renewal" : null),
          billingRole: metadata.billingRole || null,
          providerCost,
          grossProfit: normalizeMoney(moneyValue(transaction.amount) - moneyValue(providerCost)),
        };
      });

    const vonageSmsMessages = smsMessages
      .filter(
        ({ message }) =>
          inDateRange(message.createdAt) &&
          (!virtualProviderSlug || virtualProviderSlug === "all" || trim(message.provider).toLowerCase() === virtualProviderSlug),
      )
      .map(({ message, userName, userEmail, msisdn }) => {
        const metadata = ((message.metadata as Record<string, any>) || {});
        const billing = ((metadata.billing as Record<string, any>) || {});
        const number = activeNumberById.get(message.virtualNumberId);
        const inventoryItem = inventoryByMsisdn.get(msisdn || number?.msisdn || "") || null;
        const providerCost = getProviderCost(inventoryItem, "sms", message.direction, {
          providerCost: billing.providerCost || metadata.providerCost,
        });
        return {
          id: message.id,
          userId: message.userId,
          userName,
          userEmail,
          virtualNumberId: message.virtualNumberId,
          msisdn: msisdn || number?.msisdn || "",
          direction: message.direction,
          fromNumber: message.fromNumber,
          toNumber: message.toNumber,
          text: message.text,
          status: message.status,
          providerMessageId: message.providerMessageId || null,
          customerCharge: normalizeMoney(billing.amount || "0.00"),
          providerCost,
          grossProfit: normalizeMoney(moneyValue(billing.amount) - moneyValue(providerCost)),
          createdAt: toIsoOrNull(message.createdAt) || new Date().toISOString(),
          metadata,
        };
      });

    const packageTransactions = orderRows
      .filter(({ order }) => inDateRange(order.createdAt))
      .filter(({ providerSlug: slug }) => !providerSlug || providerSlug === "all" || trim(slug).toLowerCase() === providerSlug)
      .map(({ order, userName, userEmail, userRole, providerName, providerSlug: slug, packageTitle, packageWholesalePrice, packageRetailPrice }) => {
        const quantity = Math.max(1, Number(order.quantity || 1));
        const unitCustomerPrice = moneyValue(order.price);
        const unitCost = moneyValue(order.wholesalePrice || order.airaloPrice || packageWholesalePrice);
        const customerCharge = unitCustomerPrice * quantity;
        const providerCost = unitCost * quantity;

        return {
          id: order.id,
          displayOrderId: order.displayOrderId,
          userId: order.userId || null,
          userName,
          userEmail: userEmail || order.guestEmail || null,
          userRole,
          providerId: order.providerId,
          providerName: providerName || "Unknown Provider",
          providerSlug: slug || "unknown",
          providerOrderId: order.providerOrderId || order.airaloOrderId || null,
          requestId: order.requestId || null,
          packageId: order.packageId,
          packageTitle: packageTitle || "eSIM Package",
          status: order.status,
          esimStatus: order.esimStatus || null,
          orderType: order.orderType,
          quantity,
          dataAmount: order.dataAmount,
          validity: order.validity,
          countryCode: null,
          customerUnitPrice: normalizeMoney(unitCustomerPrice),
          providerUnitCost: normalizeMoney(unitCost),
          customerCharge: normalizeMoney(customerCharge),
          providerCost: normalizeMoney(providerCost),
          grossProfit: normalizeMoney(customerCharge - providerCost),
          marginPercent: customerCharge > 0 ? normalizeMoney(((customerCharge - providerCost) / customerCharge) * 100) : "0.00",
          currency: order.currency || order.orderCurrency || "USD",
          paymentMethod: order.paymentMethod || null,
          orderSource: order.orderSource || null,
          iccid: order.iccid || null,
          createdAt: toIsoOrNull(order.createdAt) || new Date().toISOString(),
          updatedAt: toIsoOrNull(order.updatedAt),
          packageRetailPrice: normalizeMoney(packageRetailPrice),
          packageWholesalePrice: normalizeMoney(packageWholesalePrice),
          failoverAttempts: order.failoverAttempts || null,
        };
      });

    const topupTransactions = topupRows
      .filter(({ topup }) => inDateRange(topup.createdAt))
      .map(({ topup, userName, userEmail }) => {
        const customerCharge = moneyValue(topup.price);
        const providerCost = moneyValue(topup.airaloPrice);
        return {
          id: topup.id,
          displayTopupId: topup.displayTopupId,
          orderId: topup.orderId,
          userId: topup.userId,
          userName,
          userEmail,
          providerName: "Airalo",
          providerSlug: "airalo",
          providerOrderId: topup.airaloTopupId || null,
          requestId: topup.requestId || null,
          packageId: topup.packageId,
          packageTitle: "eSIM Top-up",
          status: topup.status,
          quantity: 1,
          dataAmount: topup.dataAmount,
          validity: topup.validity,
          customerCharge: normalizeMoney(customerCharge),
          providerCost: normalizeMoney(providerCost),
          grossProfit: normalizeMoney(customerCharge - providerCost),
          marginPercent: customerCharge > 0 ? normalizeMoney(((customerCharge - providerCost) / customerCharge) * 100) : "0.00",
          currency: topup.currency || "USD",
          iccid: topup.iccid,
          createdAt: toIsoOrNull(topup.createdAt) || new Date().toISOString(),
        };
      })
      .filter((topup) => !providerSlug || providerSlug === "all" || topup.providerSlug === providerSlug);

    const customerSummary = customerTransactions.reduce(
      (summary, transaction) => {
        const movement = moneyValue(transaction.movement);
        summary.totalTransactions += 1;
        if (movement >= 0) summary.totalCredits += movement;
        else summary.totalDebits += Math.abs(movement);
        summary.netMovement += movement;
        if (transaction.status === "completed") summary.completedTransactions += 1;
        if (transaction.status === "pending") summary.pendingTransactions += 1;
        return summary;
      },
      { totalTransactions: 0, completedTransactions: 0, pendingTransactions: 0, totalCredits: 0, totalDebits: 0, netMovement: 0 },
    );

    const vonageSummary = vonageTransactions.reduce(
      (summary, transaction) => {
        const customerCharge = moneyValue(transaction.amount);
        const providerCost = moneyValue(transaction.providerCost);
        summary.totalTransactions += 1;
        summary.customerCharges += customerCharge;
        summary.providerCost += providerCost;
        summary.grossProfit += customerCharge - providerCost;
        if (transaction.usageType === "sms") summary.smsTransactions += 1;
        if (transaction.usageType === "voice") summary.voiceTransactions += 1;
        if (transaction.usageType === "renewal" || transaction.chargePoint === "auto_renewal") summary.renewalTransactions += 1;
        return summary;
      },
      { totalTransactions: 0, smsTransactions: 0, voiceTransactions: 0, renewalTransactions: 0, customerCharges: 0, providerCost: 0, grossProfit: 0 },
    );

    const packageSummary = [...packageTransactions, ...topupTransactions].reduce(
      (summary, transaction) => {
        const customerCharge = moneyValue(transaction.customerCharge);
        const providerCost = moneyValue(transaction.providerCost);
        const status = trim(transaction.status).toLowerCase();
        summary.totalTransactions += 1;
        summary.customerCharges += customerCharge;
        summary.providerCost += providerCost;
        summary.grossProfit += customerCharge - providerCost;
        if (["completed", "ready", "active", "paid"].includes(status)) summary.completedTransactions += 1;
        if (["failed", "cancelled", "canceled"].includes(status)) summary.failedTransactions += 1;
        if (["pending", "processing", "provisioning"].includes(status)) summary.pendingTransactions += 1;
        if ("displayTopupId" in transaction) summary.topupTransactions += 1;
        else summary.packageOrders += 1;
        return summary;
      },
      {
        totalTransactions: 0,
        packageOrders: 0,
        topupTransactions: 0,
        completedTransactions: 0,
        failedTransactions: 0,
        pendingTransactions: 0,
        customerCharges: 0,
        providerCost: 0,
        grossProfit: 0,
      },
    );

    const formatSummary = (summary: Record<string, number>) =>
      Object.fromEntries(
        Object.entries(summary).map(([key, value]) => [
          key,
          key.toLowerCase().includes("transactions") || key.toLowerCase().includes("orders") ? value : normalizeMoney(value),
        ]),
      );

    return ApiResponse.success(res, "Admin transaction report loaded successfully", {
      type: reportType || "all",
      customerSummary: formatSummary(customerSummary),
      vonageSummary: formatSummary(vonageSummary),
      packageSummary: formatSummary(packageSummary),
      customerTransactions,
      vonageTransactions,
      vonageSmsMessages,
      packageTransactions,
      topupTransactions,
      providers: providerRows.map((provider) => ({
        id: provider.id,
        name: provider.name,
        slug: provider.slug,
        enabled: provider.enabled,
      })),
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load transaction report");
  }
});

router.get("/providers", async (_req, res) => {
  try {
    const [esimProviders, inventoryRows, smsRows] = await Promise.all([
      db.select().from(providers).orderBy(asc(providers.name)),
      db.select({ provider: virtualNumberInventory.provider }).from(virtualNumberInventory),
      db.select({ provider: virtualSmsMessages.provider }).from(virtualSmsMessages),
    ]);

    const virtualProviderSet = new Set<string>();
    for (const row of inventoryRows) {
      const provider = trim(row.provider).toLowerCase();
      if (provider) virtualProviderSet.add(provider);
    }
    for (const row of smsRows) {
      const provider = trim(row.provider).toLowerCase();
      if (provider) virtualProviderSet.add(provider);
    }
    if (virtualProviderSet.size === 0) virtualProviderSet.add("vonage");

    return ApiResponse.success(res, "Transaction providers loaded successfully", {
      esimProviders: esimProviders.map((provider) => ({
        id: provider.id,
        name: provider.name,
        slug: provider.slug,
        enabled: provider.enabled,
      })),
      virtualNumberProviders: Array.from(virtualProviderSet)
        .sort()
        .map((slug) => ({
          id: slug,
          slug,
          name: slug === "vonage" ? "Vonage" : slug.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
        })),
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load transaction providers");
  }
});

export default router;
