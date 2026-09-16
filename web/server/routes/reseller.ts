import { Router } from "express";
import { and, asc, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { z } from "zod";
import { db } from "server/db";
import { requireAuth } from "server/middleware/auth";
import { resellerLogoUpload } from "server/middleware/image-upload";
import { storage } from "server/storage";
import { generateCustomNotificationEmail, generateInstallationEmail, sendEmail, type SmtpOverride } from "server/email";
import { providerFactory } from "server/providers";
import {
  destinations,
  currencyRates,
  orders,
  paymentGateways,
  providers,
  rateTableAssignments,
  rateTablePrices,
  rateTables,
  regions,
  resellerCustomerLinks,
  resellerPaymentSettings,
  resellerPackagePrices,
  resellerProviderSettings,
  unifiedPackages,
  users,
  voucherCodes,
  walletTransactions,
  supportedCurrency,
} from "@shared/schema";
import {
  calculateMarkupPercent,
  normalizeMoneyInput,
  parseCsv,
  readCsvValue,
  toCsv,
} from "server/utils/pricingCsv";
import {
  getRequestHost,
  getRequestStorefrontReseller,
  normalizeResellerSubdomainInput,
} from "server/helpers/packagePricing";
import {
  resellerProviderAliasSlugsForSearch,
  resellerProviderDisplayName,
} from "@shared/providerNames";
import {
  ensureResellerPaymentSettingsTable,
  normalizePaypalEmail,
} from "server/utils/resellerPaymentSettings";
import { ensurePaymentGatewayOwnershipColumn } from "server/utils/paymentGatewayOwnership";
import { applyRateTableToUser, ensureRateTables } from "server/utils/rateTables";
import { ensureUserWhatsappColumn } from "server/utils/whatsapp";
import {
  getPushNotificationSettings,
  isPushNotificationModuleEnabled,
  sendPushCampaign,
  type PushAudience,
  type PushSenderType,
} from "server/services/push-notification-service";

const router = Router();

function money(value: unknown): number {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
}

function wholesaleCost(pkg: { resellerPrice?: unknown; retailPrice?: unknown; wholesalePrice?: unknown }): number {
  return money(pkg.resellerPrice || pkg.retailPrice || pkg.wholesalePrice);
}

function assignedResellerCost(
  pkg: { resellerPrice?: unknown; retailPrice?: unknown; wholesalePrice?: unknown },
  assignedRatePrice?: typeof rateTablePrices.$inferSelect | null,
): number {
  return money(assignedRatePrice?.sellingPrice || wholesaleCost(pkg));
}

function isCopiedAssignedRatePrice(
  customPrice?: typeof resellerPackagePrices.$inferSelect | null,
  assignedRatePrice?: typeof rateTablePrices.$inferSelect | null,
): boolean {
  if (!customPrice || !assignedRatePrice) return false;
  const sameSellingPrice = Math.abs(money(customPrice.sellingPrice) - money(assignedRatePrice.sellingPrice)) < 0.01;
  if (!sameSellingPrice) return false;

  const customMarkup = Number(customPrice.markupPercent);
  const assignedMarkup = Number(assignedRatePrice.marginPercent);
  if (!Number.isFinite(customMarkup) || !Number.isFinite(assignedMarkup)) return true;
  return Math.abs(customMarkup - assignedMarkup) < 0.01;
}

function resellerRetailPricing(
  pkg: { resellerPrice?: unknown; retailPrice?: unknown; wholesalePrice?: unknown },
  customPrice?: typeof resellerPackagePrices.$inferSelect | null,
  assignedRatePrice?: typeof rateTablePrices.$inferSelect | null,
) {
  const cost = assignedResellerCost(pkg, assignedRatePrice);
  const retailOverride = isCopiedAssignedRatePrice(customPrice, assignedRatePrice) ? null : customPrice;
  const savedMarkupPercent = retailOverride?.markupPercent !== null && retailOverride?.markupPercent !== undefined
    ? Number(retailOverride.markupPercent)
    : null;
  const hasMarkup = savedMarkupPercent !== null && Number.isFinite(savedMarkupPercent);
  const sellingPrice = hasMarkup
    ? money(cost * (1 + savedMarkupPercent / 100))
    : money(retailOverride?.sellingPrice || cost);
  const markupPercent = hasMarkup
    ? savedMarkupPercent
    : Number(calculateMarkupPercent(cost, sellingPrice));

  return {
    cost,
    sellingPrice,
    markupPercent,
    retailOverride,
  };
}

async function getAssignedRatePriceForPackage(userId: string, packageId: string) {
  await ensureRateTables();

  const [row] = await db
    .select({ assignedRatePrice: rateTablePrices })
    .from(rateTableAssignments)
    .innerJoin(
      rateTablePrices,
      and(
        eq(rateTablePrices.rateTableId, rateTableAssignments.rateTableId),
        eq(rateTablePrices.packageId, packageId),
      ),
    )
    .where(eq(rateTableAssignments.userId, userId))
    .limit(1);

  return row?.assignedRatePrice || null;
}

function normalizePercent(value: unknown, label: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error(`${label} must be a valid positive percentage`);
  }
  return numeric;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

const resellerCustomerCreateSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  name: z.string().trim().min(1, "Customer name is required").max(120),
  phone: z.string().trim().max(50).optional().nullable(),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  role: z.enum(["customer", "agent", "reseller"]).default("customer"),
  rateTableId: z.string().trim().optional().nullable(),
});

const resellerCustomerUpdateSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(50).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
});

const resellerCustomerPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const resellerCustomerStatusSchema = z.object({
  status: z.enum(["active", "inactive", "deactivated"]),
});

const resellerCustomerBalanceSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero").max(100000),
  description: z.string().trim().max(500).optional(),
});

const resellerCustomerApplyPackageSchema = z.object({
  packageId: z.string().min(1),
  sendEmail: z.coerce.boolean().default(true),
});

const resellerCustomerReminderSchema = z.object({
  type: z.enum(["kyc", "balance"]),
});

const resellerPushNotificationSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(180),
  message: z.string().trim().min(1, "Message is required").max(4000),
  audience: z.enum(["all", "users", "agents", "resellers", "single"]).default("all"),
  recipientUserId: z.string().trim().optional().nullable(),
  sendPush: z.coerce.boolean().default(true),
  sendInApp: z.coerce.boolean().default(true),
});

const resellerPaymentSettingsSchema = z.object({
  paypalEmail: z.string().trim().email("Enter a valid PayPal email").optional().or(z.literal("")),
});

const resellerStorefrontSmtpSchema = z.object({
  host: z.string().trim().max(255).optional().or(z.literal("")),
  port: z.coerce.number().int().min(1).max(65535).default(587),
  user: z.string().trim().max(255).optional().or(z.literal("")),
  pass: z.string().trim().max(500).optional().or(z.literal("")),
  fromEmail: z.string().trim().email("Enter a valid from email").optional().or(z.literal("")),
  fromName: z.string().trim().max(120).optional().or(z.literal("")),
  allowSelfSigned: z.coerce.boolean().default(false),
  isEnabled: z.coerce.boolean().default(false),
});

const resellerGatewayProviderSchema = z.enum(["stripe", "paypal", "nowpayments", "cryptomus", "ayamerchant"]);

const resellerGatewaySchema = z.object({
  provider: resellerGatewayProviderSchema,
  displayName: z.string().trim().min(2, "Display name is required").max(100),
  publicKey: z.string().trim().max(255).optional().or(z.literal("")),
  secretKey: z.string().trim().max(255).optional().or(z.literal("")),
  webhookSecret: z.string().trim().max(255).optional().or(z.literal("")),
  config: z.record(z.any()).optional(),
  isEnabled: z.coerce.boolean().default(true),
  supportedCurrencies: z
    .array(z.object({ currencyId: z.string().min(1) }))
    .min(1, "Select at least one currency"),
});

const resellerGatewayUpdateSchema = resellerGatewaySchema.partial().extend({
  supportedCurrencies: z.array(z.object({ currencyId: z.string().min(1) })).min(1).optional(),
});

const storefrontSetupSectionSchema = z.enum([
  "app-stores",
  "modules",
  "banner",
  "pages",
  "faq",
  "blog",
  "languages",
  "translations",
  "api-docs",
]);

const storefrontSetupConfigSchema = z.object({
  isEnabled: z.coerce.boolean().default(true),
  title: z.string().trim().max(160).optional().or(z.literal("")),
  description: z.string().trim().max(10000).optional().or(z.literal("")),
  primaryUrl: z.string().trim().max(500).optional().or(z.literal("")),
  agentEnabled: z.coerce.boolean().optional(),
  subResellerEnabled: z.coerce.boolean().optional(),
  settings: z.record(z.any()).optional(),
});

let resellerCustomerLinksReady = false;

