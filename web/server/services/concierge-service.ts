import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { Request } from "express";
import { db } from "server/db";
import { storage } from "server/storage";
import {
  conciergeSubscriptions,
  destinations,
  providers,
  regions,
  ticketReplies,
  tickets,
  unifiedPackages,
  users,
  walletTransactions,
} from "@shared/schema";
import { getRequestStorefrontReseller } from "server/helpers/packagePricing";
import { openAIService } from "server/services/ai/openai-service";

type ConciergePricingMode = "free" | "paid";
type ConciergeBillingCycle = "one_time" | "monthly";
type ConciergeStatus =
  | "inactive"
  | "trial_active"
  | "active"
  | "pending_payment"
  | "past_due"
  | "expired";

type ConciergeSettings = {
  enabled: boolean;
  pricingMode: ConciergePricingMode;
  billingCycle: ConciergeBillingCycle;
  fee: number;
  trialEnabled: boolean;
  trialDays: number;
};

type ConciergeAiSettings = {
  enabled: boolean;
  name: string;
  welcome: string;
  prompt: string;
};

type ConciergeVoiceSettings = {
  enabled: boolean;
  readMode: "openai" | "browser";
  translationEnabled: boolean;
  translationLanguage: string;
  voiceTranslationEnabled: boolean;
};

type ConciergeSettingsContext = {
  req?: Request;
  userId?: string;
};

type ConciergePackageSnapshotRow = {
  id: string;
  title: string;
  type: string;
  dataAmount: string;
  dataMb: number | null;
  validityDays: number;
  retailPrice: string;
  currency: string;
  operator: string | null;
  countryCode: string | null;
  countryName: string | null;
  isUnlimited: boolean;
  isBestPrice: boolean;
  isPopular: boolean;
  isRecommended: boolean;
  providerName: string | null;
  destinationName: string | null;
  destinationCode: string | null;
  regionName: string | null;
};

let ensurePromise: Promise<void> | null = null;