async function ensureResellerCustomerLinksTable() {
  if (resellerCustomerLinksReady) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS reseller_customer_links (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      reseller_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      customer_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT reseller_customer_links_reseller_customer_unique UNIQUE (reseller_id, customer_id)
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS reseller_customer_links_reseller_idx
    ON reseller_customer_links (reseller_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS reseller_customer_links_customer_idx
    ON reseller_customer_links (customer_id)
  `);

  resellerCustomerLinksReady = true;
}

async function syncResellerOrderCustomers(resellerId: string) {
  await ensureResellerCustomerLinksTable();
  await db.execute(sql`
    INSERT INTO reseller_customer_links (reseller_id, customer_id)
    SELECT DISTINCT ${resellerId}, ${orders.userId}
    FROM ${orders}
    WHERE ${orders.resellerId} = ${resellerId}
      AND ${orders.userId} IS NOT NULL
    ON CONFLICT (reseller_id, customer_id) DO NOTHING
  `);
}

async function getResellerCustomer(resellerId: string, customerId: string) {
  await ensureResellerCustomerLinksTable();
  const [row] = await db
    .select({ customer: users, linkedAt: resellerCustomerLinks.createdAt })
    .from(resellerCustomerLinks)
    .innerJoin(users, eq(resellerCustomerLinks.customerId, users.id))
    .where(and(
      eq(resellerCustomerLinks.resellerId, resellerId),
      eq(resellerCustomerLinks.customerId, customerId),
    ))
    .limit(1);

  return row;
}

function resellerCustomerResponse(customer: typeof users.$inferSelect, extra: Record<string, unknown> = {}) {
  return {
    id: customer.id,
    displayUserId: customer.displayUserId,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    role: customer.role,
    kycStatus: customer.kycStatus,
    walletBalance: customer.walletBalance,
    isBlocked: customer.isBlocked,
    isDeleted: customer.isDeleted,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    ...extra,
  };
}

async function refundResellerWallet(
  resellerId: string,
  amount: number,
  description: string,
  metadata: Record<string, unknown>,
) {
  await db.transaction(async (tx) => {
    const [reseller] = await tx.select().from(users).where(eq(users.id, resellerId));
    if (!reseller) return;

    const balanceBefore = money(reseller.walletBalance);
    const balanceAfter = balanceBefore + amount;

    await tx
      .update(users)
      .set({
        walletBalance: balanceAfter.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(users.id, resellerId));

    await tx.insert(walletTransactions).values({
      userId: resellerId,
      type: "refund",
      status: "completed",
      amount: amount.toFixed(2),
      currency: "USD",
      balanceBefore: balanceBefore.toFixed(2),
      balanceAfter: balanceAfter.toFixed(2),
      provider: "reseller",
      description,
      metadata,
      completedAt: new Date(),
    });
  });
}

function buildStorefrontUrl(req: any, subdomain?: string | null) {
  if (!subdomain) return null;

  const fallbackBaseUrl = `${req.protocol || "http"}://${req.get?.("host") || "localhost:5000"}`;
  const configuredBaseUrl = process.env.BASE_URL || fallbackBaseUrl;

  try {
    const baseUrl = new URL(configuredBaseUrl);
    const configuredDomain = process.env.RESELLER_BASE_DOMAIN || process.env.BASE_DOMAIN;
    const hostname = (configuredDomain || baseUrl.hostname).replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
    const port = baseUrl.port ? `:${baseUrl.port}` : "";
    return `${baseUrl.protocol}//${subdomain}.${hostname}${port}`;
  } catch {
    return `http://${subdomain}.localhost:5000`;
  }
}

function buildCustomerAccountUrl(req: any, path: string) {
  const fallbackBaseUrl = `${req.protocol || "http"}://${req.get?.("host") || "localhost:5000"}`;
  const configuredBaseUrl = process.env.BASE_URL || fallbackBaseUrl;

  try {
    return new URL(path, configuredBaseUrl).toString();
  } catch {
    return `${fallbackBaseUrl}${path}`;
  }
}

async function getProviderAvailabilityForReseller(userId: string, providerId?: string | null) {
  if (!providerId) {
    return { available: true, message: null };
  }

  const [provider] = await db
    .select({ enabled: providers.enabled })
    .from(providers)
    .where(eq(providers.id, providerId))
    .limit(1);

  if (!provider || !provider.enabled) {
    return { available: false, message: "Provider is disabled by admin" };
  }

  const [setting] = await db
    .select({ isEnabled: resellerProviderSettings.isEnabled })
    .from(resellerProviderSettings)
    .where(and(
      eq(resellerProviderSettings.resellerId, userId),
      eq(resellerProviderSettings.providerId, providerId),
    ))
    .limit(1);

  return {
    available: setting?.isEnabled !== false,
    message: setting?.isEnabled === false ? "Provider is disabled for your Reseller Account" : null,
  };
}

function storefrontSettingsResponse(req: any, reseller: typeof users.$inferSelect) {
  return {
    subdomain: reseller.resellerSubdomain || "",
    storeName: reseller.resellerStoreName || reseller.name || "",
    tagline: reseller.resellerStoreTagline || "",
    contactEmail: reseller.resellerContactEmail || reseller.email || "",
    defaultCurrencyId: reseller.resellerDefaultCurrency || reseller.currency || "",
    storefrontConfig: normalizeStorefrontConfig(reseller.resellerStoreConfig),
    logoUrl: reseller.resellerLogoUrl || "",
    whatsappNumber: reseller.whatsappNumber || "",
    isActive: Boolean(reseller.resellerStoreActive),
    url: buildStorefrontUrl(req, reseller.resellerSubdomain),
  };
}

const STOREFRONT_WORKING_DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const DEFAULT_STOREFRONT_CONFIG = {
  whatsappEnabled: true,
  whatsappScheduleEnabled: false,
  whatsappStartTime: "09:00",
  whatsappEndTime: "18:00",
  whatsappWorkingDays: ["mon", "tue", "wed", "thu", "fri"],
  conciergeEnabled: true,
  conciergePricingMode: "free",
  conciergeBillingCycle: "one_time",
  conciergeFee: "29.00",
  conciergeTrialEnabled: true,
  conciergeTrialDays: "7",
  supportSipEnabled: false,
  supportSipLabel: "Call Center",
  supportSipUri: "",
  supportSipServer: "",
  supportSipExtension: "",
  supportSipUsername: "",
  faviconUrl: "",
  copyrightText: "",
};

function normalizeTimeInput(value: unknown, fallback: string) {
  const text = String(value || "").trim();
  return /^\d{2}:\d{2}$/.test(text) ? text : fallback;
}

function normalizeTrialDaysInput(value: unknown, fallback: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return String(Math.min(30, Math.max(1, Math.round(numeric))));
}

function normalizeStorefrontConfig(value: unknown) {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const workingDaysInput = Array.isArray(input.whatsappWorkingDays)
    ? input.whatsappWorkingDays.map((day) => String(day).toLowerCase())
    : DEFAULT_STOREFRONT_CONFIG.whatsappWorkingDays;
  const workingDays = workingDaysInput.filter((day): day is typeof STOREFRONT_WORKING_DAYS[number] =>
    STOREFRONT_WORKING_DAYS.includes(day as typeof STOREFRONT_WORKING_DAYS[number]),
  );
  const pricingMode = input.conciergePricingMode === "paid" ? "paid" : "free";
  const billingCycle = input.conciergeBillingCycle === "monthly" ? "monthly" : "one_time";
  const fee = money(input.conciergeFee || DEFAULT_STOREFRONT_CONFIG.conciergeFee).toFixed(2);

  return {
    whatsappEnabled: input.whatsappEnabled !== false,
    whatsappScheduleEnabled: input.whatsappScheduleEnabled === true,
    whatsappStartTime: normalizeTimeInput(input.whatsappStartTime, DEFAULT_STOREFRONT_CONFIG.whatsappStartTime),
    whatsappEndTime: normalizeTimeInput(input.whatsappEndTime, DEFAULT_STOREFRONT_CONFIG.whatsappEndTime),
    whatsappWorkingDays: workingDays.length ? workingDays : DEFAULT_STOREFRONT_CONFIG.whatsappWorkingDays,
    conciergeEnabled: input.conciergeEnabled !== false,
    conciergePricingMode: pricingMode,
    conciergeBillingCycle: billingCycle,
    conciergeFee: fee,
    conciergeTrialEnabled: input.conciergeTrialEnabled !== false,
    conciergeTrialDays: normalizeTrialDaysInput(input.conciergeTrialDays, DEFAULT_STOREFRONT_CONFIG.conciergeTrialDays),
    supportSipEnabled: input.supportSipEnabled === true,
    supportSipLabel: String(input.supportSipLabel || DEFAULT_STOREFRONT_CONFIG.supportSipLabel).trim(),
    supportSipUri: String(input.supportSipUri || "").trim(),
    supportSipServer: String(input.supportSipServer || "").trim(),
    supportSipExtension: String(input.supportSipExtension || "").trim(),
    supportSipUsername: String(input.supportSipUsername || "").trim(),
    faviconUrl: String(input.faviconUrl || "").trim(),
    copyrightText: String(input.copyrightText || "").trim(),
  };
}

function normalizeStorefrontSmtpConfig(value: unknown) {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const rawSmtp = input.smtp && typeof input.smtp === "object" && !Array.isArray(input.smtp)
    ? input.smtp as Record<string, unknown>
    : {};
  const port = Number(rawSmtp.port || 587);

  return {
    host: String(rawSmtp.host || "").trim(),
    port: Number.isFinite(port) ? port : 587,
    user: String(rawSmtp.user || "").trim(),
    pass: String(rawSmtp.pass || "").trim(),
    fromEmail: String(rawSmtp.fromEmail || "").trim(),
    fromName: String(rawSmtp.fromName || "").trim(),
    allowSelfSigned: rawSmtp.allowSelfSigned === true,
    isEnabled: rawSmtp.isEnabled === true,
  };
}

function storefrontSmtpFromUser(user: typeof users.$inferSelect): SmtpOverride | null {
  const smtp = normalizeStorefrontSmtpConfig(user.resellerStoreConfig);
  if (!smtp.isEnabled || !smtp.host || !smtp.user || !smtp.pass) return null;
  return {
    host: smtp.host,
    port: smtp.port,
    user: smtp.user,
    pass: smtp.pass,
    fromEmail: smtp.fromEmail || smtp.user,
    fromName: smtp.fromName || user.resellerStoreName || user.name || user.email,
    allowSelfSigned: smtp.allowSelfSigned,
  };
}

function resellerEmailOptions(reseller: typeof users.$inferSelect) {
  return {
    smtpOverride: storefrontSmtpFromUser(reseller),
    fromName: reseller.resellerStoreName || reseller.name || reseller.email || "Storefront",
  };
}

function normalizeStorefrontSectionsConfig(value: unknown) {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const sections = input.storefrontSections && typeof input.storefrontSections === "object" && !Array.isArray(input.storefrontSections)
    ? input.storefrontSections as Record<string, unknown>
    : {};
  return sections;
}

function normalizeStorefrontSectionConfig(section: string, value: unknown) {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    section,
    isEnabled: input.isEnabled !== false,
    title: String(input.title || "").trim(),
    description: String(input.description || "").trim(),
    primaryUrl: String(input.primaryUrl || "").trim(),
    agentEnabled: input.agentEnabled === true,
    subResellerEnabled: input.subResellerEnabled === true,
    settings: input.settings && typeof input.settings === "object" && !Array.isArray(input.settings)
      ? input.settings
      : {},
    updatedAt: input.updatedAt || null,
  };
}

function storefrontConfigFromRequest(req: any) {
  const base = normalizeStorefrontConfig(req.reseller.resellerStoreConfig);
  const input = req.body.storefrontConfig && typeof req.body.storefrontConfig === "object"
    ? req.body.storefrontConfig
    : req.body;

  return normalizeStorefrontConfig({
    ...base,
    whatsappEnabled: normalizeBoolean(input.whatsappEnabled) ?? input.whatsappEnabled ?? base.whatsappEnabled,
    whatsappScheduleEnabled:
      normalizeBoolean(input.whatsappScheduleEnabled) ?? input.whatsappScheduleEnabled ?? base.whatsappScheduleEnabled,
    whatsappStartTime: input.whatsappStartTime ?? base.whatsappStartTime,
    whatsappEndTime: input.whatsappEndTime ?? base.whatsappEndTime,
    whatsappWorkingDays: input.whatsappWorkingDays ?? base.whatsappWorkingDays,
    conciergeEnabled: normalizeBoolean(input.conciergeEnabled) ?? input.conciergeEnabled ?? base.conciergeEnabled,
    conciergePricingMode: input.conciergePricingMode ?? base.conciergePricingMode,
    conciergeBillingCycle: input.conciergeBillingCycle ?? base.conciergeBillingCycle,
    conciergeFee: input.conciergeFee ?? base.conciergeFee,
    conciergeTrialEnabled:
      normalizeBoolean(input.conciergeTrialEnabled) ?? input.conciergeTrialEnabled ?? base.conciergeTrialEnabled,
    conciergeTrialDays: input.conciergeTrialDays ?? base.conciergeTrialDays,
    supportSipEnabled: normalizeBoolean(input.supportSipEnabled) ?? input.supportSipEnabled ?? base.supportSipEnabled,
    supportSipLabel: input.supportSipLabel ?? base.supportSipLabel,
    supportSipUri: input.supportSipUri ?? base.supportSipUri,
    supportSipServer: input.supportSipServer ?? base.supportSipServer,
    supportSipExtension: input.supportSipExtension ?? base.supportSipExtension,
    supportSipUsername: input.supportSipUsername ?? base.supportSipUsername,
    faviconUrl: input.faviconUrl ?? base.faviconUrl,
    copyrightText: input.copyrightText ?? base.copyrightText,
  });
}

function assertResellerGatewayCredentials(data: {
  provider: z.infer<typeof resellerGatewayProviderSchema>;
  publicKey?: string | null;
  secretKey?: string | null;
}) {
  const publicKey = String(data.publicKey || "").trim();
  const secretKey = String(data.secretKey || "").trim();

  if (data.provider === "stripe" && (!publicKey || !secretKey)) {
    throw new Error("Stripe publishable key and secret key are required");
  }

  if (data.provider === "paypal" && (!publicKey || !secretKey)) {
    throw new Error("PayPal client ID and secret are required");
  }

  if (data.provider === "nowpayments" && !secretKey) {
    throw new Error("NOWPayments API key is required");
  }

  if (data.provider === "ayamerchant" && !secretKey) {
    throw new Error("AYAMERCHANT API key is required");
  }

  if (data.provider === "cryptomus" && (!publicKey || !secretKey)) {
    throw new Error("Cryptomus merchant UUID and payment API key are required");
  }
}

function cleanNullableSecret(value: unknown) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

async function listResellerPaymentGateways(resellerId: string) {
  await ensurePaymentGatewayOwnershipColumn();

  const rows = await db
    .select({
      gatewayId: paymentGateways.id,
      provider: paymentGateways.provider,
      displayName: paymentGateways.displayName,
      isEnabled: paymentGateways.isEnabled,
      publicKey: paymentGateways.publicKey,
      secretKey: paymentGateways.secretKey,
      webhookSecret: paymentGateways.webhookSecret,
      config: paymentGateways.config,
      createdAt: paymentGateways.createdAt,
      updatedAt: paymentGateways.updatedAt,
      currencyId: supportedCurrency.currencyId,
    })
    .from(paymentGateways)
    .leftJoin(supportedCurrency, eq(paymentGateways.id, supportedCurrency.paymentGatewayId))
    .where(eq(paymentGateways.resellerId, resellerId))
    .orderBy(asc(paymentGateways.provider), asc(paymentGateways.displayName));

  const map = new Map<string, any>();
  for (const row of rows) {
    if (!map.has(row.gatewayId)) {
      map.set(row.gatewayId, {
        id: row.gatewayId,
        provider: row.provider,
        displayName: row.displayName,
        isEnabled: row.isEnabled,
        publicKey: row.publicKey || "",
        secretKey: row.secretKey || "",
        webhookSecret: row.webhookSecret || "",
        config: row.config || {},
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        supportedCurrencies: [],
      });
    }

    if (row.currencyId) {
      map.get(row.gatewayId).supportedCurrencies.push({ currencyId: row.currencyId });
    }
  }

  return Array.from(map.values());
}

async function requireReseller(req: any, res: any, next: any) {
  try {
    const user = await storage.getUser(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role !== "reseller") {
      return res.status(403).json({ success: false, message: "Reseller Access required" });
    }

    req.reseller = user;
    return next();
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Reseller auth failed" });
  }
}

async function requireResellerOrAgent(req: any, res: any, next: any) {
  try {
    const user = await storage.getUser(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role !== "reseller" && user.role !== "agent") {
      return res.status(403).json({ success: false, message: "Reseller or Agent access required" });
    }

    req.reseller = user;
    req.pricingAccount = user;
    next();
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Access check failed" });
  }
}

router.get("/storefront/current", async (req: any, res) => {
  try {
    await ensureUserWhatsappColumn();
    const storefront = await getRequestStorefrontReseller(req);
    if (!storefront) {
      return res.json({ success: true, data: null });
    }

    return res.json({
      success: true,
      data: {
        resellerId: storefront.id,
        storeName: storefront.resellerStoreName || storefront.name || "Reseller Store",
        tagline: storefront.resellerStoreTagline || "",
        contactEmail: storefront.resellerContactEmail || storefront.email || "",
        defaultCurrencyId: storefront.resellerDefaultCurrency || "",
        storefrontConfig: normalizeStorefrontConfig(storefront.resellerStoreConfig),
        logoUrl: storefront.resellerLogoUrl || "",
        whatsappNumber: storefront.whatsappNumber || "",
        subdomain: storefront.resellerSubdomain,
        host: getRequestHost(req),
        url: buildStorefrontUrl(req, storefront.resellerSubdomain),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to load storefront" });
  }
});

router.get("/storefront/settings", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  await ensureUserWhatsappColumn();
  const reseller = req.reseller;
  return res.json({
    success: true,
    data: storefrontSettingsResponse(req, reseller),
  });
});

router.get("/storefront/smtp", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  const smtp = normalizeStorefrontSmtpConfig(req.reseller.resellerStoreConfig);
  return res.json({
    success: true,
    data: {
      ...smtp,
      pass: smtp.pass ? "********" : "",
      isConfigured: Boolean(smtp.isEnabled && smtp.host && smtp.user && smtp.pass),
    },
  });
});

router.patch("/storefront/smtp", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const payload = resellerStorefrontSmtpSchema.parse(req.body);
    const currentConfig = req.reseller.resellerStoreConfig && typeof req.reseller.resellerStoreConfig === "object"
      ? req.reseller.resellerStoreConfig as Record<string, unknown>
      : {};
    const currentSmtp = normalizeStorefrontSmtpConfig(currentConfig);
    const passInput = String(payload.pass || "").trim();
    const smtp = {
      host: String(payload.host || "").trim(),
      port: payload.port || 587,
      user: String(payload.user || "").trim(),
      pass: passInput && passInput !== "********" ? passInput : currentSmtp.pass,
      fromEmail: String(payload.fromEmail || "").trim(),
      fromName: String(payload.fromName || "").trim(),
      allowSelfSigned: payload.allowSelfSigned,
      isEnabled: payload.isEnabled,
    };

    if (smtp.isEnabled && (!smtp.host || !smtp.user || !smtp.pass)) {
      return res.status(400).json({
        success: false,
        message: "SMTP host, username, and password are required when SMTP is enabled.",
      });
    }

    const [updated] = await db
      .update(users)
      .set({
        resellerStoreConfig: {
          ...currentConfig,
          smtp,
        },
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.userId))
      .returning();

    const savedSmtp = normalizeStorefrontSmtpConfig(updated.resellerStoreConfig);
    return res.json({
      success: true,
      message: "Storefront SMTP settings saved",
      data: {
        ...savedSmtp,
        pass: savedSmtp.pass ? "********" : "",
        isConfigured: Boolean(savedSmtp.isEnabled && savedSmtp.host && savedSmtp.user && savedSmtp.pass),
      },
    });
  } catch (error: any) {
    console.error("Reseller storefront SMTP error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to save SMTP settings" });
  }
});

router.get("/storefront/setup/:section", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const section = storefrontSetupSectionSchema.parse(req.params.section);
    const sections = normalizeStorefrontSectionsConfig(req.reseller.resellerStoreConfig);
    return res.json({
      success: true,
      data: normalizeStorefrontSectionConfig(section, sections[section]),
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Invalid storefront setup section" });
  }
});

router.patch("/storefront/setup/:section", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const section = storefrontSetupSectionSchema.parse(req.params.section);
    const payload = storefrontSetupConfigSchema.parse(req.body);
    const currentConfig = req.reseller.resellerStoreConfig && typeof req.reseller.resellerStoreConfig === "object" && !Array.isArray(req.reseller.resellerStoreConfig)
      ? req.reseller.resellerStoreConfig as Record<string, unknown>
      : {};
    const sections = normalizeStorefrontSectionsConfig(currentConfig);
    const nextSection = {
      isEnabled: payload.isEnabled,
      title: payload.title || "",
      description: payload.description || "",
      primaryUrl: payload.primaryUrl || "",
      agentEnabled: payload.agentEnabled === true,
      subResellerEnabled: payload.subResellerEnabled === true,
      settings: payload.settings || {},
      updatedAt: new Date().toISOString(),
    };

    const [updated] = await db
      .update(users)
      .set({
        resellerStoreConfig: {
          ...currentConfig,
          storefrontSections: {
            ...sections,
            [section]: nextSection,
          },
        },
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.userId))
      .returning();

    const savedSections = normalizeStorefrontSectionsConfig(updated.resellerStoreConfig);
    return res.json({
      success: true,
      message: "Storefront setup section saved",
      data: normalizeStorefrontSectionConfig(section, savedSections[section]),
    });
  } catch (error: any) {
    console.error("Reseller storefront setup section error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to save storefront setup section" });
  }
});

router.patch("/storefront/settings", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    await ensureUserWhatsappColumn();
    const rawSubdomain = req.body.subdomain ?? req.body.resellerSubdomain;
    const hasSubdomainInput = rawSubdomain !== undefined;
    const subdomain = hasSubdomainInput ? normalizeResellerSubdomainInput(rawSubdomain) : req.reseller.resellerSubdomain;
    const storeName = String(req.body.storeName ?? req.body.resellerStoreName ?? req.reseller.resellerStoreName ?? "").trim();
    const tagline = String(req.body.tagline ?? req.body.resellerStoreTagline ?? req.reseller.resellerStoreTagline ?? "").trim();
    const contactEmail = String(req.body.contactEmail ?? req.body.resellerContactEmail ?? req.reseller.resellerContactEmail ?? req.reseller.email ?? "").trim().toLowerCase();
    const defaultCurrencyId = String(req.body.defaultCurrencyId ?? req.body.resellerDefaultCurrency ?? req.reseller.resellerDefaultCurrency ?? req.reseller.currency ?? "").trim();
    const whatsappNumber = String(req.body.whatsappNumber ?? req.reseller.whatsappNumber ?? "").trim();
    const currentStoreConfig = req.reseller.resellerStoreConfig && typeof req.reseller.resellerStoreConfig === "object" && !Array.isArray(req.reseller.resellerStoreConfig)
      ? req.reseller.resellerStoreConfig as Record<string, unknown>
      : {};
    const storefrontConfig = {
      ...currentStoreConfig,
      ...storefrontConfigFromRequest(req),
    };
    const isActiveInput = normalizeBoolean(req.body.isActive ?? req.body.resellerStoreActive);
    const isClearing = hasSubdomainInput && String(rawSubdomain || "").trim() === "";

    if (hasSubdomainInput && !subdomain && !isClearing) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid subdomain using letters, numbers, and hyphens only.",
      });
    }

    if (subdomain) {
      const existing = await db.query.users.findFirst({
        where: and(
          eq(users.resellerSubdomain, subdomain),
          ne(users.id, req.userId),
        ),
      });
      if (existing) {
        return res.status(409).json({ success: false, message: "This subdomain is already used by another account." });
      }
    }

    if (contactEmail && !z.string().email().safeParse(contactEmail).success) {
      return res.status(400).json({ success: false, message: "Enter a valid contact email." });
    }

    if (defaultCurrencyId) {
      const [currency] = await db
        .select({ id: currencyRates.id })
        .from(currencyRates)
        .where(and(eq(currencyRates.id, defaultCurrencyId), eq(currencyRates.isEnabled, true)))
        .limit(1);
      if (!currency) {
        return res.status(400).json({ success: false, message: "Select a valid enabled default currency." });
      }
    }

    const updateData = {
      resellerSubdomain: isClearing ? null : subdomain,
      resellerStoreName: storeName || req.reseller.name || req.reseller.email,
      resellerStoreTagline: tagline || null,
      resellerContactEmail: contactEmail || null,
      resellerDefaultCurrency: defaultCurrencyId || null,
      resellerStoreConfig: storefrontConfig,
      whatsappNumber,
      resellerStoreActive: Boolean((isActiveInput ?? true) && subdomain && !isClearing),
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, req.userId))
      .returning();

    return res.json({
      success: true,
      message: "Storefront settings saved",
      data: {
        subdomain: updated.resellerSubdomain || "",
        storeName: updated.resellerStoreName || "",
        tagline: updated.resellerStoreTagline || "",
        contactEmail: updated.resellerContactEmail || updated.email || "",
        defaultCurrencyId: updated.resellerDefaultCurrency || updated.currency || "",
        storefrontConfig: normalizeStorefrontConfig(updated.resellerStoreConfig),
        logoUrl: updated.resellerLogoUrl || "",
        whatsappNumber: updated.whatsappNumber || "",
        isActive: Boolean(updated.resellerStoreActive),
        url: buildStorefrontUrl(req, updated.resellerSubdomain),
      },
    });
  } catch (error: any) {
    console.error("Reseller storefront settings error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to save storefront settings" });
  }
});

router.post("/storefront/logo", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  resellerLogoUpload.single("logo")(req, res, async (err: any) => {
    try {
      if (err) {
        return res.status(400).json({ success: false, message: err.message || "Logo upload failed" });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: "No logo file provided" });
      }

      const logoUrl = `/uploads/reseller-logos/${req.file.filename}`;
      const [updated] = await db
        .update(users)
        .set({
          resellerLogoUrl: logoUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.userId))
        .returning();

      return res.json({
        success: true,
        message: "Storefront logo uploaded",
        data: storefrontSettingsResponse(req, updated),
      });
    } catch (error: any) {
      console.error("Reseller logo upload error:", error);
      return res.status(500).json({ success: false, message: error.message || "Failed to upload logo" });
    }
  });
});

router.delete("/storefront/logo", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const [updated] = await db
      .update(users)
      .set({
        resellerLogoUrl: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.userId))
      .returning();

    return res.json({
      success: true,
      message: "Storefront logo removed",
      data: storefrontSettingsResponse(req, updated),
    });
  } catch (error: any) {
    console.error("Reseller logo remove error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to remove logo" });
  }
});

router.get("/payment-settings", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    await ensureResellerPaymentSettingsTable();

    const [settings] = await db
      .select()
      .from(resellerPaymentSettings)
      .where(eq(resellerPaymentSettings.resellerId, req.userId))
      .limit(1);

    return res.json({
      success: true,
      data: {
        paypalEmail: settings?.paypalEmail || "",
      },
    });
  } catch (error: any) {
    console.error("Reseller payment settings fetch error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load payment settings" });
  }
});

router.patch("/payment-settings", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    await ensureResellerPaymentSettingsTable();
    const payload = resellerPaymentSettingsSchema.parse(req.body);
    const paypalEmail = normalizePaypalEmail(payload.paypalEmail);

    const [settings] = await db
      .insert(resellerPaymentSettings)
      .values({
        resellerId: req.userId,
        paypalEmail: paypalEmail || null,
      })
      .onConflictDoUpdate({
        target: resellerPaymentSettings.resellerId,
        set: {
          paypalEmail: paypalEmail || null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return res.json({
      success: true,
      message: "Payment settings saved",
      data: {
        paypalEmail: settings.paypalEmail || "",
      },
    });
  } catch (error: any) {
    console.error("Reseller payment settings update error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to save payment settings" });
  }
});

router.get("/payment-gateways/currencies", requireAuth, requireResellerOrAgent, async (_req: any, res) => {
  try {
    const currencies = await db
      .select({
        id: currencyRates.id,
        code: currencyRates.code,
        name: currencyRates.name,
        symbol: currencyRates.symbol,
        isEnabled: currencyRates.isEnabled,
      })
      .from(currencyRates)
      .where(eq(currencyRates.isEnabled, true))
      .orderBy(desc(currencyRates.isDefault), asc(currencyRates.code));

    return res.json({ success: true, data: currencies });
  } catch (error: any) {
    console.error("Reseller gateway currencies error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load currencies" });
  }
});

router.get("/payment-gateways", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const gateways = await listResellerPaymentGateways(req.userId);
    return res.json({ success: true, data: gateways });
  } catch (error: any) {
    console.error("Reseller gateways fetch error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load payment gateways" });
  }
});

router.post("/payment-gateways", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    await ensurePaymentGatewayOwnershipColumn();
    const payload = resellerGatewaySchema.parse(req.body);
    assertResellerGatewayCredentials(payload);

    const [existing] = await db
      .select({ id: paymentGateways.id })
      .from(paymentGateways)
      .where(and(
        eq(paymentGateways.resellerId, req.userId),
        eq(paymentGateways.provider, payload.provider),
        eq(paymentGateways.displayName, payload.displayName),
      ))
      .limit(1);

    if (existing) {
      return res.status(400).json({ success: false, message: "Display name already exists for this provider" });
    }

    await db.transaction(async (tx) => {
      const [gateway] = await tx
        .insert(paymentGateways)
        .values({
          resellerId: req.userId,
          provider: payload.provider,
          displayName: payload.displayName,
          publicKey: cleanNullableSecret(payload.publicKey),
          secretKey: cleanNullableSecret(payload.secretKey),
          webhookSecret: cleanNullableSecret(payload.webhookSecret),
          config: payload.config || {},
          isEnabled: payload.isEnabled,
        })
        .returning({ id: paymentGateways.id });

      await tx.insert(supportedCurrency).values(
        payload.supportedCurrencies.map((item) => ({
          paymentGatewayId: gateway.id,
          currencyId: item.currencyId,
        })),
      );
    });

    return res.status(201).json({
      success: true,
      message: "Payment gateway saved",
      data: await listResellerPaymentGateways(req.userId),
    });
  } catch (error: any) {
    console.error("Reseller gateway create error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to save payment gateway" });
  }
});