function toNumber(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function money(value: unknown): string {
  return (Math.round(toNumber(value) * 100) / 100).toFixed(2);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function normalizeTrialDays(value: unknown) {
  const days = Number(value);
  if (!Number.isFinite(days)) return 7;
  return Math.min(30, Math.max(1, Math.round(days)));
}

function normalizeStorefrontConciergeConfig(value: unknown) {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    enabled: input.conciergeEnabled !== false,
    pricingMode: input.conciergePricingMode === "paid" ? "paid" as const : "free" as const,
    billingCycle: input.conciergeBillingCycle === "monthly" ? "monthly" as const : "one_time" as const,
    fee: Math.max(0, toNumber(input.conciergeFee)),
    trialEnabled: input.conciergeTrialEnabled !== false,
    trialDays: normalizeTrialDays(input.conciergeTrialDays),
  };
}

async function getSettingValue(key: string) {
  return (await storage.getSettingByKey(key))?.value;
}

async function getConciergeAiSettings(): Promise<ConciergeAiSettings> {
  const [enabled, name, welcome, prompt] = await Promise.all([
    getSettingValue("concierge_ai_bot_enabled"),
    getSettingValue("concierge_ai_bot_name"),
    getSettingValue("concierge_ai_bot_welcome"),
    getSettingValue("concierge_ai_bot_prompt"),
  ]);

  return {
    enabled: enabled !== "false",
    name: String(name || "ChatGPT Concierge").trim() || "ChatGPT Concierge",
    welcome:
      String(welcome || "Hi, I am your ChatGPT Concierge assistant. How can I help today?").trim() ||
      "Hi, I am your ChatGPT Concierge assistant. How can I help today?",
    prompt:
      String(
        prompt ||
          "You are ChatGPT inside VIP Concierge. Answer general questions clearly and help users with eSIM activation, package selection, travel connectivity, troubleshooting, and account navigation. Keep replies practical. Escalate billing disputes, refunds, failed payments, security issues, and account changes to the human Concierge Team.",
      ).trim() ||
      "You are ChatGPT inside VIP Concierge. Answer general questions clearly and help users with eSIM activation, package selection, travel connectivity, troubleshooting, and account navigation. Keep replies practical. Escalate billing disputes, refunds, failed payments, security issues, and account changes to the human Concierge Team.",
  };
}

async function getConciergeVoiceSettings(): Promise<ConciergeVoiceSettings> {
  const [enabled, readMode, translationEnabled, translationLanguage, voiceTranslationEnabled] = await Promise.all([
    getSettingValue("concierge_voice_enabled"),
    getSettingValue("concierge_voice_read_mode"),
    getSettingValue("concierge_translation_enabled"),
    getSettingValue("concierge_translation_language"),
    getSettingValue("concierge_voice_translation_enabled"),
  ]);

  return {
    enabled: enabled !== "false",
    readMode: readMode === "browser" ? "browser" : "openai",
    translationEnabled: translationEnabled === "true",
    translationLanguage: String(translationLanguage || "auto").trim() || "auto",
    voiceTranslationEnabled: voiceTranslationEnabled === "true",
  };
}

export async function ensureConciergeSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS concierge_subscriptions (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id varchar NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          status text NOT NULL DEFAULT 'inactive',
          pricing_mode text NOT NULL DEFAULT 'free',
          billing_cycle text NOT NULL DEFAULT 'one_time',
          payment_method text,
          fee decimal(10, 2) NOT NULL DEFAULT '0.00',
          currency text NOT NULL DEFAULT 'USD',
          trial_requested_at timestamp,
          trial_ends_at timestamp,
          active_from timestamp,
          active_until timestamp,
          next_charge_at timestamp,
          last_charged_at timestamp,
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS concierge_subscriptions_user_id_idx ON concierge_subscriptions(user_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS concierge_subscriptions_status_idx ON concierge_subscriptions(status)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS concierge_subscriptions_next_charge_at_idx ON concierge_subscriptions(next_charge_at)`);
    })();
  }

  return ensurePromise;
}

async function getGlobalConciergeSettings(): Promise<ConciergeSettings> {
  const [enabled, pricingMode, billingCycle, fee, trialEnabled, legacyTrialEnabled, trialDays] = await Promise.all([
    getSettingValue("concierge_enabled"),
    getSettingValue("concierge_pricing_mode"),
    getSettingValue("concierge_billing_cycle"),
    getSettingValue("concierge_fee"),
    getSettingValue("concierge_trial_enabled"),
    getSettingValue("concierge_free_trial_enabled"),
    getSettingValue("concierge_trial_days"),
  ]);

  return {
    enabled: enabled !== "false",
    pricingMode: pricingMode === "paid" ? "paid" : "free",
    billingCycle: billingCycle === "monthly" ? "monthly" : "one_time",
    fee: Math.max(0, toNumber(fee)),
    trialEnabled: (trialEnabled ?? legacyTrialEnabled) !== "false",
    trialDays: normalizeTrialDays(trialDays),
  };
}

async function getContextualStorefrontConfig(context?: ConciergeSettingsContext) {
  if (context?.req) {
    const storefront = await getRequestStorefrontReseller(context.req);
    if (storefront?.resellerStoreConfig) {
      return storefront.resellerStoreConfig;
    }
  }

  if (!context?.userId) return null;
  const user = await storage.getUser(context.userId);
  if ((user?.role === "reseller" || user?.role === "agent") && user.resellerStoreConfig) {
    return user.resellerStoreConfig;
  }

  return null;
}

export async function getConciergeSettings(context?: ConciergeSettingsContext): Promise<ConciergeSettings> {
  const globalSettings = await getGlobalConciergeSettings();
  const storefrontConfig = await getContextualStorefrontConfig(context);
  if (!storefrontConfig) return globalSettings;

  const storefrontSettings = normalizeStorefrontConciergeConfig(storefrontConfig);
  return {
    enabled: globalSettings.enabled && storefrontSettings.enabled,
    pricingMode: storefrontSettings.pricingMode,
    billingCycle: storefrontSettings.billingCycle,
    fee: storefrontSettings.fee,
    trialEnabled: storefrontSettings.trialEnabled,
    trialDays: storefrontSettings.trialDays,
  };
}

async function getOrCreateSubscription(userId: string) {
  await ensureConciergeSchema();

  const [existing] = await db
    .select()
    .from(conciergeSubscriptions)
    .where(eq(conciergeSubscriptions.userId, userId));

  if (existing) return existing;

  const [created] = await db
    .insert(conciergeSubscriptions)
    .values({
      userId,
      status: "inactive",
    })
    .returning();

  return created;
}

async function createOtherPaymentTicket(userId: string, fee: number, billingCycle: ConciergeBillingCycle) {
  const user = await storage.getUser(userId);
  if (!user) throw new Error("User not found");

  const existingTicket = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(
      and(
        eq(tickets.userId, userId),
        eq(tickets.status, "open"),
        eq(tickets.title, "Concierge Payment Request"),
      ),
    )
    .limit(1);

  if (existingTicket[0]) {
    return existingTicket[0].id;
  }

  const ticket = await storage.createTicket({
    userId,
    userName: user.name || user.email,
    title: "Concierge Payment Request",
    description: `Customer requested Concierge activation using another payment method.\n\nBilling: ${
      billingCycle === "monthly" ? "Monthly" : "One time"
    }\nFee: $${money(fee)}\n\nPlease contact the customer to complete the payment manually.`,
    priority: "high",
    status: "open",
  });

  return ticket.id;
}

async function chargeWalletForConcierge(userId: string, amount: number, billingCycle: ConciergeBillingCycle) {
  if (amount <= 0) {
    return { success: true as const, balanceAfter: null };
  }

  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    const balanceBefore = toNumber(user.walletBalance || "0.00");
    if (balanceBefore + 0.0001 < amount) {
      return { success: false as const, balanceAfter: balanceBefore };
    }

    const balanceAfter = balanceBefore - amount;

    await tx
      .update(users)
      .set({
        walletBalance: money(balanceAfter),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await tx.insert(walletTransactions).values({
      userId,
      type: "concierge_debit",
      status: "completed",
      amount: money(amount),
      currency: "USD",
      balanceBefore: money(balanceBefore),
      balanceAfter: money(balanceAfter),
      provider: "wallet",
      referenceId: `concierge-${billingCycle}-${Date.now()}`,
      description: `Concierge ${billingCycle === "monthly" ? "monthly" : "one-time"} charge`,
      metadata: {
        feature: "concierge",
        billingCycle,
      },
      completedAt: new Date(),
    });

    return { success: true as const, balanceAfter };
  });
}

async function tryRenewMonthlySubscription(userId: string, context?: ConciergeSettingsContext) {
  const settings = await getConciergeSettings(context);
  const subscription = await getOrCreateSubscription(userId);

  if (subscription.status !== "active" || subscription.billingCycle !== "monthly" || !subscription.nextChargeAt) {
    return subscription;
  }

  if (subscription.nextChargeAt > new Date()) {
    return subscription;
  }

  const charge = await chargeWalletForConcierge(userId, settings.fee, "monthly");
  if (!charge.success) {
    const [updated] = await db
      .update(conciergeSubscriptions)
      .set({
        status: "past_due",
        updatedAt: new Date(),
      })
      .where(eq(conciergeSubscriptions.userId, userId))
      .returning();

    await storage.createNotification({
      userId,
      type: "wallet",
      title: "Concierge renewal needs payment",
      message: "Your Concierge monthly renewal could not be charged from wallet balance.",
      read: false,
      metadata: { feature: "concierge" },
    });

    return updated;
  }

  const now = new Date();
  const nextChargeAt = addMonths(now, 1);

  const [updated] = await db
    .update(conciergeSubscriptions)
    .set({
      status: "active",
      fee: money(settings.fee),
      pricingMode: settings.pricingMode,
      billingCycle: settings.billingCycle,
      paymentMethod: "wallet",
      activeFrom: subscription.activeFrom || now,
      lastChargedAt: now,
      nextChargeAt,
      updatedAt: now,
    })
    .where(eq(conciergeSubscriptions.userId, userId))
    .returning();

  await storage.createNotification({
    userId,
    type: "wallet",
    title: "Concierge renewed",
    message: `$${money(settings.fee)} was deducted from your wallet for Concierge renewal.`,
    read: false,
    metadata: { feature: "concierge" },
  });

  return updated;
}

export async function getConciergeStatus(userId: string, context?: ConciergeSettingsContext) {
  await ensureConciergeSchema();

  const settings = await getConciergeSettings({ ...context, userId });
  let subscription = await getOrCreateSubscription(userId);

  if (subscription.status === "trial_active" && subscription.trialEndsAt && subscription.trialEndsAt <= new Date()) {
    const [updated] = await db
      .update(conciergeSubscriptions)
      .set({
        status: "expired",
        updatedAt: new Date(),
      })
      .where(eq(conciergeSubscriptions.userId, userId))
      .returning();
    subscription = updated;
  }

  if (subscription.status === "active" && subscription.billingCycle === "monthly") {
    subscription = await tryRenewMonthlySubscription(userId, { ...context, userId });
  }

  const hasAccess =
    settings.enabled &&
    (settings.pricingMode === "free" ||
      subscription.status === "active" ||
      subscription.status === "trial_active");

  const trialAvailable =
    settings.enabled &&
    settings.pricingMode === "paid" &&
    settings.trialEnabled &&
    !subscription.trialRequestedAt;
  await openAIService.refreshFromStoredKey();

  return {
    enabled: settings.enabled,
    pricingMode: settings.pricingMode,
    billingCycle: settings.billingCycle,
    fee: money(settings.fee),
    currency: "USD",
    trialEnabled: settings.trialEnabled,
    trialDays: settings.trialDays,
    hasAccess,
    trialAvailable,
    isTrialActive: subscription.status === "trial_active",
    status: subscription.status,
    paymentMethod: subscription.paymentMethod,
    trialRequestedAt: subscription.trialRequestedAt,
    trialEndsAt: subscription.trialEndsAt,
    activeFrom: subscription.activeFrom,
    activeUntil: subscription.activeUntil,
    nextChargeAt: subscription.nextChargeAt,
    lastChargedAt: subscription.lastChargedAt,
    aiBot: await getConciergeAiSettings().then((ai) => ({
      enabled: ai.enabled,
      name: ai.name,
      welcome: ai.welcome,
      ready: openAIService.isReady(),
    })),
    voice: await getConciergeVoiceSettings(),
  };
}

export async function startConciergeTrial(userId: string, context?: ConciergeSettingsContext) {
  const settings = await getConciergeSettings({ ...context, userId });
  if (!settings.enabled) throw new Error("Concierge is disabled");
  if (settings.pricingMode !== "paid") throw new Error("Free trial is only used when Concierge is paid");
  if (!settings.trialEnabled) throw new Error("Free trial is disabled");

  const subscription = await getOrCreateSubscription(userId);
  if (subscription.trialRequestedAt) {
    throw new Error("Free trial has already been used for this account");
  }

  const now = new Date();
  const trialEndsAt = addDays(now, settings.trialDays);

  const [updated] = await db
    .update(conciergeSubscriptions)
    .set({
      status: "trial_active",
      pricingMode: settings.pricingMode,
      billingCycle: settings.billingCycle,
      paymentMethod: "free_trial",
      fee: money(settings.fee),
      trialRequestedAt: now,
      trialEndsAt,
      activeFrom: now,
      activeUntil: trialEndsAt,
      updatedAt: now,
    })
    .where(eq(conciergeSubscriptions.userId, userId))
    .returning();

  await storage.createNotification({
    userId,
    type: "wallet",
    title: "Concierge free trial started",
    message: `Your Concierge free trial is active until ${trialEndsAt.toLocaleDateString()}.`,
    read: false,
    metadata: { feature: "concierge", trialEndsAt: trialEndsAt.toISOString() },
  });

  return updated;
}

export async function activateConciergePlan(userId: string, paymentMethod: "wallet" | "other", context?: ConciergeSettingsContext) {
  const settings = await getConciergeSettings({ ...context, userId });
  if (!settings.enabled) throw new Error("Concierge is disabled");

  if (settings.pricingMode === "free") {
    return getConciergeStatus(userId, context);
  }

  if (settings.fee <= 0) {
    throw new Error("Concierge payment is not configured yet.");
  }

  await getOrCreateSubscription(userId);

  if (paymentMethod === "other") {
    const ticketId = await createOtherPaymentTicket(userId, settings.fee, settings.billingCycle);
    const [updated] = await db
      .update(conciergeSubscriptions)
      .set({
        status: "pending_payment",
        pricingMode: settings.pricingMode,
        billingCycle: settings.billingCycle,
        paymentMethod: "other",
        fee: money(settings.fee),
        updatedAt: new Date(),
        metadata: {
          supportTicketId: ticketId,
        },
      })
      .where(eq(conciergeSubscriptions.userId, userId))
      .returning();

    return {
      subscription: updated,
      message: "Payment request created. Support will contact you to complete Concierge activation.",
    };
  }

  const charge = await chargeWalletForConcierge(userId, settings.fee, settings.billingCycle);
  if (!charge.success) {
    throw new Error("Insufficient wallet balance. Top up wallet or use another payment method.");
  }

  const now = new Date();
  const nextChargeAt = settings.billingCycle === "monthly" ? addMonths(now, 1) : null;

  const [updated] = await db
    .update(conciergeSubscriptions)
    .set({
      status: "active",
      pricingMode: settings.pricingMode,
      billingCycle: settings.billingCycle,
      paymentMethod: "wallet",
      fee: money(settings.fee),
      activeFrom: now,
      activeUntil: settings.billingCycle === "one_time" ? null : undefined,
      nextChargeAt,
      lastChargedAt: now,
      updatedAt: now,
    })
    .where(eq(conciergeSubscriptions.userId, userId))
    .returning();

  await storage.createNotification({
    userId,
    type: "wallet",
    title: "Concierge activated",
    message:
      settings.billingCycle === "monthly"
        ? `Concierge is active. $${money(settings.fee)} was charged from your wallet.`
        : `Concierge one-time access is active. $${money(settings.fee)} was charged from your wallet.`,
    read: false,
    metadata: { feature: "concierge" },
  });

  return {
    subscription: updated,
    message:
      settings.billingCycle === "monthly"
        ? "Concierge monthly plan activated from wallet balance."
        : "Concierge access activated from wallet balance.",
  };
}

export async function cancelConciergePlan(userId: string) {
  await ensureConciergeSchema();
  const subscription = await getOrCreateSubscription(userId);

  if (!["active", "trial_active", "past_due", "pending_payment"].includes(subscription.status)) {
    throw new Error("No active Concierge subscription to cancel");
  }

  const [updated] = await db
    .update(conciergeSubscriptions)
    .set({
      status: "inactive",
      activeUntil: new Date(),
      nextChargeAt: null,
      updatedAt: new Date(),
      metadata: {
        ...(subscription.metadata as Record<string, unknown> | null),
        cancelledAt: new Date().toISOString(),
      },
    })
    .where(eq(conciergeSubscriptions.userId, userId))
    .returning();

  await storage.createNotification({
    userId,
    type: "wallet",
    title: "Concierge cancelled",
    message: "Your Concierge subscription has been cancelled.",
    read: false,
    metadata: { feature: "concierge" },
  });

  return updated;
}

export async function renewConciergePlan(userId: string, paymentMethod: "wallet" | "other", context?: ConciergeSettingsContext) {
  const subscription = await getOrCreateSubscription(userId);
  if (subscription.status === "active" && subscription.billingCycle === "monthly") {
    throw new Error("Concierge subscription is already active");
  }

  return activateConciergePlan(userId, paymentMethod, context);
}

async function getExistingConciergeTicket(userId: string) {
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.userId, userId), eq(tickets.title, "AI Voice Concierge Request")))
    .orderBy(desc(tickets.createdAt))
    .limit(1);

  return ticket || null;
}

function normalizeConciergeReplies(
  replies: Array<{
    id: string;
    ticketId: string;
    userId: string | null;
    adminId: string | null;
    message: string;
    isInternal: boolean;
    createdAt: Date;
  }>,
  aiBotName = "Concierge AI",
) {
  return replies
    .filter((reply) => !reply.isInternal)
    .map((reply) => ({
      id: reply.id,
      ticketId: reply.ticketId,
      senderId: reply.adminId ?? reply.userId,
      senderType: reply.adminId ? "admin" : reply.userId ? "user" : "ai",
      senderName: reply.adminId ? "Concierge Team" : reply.userId ? "You" : aiBotName,
      message: reply.message,
      isInternal: reply.isInternal,
      createdAt: reply.createdAt,
    }));
}

async function getRecentConciergeReplies(ticketId: string) {
  return db
    .select()
    .from(ticketReplies)
    .where(eq(ticketReplies.ticketId, ticketId))
    .orderBy(desc(ticketReplies.createdAt))
    .limit(12);
}

function buildConciergeSystemPrompt(aiSettings: ConciergeAiSettings) {
  return [
    aiSettings.prompt,
    "",
    "You are ChatGPT inside the VIP Concierge screen.",
    "Keep replies concise, practical, and friendly.",
    "Before answering, use the live package pricing snapshot supplied in the user prompt as the source of truth for eSIM availability and prices on this website.",
    "When a question is about packages, destinations, pricing, recommendations, or travel data, recommend only packages from the supplied snapshot and quote the displayed customer price/currency.",
    "Act like a price advisor: compare similar packages by total price, data amount, validity, price per GB, and price per day when those values are available.",
    "If a cheaper package or better-value package appears in the snapshot, tell the customer directly and explain the tradeoff in one short sentence.",
    "For light users, favor lower total price. For heavy users or longer trips, favor better price per GB/day and enough validity.",
    "If the customer asks for a destination or package that is not present in the snapshot, say you do not see that package in the current catalog and offer the closest listed alternatives.",
    "For non-package questions, answer normally, but do not ignore relevant pricing context if it helps.",
    "Do not invent account-specific order, payment, wallet, refund, or provider status details.",
    "For billing disputes, refunds, urgent failed payments, account security, or anything requiring account changes, tell the user that the Concierge Team will review it and continue with human support.",
  ].join("\n");
}

function normalizeSearchToken(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function formatPackageLine(pkg: ConciergePackageSnapshotRow) {
  const location = pkg.destinationName || pkg.regionName || pkg.countryName || pkg.countryCode || pkg.type;
  const price = toNumber(pkg.retailPrice);
  const dataGb = pkg.dataMb && pkg.dataMb > 0 ? pkg.dataMb / 1024 : null;
  const valueMetrics = [
    dataGb ? `${pkg.currency} ${money(price / dataGb)} per GB` : "",
    pkg.validityDays > 0 ? `${pkg.currency} ${money(price / pkg.validityDays)} per day` : "",
  ].filter(Boolean);
  const flags = [
    pkg.isBestPrice ? "best price" : "",
    pkg.isPopular ? "popular" : "",
    pkg.isRecommended ? "recommended" : "",
  ].filter(Boolean);

  return [
    `${pkg.title}`,
    `${location}`,
    `${pkg.dataAmount}${pkg.isUnlimited ? " unlimited" : ""}`,
    `${pkg.validityDays} days`,
    `${pkg.currency} ${money(pkg.retailPrice)}`,
    valueMetrics.length ? valueMetrics.join(", ") : "",
    pkg.providerName ? `provider ${pkg.providerName}` : "",
    pkg.operator ? `operator ${pkg.operator}` : "",
    flags.length ? flags.join(", ") : "",
  ].filter(Boolean).join(" | ");
}

async function buildPackagePricingContext(customerQuestion: string) {
  const rows = await db
    .select({
      id: unifiedPackages.id,
      title: unifiedPackages.title,
      type: unifiedPackages.type,
      dataAmount: unifiedPackages.dataAmount,
      dataMb: unifiedPackages.dataMb,
      validityDays: unifiedPackages.validityDays,
      retailPrice: unifiedPackages.retailPrice,
      currency: unifiedPackages.currency,
      operator: unifiedPackages.operator,
      countryCode: unifiedPackages.countryCode,
      countryName: unifiedPackages.countryName,
      isUnlimited: unifiedPackages.isUnlimited,
      isBestPrice: unifiedPackages.isBestPrice,
      isPopular: unifiedPackages.isPopular,
      isRecommended: unifiedPackages.isRecommended,
      providerName: providers.name,
      destinationName: destinations.name,
      destinationCode: destinations.countryCode,
      regionName: regions.name,
    })
    .from(unifiedPackages)
    .leftJoin(providers, eq(unifiedPackages.providerId, providers.id))
    .leftJoin(destinations, eq(unifiedPackages.destinationId, destinations.id))
    .leftJoin(regions, eq(unifiedPackages.regionId, regions.id))
    .where(eq(unifiedPackages.isEnabled, true))
    .orderBy(asc(unifiedPackages.retailPrice));

  const packages = rows as ConciergePackageSnapshotRow[];
  if (!packages.length) {
    return "Live website package pricing snapshot: no enabled customer-facing eSIM packages are currently listed.";
  }

  const question = normalizeSearchToken(customerQuestion);
  const tokens = new Set(question.split(/\s+/).filter((token) => token.length >= 2));

  const scorePackage = (pkg: ConciergePackageSnapshotRow) => {
    const searchable = normalizeSearchToken([
      pkg.title,
      pkg.type,
      pkg.dataAmount,
      pkg.operator,
      pkg.countryCode,
      pkg.countryName,
      pkg.destinationName,
      pkg.destinationCode,
      pkg.regionName,
      pkg.providerName,
    ].filter(Boolean).join(" "));

    let score = 0;
    for (const token of tokens) {
      if (searchable.includes(token)) score += token.length >= 4 ? 3 : 1;
    }
    if (pkg.isBestPrice) score += 1;
    if (pkg.isRecommended) score += 1;
    if (pkg.isPopular) score += 1;
    return score;
  };

  const relevant = packages
    .map((pkg) => ({ pkg, score: scorePackage(pkg) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || toNumber(a.pkg.retailPrice) - toNumber(b.pkg.retailPrice))
    .slice(0, 25)
    .map((item) => item.pkg);

  const cheapestByLocation = new Map<string, ConciergePackageSnapshotRow>();
  for (const pkg of packages) {
    const location = pkg.destinationName || pkg.regionName || pkg.countryName || pkg.countryCode || pkg.type;
    const existing = cheapestByLocation.get(location);
    if (!existing || toNumber(pkg.retailPrice) < toNumber(existing.retailPrice)) {
      cheapestByLocation.set(location, pkg);
    }
  }

  const highlighted = packages
    .filter((pkg) => pkg.isRecommended || pkg.isPopular || pkg.isBestPrice)
    .slice(0, 12);
  const cheapest = Array.from(cheapestByLocation.values()).slice(0, 20);
  const bestValue = [...packages]
    .filter((pkg) => pkg.dataMb && pkg.dataMb > 0 && toNumber(pkg.retailPrice) > 0)
    .sort((a, b) => {
      const aPricePerGb = toNumber(a.retailPrice) / ((a.dataMb || 1) / 1024);
      const bPricePerGb = toNumber(b.retailPrice) / ((b.dataMb || 1) / 1024);
      return aPricePerGb - bPricePerGb || toNumber(a.retailPrice) - toNumber(b.retailPrice);
    })
    .slice(0, 10);
  const lines = relevant.length ? relevant : [...highlighted, ...cheapest, ...bestValue].slice(0, 25);

  return [
    `Live website package pricing snapshot checked: ${packages.length} enabled packages scanned.`,
    "Use these rows as current customer-facing package/pricing context:",
    ...lines.map((pkg, index) => `${index + 1}. ${formatPackageLine(pkg)}`),
    "",
    relevant.length
      ? "The rows above are the packages most relevant to the customer's latest message."
      : "The customer did not mention a clear destination/package, so the rows above are catalog highlights and lowest visible prices by location.",
    bestValue.length
      ? `Best value reference from the current catalog: ${bestValue.slice(0, 5).map(formatPackageLine).join(" || ")}`
      : "Best value reference: price-per-GB comparison is unavailable for the current snapshot.",
    "When advising, name one best low-price option and one best-value option if both are relevant.",
    "If more exact package rows are needed, ask the customer for the destination, data amount, and trip length.",
  ].join("\n");
}

function buildConciergeUserPrompt(
  user: { name?: string | null; email?: string | null },
  replies: Array<{
    userId: string | null;
    adminId: string | null;
    message: string;
    isInternal: boolean;
    createdAt: Date;
  }>,
  packagePricingContext: string,
) {
  const conversation = replies
    .filter((reply) => !reply.isInternal)
    .reverse()
    .map((reply) => {
      const speaker = reply.adminId ? "Human support" : reply.userId ? "Customer" : "AI concierge";
      return `${speaker}: ${reply.message}`;
    })
    .join("\n");

  return [
    `Customer: ${user.name || user.email || "Customer"}`,
    "",
    packagePricingContext,
    "",
    "Recent conversation:",
    conversation || "No previous messages.",
    "",
    "Write the next AI concierge reply to the customer.",
  ].join("\n");
}

async function createConciergeAiReply(ticketId: string, userId: string) {
  const aiSettings = await getConciergeAiSettings();
  if (!aiSettings.enabled) return null;

  const user = await storage.getUser(userId);
  if (!user) return null;

  const recentReplies = await getRecentConciergeReplies(ticketId);
  const latestCustomerMessage = recentReplies.find((reply) => reply.userId === userId)?.message || "";
  const packagePricingContext = await buildPackagePricingContext(latestCustomerMessage);
  const result = await openAIService.chatCompletion(
    buildConciergeUserPrompt(user, recentReplies, packagePricingContext),
    {
      systemPrompt: buildConciergeSystemPrompt(aiSettings),
      model: "gpt-4o-mini",
      temperature: 0.35,
      maxTokens: 900,
    },
  );

  const message =
    result.success && result.content?.trim()
      ? result.content.trim()
      : result.error === "OpenAI not configured"
        ? "ChatGPT is not connected yet. Please add or verify the OpenAI API key in Admin > Settings > OpenAI Connection, then restart the server or save the key again."
        : `ChatGPT could not answer right now. ${result.error ? `OpenAI error: ${result.error}` : "Please try again shortly."}`;

  return storage.createTicketReply({
    ticketId,
    userId: null,
    adminId: null,
    message,
    isInternal: false,
  });
}

export async function getConciergeThread(userId: string, context?: ConciergeSettingsContext) {
  await ensureConciergeSchema();

  const status = await getConciergeStatus(userId, context);
  const aiSettings = await getConciergeAiSettings();
  const ticket = await getExistingConciergeTicket(userId);

  if (!ticket) {
    return {
      ...status,
      ticket: null,
      messages: [],
    };
  }

  const replies = await db
    .select()
    .from(ticketReplies)
    .where(eq(ticketReplies.ticketId, ticket.id))
    .orderBy(asc(ticketReplies.createdAt));

  return {
    ...status,
    ticket,
    messages: normalizeConciergeReplies(replies, aiSettings.name),
  };
}

export async function startConciergeThread(userId: string, context?: ConciergeSettingsContext) {
  const status = await getConciergeStatus(userId, context);
  if (!status.enabled) throw new Error("Concierge is disabled");
  if (!status.hasAccess) throw new Error("Activate Concierge before starting a concierge chat");

  const user = await storage.getUser(userId);
  if (!user) throw new Error("User not found");

  let ticket = await getExistingConciergeTicket(userId);
  let createdTicket = false;

  if (!ticket) {
    ticket = await storage.createTicket({
      userId,
      userName: user.name || user.email,
      title: "AI Voice Concierge Request",
      description:
        "Concierge conversation started from the in-app concierge panel.\n\nPlease assist with eSIM, activation, package, or travel support.",
      status: "open",
      priority: "high",
    });
    createdTicket = true;
  } else if (["resolved", "closed"].includes(String(ticket.status))) {
    ticket =
      (await storage.updateTicket(ticket.id, {
        status: "open",
        priority: "high",
      })) || ticket;
  }

  const aiSettings = await getConciergeAiSettings();
  if (createdTicket && aiSettings.enabled) {
    await storage.createTicketReply({
      ticketId: ticket.id,
      userId: null,
      adminId: null,
      message: aiSettings.welcome,
      isInternal: false,
    });
  }

  return getConciergeThread(userId, context);
}

export async function sendConciergeMessage(userId: string, message: string, context?: ConciergeSettingsContext) {
  const text = String(message || "").trim();
  if (!text) throw new Error("Message text is required");

  const status = await getConciergeStatus(userId, context);
  if (!status.enabled) throw new Error("Concierge is disabled");
  if (!status.hasAccess) throw new Error("Activate Concierge before sending messages");

  const thread = await startConciergeThread(userId, context);
  if (!thread.ticket) throw new Error("Unable to start concierge thread");

  await storage.createTicketReply({
    ticketId: thread.ticket.id,
    userId,
    adminId: null,
    message: text,
    isInternal: false,
  });

  await storage.updateTicket(thread.ticket.id, {
    status: "open",
    priority: "high",
  });

  await createConciergeAiReply(thread.ticket.id, userId);

  return getConciergeThread(userId, context);
}