router.put("/payment-gateways/:id", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    await ensurePaymentGatewayOwnershipColumn();
    const gatewayId = req.params.id;
    const [existing] = await db
      .select()
      .from(paymentGateways)
      .where(and(eq(paymentGateways.id, gatewayId), eq(paymentGateways.resellerId, req.userId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ success: false, message: "Payment gateway not found" });
    }

    const payload = resellerGatewayUpdateSchema.parse(req.body);
    const merged = {
      provider: existing.provider as z.infer<typeof resellerGatewayProviderSchema>,
      publicKey: payload.publicKey !== undefined ? payload.publicKey : existing.publicKey,
      secretKey: payload.secretKey !== undefined ? payload.secretKey : existing.secretKey,
    };
    assertResellerGatewayCredentials(merged);

    await db.transaction(async (tx) => {
      await tx
        .update(paymentGateways)
        .set({
          displayName: payload.displayName ?? existing.displayName,
          publicKey: payload.publicKey !== undefined ? cleanNullableSecret(payload.publicKey) : existing.publicKey,
          secretKey: payload.secretKey !== undefined ? cleanNullableSecret(payload.secretKey) : existing.secretKey,
          webhookSecret:
            payload.webhookSecret !== undefined ? cleanNullableSecret(payload.webhookSecret) : existing.webhookSecret,
          config: payload.config !== undefined ? payload.config : existing.config,
          isEnabled: payload.isEnabled !== undefined ? payload.isEnabled : existing.isEnabled,
          updatedAt: new Date(),
        })
        .where(and(eq(paymentGateways.id, gatewayId), eq(paymentGateways.resellerId, req.userId)));

      if (payload.supportedCurrencies) {
        await tx.delete(supportedCurrency).where(eq(supportedCurrency.paymentGatewayId, gatewayId));
        await tx.insert(supportedCurrency).values(
          payload.supportedCurrencies.map((item) => ({
            paymentGatewayId: gatewayId,
            currencyId: item.currencyId,
          })),
        );
      }
    });

    return res.json({
      success: true,
      message: "Payment gateway updated",
      data: await listResellerPaymentGateways(req.userId),
    });
  } catch (error: any) {
    console.error("Reseller gateway update error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update payment gateway" });
  }
});

router.patch("/payment-gateways/:id/status", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    await ensurePaymentGatewayOwnershipColumn();
    const isEnabled = normalizeBoolean(req.body.isEnabled);
    if (isEnabled === undefined) {
      return res.status(400).json({ success: false, message: "isEnabled must be true or false" });
    }

    const [updated] = await db
      .update(paymentGateways)
      .set({ isEnabled, updatedAt: new Date() })
      .where(and(eq(paymentGateways.id, req.params.id), eq(paymentGateways.resellerId, req.userId)))
      .returning({ id: paymentGateways.id });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Payment gateway not found" });
    }

    return res.json({
      success: true,
      message: "Payment gateway status updated",
      data: await listResellerPaymentGateways(req.userId),
    });
  } catch (error: any) {
    console.error("Reseller gateway status error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update payment gateway" });
  }
});

router.delete("/payment-gateways/:id", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    await ensurePaymentGatewayOwnershipColumn();
    const [deleted] = await db
      .delete(paymentGateways)
      .where(and(eq(paymentGateways.id, req.params.id), eq(paymentGateways.resellerId, req.userId)))
      .returning({ id: paymentGateways.id });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Payment gateway not found" });
    }

    return res.json({
      success: true,
      message: "Payment gateway deleted",
      data: await listResellerPaymentGateways(req.userId),
    });
  } catch (error: any) {
    console.error("Reseller gateway delete error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to delete payment gateway" });
  }
});

router.get("/customers", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const resellerId = req.userId;
    await syncResellerOrderCustomers(resellerId);

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const offset = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "all");
    const role = String(req.query.role || "all").trim();

    const whereClauses: any[] = [eq(resellerCustomerLinks.resellerId, resellerId)];

    if (search) {
      const searchTerm = `%${search}%`;
      whereClauses.push(or(
        ilike(users.name, searchTerm),
        ilike(users.email, searchTerm),
        ilike(users.phone, searchTerm),
        sql`CAST(${users.displayUserId} AS TEXT) ILIKE ${searchTerm}`,
      ));
    }

    if (status === "active") {
      whereClauses.push(and(eq(users.isDeleted, false), eq(users.isBlocked, false)));
    } else if (status === "blocked") {
      whereClauses.push(and(eq(users.isDeleted, false), eq(users.isBlocked, true)));
    } else if (status === "deleted") {
      whereClauses.push(eq(users.isDeleted, true));
    }

    if (["customer", "agent", "reseller"].includes(role)) {
      whereClauses.push(eq(users.role, role));
    }

    const whereCondition = and(...whereClauses);

    const [rows, totalRows, statsRows] = await Promise.all([
      db
        .select({
          customer: users,
          linkedAt: resellerCustomerLinks.createdAt,
          orderCount: sql<number>`(
            SELECT COUNT(*)::int
            FROM ${orders}
            WHERE ${orders.userId} = ${users.id}
              AND ${orders.resellerId} = ${resellerId}
          )`,
          totalSpend: sql<string>`(
            SELECT COALESCE(SUM(${orders.price}::numeric * ${orders.quantity}), 0)
            FROM ${orders}
            WHERE ${orders.userId} = ${users.id}
              AND ${orders.resellerId} = ${resellerId}
          )`,
        })
        .from(resellerCustomerLinks)
        .innerJoin(users, eq(resellerCustomerLinks.customerId, users.id))
        .where(whereCondition)
        .orderBy(desc(resellerCustomerLinks.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(resellerCustomerLinks)
        .innerJoin(users, eq(resellerCustomerLinks.customerId, users.id))
        .where(whereCondition),
      db
        .select({
          total: count(),
          active: sql<number>`COUNT(*) FILTER (WHERE ${users.isDeleted} = false AND ${users.isBlocked} = false)::int`,
          blocked: sql<number>`COUNT(*) FILTER (WHERE ${users.isDeleted} = false AND ${users.isBlocked} = true)::int`,
          deleted: sql<number>`COUNT(*) FILTER (WHERE ${users.isDeleted} = true)::int`,
        })
        .from(resellerCustomerLinks)
        .innerJoin(users, eq(resellerCustomerLinks.customerId, users.id))
        .where(eq(resellerCustomerLinks.resellerId, resellerId)),
    ]);

    const total = Number(totalRows[0]?.total || 0);
    const stats = statsRows[0] || { total: 0, active: 0, blocked: 0, deleted: 0 };

    return res.json({
      success: true,
      data: {
        customers: rows.map((row) => resellerCustomerResponse(row.customer, {
          linkedAt: row.linkedAt,
          orderCount: Number(row.orderCount || 0),
          totalSpend: money(row.totalSpend).toFixed(2),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats: {
          total: Number(stats.total || 0),
          active: Number(stats.active || 0),
          blocked: Number(stats.blocked || 0),
          deleted: Number(stats.deleted || 0),
        },
      },
    });
  } catch (error: any) {
    console.error("Reseller customers fetch error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load Customers" });
  }
});

router.post("/customers", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    await ensureResellerCustomerLinksTable();
    await ensureRateTables();
    const resellerId = req.userId;
    const payload = resellerCustomerCreateSchema.parse(req.body);

    const existing = await storage.getUserByEmail(payload.email);
    if (existing) {
      return res.status(409).json({ success: false, message: "A customer with this email already exists" });
    }

    let selectedRate: typeof rateTables.$inferSelect | null = null;
    if (payload.role !== "customer") {
      if (payload.rateTableId) {
        const [rate] = await db
          .select()
          .from(rateTables)
          .where(and(eq(rateTables.id, payload.rateTableId), eq(rateTables.ownerUserId, resellerId)))
          .limit(1);

        if (!rate) {
          return res.status(404).json({ success: false, message: "Rate table not found" });
        }
        selectedRate = rate;
      }
    }

    const hashedPassword = payload.password
      ? await bcrypt.hash(payload.password, 10)
      : undefined;

    const customer = await storage.createUser({
      email: payload.email,
      name: payload.name,
      phone: payload.phone || null,
      role: payload.role,
      hashedPassword,
      passwordSetAt: hashedPassword ? new Date() : null,
    } as any);

    let rateAssignment = null;
    if (selectedRate) {
      rateAssignment = await applyRateTableToUser(customer.id, selectedRate.id, null);
    }

    await db
      .insert(resellerCustomerLinks)
      .values({
        resellerId,
        customerId: customer.id,
      })
      .onConflictDoNothing({
        target: [resellerCustomerLinks.resellerId, resellerCustomerLinks.customerId],
      });

    return res.status(201).json({
      success: true,
      message:
        payload.role === "agent"
          ? "Agent created successfully"
          : payload.role === "reseller"
            ? "Sub Reseller created successfully"
            : "Customer created successfully",
      data: resellerCustomerResponse(customer, {
        linkedAt: new Date(),
        orderCount: 0,
        totalSpend: "0.00",
        rateAssignment,
      }),
    });
  } catch (error: any) {
    console.error("Reseller customer create error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to create customer" });
  }
});

router.get("/customers/:id", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const resellerId = req.userId;
    const row = await getResellerCustomer(resellerId, req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const orderWhere = and(eq(orders.resellerId, resellerId), eq(orders.userId, req.params.id));
    const [recentOrders, orderStatsRows] = await Promise.all([
      db
        .select({
          id: orders.id,
          displayOrderId: orders.displayOrderId,
          packageId: orders.packageId,
          dataAmount: orders.dataAmount,
          validity: orders.validity,
          price: orders.price,
          quantity: orders.quantity,
          status: orders.status,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(orderWhere)
        .orderBy(desc(orders.createdAt))
        .limit(10),
      db
        .select({
          orderCount: count(),
          totalSpend: sql<string>`COALESCE(SUM(${orders.price}::numeric * ${orders.quantity}), 0)`,
        })
        .from(orders)
        .where(orderWhere),
    ]);
    const orderStats = orderStatsRows[0];

    return res.json({
      success: true,
      data: resellerCustomerResponse(row.customer, {
        linkedAt: row.linkedAt,
        orderCount: Number(orderStats?.orderCount || 0),
        totalSpend: money(orderStats?.totalSpend).toFixed(2),
        recentOrders: recentOrders.map((order) => ({
          ...order,
          price: money(order.price).toFixed(2),
        })),
      }),
    });
  } catch (error: any) {
    console.error("Reseller customer detail error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load customer" });
  }
});

router.patch("/customers/:id", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const resellerId = req.userId;
    const row = await getResellerCustomer(resellerId, req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const payload = resellerCustomerUpdateSchema.parse(req.body);
    if (payload.email && payload.email !== row.customer.email) {
      const existing = await storage.getUserByEmail(payload.email);
      if (existing && existing.id !== row.customer.id) {
        return res.status(409).json({ success: false, message: "A customer with this email already exists" });
      }
    }

    const customer = await storage.updateUser(row.customer.id, {
      email: payload.email,
      name: payload.name,
      phone: payload.phone,
      address: payload.address,
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    await db
      .update(resellerCustomerLinks)
      .set({ updatedAt: new Date() })
      .where(and(
        eq(resellerCustomerLinks.resellerId, resellerId),
        eq(resellerCustomerLinks.customerId, customer.id),
      ));

    return res.json({
      success: true,
      message: "Customer updated successfully",
      data: resellerCustomerResponse(customer, { linkedAt: row.linkedAt }),
    });
  } catch (error: any) {
    console.error("Reseller customer update error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update customer" });
  }
});

router.patch("/customers/:id/password", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const row = await getResellerCustomer(req.userId, req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const { password } = resellerCustomerPasswordSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(password, 10);
    const customer = await storage.updateUser(row.customer.id, {
      hashedPassword,
      passwordSetAt: new Date(),
    });

    return res.json({
      success: true,
      message: "Password changed successfully",
      data: customer ? resellerCustomerResponse(customer) : null,
    });
  } catch (error: any) {
    console.error("Reseller customer password error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to change password" });
  }
});

router.patch("/customers/:id/status", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const row = await getResellerCustomer(req.userId, req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const { status } = resellerCustomerStatusSchema.parse(req.body);
    const customer = await storage.updateUser(
      row.customer.id,
      status === "active"
        ? { isBlocked: false, isDeleted: false }
        : { isBlocked: true },
    );

    return res.json({
      success: true,
      message: status === "active" ? "Customer activated successfully" : "Customer deactivated successfully",
      data: customer ? resellerCustomerResponse(customer) : null,
    });
  } catch (error: any) {
    console.error("Reseller customer status error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update customer status" });
  }
});

router.post("/customers/:id/balance", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const resellerId = req.userId;
    const row = await getResellerCustomer(resellerId, req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    if (row.customer.isDeleted) {
      return res.status(400).json({ success: false, message: "Cannot add funds to a deleted customer" });
    }

    const { amount, description } = resellerCustomerBalanceSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const [updatedReseller] = await tx
        .update(users)
        .set({
          walletBalance: sql`${users.walletBalance}::numeric - ${amount}`,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, resellerId), sql`${users.walletBalance}::numeric >= ${amount}`))
        .returning();

      if (!updatedReseller) {
        throw new Error("INSUFFICIENT_RESELLER_BALANCE");
      }

      const resellerBalanceAfter = money(updatedReseller.walletBalance);
      const resellerBalanceBefore = resellerBalanceAfter + amount;

      const [updatedCustomer] = await tx
        .update(users)
        .set({
          walletBalance: sql`${users.walletBalance}::numeric + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, row.customer.id))
        .returning();

      const customerBalanceAfter = money(updatedCustomer.walletBalance);
      const customerBalanceBefore = customerBalanceAfter - amount;

      const note = description || `Wallet funds added by reseller ${req.reseller.email}`;

      await tx.insert(walletTransactions).values({
        userId: resellerId,
        type: "adjustment",
        status: "completed",
        amount: amount.toFixed(2),
        currency: "USD",
        balanceBefore: resellerBalanceBefore.toFixed(2),
        balanceAfter: resellerBalanceAfter.toFixed(2),
        provider: "reseller",
        description: `Customer wallet credit: ${row.customer.email}`,
        metadata: {
          action: "reseller_customer_wallet_credit_debit",
          customerId: row.customer.id,
          customerEmail: row.customer.email,
          description: note,
        },
        completedAt: new Date(),
      });

      const [customerTransaction] = await tx.insert(walletTransactions).values({
        userId: row.customer.id,
        type: "adjustment",
        status: "completed",
        amount: amount.toFixed(2),
        currency: "USD",
        balanceBefore: customerBalanceBefore.toFixed(2),
        balanceAfter: customerBalanceAfter.toFixed(2),
        provider: "reseller",
        description: note,
        metadata: {
          action: "reseller_customer_wallet_credit",
          resellerId,
          resellerEmail: req.reseller.email,
        },
        completedAt: new Date(),
      }).returning();

      return {
        customer: updatedCustomer,
        resellerBalance: resellerBalanceAfter.toFixed(2),
        transaction: customerTransaction,
      };
    });

    try {
      await storage.createNotification({
        userId: row.customer.id,
        type: "wallet",
        title: "Wallet balance updated",
        message: `$${amount.toFixed(2)} has been added to your wallet.`,
        read: false,
        metadata: { resellerId, amount: amount.toFixed(2) },
      });
    } catch {
      // Notification failure should not roll back the completed wallet transfer.
    }

    return res.json({
      success: true,
      message: "Customer wallet funded successfully",
      data: {
        customer: resellerCustomerResponse(result.customer),
        resellerBalance: result.resellerBalance,
        transaction: result.transaction,
      },
    });
  } catch (error: any) {
    if (error.message === "INSUFFICIENT_RESELLER_BALANCE") {
      return res.status(400).json({ success: false, message: "Insufficient reseller wallet balance" });
    }
    console.error("Reseller customer balance error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to add wallet funds" });
  }
});

router.post("/customers/:id/apply-package", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  let createdOrderId: string | null = null;
  let debitedAmount = 0;

  try {
    const resellerId = req.userId;
    const { packageId, sendEmail: shouldSendEmail } = resellerCustomerApplyPackageSchema.parse(req.body);
    const row = await getResellerCustomer(resellerId, req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    if (row.customer.isDeleted || row.customer.isBlocked) {
      return res.status(400).json({ success: false, message: "Cannot apply a package to an inactive customer" });
    }

    const pkg = await storage.getUnifiedPackageById(packageId);
    if (!pkg || !pkg.isEnabled) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    const provider = await storage.getProviderById(pkg.providerId);
    if (!provider || !provider.enabled) {
      return res.status(400).json({ success: false, message: "Package provider is disabled" });
    }

    const availability = await getProviderAvailabilityForReseller(resellerId, provider.id);
    if (!availability.available) {
      return res.status(400).json({ success: false, message: availability.message || "Provider is not available" });
    }

    const [customPrice] = await db
      .select()
      .from(resellerPackagePrices)
      .where(and(
        eq(resellerPackagePrices.resellerId, resellerId),
        eq(resellerPackagePrices.packageId, pkg.id),
      ))
      .limit(1);

    if (customPrice?.isEnabled === false) {
      return res.status(400).json({ success: false, message: "This package is disabled in your reseller catalog" });
    }

    const assignedRatePrice = await getAssignedRatePriceForPackage(resellerId, pkg.id);
    if (assignedRatePrice?.isEnabled === false) {
      return res.status(400).json({ success: false, message: "This package is disabled by your assigned rate profile" });
    }

    const retailPricing = resellerRetailPricing(pkg, customPrice, assignedRatePrice);
    const resellerCost = retailPricing.cost;
    const providerCost = money(pkg.wholesalePrice);
    const sellingPrice = retailPricing.sellingPrice;
    if (resellerCost <= 0) {
      return res.status(400).json({ success: false, message: "Package reseller cost is not configured" });
    }

    debitedAmount = resellerCost;

    const debitResult = await db.transaction(async (tx) => {
      const [updatedReseller] = await tx
        .update(users)
        .set({
          walletBalance: sql`${users.walletBalance}::numeric - ${resellerCost}`,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, resellerId), sql`${users.walletBalance}::numeric >= ${resellerCost}`))
        .returning();

      if (!updatedReseller) {
        throw new Error("INSUFFICIENT_RESELLER_BALANCE");
      }

      const [order] = await tx.insert(orders).values({
        userId: row.customer.id,
        packageId: pkg.id,
        providerId: provider.id,
        resellerId,
        orderType: "single",
        quantity: 1,
        status: "processing",
        price: sellingPrice.toFixed(2),
        airaloPrice: providerCost.toFixed(2),
        wholesalePrice: resellerCost.toFixed(2),
        currency: pkg.currency || "USD",
        orderCurrency: pkg.currency || "USD",
        dataAmount: pkg.dataAmount,
        validity: pkg.validity,
        installationSent: false,
        paymentMethod: "reseller_wallet",
        orderSource: "reseller",
      }).returning();

      const balanceAfter = money(updatedReseller.walletBalance);
      const balanceBefore = balanceAfter + resellerCost;

      await tx.insert(walletTransactions).values({
        userId: resellerId,
        type: "purchase_debit",
        status: "completed",
        amount: resellerCost.toFixed(2),
        currency: "USD",
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        provider: "reseller",
        referenceId: order.id,
        description: `Applied ${pkg.title || pkg.dataAmount} to ${row.customer.email}`,
        metadata: {
          action: "reseller_apply_package",
          orderId: order.id,
          customerId: row.customer.id,
          customerEmail: row.customer.email,
          packageId: pkg.id,
          sellingPrice: sellingPrice.toFixed(2),
          resellerCost: resellerCost.toFixed(2),
        },
        completedAt: new Date(),
      });

      return {
        order,
        resellerBalance: balanceAfter.toFixed(2),
      };
    });

    createdOrderId = debitResult.order.id;

    const providerService = providerFactory.getService(provider);
    const orderResponse = await providerService.createOrder({
      packageId: pkg.slug,
      quantity: 1,
      customerRef: `Reseller package ${debitResult.order.id} for ${row.customer.email}`,
      customerEmail: row.customer.email,
    });

    if (!orderResponse.success) {
      await storage.updateOrder(debitResult.order.id, {
        status: "failed",
        failureReason: orderResponse.errorMessage || "Provider order failed",
      });
      await refundResellerWallet(
        resellerId,
        resellerCost,
        `Refund for failed package application to ${row.customer.email}`,
        { orderId: debitResult.order.id, packageId: pkg.id, customerId: row.customer.id },
      );
      return res.status(400).json({
        success: false,
        message: orderResponse.errorMessage || "Failed to provision package",
      });
    }

    const updatedOrder = await storage.updateOrder(debitResult.order.id, {
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
          name: row.customer.name || "Traveler",
          packageName: `${destination?.name ? `${destination.name} ` : ""}${pkg.dataAmount} - ${pkg.validity} Days`,
          qrCodeUrl: orderResponse.qrCodeUrl,
          iccid: orderResponse.iccid,
          activationCode: orderResponse.activationCode || "",
          smdpAddress: orderResponse.smdpAddress || "",
        });

        await sendEmail({
          to: row.customer.email,
          subject: installEmail.subject,
          html: installEmail.html,
          ...resellerEmailOptions(req.reseller),
        });

        await storage.updateOrder(debitResult.order.id, { installationSent: true });
        installationSent = true;
      } catch (emailError: any) {
        console.warn("Failed to send reseller-applied package email", emailError.message);
      }
    }

    try {
      await storage.createNotification({
        userId: row.customer.id,
        type: "purchase",
        title: "Package added to your account",
        message: `${pkg.title || pkg.dataAmount} has been added to your account.`,
        read: false,
        metadata: { orderId: debitResult.order.id, packageId: pkg.id, resellerId },
      });
    } catch {
      // Notification failure should not block package fulfillment.
    }

    return res.status(201).json({
      success: true,
      message: "Package applied successfully",
      data: {
        order: { ...updatedOrder, installationSent },
        resellerBalance: debitResult.resellerBalance,
      },
    });
  } catch (error: any) {
    if (error.message === "INSUFFICIENT_RESELLER_BALANCE") {
      return res.status(400).json({ success: false, message: "Insufficient reseller wallet balance" });
    }
    if (createdOrderId && debitedAmount > 0) {
      await refundResellerWallet(
        req.userId,
        debitedAmount,
        "Refund for failed package application",
        { orderId: createdOrderId, customerId: req.params.id },
      );
    }
    console.error("Reseller customer apply package error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to apply package" });
  }
});

router.post("/customers/:id/reminder", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const resellerId = req.userId;
    const { type } = resellerCustomerReminderSchema.parse(req.body);
    const row = await getResellerCustomer(resellerId, req.params.id);

    if (!row) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    if (row.customer.isDeleted) {
      return res.status(400).json({ success: false, message: "Cannot send reminders to a deleted customer" });
    }

    const customerName = row.customer.name || "Customer";
    const storeName = req.reseller.resellerStoreName || req.reseller.name || "AYA eSIM";
    let subject = "";
    let message = "";
    let notificationTitle = "";
    let notificationMessage = "";

    if (type === "kyc") {
      const kycStatus = String(row.customer.kycStatus || "").toLowerCase();
      if (["approved", "verified"].includes(kycStatus)) {
        return res.status(400).json({ success: false, message: "Customer KYC is already verified" });
      }

      const kycUrl = buildCustomerAccountUrl(req, "/account/kyc");
      subject = "KYC Verification Reminder";
      message = [
        `This is a reminder from ${storeName} to complete your KYC verification.`,
        "Please submit or update your identity verification documents so your account remains ready for all eligible services.",
        `Complete KYC here: ${kycUrl}`,
      ].join("\n\n");
      notificationTitle = "KYC verification reminder";
      notificationMessage = "Please complete your KYC verification.";
    } else {
      const balance = money(row.customer.walletBalance);
      if (balance >= 0) {
        return res.status(400).json({ success: false, message: "Customer wallet balance is not negative" });
      }

      const walletUrl = buildCustomerAccountUrl(req, "/account/wallet");
      subject = "Wallet Balance Reminder";
      message = [
        `This is a reminder from ${storeName} that your wallet balance is currently ${balance.toFixed(2)} USD.`,
        "Please add funds to your wallet to keep your account in good standing.",
        `Open your wallet here: ${walletUrl}`,
      ].join("\n\n");
      notificationTitle = "Wallet balance reminder";
      notificationMessage = "Your wallet balance is negative. Please add funds.";
    }

    const emailContent = await generateCustomNotificationEmail(subject, message, customerName, row.customer.email);
    await sendEmail({
      to: row.customer.email,
      subject: emailContent.subject,
      html: emailContent.html,
      ...resellerEmailOptions(req.reseller),
    });

    try {
      await storage.createNotification({
        userId: row.customer.id,
        type: type === "kyc" ? "kyc" : "wallet",
        title: notificationTitle,
        message: notificationMessage,
        read: false,
        metadata: { resellerId, reminderType: type },
      });
    } catch {
      // Notification failure should not block email reminders.
    }

    return res.json({
      success: true,
      message: type === "kyc" ? "KYC reminder email sent" : "Balance reminder email sent",
      data: { type, customerId: row.customer.id },
    });
  } catch (error: any) {
    console.error("Reseller customer reminder error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to send reminder" });
  }
});

router.get("/push-notifications/settings", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const senderRole = req.reseller?.role === "agent" ? "agent" : "reseller";
    const enabled = await isPushNotificationModuleEnabled(req.userId, senderRole);
    const settings = await getPushNotificationSettings();

    return res.json({
      success: true,
      data: {
        enabled,
        role: senderRole,
        pricing: settings[senderRole],
      },
    });
  } catch (error: any) {
    console.error("Push notification settings error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load push notification settings" });
  }
});

router.post("/push-notifications/send", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const senderRole = (req.reseller?.role === "agent" ? "agent" : "reseller") as PushSenderType;
    const enabled = await isPushNotificationModuleEnabled(req.userId, senderRole);
    if (!enabled) {
      return res.status(403).json({ success: false, message: "Push Notifications module is disabled for this account" });
    }

    const payload = resellerPushNotificationSchema.parse(req.body);
    const result = await sendPushCampaign({
      sender: { id: req.userId, type: senderRole },
      title: payload.title,
      message: payload.message,
      audience: payload.audience as PushAudience,
      recipientUserId: payload.recipientUserId,
      sendPush: payload.sendPush,
      sendInApp: payload.sendInApp,
      metadata: { channel: "reseller_push_notification" },
    });

    return res.json({
      success: true,
      message: "Push notification sent",
      data: result,
    });
  } catch (error: any) {
    const message =
      error?.message === "INSUFFICIENT_PUSH_NOTIFICATION_BALANCE"
        ? "Insufficient wallet balance for this push notification campaign"
        : error.message || "Failed to send push notification";
    console.error("Reseller push notification error:", error);
    return res.status(400).json({ success: false, message });
  }
});

router.delete("/customers/:id", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const row = await getResellerCustomer(req.userId, req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    await storage.deleteUser(row.customer.id);

    return res.json({
      success: true,
      message: "Customer deleted successfully",
      data: { id: row.customer.id, isDeleted: true },
    });
  } catch (error: any) {
    console.error("Reseller customer delete error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to delete customer" });
  }
});

router.get("/stats", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const userId = req.userId;
    const reseller = req.reseller;
    const resellerOrderCondition = or(eq(orders.userId, userId), eq(orders.resellerId, userId));
    const orderResellerId = sql<string>`COALESCE(${orders.resellerId}, ${orders.userId})`;
    await ensureResellerCustomerLinksTable();

    const [orderStats] = await db
      .select({
        totalOrders: count(),
        completedOrders: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'completed')`.mapWith(Number),
        totalEsims: sql<number>`COALESCE(SUM(${orders.quantity}), 0)`.mapWith(Number),
        totalSpend: sql<string>`COALESCE(SUM(${orders.price}::numeric * ${orders.quantity}), 0)`,
        estimatedSavings: sql<string>`COALESCE(SUM(GREATEST((${unifiedPackages.retailPrice}::numeric - ${orders.price}::numeric), 0) * ${orders.quantity}), 0)`,
        totalProfit: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} = 'completed' THEN (
          COALESCE(${orders.price}::numeric, 0)
          - COALESCE(${orders.wholesalePrice}::numeric, ${unifiedPackages.resellerPrice}::numeric, ${unifiedPackages.retailPrice}::numeric, ${unifiedPackages.wholesalePrice}::numeric, ${orders.price}::numeric, 0)
        ) * ${orders.quantity} ELSE 0 END), 0)`,
      })
      .from(orders)
      .leftJoin(unifiedPackages, eq(orders.packageId, unifiedPackages.id))
      .leftJoin(
        resellerPackagePrices,
        and(
          eq(resellerPackagePrices.packageId, orders.packageId),
          eq(resellerPackagePrices.resellerId, orderResellerId),
        ),
      )
      .where(resellerOrderCondition);

    const [walletStats] = await db
      .select({
        totalCredits: sql<string>`COALESCE(SUM(CASE WHEN ${walletTransactions.status} = 'completed' AND ${walletTransactions.type} IN ('payment_topup', 'voucher_redeem', 'refund', 'adjustment') THEN ${walletTransactions.amount}::numeric ELSE 0 END), 0)`,
        totalDebits: sql<string>`COALESCE(SUM(CASE WHEN ${walletTransactions.status} = 'completed' AND ${walletTransactions.type} IN ('purchase_debit', 'voucher_debit', 'refund_debit') THEN ${walletTransactions.amount}::numeric ELSE 0 END), 0)`,
        topupCount: sql<number>`COUNT(*) FILTER (WHERE ${walletTransactions.status} = 'completed' AND ${walletTransactions.type} IN ('payment_topup', 'voucher_redeem'))`.mapWith(Number),
      })
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId));

    const [voucherStats] = await db
      .select({
        generatedVouchers: count(),
        activeVoucherValue: sql<string>`COALESCE(SUM(CASE WHEN ${voucherCodes.status} = 'active' AND (${voucherCodes.maxUses} IS NULL OR ${voucherCodes.currentUses} < ${voucherCodes.maxUses}) THEN ${voucherCodes.value}::numeric ELSE 0 END), 0)`,
        redeemedVoucherValue: sql<string>`COALESCE(SUM(${voucherCodes.value}::numeric * ${voucherCodes.currentUses}), 0)`,
      })
      .from(voucherCodes)
      .where(eq(voucherCodes.createdByUser, userId));

    const monthlySpend = await db
      .select({
        month: sql<string>`TO_CHAR(DATE_TRUNC('month', ${orders.createdAt}), 'Mon YYYY')`,
        spend: sql<string>`COALESCE(SUM(${orders.price}::numeric * ${orders.quantity}), 0)`,
        orders: count(),
      })
      .from(orders)
      .where(resellerOrderCondition)
      .groupBy(sql`DATE_TRUNC('month', ${orders.createdAt})`)
      .orderBy(sql`DATE_TRUNC('month', ${orders.createdAt})`)
      .limit(6);

    const customerRoleRows = await db
      .select({
        role: users.role,
        total: count(),
      })
      .from(resellerCustomerLinks)
      .innerJoin(users, eq(resellerCustomerLinks.customerId, users.id))
      .where(eq(resellerCustomerLinks.resellerId, userId))
      .groupBy(users.role);

    const ordersByStatus = await db
      .select({
        status: orders.status,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(orders)
      .where(resellerOrderCondition)
      .groupBy(orders.status)
      .orderBy(desc(sql`COUNT(*)`));

    const topDestinations = await db
      .select({
        country: destinations.name,
        iso2: sql<string>`UPPER(COALESCE(${destinations.countryCode}, ''))`,
        count: sql<number>`COUNT(*)::int`,
        revenue: sql<string>`COALESCE(SUM(${orders.price}::numeric * ${orders.quantity}), 0)`,
      })
      .from(orders)
      .leftJoin(unifiedPackages, eq(orders.packageId, unifiedPackages.id))
      .leftJoin(destinations, eq(unifiedPackages.destinationId, destinations.id))
      .where(resellerOrderCondition)
      .groupBy(destinations.name, destinations.countryCode)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(7);

    const ordersByCountry = await db
      .select({
        country: destinations.name,
        iso2: sql<string>`UPPER(COALESCE(${destinations.countryCode}, ''))`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(orders)
      .leftJoin(unifiedPackages, eq(orders.packageId, unifiedPackages.id))
      .leftJoin(destinations, eq(unifiedPackages.destinationId, destinations.id))
      .where(resellerOrderCondition)
      .groupBy(destinations.name, destinations.countryCode);

    const recentOrders = await db
      .select({
        id: orders.id,
        displayOrderId: orders.displayOrderId,
        packageTitle: unifiedPackages.title,
        destinationName: destinations.name,
        userEmail: users.email,
        customerName: users.name,
        dataAmount: orders.dataAmount,
        validity: orders.validity,
        price: orders.price,
        quantity: orders.quantity,
        status: orders.status,
        createdAt: orders.createdAt,
        resellerId: orders.resellerId,
        storefrontHost: orders.storefrontHost,
      })
      .from(orders)
      .leftJoin(unifiedPackages, eq(orders.packageId, unifiedPackages.id))
      .leftJoin(destinations, eq(unifiedPackages.destinationId, destinations.id))
      .leftJoin(users, eq(orders.userId, users.id))
      .where(resellerOrderCondition)
      .orderBy(desc(orders.createdAt))
      .limit(10);

    const recentTransactions = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(8);

    const recommendedPackages = await db
      .select({
        id: unifiedPackages.id,
        slug: unifiedPackages.slug,
        title: unifiedPackages.title,
        dataAmount: unifiedPackages.dataAmount,
        validity: unifiedPackages.validity,
        retailPrice: unifiedPackages.retailPrice,
        resellerPrice: unifiedPackages.resellerPrice,
        destinationName: destinations.name,
        countryCode: destinations.countryCode,
      })
      .from(unifiedPackages)
      .leftJoin(destinations, eq(unifiedPackages.destinationId, destinations.id))
      .where(eq(unifiedPackages.isEnabled, true))
      .orderBy(desc(unifiedPackages.updatedAt))
      .limit(6);

    const customerRoleCounts = customerRoleRows.reduce((acc, row) => {
      acc[String(row.role || "customer")] = Number(row.total || 0);
      return acc;
    }, {} as Record<string, number>);
    const totalCustomers = Object.values(customerRoleCounts).reduce((sum, value) => sum + value, 0);
    const customerTypeStats = {
      customer: {
        total: customerRoleCounts.customer || 0,
        totalProfit: money(orderStats?.totalProfit),
      },
      agent: {
        total: customerRoleCounts.agent || 0,
        totalProfit: 0,
      },
      reseller: {
        total: customerRoleCounts.reseller || 0,
        totalProfit: 0,
      },
    };

    return res.json({
      success: true,
      data: {
        reseller: {
          id: reseller.id,
          email: reseller.email,
          name: reseller.name,
          role: reseller.role,
          walletBalance: reseller.walletBalance || "0.00",
        },
        totals: {
          totalOrders: Number(orderStats?.totalOrders || 0),
          completedOrders: Number(orderStats?.completedOrders || 0),
          totalEsims: Number(orderStats?.totalEsims || 0),
          totalSpend: money(orderStats?.totalSpend),
          estimatedSavings: money(orderStats?.estimatedSavings),
          totalProfit: money(orderStats?.totalProfit),
          walletBalance: money(reseller.walletBalance),
          walletCredits: money(walletStats?.totalCredits),
          walletDebits: money(walletStats?.totalDebits),
          walletTopupCount: Number(walletStats?.topupCount || 0),
          generatedVouchers: Number(voucherStats?.generatedVouchers || 0),
          activeVoucherValue: money(voucherStats?.activeVoucherValue),
          redeemedVoucherValue: money(voucherStats?.redeemedVoucherValue),
        },
        monthlySpend: monthlySpend.map((item) => ({
          month: item.month,
          spend: money(item.spend),
          orders: Number(item.orders || 0),
        })),
        totalCustomers,
        customerTypeStats,
        ordersByStatus: ordersByStatus.map((item) => ({
          status: item.status || "pending",
          count: Number(item.count || 0),
        })),
        topDestinations: topDestinations
          .filter((item) => item.country)
          .map((item) => ({
            country: item.country,
            iso2: item.iso2,
            count: Number(item.count || 0),
            revenue: money(item.revenue),
          })),
        ordersByCountry: ordersByCountry
          .filter((item) => item.country && item.iso2)
          .map((item) => ({
            country: item.country,
            iso2: item.iso2,
            count: Number(item.count || 0),
          })),
        recentOrders: recentOrders.map((order) => ({
          ...order,
          price: money(order.price),
        })),
        latestOrders: recentOrders.map((order) => ({
          ...order,
          price: money(order.price),
        })),
        recentTransactions: recentTransactions.map((transaction) => ({
          ...transaction,
          amount: money(transaction.amount),
          balanceAfter: money(transaction.balanceAfter),
        })),
        recommendedPackages: recommendedPackages.map((pkg) => {
          const resellerPrice = money(pkg.resellerPrice || pkg.retailPrice);
          const retailPrice = money(pkg.retailPrice);
          return {
            ...pkg,
            resellerPrice,
            retailPrice,
            savings: Math.max(0, retailPrice - resellerPrice),
          };
        }),
      },
    });
  } catch (error: any) {
    console.error("Reseller stats error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load reseller dashboard" });
  }
});

router.get("/esim-orders", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const userId = req.userId;
    const limit = Math.min(Math.max(Number(req.query.limit || 500), 1), 1000);
    const resellerOrderCondition = or(eq(orders.userId, userId), eq(orders.resellerId, userId));

    const rows = await db
      .select({
        id: orders.id,
        displayOrderId: orders.displayOrderId,
        packageId: orders.packageId,
        packageTitle: unifiedPackages.title,
        destinationName: destinations.name,
        customerEmail: users.email,
        customerName: users.name,
        dataAmount: orders.dataAmount,
        validity: orders.validity,
        price: orders.price,
        wholesalePrice: orders.wholesalePrice,
        quantity: orders.quantity,
        status: orders.status,
        packageEnabled: unifiedPackages.isEnabled,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .leftJoin(unifiedPackages, eq(orders.packageId, unifiedPackages.id))
      .leftJoin(destinations, eq(unifiedPackages.destinationId, destinations.id))
      .leftJoin(users, eq(orders.userId, users.id))
      .where(resellerOrderCondition)
      .orderBy(desc(orders.createdAt))
      .limit(limit);

    return res.json({
      success: true,
      data: {
        orders: rows.map((order) => {
          const unitPrice = money(order.price);
          const unitCost = money(order.wholesalePrice);
          const quantity = Number(order.quantity || 1);
          return {
            ...order,
            price: unitPrice,
            wholesalePrice: unitCost,
            totalPrice: money(unitPrice * quantity),
            profit: money((unitPrice - unitCost) * quantity),
            quantity,
            packageStatus: order.packageEnabled ? "active" : "inactive",
          };
        }),
      },
    });
  } catch (error: any) {
    console.error("Reseller eSIM order logs error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load eSIM order logs" });
  }
});

router.get("/prices", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const userId = req.userId;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const offset = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "all");
    const providerFilter = String(req.query.providerId || "all").trim();
    const sort = String(req.query.sort || "name").trim();

    const providerSettingsJoin = and(
      eq(resellerProviderSettings.providerId, unifiedPackages.providerId),
      eq(resellerProviderSettings.resellerId, userId),
    );
    const rateAssignmentJoin = eq(rateTableAssignments.userId, userId);
    const assignedRatePriceJoin = and(
      eq(rateTablePrices.rateTableId, rateTableAssignments.rateTableId),
      eq(rateTablePrices.packageId, unifiedPackages.id),
    );
    const providerEnabledForReseller = sql`COALESCE(${resellerProviderSettings.isEnabled}, true) = true`;
    const assignedRateEnabled = sql`COALESCE(${rateTablePrices.isEnabled}, true) = true`;
    const whereClauses: any[] = [
      eq(providers.enabled, true),
      eq(unifiedPackages.isEnabled, true),
      providerEnabledForReseller,
    ];
    if (search) {
      const searchTerm = `%${search}%`;
      const aliasProviderClauses = resellerProviderAliasSlugsForSearch(search).map((slug) =>
        eq(providers.slug, slug),
      );
      whereClauses.push(
        or(
          ilike(unifiedPackages.title, searchTerm),
          ilike(unifiedPackages.slug, searchTerm),
          ilike(providers.name, searchTerm),
          ilike(destinations.name, searchTerm),
          ilike(regions.name, searchTerm),
          ...aliasProviderClauses,
        ),
      );
    }
    if (providerFilter && providerFilter !== "all") {
      whereClauses.push(eq(unifiedPackages.providerId, providerFilter));
    }
    if (status === "active") {
      whereClauses.push(
        and(
          sql`COALESCE(${resellerPackagePrices.isEnabled}, true) = true`,
          assignedRateEnabled,
        ),
      );
    } else if (status === "disabled") {
      whereClauses.push(
        or(
          eq(resellerPackagePrices.isEnabled, false),
          eq(rateTablePrices.isEnabled, false),
        ),
      );
    }

    const whereCondition = and(...whereClauses);

    const statsQuery = db
      .select({
        totalPackages: sql<number>`COUNT(*)::int`,
        activePackages: sql<number>`COUNT(*) FILTER (WHERE ${unifiedPackages.isEnabled} = true AND ${providers.enabled} = true AND COALESCE(${resellerPackagePrices.isEnabled}, true) = true AND COALESCE(${rateTablePrices.isEnabled}, true) = true)::int`,
        disabledPackages: sql<number>`COUNT(*) FILTER (WHERE COALESCE(${resellerPackagePrices.isEnabled}, true) = false OR COALESCE(${rateTablePrices.isEnabled}, true) = false)::int`,
        customPrices: sql<number>`COUNT(${resellerPackagePrices.id})::int`,
      })
      .from(unifiedPackages)
      .leftJoin(providers, eq(unifiedPackages.providerId, providers.id))
      .leftJoin(resellerProviderSettings, providerSettingsJoin)
      .leftJoin(rateTableAssignments, rateAssignmentJoin)
      .leftJoin(rateTablePrices, assignedRatePriceJoin)
      .leftJoin(
        resellerPackagePrices,
        and(
          eq(resellerPackagePrices.packageId, unifiedPackages.id),
          eq(resellerPackagePrices.resellerId, userId),
        ),
      )
      .where(and(eq(providers.enabled, true), eq(unifiedPackages.isEnabled, true), providerEnabledForReseller));

    const countQuery = db
      .select({ total: sql<number>`count(*)::int` })
      .from(unifiedPackages)
      .leftJoin(providers, eq(unifiedPackages.providerId, providers.id))
      .leftJoin(destinations, eq(unifiedPackages.destinationId, destinations.id))
      .leftJoin(regions, eq(unifiedPackages.regionId, regions.id))
      .leftJoin(resellerProviderSettings, providerSettingsJoin)
      .leftJoin(rateTableAssignments, rateAssignmentJoin)
      .leftJoin(rateTablePrices, assignedRatePriceJoin)
      .leftJoin(
        resellerPackagePrices,
        and(
          eq(resellerPackagePrices.packageId, unifiedPackages.id),
          eq(resellerPackagePrices.resellerId, userId),
        ),
      );

    countQuery.where(whereCondition);

    const [stats] = await statsQuery;
    const [{ total }] = await countQuery;

    const priceSortExpression = sql`COALESCE(${rateTablePrices.sellingPrice}::numeric, ${unifiedPackages.resellerPrice}::numeric, ${unifiedPackages.retailPrice}::numeric, ${unifiedPackages.wholesalePrice}::numeric, 0)`;
    const sortOrder =
      sort === "price-low"
        ? asc(priceSortExpression)
        : sort === "price-high"
          ? desc(priceSortExpression)
          : asc(unifiedPackages.title);

    const rowsQuery = db
      .select({
        pkg: unifiedPackages,
        providerId: providers.id,
        providerName: providers.name,
        providerSlug: providers.slug,
        providerPlatformEnabled: providers.enabled,
        destinationName: destinations.name,
        regionName: regions.name,
        providerSetting: resellerProviderSettings,
        customPrice: resellerPackagePrices,
        assignedRatePrice: rateTablePrices,
      })
      .from(unifiedPackages)
      .leftJoin(providers, eq(unifiedPackages.providerId, providers.id))
      .leftJoin(destinations, eq(unifiedPackages.destinationId, destinations.id))
      .leftJoin(regions, eq(unifiedPackages.regionId, regions.id))
      .leftJoin(resellerProviderSettings, providerSettingsJoin)
      .leftJoin(rateTableAssignments, rateAssignmentJoin)
      .leftJoin(rateTablePrices, assignedRatePriceJoin)
      .leftJoin(
        resellerPackagePrices,
        and(
          eq(resellerPackagePrices.packageId, unifiedPackages.id),
          eq(resellerPackagePrices.resellerId, userId),
        ),
      )
      .orderBy(sortOrder, asc(unifiedPackages.title))
      .limit(limit)
      .offset(offset);

    rowsQuery.where(whereCondition);

    const rows = await rowsQuery;

    const packages = rows.map(({ pkg, providerId, providerName, providerSlug, providerPlatformEnabled, destinationName, regionName, providerSetting, customPrice, assignedRatePrice }) => {
      const { cost, sellingPrice, markupPercent, retailOverride } = resellerRetailPricing(pkg, customPrice, assignedRatePrice);
      const resellerEnabled = (customPrice?.isEnabled ?? true) && (assignedRatePrice?.isEnabled ?? true);
      const providerEnabled = Boolean(providerPlatformEnabled) && (providerSetting?.isEnabled ?? true);
      const platformEnabled = Boolean(pkg.isEnabled);
      const isEnabled = platformEnabled && providerEnabled && resellerEnabled;

      return {
        packageId: pkg.id,
        slug: pkg.slug,
        title: pkg.title,
        providerId: providerId || pkg.providerId,
        providerName: resellerProviderDisplayName(providerSlug, providerName),
        providerSlug,
        destinationName,
        regionName,
        type: pkg.type,
        dataAmount: pkg.dataAmount,
        validity: pkg.validity,
        publicRetailPrice: money(pkg.retailPrice),
        wholesaleCost: cost,
        sellingPrice,
        markupPercent,
        profit: money(sellingPrice - cost),
        isEnabled,
        resellerEnabled,
        platformEnabled,
        providerEnabled,
        providerPlatformEnabled: Boolean(providerPlatformEnabled),
        isBestPrice: Boolean(pkg.isBestPrice),
        hasCustomPrice: Boolean(retailOverride),
        assignedRatePrice: assignedRatePrice?.sellingPrice ? money(assignedRatePrice.sellingPrice) : null,
        updatedAt: retailOverride?.updatedAt || assignedRatePrice?.updatedAt || pkg.updatedAt,
      };
    });

    return res.json({
      success: true,
      data: {
        packages,
        pagination: {
          page,
          limit,
          total: Number(total || 0),
          totalPages: Math.ceil(Number(total || 0) / limit),
        },
        stats: {
          totalPackages: Number(stats?.totalPackages || 0),
          activePackages: Number(stats?.activePackages || 0),
          disabledPackages: Number(stats?.disabledPackages || 0),
          customPrices: Number(stats?.customPrices || 0),
        },
      },
    });
  } catch (error: any) {
    console.error("Reseller prices error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load prices" });
  }
});

router.get("/providers", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const userId = req.userId;
    const providerRows = await db
      .select()
      .from(providers)
      .where(eq(providers.enabled, true))
      .orderBy(asc(providers.name));

    const settingsRows = await db
      .select()
      .from(resellerProviderSettings)
      .where(eq(resellerProviderSettings.resellerId, userId));
    const settingsByProvider = new Map(settingsRows.map((setting) => [setting.providerId, setting]));

    const providerSummaries = await Promise.all(
      providerRows.map(async (provider) => {
        const setting = settingsByProvider.get(provider.id);
        const isEnabled = setting?.isEnabled ?? true;
        if (!isEnabled) return null;

        const [stats] = await db
          .select({
            totalPackages: sql<number>`COUNT(*) FILTER (WHERE ${unifiedPackages.isEnabled} = true)::int`,
            activePackages: sql<number>`COUNT(*) FILTER (WHERE ${unifiedPackages.isEnabled} = true AND COALESCE(${resellerPackagePrices.isEnabled}, true) = true AND COALESCE(${rateTablePrices.isEnabled}, true) = true)::int`,
            customPrices: sql<number>`COUNT(${resellerPackagePrices.id})::int`,
            resellerPriceFrom: sql<string>`MIN(CASE WHEN ${unifiedPackages.isEnabled} = true THEN COALESCE(${rateTablePrices.sellingPrice}::numeric, ${unifiedPackages.resellerPrice}::numeric, ${unifiedPackages.retailPrice}::numeric) END)`,
          })
          .from(unifiedPackages)
          .leftJoin(rateTableAssignments, eq(rateTableAssignments.userId, userId))
          .leftJoin(
            rateTablePrices,
            and(
              eq(rateTablePrices.rateTableId, rateTableAssignments.rateTableId),
              eq(rateTablePrices.packageId, unifiedPackages.id),
            ),
          )
          .leftJoin(
            resellerPackagePrices,
            and(
              eq(resellerPackagePrices.packageId, unifiedPackages.id),
              eq(resellerPackagePrices.resellerId, userId),
            ),
          )
          .where(eq(unifiedPackages.providerId, provider.id));

        const totalPackages = Number(stats?.totalPackages || 0);
        if (totalPackages === 0) return null;

        return {
          providerId: provider.id,
          id: provider.id,
          name: resellerProviderDisplayName(provider.slug, provider.name),
          slug: provider.slug,
          isEnabled,
          platformEnabled: Boolean(provider.enabled),
          totalPackages,
          activePackages: isEnabled ? Number(stats?.activePackages || 0) : 0,
          customPrices: Number(stats?.customPrices || 0),
          resellerPriceFrom: stats?.resellerPriceFrom ? Number(stats.resellerPriceFrom).toFixed(2) : null,
          updatedAt: setting?.updatedAt || provider.updatedAt,
        };
      }),
    );
    const visibleProviderSummaries = providerSummaries.filter(Boolean);

    return res.json({
      success: true,
      data: { providers: visibleProviderSummaries },
    });
  } catch (error: any) {
    console.error("Reseller providers error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load providers" });
  }
});

router.patch("/providers/:providerId", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const userId = req.userId;
    const providerId = req.params.providerId;
    const isEnabled = normalizeBoolean(req.body.isEnabled);

    if (isEnabled === undefined) {
      return res.status(400).json({ success: false, message: "Provider status is required" });
    }

    const provider = await db.query.providers.findFirst({
      where: eq(providers.id, providerId),
    });
    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }
    if (!provider.enabled && isEnabled) {
      return res.status(400).json({ success: false, message: "This provider is disabled by admin" });
    }
    if (isEnabled) {
      const existingSetting = await db.query.resellerProviderSettings.findFirst({
        where: and(
          eq(resellerProviderSettings.resellerId, userId),
          eq(resellerProviderSettings.providerId, providerId),
        ),
      });
      if (existingSetting?.isEnabled === false) {
        return res.status(403).json({
          success: false,
          message: "This provider access is disabled by admin",
        });
      }
    }

    const now = new Date();
    await db
      .insert(resellerProviderSettings)
      .values({
        resellerId: userId,
        providerId,
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

    return res.json({
      success: true,
      message: "Provider setting updated",
      data: {
        providerId,
        isEnabled,
        platformEnabled: Boolean(provider.enabled),
      },
    });
  } catch (error: any) {
    console.error("Reseller provider update error:", error);
    return res.status(500).json({ success: false, message: error.message || "Provider update failed" });
  }
});

router.post("/prices/bulk-markup", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const userId = req.userId;
    const markupPercent = normalizePercent(req.body.markupPercent, "Markup");
    const providerSettingsJoin = and(
      eq(resellerProviderSettings.providerId, unifiedPackages.providerId),
      eq(resellerProviderSettings.resellerId, userId),
    );
    const assignedRatePriceJoin = and(
      eq(rateTablePrices.rateTableId, rateTableAssignments.rateTableId),
      eq(rateTablePrices.packageId, unifiedPackages.id),
    );

    const packages = await db
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
      .leftJoin(rateTableAssignments, eq(rateTableAssignments.userId, userId))
      .leftJoin(rateTablePrices, assignedRatePriceJoin)
      .where(and(
        eq(providers.enabled, true),
        eq(unifiedPackages.isEnabled, true),
        sql`COALESCE(${resellerProviderSettings.isEnabled}, true) = true`,
        sql`COALESCE(${rateTablePrices.isEnabled}, true) = true`,
      ));

    const now = new Date();
    for (const pkg of packages) {
      const cost = assignedResellerCost(pkg, pkg.assignedRatePrice);
      const sellingPrice = money(cost * (1 + markupPercent / 100)).toFixed(2);
      await db
        .insert(resellerPackagePrices)
        .values({
          resellerId: userId,
          packageId: pkg.id,
          sellingPrice,
          markupPercent: markupPercent.toFixed(2),
          isEnabled: true,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [resellerPackagePrices.resellerId, resellerPackagePrices.packageId],
          set: {
            sellingPrice,
            markupPercent: markupPercent.toFixed(2),
            updatedAt: now,
          },
        });
    }

    return res.json({
      success: true,
      message: "Package prices updated successfully",
      data: { updated: packages.length, markupPercent },
    });
  } catch (error: any) {
    console.error("Reseller bulk pricing error:", error);
    return res.status(500).json({ success: false, message: error.message || "Bulk pricing failed" });
  }
});

router.post("/prices/bulk-status", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const userId = req.userId;
    const isEnabled = normalizeBoolean(req.body.isEnabled);

    if (isEnabled === undefined) {
      return res.status(400).json({ success: false, message: "Package status is required" });
    }

    const providerSettingsJoin = and(
      eq(resellerProviderSettings.providerId, unifiedPackages.providerId),
      eq(resellerProviderSettings.resellerId, userId),
    );
    const assignedRatePriceJoin = and(
      eq(rateTablePrices.rateTableId, rateTableAssignments.rateTableId),
      eq(rateTablePrices.packageId, unifiedPackages.id),
    );
    const packageAvailabilityClauses = [
      eq(providers.enabled, true),
      eq(unifiedPackages.isEnabled, true),
      sql`COALESCE(${resellerProviderSettings.isEnabled}, true) = true`,
      sql`COALESCE(${rateTablePrices.isEnabled}, true) = true`,
    ];

    const packages = await db
      .select({
        id: unifiedPackages.id,
        resellerPrice: unifiedPackages.resellerPrice,
        retailPrice: unifiedPackages.retailPrice,
        wholesalePrice: unifiedPackages.wholesalePrice,
        customPrice: resellerPackagePrices,
        assignedRatePrice: rateTablePrices,
      })
      .from(unifiedPackages)
      .leftJoin(providers, eq(unifiedPackages.providerId, providers.id))
      .leftJoin(resellerProviderSettings, providerSettingsJoin)
      .leftJoin(rateTableAssignments, eq(rateTableAssignments.userId, userId))
      .leftJoin(rateTablePrices, assignedRatePriceJoin)
      .leftJoin(
        resellerPackagePrices,
        and(
          eq(resellerPackagePrices.packageId, unifiedPackages.id),
          eq(resellerPackagePrices.resellerId, userId),
        ),
      )
      .where(and(...packageAvailabilityClauses));

    const now = new Date();
    for (const pkg of packages) {
      const { cost, sellingPrice } = resellerRetailPricing(pkg, pkg.customPrice, pkg.assignedRatePrice);
      const finalSellingPrice = money(pkg.customPrice?.sellingPrice || sellingPrice || cost).toFixed(2);
      const markupPercent = calculateMarkupPercent(cost, Number(finalSellingPrice));

      await db
        .insert(resellerPackagePrices)
        .values({
          resellerId: userId,
          packageId: pkg.id,
          sellingPrice: finalSellingPrice,
          markupPercent,
          isEnabled,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [resellerPackagePrices.resellerId, resellerPackagePrices.packageId],
          set: {
            sellingPrice: finalSellingPrice,
            markupPercent,
            isEnabled,
            updatedAt: now,
          },
        });
    }

    return res.json({
      success: true,
      message: isEnabled ? "All packages enabled" : "All packages disabled",
      data: { updated: packages.length, isEnabled },
    });
  } catch (error: any) {
    console.error("Reseller bulk package status error:", error);
    return res.status(500).json({ success: false, message: error.message || "Bulk package status update failed" });
  }
});

router.patch("/prices/:packageId", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const userId = req.userId;
    const packageId = req.params.packageId;
    const hasSellingPrice = req.body.sellingPrice !== undefined;
    const sellingPrice = hasSellingPrice
      ? normalizeMoneyInput(req.body.sellingPrice, "Retail selling price")
      : undefined;
    const isEnabled = normalizeBoolean(req.body.isEnabled);

    if (hasSellingPrice && !sellingPrice) {
      return res.status(400).json({ success: false, message: "Retail selling price is required" });
    }
    if (sellingPrice === undefined && isEnabled === undefined) {
      return res.status(400).json({ success: false, message: "Enter a retail selling price or package status" });
    }

    const pkg = await db.query.unifiedPackages.findFirst({
      where: eq(unifiedPackages.id, packageId),
    });
    if (!pkg) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }
    if (!pkg.isEnabled) {
      return res.status(400).json({ success: false, message: "This package is disabled by admin" });
    }

    const providerAvailability = await getProviderAvailabilityForReseller(userId, pkg.providerId);
    if (!providerAvailability.available) {
      return res.status(400).json({
        success: false,
        message: providerAvailability.message || "Package provider is not available",
      });
    }

    const assignedRatePrice = await getAssignedRatePriceForPackage(userId, packageId);
    if (assignedRatePrice?.isEnabled === false && isEnabled !== false) {
      return res.status(400).json({
        success: false,
        message: "This package is disabled by your assigned rate profile",
      });
    }
    const cost = assignedResellerCost(pkg, assignedRatePrice);
    const existing = await db.query.resellerPackagePrices.findFirst({
      where: and(
        eq(resellerPackagePrices.resellerId, userId),
        eq(resellerPackagePrices.packageId, packageId),
      ),
    });
    const existingRetail = resellerRetailPricing(pkg, existing, assignedRatePrice);
    const finalSellingPrice = sellingPrice ?? existingRetail.sellingPrice.toFixed(2);
    const markupPercent = calculateMarkupPercent(cost, Number(finalSellingPrice));
    const finalIsEnabled = isEnabled ?? existing?.isEnabled ?? true;
    const now = new Date();

    await db
      .insert(resellerPackagePrices)
      .values({
        resellerId: userId,
        packageId,
        sellingPrice: finalSellingPrice,
        markupPercent,
        isEnabled: finalIsEnabled,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [resellerPackagePrices.resellerId, resellerPackagePrices.packageId],
        set: {
          sellingPrice: finalSellingPrice,
          markupPercent,
          isEnabled: finalIsEnabled,
          updatedAt: now,
        },
      });

    return res.json({
      success: true,
      message: "Package selling price updated",
      data: {
        packageId,
        wholesaleCost: cost,
        sellingPrice: Number(finalSellingPrice),
        markupPercent: Number(markupPercent),
        isEnabled: finalIsEnabled,
        platformEnabled: Boolean(pkg.isEnabled),
      },
    });
  } catch (error: any) {
    console.error("Reseller package price update error:", error);
    return res.status(500).json({ success: false, message: error.message || "Price update failed" });
  }
});

router.get("/prices/export", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const userId = req.userId;
    const providerSettingsJoin = and(
      eq(resellerProviderSettings.providerId, unifiedPackages.providerId),
      eq(resellerProviderSettings.resellerId, userId),
    );
    const assignedRatePriceJoin = and(
      eq(rateTablePrices.rateTableId, rateTableAssignments.rateTableId),
      eq(rateTablePrices.packageId, unifiedPackages.id),
    );
    const rows = await db
      .select({
        pkg: unifiedPackages,
        providerName: providers.name,
        providerSlug: providers.slug,
        destinationName: destinations.name,
        regionName: regions.name,
        customPrice: resellerPackagePrices,
        assignedRatePrice: rateTablePrices,
      })
      .from(unifiedPackages)
      .leftJoin(providers, eq(unifiedPackages.providerId, providers.id))
      .leftJoin(destinations, eq(unifiedPackages.destinationId, destinations.id))
      .leftJoin(regions, eq(unifiedPackages.regionId, regions.id))
      .leftJoin(resellerProviderSettings, providerSettingsJoin)
      .leftJoin(rateTableAssignments, eq(rateTableAssignments.userId, userId))
      .leftJoin(rateTablePrices, assignedRatePriceJoin)
      .leftJoin(
        resellerPackagePrices,
        and(
          eq(resellerPackagePrices.packageId, unifiedPackages.id),
          eq(resellerPackagePrices.resellerId, userId),
        ),
      )
      .where(and(
        eq(providers.enabled, true),
        eq(unifiedPackages.isEnabled, true),
        sql`COALESCE(${resellerProviderSettings.isEnabled}, true) = true`,
      ))
      .orderBy(asc(unifiedPackages.title));

    const csvRows = rows.map(({ pkg, providerName, providerSlug, destinationName, regionName, customPrice, assignedRatePrice }) => {
      const { cost, sellingPrice, markupPercent } = resellerRetailPricing(pkg, customPrice, assignedRatePrice);
      const resellerEnabled = (customPrice?.isEnabled ?? true) && (assignedRatePrice?.isEnabled ?? true);
      return {
        packageId: pkg.id,
        slug: pkg.slug,
        title: pkg.title,
        provider: resellerProviderDisplayName(providerSlug, providerName),
        destination: destinationName,
        region: regionName,
        type: pkg.type,
        dataAmount: pkg.dataAmount,
        validity: pkg.validity,
        wholesaleCost: cost.toFixed(2),
        sellingPrice: sellingPrice.toFixed(2),
        markupPercent: markupPercent.toFixed(2),
        publicRetailPrice: money(pkg.retailPrice).toFixed(2),
        isEnabled: Boolean(pkg.isEnabled) && resellerEnabled ? "true" : "false",
        resellerEnabled: resellerEnabled ? "true" : "false",
        platformEnabled: pkg.isEnabled ? "true" : "false",
      };
    });

    const headers = [
      "packageId",
      "slug",
      "title",
      "provider",
      "destination",
      "region",
      "type",
      "dataAmount",
      "validity",
      "wholesaleCost",
      "sellingPrice",
      "markupPercent",
      "publicRetailPrice",
      "isEnabled",
      "resellerEnabled",
      "platformEnabled",
    ];

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="reseller-price-cost.csv"');
    res.send(toCsv(headers, csvRows));
  } catch (error: any) {
    console.error("Reseller prices export error:", error);
    return res.status(500).json({ success: false, message: error.message || "Export failed" });
  }
});

router.post("/prices/import", requireAuth, requireResellerOrAgent, async (req: any, res) => {
  try {
    const userId = req.userId;
    const rows = parseCsv(String(req.body.csv || ""));
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "No CSV rows found" });
    }

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      try {
        const packageKey = readCsvValue(row, ["packageId", "id", "slug"]);
        if (!packageKey) {
          skipped += 1;
          continue;
        }

        const pkg = await db.query.unifiedPackages.findFirst({
          where: or(eq(unifiedPackages.id, packageKey), eq(unifiedPackages.slug, packageKey)),
        });
        if (!pkg) {
          skipped += 1;
          errors.push(`Row ${index + 2}: package not found`);
          continue;
        }
        if (!pkg.isEnabled) {
          skipped += 1;
          errors.push(`Row ${index + 2}: package is disabled by admin`);
          continue;
        }

        const providerAvailability = await getProviderAvailabilityForReseller(userId, pkg.providerId);
        if (!providerAvailability.available) {
          skipped += 1;
          errors.push(`Row ${index + 2}: ${providerAvailability.message || "package provider is not available"}`);
          continue;
        }

        let sellingPrice = normalizeMoneyInput(
          readCsvValue(row, ["sellingPrice", "retailSellingPrice", "resellerRetailPrice"]),
          "Retail selling price",
        );
        const markupValue = readCsvValue(row, ["markupPercent", "markup"]);
        const enabledValue = readCsvValue(row, ["resellerEnabled", "isEnabled", "enabled", "active"]);
        const isEnabled = enabledValue ? normalizeBoolean(enabledValue.toLowerCase()) : undefined;
        const assignedRatePrice = await getAssignedRatePriceForPackage(userId, pkg.id);
        const cost = assignedResellerCost(pkg, assignedRatePrice);

        if (!sellingPrice && markupValue) {
          const markupPercent = normalizePercent(markupValue, "Markup");
          sellingPrice = money(cost * (1 + markupPercent / 100)).toFixed(2);
        }

        if (!sellingPrice && isEnabled === undefined) {
          skipped += 1;
          continue;
        }

        const existing = await db.query.resellerPackagePrices.findFirst({
          where: and(
            eq(resellerPackagePrices.resellerId, userId),
            eq(resellerPackagePrices.packageId, pkg.id),
          ),
        });
        const existingRetail = resellerRetailPricing(pkg, existing, assignedRatePrice);
        const finalSellingPrice = sellingPrice || existingRetail.sellingPrice.toFixed(2);
        const markupPercent = calculateMarkupPercent(cost, Number(finalSellingPrice));
        const now = new Date();
        await db
          .insert(resellerPackagePrices)
          .values({
            resellerId: userId,
            packageId: pkg.id,
            sellingPrice: finalSellingPrice,
            markupPercent,
            isEnabled: isEnabled ?? existing?.isEnabled ?? true,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [resellerPackagePrices.resellerId, resellerPackagePrices.packageId],
            set: {
              sellingPrice: finalSellingPrice,
              markupPercent,
              isEnabled: isEnabled ?? existing?.isEnabled ?? true,
              updatedAt: now,
            },
          });
        updated += 1;
      } catch (rowError: any) {
        skipped += 1;
        errors.push(`Row ${index + 2}: ${rowError.message}`);
      }
    }

    return res.json({
      success: true,
      message: "Reseller prices imported successfully",
      data: {
        totalRows: rows.length,
        updated,
        skipped,
        errors: errors.slice(0, 20),
      },
    });
  } catch (error: any) {
    console.error("Reseller prices import error:", error);
    return res.status(500).json({ success: false, message: error.message || "Import failed" });
  }
});

export default router;
