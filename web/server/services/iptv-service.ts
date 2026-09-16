import { pool } from "server/db";
import { generateCustomNotificationEmail, sendEmail } from "server/email";
import { getAdminMessaging } from "server/config/firebase-admin";

const TVPLUS_API_BASE_URL = "https://tvpluspanel.net/api/api.php";
const IOTV_DEFAULT_API_BASE_URL = "https://yourdns.com";
const IPTV_RESELLER_HUB_CATALOG_SOURCE = "https://www.iptvchannellist.com/";
const IPTV_RESELLER_HUB_CATALOG_ENDPOINTS = {
  live: "https://www.iptvchannellist.com/wp-content/iptvchannellist/api/live.php",
  vod: "https://www.iptvchannellist.com/wp-content/iptvchannellist/api/vod.php",
  series: "https://www.iptvchannellist.com/wp-content/iptvchannellist/api/series.php",
};
const TVPLUS_DINO_CHANNEL_LIST_URLS = [
  "https://dinoiptv.co/channels-list/",
  "https://dino-tv.us/channels-list/",
];
const TVPLUS_OTT_DINO_CATALOG_URL = "https://ottcredits.com/dinoiptv";
const TVPLUS_OTT_DINO_DEFAULT_COUNTS = {
  liveCount: 19390,
  movieCount: 88383,
  seriesCount: 21630,
};

export type IptvDeviceType = "m3u" | "mag" | "protocol";
export type IptvOrderStatus = "pending" | "active" | "failed" | "expired" | "cancelled" | "refunded" | "suspended";
type IptvSubscriptionTerm = {
  tvplusSub: number;
  storageMonths: number;
  termType: "months" | "hours";
  termHours: number | null;
  label: string;
  isFree: boolean;
};

export type IptvSettings = {
  enabled: boolean;
  activeProvider: "tvplus" | "iotv";
  apiKeyConfigured: boolean;
  apiKeyPreview: string;
  baseUrl: string;
  defaultPackageId: string;
  defaultPackageName: string;
  retailMarginPercent: string;
  demoEnabled: boolean;
  providerDemoMode: boolean;
  iotvTokenConfigured: boolean;
  iotvTokenPreview: string;
  iotvApiBaseUrl: string;
  iotvResellerUsernameConfigured: boolean;
  iotvResellerUsernamePreview: string;
  iotvResellerPasswordConfigured: boolean;
  iotvResellerPasswordPreview: string;
  iotvPlayerBaseUrl: string;
  allowWebTrial: boolean;
  allowMobileTrial: boolean;
  autoRenewEnabled: boolean;
  showAllProviderPackagesWeb: boolean;
  showAllProviderPackagesMobile: boolean;
  specialPromotionEnabled: boolean;
  specialPromotionTitle: string;
  specialPromotionBody: string;
  specialPromotionBadge: string;
  specialPromotionButtonText: string;
  specialPromotionButtonUrl: string;
  specialPromotionStyle: string;
  specialPromotionHtml: string;
  specialPromotionPrice1Month: string;
  specialPromotionPrice3Months: string;
  specialPromotionPrice6Months: string;
  specialPromotionPrice9Months: string;
  specialPromotionPrice12Months: string;
  specialPromotionEmailAudience: string;
  specialPromotionPushAudience: string;
  specialOfferEnabled: boolean;
  specialOfferTitle: string;
  specialOfferBody: string;
  specialOfferBadge: string;
  specialOfferButtonText: string;
  specialOfferButtonUrl: string;
  specialOfferStyle: string;
  specialOfferHtml: string;
  specialOfferPrice1Month: string;
  specialOfferPrice3Months: string;
  specialOfferPrice6Months: string;
  specialOfferPrice9Months: string;
  specialOfferPrice12Months: string;
  specialOfferEmailAudience: string;
  specialOfferPushAudience: string;
  expiryEmailAlertsEnabled: boolean;
  expiryEmailAlertEveryHours: string;
  expiryPushAlertsEnabled: boolean;
  expiryPushAlertBeforeHours: string;
  paymentWalletEnabled: boolean;
  paymentUsdtEnabled: boolean;
  paymentPaypalEnabled: boolean;
  paymentCardEnabled: boolean;
  paymentPriority: string[];
  tvplusCurrency: string;
  tvplusCreditsPaidAmount: string;
  tvplusCreditsReceived: string;
  tvplusCreditUnitCost: string;
  iotvCurrency: string;
  iotvCreditsPaidUsd: string;
  iotvCreditsReceived: string;
  iotvCreditUnitCostUsd: string;
  iotvConnectionPriceMultiplierEnabled: boolean;
  conversionDisplayCurrency: string;
};

type TvplusResponse = Array<Record<string, any>> | Record<string, any>;
type IptvCatalogPart = {
  count: number;
  categories: number;
  updatedAt: string | null;
  error?: string;
};

type IptvProviderCatalogSummary = {
  provider: "iotv" | "tvplus";
  label: string;
  source: string;
  liveCount: number;
  movieCount: number;
  seriesCount: number;
  liveCategories: number;
  movieCategories: number;
  seriesCategories: number;
  updatedAt: string | null;
  fetchedAt: string;
  errors: string[];
};

type IptvPromotionSendInput = {
  kind?: "promotion" | "offer";
  channel?: "email" | "push";
  audience?: "active" | "inactive" | "both";
  title?: string;
  body?: string;
  html?: string;
  buttonText?: string;
  buttonUrl?: string;
};

let iptvResellerHubCatalogCache: { expiresAt: number; data: IptvProviderCatalogSummary } | null = null;
let tvplusOttDinoCatalogCache: { expiresAt: number; data: IptvProviderCatalogSummary } | null = null;

const IPTV_CONTENT_CATALOG = {
  countries: [
    { code: "US", name: "United States", channelCount: 124, movieCount: 540 },
    { code: "CA", name: "Canada", channelCount: 82, movieCount: 310 },
    { code: "GB", name: "United Kingdom", channelCount: 96, movieCount: 420 },
    { code: "FR", name: "France", channelCount: 74, movieCount: 260 },
    { code: "DE", name: "Germany", channelCount: 68, movieCount: 240 },
    { code: "LB", name: "Lebanon", channelCount: 38, movieCount: 120 },
    { code: "AE", name: "United Arab Emirates", channelCount: 44, movieCount: 160 },
    { code: "SA", name: "Saudi Arabia", channelCount: 52, movieCount: 180 },
  ],
  channels: [
    { id: "news-us-live", name: "US News Live", countryCode: "US", category: "News", language: "English", quality: "FHD" },
    { id: "sports-plus-1", name: "Sports Plus 1", countryCode: "US", category: "Sports", language: "English", quality: "FHD" },
    { id: "canada-entertainment", name: "Canada Entertainment", countryCode: "CA", category: "Entertainment", language: "English", quality: "HD" },
    { id: "uk-premier-sports", name: "UK Premier Sports", countryCode: "GB", category: "Sports", language: "English", quality: "FHD" },
    { id: "fr-cinema", name: "France Cinema", countryCode: "FR", category: "Movies", language: "French", quality: "HD" },
    { id: "de-documentary", name: "Germany Documentary", countryCode: "DE", category: "Documentary", language: "German", quality: "HD" },
    { id: "lb-family", name: "Lebanon Family", countryCode: "LB", category: "Family", language: "Arabic", quality: "HD" },
    { id: "arabic-series", name: "Arabic Series", countryCode: "AE", category: "Series", language: "Arabic", quality: "FHD" },
    { id: "ksa-sports", name: "Saudi Sports", countryCode: "SA", category: "Sports", language: "Arabic", quality: "FHD" },
  ],
  movies: [
    { id: "movie-action-collection", title: "Action Collection", genre: "Action", year: 2026, runtimeMinutes: 118, rating: "PG-13", quality: "4K" },
    { id: "movie-family-night", title: "Family Night", genre: "Family", year: 2025, runtimeMinutes: 96, rating: "PG", quality: "FHD" },
    { id: "movie-arabic-drama", title: "Arabic Drama Picks", genre: "Drama", year: 2025, runtimeMinutes: 110, rating: "PG-13", quality: "HD" },
    { id: "movie-euro-thriller", title: "European Thriller", genre: "Thriller", year: 2024, runtimeMinutes: 104, rating: "R", quality: "FHD" },
    { id: "movie-documentary-world", title: "World Documentary", genre: "Documentary", year: 2026, runtimeMinutes: 88, rating: "PG", quality: "HD" },
    { id: "movie-comedy-box", title: "Comedy Box", genre: "Comedy", year: 2025, runtimeMinutes: 101, rating: "PG-13", quality: "FHD" },
  ],
  series: [
    { id: "series-global-drama", title: "Global Drama", genre: "Drama", seasons: 4, episodes: 42, quality: "FHD" },
    { id: "series-family-box", title: "Family Box", genre: "Family", seasons: 3, episodes: 28, quality: "HD" },
    { id: "series-arabic-premium", title: "Arabic Premium Series", genre: "Drama", seasons: 5, episodes: 56, quality: "FHD" },
    { id: "series-documentary-world", title: "World Documentary Series", genre: "Documentary", seasons: 2, episodes: 18, quality: "HD" },
  ],
};

const IOTV_PACKAGE_GROUPS = [
  { connections: 1, name: "IPTV Reseller Hub Provider - 1 Connection", packageIds: { 1: 62, 3: 65, 6: 68, 12: 71, trial: 7, trial24: 7, trial48: 7 } },
  { connections: 2, name: "IPTV Reseller Hub Provider - 2 Connections", packageIds: { 1: 63, 3: 66, 6: 69, 12: 72, trial: 7, trial24: 7, trial48: 7 } },
  { connections: 3, name: "IPTV Reseller Hub Provider - 3 Connections", packageIds: { 1: 64, 3: 67, 6: 70, 12: 73, trial: 7, trial24: 7, trial48: 7 } },
  { connections: 4, name: "IPTV Reseller Hub Provider - 4 Connections", packageIds: { 1: 74, 3: 75, 6: 76, 12: 77, trial: 7, trial24: 7, trial48: 7 } },
  { connections: 5, name: "IPTV Reseller Hub Provider - 5 Connections", packageIds: { 1: 78, 3: 79, 6: 80, 12: 81, trial: 7, trial24: 7, trial48: 7 } },
];

function boolFromSetting(value: string | null | undefined, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
}

function maskSecretPreview(value: string | null | undefined, visibleStart = 4, visibleEnd = 3) {
  const secret = String(value || "").trim();
  if (!secret) return "";
  if (secret.length <= visibleStart + visibleEnd) return `${secret.slice(0, 1)}***`;
  return `${secret.slice(0, visibleStart)}...${secret.slice(-visibleEnd)}`;
}

function getFirstResponseItem(response: TvplusResponse) {
  return Array.isArray(response) ? response[0] || {} : response || {};
}

function normalizeDeviceType(type: unknown): IptvDeviceType {
  const value = String(type || "").trim().toLowerCase();
  if (value === "mag") return "mag";
  if (value === "protocol") return "protocol";
  return "m3u";
}

function normalizeSubscriptionMonths(value: unknown) {
  const months = Number(value);
  if ([1, 3, 6, 9, 12, 99].includes(months)) return months;
  throw new Error("Subscription length must be 1, 3, 6, 9, 12, or 99 months");
}

function normalizeSubscriptionTerm(input: Record<string, any>): IptvSubscriptionTerm {
  const rawTerm = String(input.subscriptionTerm || "").trim().toLowerCase();
  if (["free_1d", "free_1day", "free_24h", "trial_1d"].includes(rawTerm)) {
    return {
      tvplusSub: 99,
      storageMonths: 99,
      termType: "hours",
      termHours: 24,
      label: "Free 1 Day",
      isFree: true,
    };
  }

  if (["free_2d", "free_2day", "free_48h", "trial_2d", "trial_48h"].includes(rawTerm)) {
    return {
      tvplusSub: 99,
      storageMonths: 99,
      termType: "hours",
      termHours: 48,
      label: "Free 48 Hours",
      isFree: true,
    };
  }

  const rawHours = input.subscriptionHours ?? (rawTerm.startsWith("free_") ? rawTerm.replace(/\D/g, "") : undefined);
  const hours = Number(rawHours);

  if (Number.isInteger(hours) && hours >= 1 && hours <= 6) {
    return {
      tvplusSub: 99,
      storageMonths: 99,
      termType: "hours",
      termHours: hours,
      label: `Free ${hours} Hour${hours === 1 ? "" : "s"}`,
      isFree: true,
    };
  }

  const months = normalizeSubscriptionMonths(input.subscriptionMonths ?? input.subscriptionTerm);
  return {
    tvplusSub: months,
    storageMonths: months,
    termType: "months",
    termHours: null,
    label: months === 99 ? "Demo" : `${months} Month${months === 1 ? "" : "s"}`,
    isFree: months === 99,
  };
}

function normalizePrice(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount < 0) return "0.00";
  return amount.toFixed(2);
}

const IPTV_MONTHLY_PRICE_TERMS = ["1", "3", "6", "9", "12"];

function getIotvPackageConnections(pkg: any) {
  const metadataConnections = Number(pkg?.metadata?.connections);
  if (Number.isFinite(metadataConnections) && metadataConnections > 0) return Math.round(metadataConnections);

  const packageId = String(pkg?.tvplusPackageId || "");
  const match = packageId.match(/iotv-connections-(\d+)/);
  return match ? Number(match[1]) : 1;
}

function isIotvConnectionPackage(pkg: any) {
  return String(pkg?.metadata?.provider || "").toLowerCase() === "iotv"
    || String(pkg?.tvplusPackageId || "").startsWith("iotv-connections-");
}

function multiplyPriceValue(value: unknown, multiplier: number) {
  const raw = String(value ?? "").trim();
  if (!raw) return raw;
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return raw;
  return normalizePrice(amount * multiplier);
}

function multiplyMonthlyPriceMap(input: Record<string, any> | undefined, multiplier: number, copyTrialPrices = true) {
  const output = { ...(input || {}) };
  for (const term of IPTV_MONTHLY_PRICE_TERMS) {
    output[term] = multiplyPriceValue(input?.[term], multiplier);
  }
  if (!copyTrialPrices) {
    delete output.trial;
  }
  return output;
}

function applyIotvConnectionPriceMultiplier(packages: any[], settings: IptvSettings) {
  if (!settings.iotvConnectionPriceMultiplierEnabled) return packages;

  const basePackage = packages.find((pkg) => isIotvConnectionPackage(pkg) && getIotvPackageConnections(pkg) === 1);
  if (!basePackage?.prices) return packages;

  const basePrices = basePackage.prices || {};
  return packages.map((pkg) => {
    if (!isIotvConnectionPackage(pkg)) return pkg;

    const connections = getIotvPackageConnections(pkg);
    if (connections <= 1) {
      return {
        ...pkg,
        metadata: {
          ...(pkg.metadata || {}),
          inheritedPricingMode: "source",
        },
      };
    }

    const inheritedPrices: Record<string, any> = {
      ...basePrices,
      cost: multiplyMonthlyPriceMap(basePrices.cost, connections, true),
      user: multiplyMonthlyPriceMap(basePrices.user, connections, true),
      reseller: multiplyMonthlyPriceMap(basePrices.reseller, connections, true),
      agent: multiplyMonthlyPriceMap(basePrices.agent, connections, true),
      trialTerms: basePrices.trialTerms || {},
    };

    for (const term of IPTV_MONTHLY_PRICE_TERMS) {
      inheritedPrices[term] = multiplyPriceValue(basePrices[term], connections);
    }

    return {
      ...pkg,
      prices: inheritedPrices,
      metadata: {
        ...(pkg.metadata || {}),
        inheritedPricingFromPackageId: basePackage.id,
        inheritedPricingMultiplier: connections,
      },
    };
  });
}

function toMoneyNumber(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

async function debitIptvWalletPayment(userId: string | null, amountValue: unknown, metadata: Record<string, any>) {
  const amount = toMoneyNumber(amountValue);
  if (amount <= 0) return null;
  if (!userId) throw new Error("Login is required to pay IPTV from wallet");

  const updatedUser = await queryOne<{ walletBalance: string }>(
    `UPDATE users
     SET wallet_balance = (wallet_balance::numeric - $2)::numeric(10,2),
         updated_at = now()
     WHERE id = $1 AND wallet_balance::numeric >= $2
     RETURNING wallet_balance AS "walletBalance"`,
    [userId, amount.toFixed(2)],
  );

  if (!updatedUser) {
    throw new Error("Insufficient wallet balance for this IPTV payment");
  }

  const balanceAfter = toMoneyNumber(updatedUser.walletBalance);
  const balanceBefore = balanceAfter + amount;
  const transaction = await queryOne<{ id: string }>(
    `INSERT INTO wallet_transactions (
       user_id, type, status, amount, currency, balance_before, balance_after,
       provider, reference_id, description, metadata, completed_at
     )
     VALUES ($1, 'purchase_debit', 'completed', $2, 'USD', $3, $4, 'wallet', $5, $6, $7::jsonb, now())
     RETURNING id`,
    [
      userId,
      amount.toFixed(2),
      balanceBefore.toFixed(2),
      balanceAfter.toFixed(2),
      metadata.referenceId || null,
      metadata.description || "IPTV subscription paid from wallet",
      JSON.stringify(metadata),
    ],
  );

  return {
    id: transaction?.id || "",
    amount: amount.toFixed(2),
    balanceBefore: balanceBefore.toFixed(2),
    balanceAfter: balanceAfter.toFixed(2),
  };
}

async function attachIptvWalletPayment(transactionId: string | undefined, orderId: string) {
  if (!transactionId) return;
  await pool.query(
    `UPDATE wallet_transactions
     SET reference_id = $2,
         metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
         updated_at = now()
     WHERE id = $1`,
    [transactionId, orderId, JSON.stringify({ iptvOrderId: orderId })],
  );
}

async function refundIptvWalletPayment(payment: Awaited<ReturnType<typeof debitIptvWalletPayment>>, reason: string) {
  if (!payment?.id) return;
  const original = await queryOne<{ userId: string; amount: string; referenceId: string | null }>(
    `SELECT user_id AS "userId", amount, reference_id AS "referenceId"
     FROM wallet_transactions
     WHERE id = $1 AND status = 'completed'`,
    [payment.id],
  );
  if (!original) return;

  const amount = toMoneyNumber(original.amount);
  if (amount <= 0) return;

  const updatedUser = await queryOne<{ walletBalance: string }>(
    `UPDATE users
     SET wallet_balance = (wallet_balance::numeric + $2)::numeric(10,2),
         updated_at = now()
     WHERE id = $1
     RETURNING wallet_balance AS "walletBalance"`,
    [original.userId, amount.toFixed(2)],
  );
  const balanceAfter = toMoneyNumber(updatedUser?.walletBalance);
  const balanceBefore = balanceAfter - amount;

  await pool.query(
    `INSERT INTO wallet_transactions (
       user_id, type, status, amount, currency, balance_before, balance_after,
       provider, reference_id, description, metadata, completed_at
     )
     VALUES ($1, 'refund', 'completed', $2, 'USD', $3, $4, 'wallet', $5, $6, $7::jsonb, now())`,
    [
      original.userId,
      amount.toFixed(2),
      balanceBefore.toFixed(2),
      balanceAfter.toFixed(2),
      original.referenceId || payment.id,
      `Refunded IPTV wallet payment: ${reason}`,
      JSON.stringify({ refundedWalletTransactionId: payment.id, reason }),
    ],
  );
}

function normalizeOptionalPrice(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) return "";
  return amount.toFixed(2);
}

function normalizeIptvRetailPrices(input: Record<string, any> = {}) {
  const prices: Record<string, string> = {};
  for (const term of IPTV_RETAIL_PRICE_TERMS) {
    const value = input[term] ?? (term === "trial" ? input.free : undefined);
    const normalized = normalizeOptionalPrice(value);
    if (normalized) prices[term] = normalized;
  }
  return prices;
}

function multiplyRetailPrices(input: Record<string, any> = {}, multiplier: number) {
  const prices = { ...input };
  for (const term of IPTV_MONTHLY_PRICE_TERMS) {
    prices[term] = multiplyPriceValue(input[term], multiplier);
  }
  return prices;
}

function getProviderCreditUnitCostUsd(settings: IptvSettings) {
  const value = settings.activeProvider === "iotv"
    ? settings.iotvCreditUnitCostUsd
    : settings.tvplusCreditUnitCost;
  const amount = Number(value || 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function getCostCreditsForTerm(prices: Record<string, any>, term: string) {
  return normalizePrice(prices?.cost?.[term] ?? 0);
}

function getCostUsdForTerm(settings: IptvSettings, prices: Record<string, any>, term: string) {
  const credits = Number(getCostCreditsForTerm(prices, term));
  const unitCost = getProviderCreditUnitCostUsd(settings);
  if (!Number.isFinite(credits) || credits <= 0 || unitCost <= 0) return "0.00";
  return normalizePrice(credits * unitCost);
}

function getCreditBasedRetailPrice(settings: IptvSettings, prices: Record<string, any>, term: string) {
  const cost = Number(getCostUsdForTerm(settings, prices, term));
  if (!Number.isFinite(cost) || cost <= 0) return "0.00";
  const margin = Number(settings.retailMarginPercent || 0);
  const markup = Number.isFinite(margin) && margin > 0 ? margin : 0;
  return normalizePrice(cost * (1 + markup / 100));
}

function firstConfiguredPrice(...values: unknown[]) {
  for (const value of values) {
    const raw = String(value ?? "").trim();
    if (raw) return raw;
  }
  return undefined;
}

function normalizeLongDecimal(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount < 0) return "0";
  return amount.toFixed(9).replace(/0+$/, "").replace(/\.$/, "");
}

function normalizeCurrencyCode(value: unknown, fallback = "USD") {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : fallback;
}

function normalizePromotionAudience(value: unknown) {
  const audience = String(value || "").trim().toLowerCase();
  return ["active", "inactive", "both"].includes(audience) ? audience : "active";
}

function normalizePromotionStyle(value: unknown, fallback = "default") {
  const style = String(value || "").trim().toLowerCase();
  return ["default", "success", "premium", "urgent"].includes(style) ? style : fallback;
}

type IptvAudienceRole = "user" | "reseller" | "agent";

const IPTV_TRIAL_TERM_KEYS = ["free_1h", "free_2h", "free_3h", "free_4h", "free_5h", "free_6h", "free_1d", "free_48h"];
const IPTV_RETAIL_PRICE_TERMS = ["trial", "1", "3", "6", "9", "12"];
const IPTV_PROVIDER_TRIAL_TERMS = {
  tvplus: [
    { key: "free_1h", label: "Free Trial - 1 Hour" },
    { key: "free_2h", label: "Free Trial - 2 Hours" },
    { key: "free_3h", label: "Free Trial - 3 Hours" },
    { key: "free_4h", label: "Free Trial - 4 Hours" },
    { key: "free_5h", label: "Free Trial - 5 Hours" },
    { key: "free_6h", label: "Free Trial - 6 Hours" },
    { key: "free_1d", label: "Free Trial - 24 Hours" },
  ],
  iotv: [
    { key: "free_1d", label: "Free Trial - 24 Hours" },
    { key: "free_48h", label: "Free Trial - 48 Hours" },
  ],
} as const;

const DEFAULT_IPTV_PACKAGE_VISIBILITY = {
  user: true,
  reseller: true,
  agent: true,
  trialUser: true,
  trialReseller: true,
  trialAgent: true,
};

function defaultIptvTrialTermVisibility() {
  return Object.fromEntries(
    IPTV_TRIAL_TERM_KEYS.map((term) => [
      term,
      { user: true, reseller: true, agent: true },
    ]),
  );
}

function normalizeIptvAudienceRole(role: unknown): IptvAudienceRole {
  const value = String(role || "").trim().toLowerCase();
  if (value === "reseller") return "reseller";
  if (value === "agent") return "agent";
  return "user";
}

function normalizeIptvPackageVisibility(input: any = {}) {
  input = input || {};
  const trialTerms = defaultIptvTrialTermVisibility();
  const inputTrialTerms = input.trialTerms || {};
  for (const term of IPTV_TRIAL_TERM_KEYS) {
    const termVisibility = inputTrialTerms[term] || {};
    trialTerms[term] = {
      user: termVisibility.user !== false,
      reseller: termVisibility.reseller !== false,
      agent: termVisibility.agent !== false,
    };
  }

  return {
    ...DEFAULT_IPTV_PACKAGE_VISIBILITY,
    user: input.user !== false,
    reseller: input.reseller !== false,
    agent: input.agent !== false,
    trialUser: input.trialUser !== false,
    trialReseller: input.trialReseller !== false,
    trialAgent: input.trialAgent !== false,
    trialTerms,
  };
}

function getIptvPackageVisibility(pkg: any) {
  return normalizeIptvPackageVisibility(pkg?.metadata?.visibility || {});
}

function normalizeIptvTrialTermKey(value: unknown) {
  const term = String(value || "").trim().toLowerCase();
  if (["free_1day", "free_24h", "trial_1d"].includes(term)) return "free_1d";
  if (["free_2d", "free_2day", "trial_2d", "trial_48h"].includes(term)) return "free_48h";
  if (IPTV_TRIAL_TERM_KEYS.includes(term)) return term;
  return "";
}

function isIptvTrialTermSupportedForProvider(provider: IptvSettings["activeProvider"], value: unknown) {
  const term = normalizeIptvTrialTermKey(value);
  if (!term) return false;
  if (provider === "iotv") return term === "free_1d" || term === "free_48h";
  return ["free_1h", "free_2h", "free_3h", "free_4h", "free_5h", "free_6h", "free_1d"].includes(term);
}

function getIptvPackageProvider(pkg: any): "tvplus" | "iotv" {
  return String(pkg?.metadata?.provider || "").toLowerCase() === "iotv"
    || String(pkg?.tvplusPackageId || "").startsWith("iotv-")
    ? "iotv"
    : "tvplus";
}

function parseVirtualIptvTrialPackageId(id: unknown) {
  const match = String(id || "").match(/^trial:(tvplus|iotv):([a-z0-9_]+)$/);
  if (!match) return null;
  const term = normalizeIptvTrialTermKey(match[2]);
  if (!term || !IPTV_PROVIDER_TRIAL_TERMS[match[1] as "tvplus" | "iotv"].some((item) => item.key === term)) {
    return null;
  }
  return { provider: match[1] as "tvplus" | "iotv", term };
}

function isIptvPackageVisibleForRole(pkg: any, role: unknown, options: { trial?: boolean; trialTerm?: string } = {}) {
  const audienceRole = normalizeIptvAudienceRole(role);
  const visibility = getIptvPackageVisibility(pkg);
  if (options.trial) {
    const trialTerm = normalizeIptvTrialTermKey(options.trialTerm);
    const termVisibility = trialTerm ? visibility.trialTerms?.[trialTerm]?.[audienceRole] !== false : true;
    if (audienceRole === "reseller") return visibility.reseller && visibility.trialReseller && termVisibility;
    if (audienceRole === "agent") return visibility.agent && visibility.trialAgent && termVisibility;
    return visibility.user && visibility.trialUser && termVisibility;
  }
  return visibility[audienceRole];
}

async function queryRows<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await queryRows<T>(sql, params);
  return rows[0] || null;
}

export async function ensureIptvSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS iptv_settings (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS iptv_packages (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      tvplus_package_id text NOT NULL UNIQUE,
      name text NOT NULL,
      description text,
      active boolean NOT NULL DEFAULT true,
      sort_order integer NOT NULL DEFAULT 0,
      prices jsonb NOT NULL DEFAULT '{}'::jsonb,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      last_synced_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS iptv_orders (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar REFERENCES users(id) ON DELETE SET NULL,
      created_by_user_id varchar REFERENCES users(id) ON DELETE SET NULL,
      package_id varchar REFERENCES iptv_packages(id) ON DELETE SET NULL,
      tvplus_user_id text,
      device_type text NOT NULL,
      subscription_months integer NOT NULL,
      subscription_term_type text NOT NULL DEFAULT 'months',
      subscription_hours integer,
      subscription_label text,
      status text NOT NULL DEFAULT 'pending',
      username text,
      password text,
      mac_address text,
      portal_url text,
      m3u_url text,
      protocol_code text,
      customer_note text,
      admin_note text,
      price decimal(10,2) NOT NULL DEFAULT '0.00',
      currency text NOT NULL DEFAULT 'USD',
      provider_response jsonb NOT NULL DEFAULT '{}'::jsonb,
      expires_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS iptv_orders_user_id_idx ON iptv_orders(user_id);
    CREATE INDEX IF NOT EXISTS iptv_orders_status_idx ON iptv_orders(status);
    CREATE INDEX IF NOT EXISTS iptv_orders_device_type_idx ON iptv_orders(device_type);

    CREATE TABLE IF NOT EXISTS iptv_channels (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      provider text NOT NULL,
      external_id text NOT NULL,
      name text NOT NULL,
      country_code text NOT NULL DEFAULT '',
      category text NOT NULL DEFAULT '',
      language text NOT NULL DEFAULT '',
      quality text NOT NULL DEFAULT '',
      active boolean NOT NULL DEFAULT true,
      sort_order integer NOT NULL DEFAULT 0,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      UNIQUE(provider, external_id)
    );

    CREATE INDEX IF NOT EXISTS iptv_channels_provider_idx ON iptv_channels(provider);
    CREATE INDEX IF NOT EXISTS iptv_channels_active_idx ON iptv_channels(active);
    CREATE INDEX IF NOT EXISTS iptv_channels_active_sort_idx ON iptv_channels(active, sort_order, name);

    CREATE TABLE IF NOT EXISTS iptv_reseller_package_prices (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      reseller_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      package_id varchar NOT NULL REFERENCES iptv_packages(id) ON DELETE CASCADE,
      prices jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      UNIQUE(reseller_id, package_id)
    );

    CREATE TABLE IF NOT EXISTS iptv_account_settings (
      user_id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      settings jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS iptv_reseller_package_prices_reseller_idx
      ON iptv_reseller_package_prices(reseller_id);
  `);

  await pool.query(`
    ALTER TABLE iptv_orders ADD COLUMN IF NOT EXISTS subscription_term_type text NOT NULL DEFAULT 'months';
    ALTER TABLE iptv_orders ADD COLUMN IF NOT EXISTS subscription_hours integer;
    ALTER TABLE iptv_orders ADD COLUMN IF NOT EXISTS subscription_label text;
    ALTER TABLE iptv_orders ADD COLUMN IF NOT EXISTS created_by_user_id varchar REFERENCES users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS iptv_orders_created_by_user_id_idx ON iptv_orders(created_by_user_id);
  `);

  await pool.query(`
    INSERT INTO iptv_settings (key, value)
    VALUES
      ('enabled', 'false'),
      ('active_provider', 'tvplus'),
      ('api_base_url', $1),
      ('default_package_id', 'all'),
      ('default_package_name', 'All Bouquets'),
      ('retail_margin_percent', '20'),
      ('demo_enabled', 'true'),
      ('provider_demo_mode', 'false'),
      ('iotv_api_base_url', $2),
      ('iotv_player_base_url', $2),
      ('allow_web_trial', 'true'),
      ('allow_mobile_trial', 'true'),
      ('auto_renew_enabled', 'false'),
      ('show_all_provider_packages_web', 'true'),
      ('show_all_provider_packages_mobile', 'true'),
      ('special_promotion_enabled', 'false'),
      ('special_promotion_title', 'Promotion'),
      ('special_promotion_body', 'Hannry and benefit from the Special promotion, Now you can renew your package for'),
      ('special_promotion_badge', ''),
      ('special_promotion_button_text', ''),
      ('special_promotion_button_url', ''),
      ('special_promotion_style', 'default'),
      ('special_promotion_html', ''),
      ('special_promotion_price_1_month', ''),
      ('special_promotion_price_3_months', ''),
      ('special_promotion_price_6_months', ''),
      ('special_promotion_price_9_months', ''),
      ('special_promotion_price_12_months', ''),
      ('special_promotion_email_audience', 'active'),
      ('special_promotion_push_audience', 'active'),
      ('special_offer_enabled', 'false'),
      ('special_offer_title', 'Special Offer'),
      ('special_offer_body', 'Hannry and benefit from the Special offer, Now you can renew your package for'),
      ('special_offer_badge', ''),
      ('special_offer_button_text', ''),
      ('special_offer_button_url', ''),
      ('special_offer_style', 'premium'),
      ('special_offer_html', ''),
      ('special_offer_price_1_month', ''),
      ('special_offer_price_3_months', ''),
      ('special_offer_price_6_months', ''),
      ('special_offer_price_9_months', ''),
      ('special_offer_price_12_months', ''),
      ('special_offer_email_audience', 'active'),
      ('special_offer_push_audience', 'active'),
      ('expiry_email_alerts_enabled', 'false'),
      ('expiry_email_alert_every_hours', '6'),
      ('expiry_push_alerts_enabled', 'false'),
      ('expiry_push_alert_before_hours', '12'),
      ('payment_wallet_enabled', 'true'),
      ('payment_usdt_enabled', 'true'),
      ('payment_paypal_enabled', 'true'),
      ('payment_card_enabled', 'true'),
      ('payment_priority', 'wallet,usdt,paypal,card'),
      ('tvplus_currency', 'USD'),
      ('tvplus_credits_paid_amount', '0'),
      ('tvplus_credits_received', '0'),
      ('iotv_currency', 'USD'),
      ('iotv_credits_paid_usd', '0'),
      ('iotv_credits_received', '0'),
      ('iotv_connection_price_multiplier_enabled', 'false'),
      ('conversion_display_currency', 'EUR')
    ON CONFLICT (key) DO NOTHING
  `, [TVPLUS_API_BASE_URL, IOTV_DEFAULT_API_BASE_URL]);

}

async function seedEditableIptvChannels() {
  const providers = ["tvplus", "iotv"];
  for (const provider of providers) {
    for (const [index, channel] of IPTV_CONTENT_CATALOG.channels.entries()) {
      await pool.query(
        `INSERT INTO iptv_channels (
           provider, external_id, name, country_code, category, language, quality, active, sort_order, metadata
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, '{}'::jsonb)
         ON CONFLICT (provider, external_id) DO NOTHING`,
        [
          provider,
          channel.id,
          channel.name,
          channel.countryCode,
          channel.category,
          channel.language,
          channel.quality,
          index,
        ],
      );
    }
  }
}

async function getRawSettings() {
  await ensureIptvSchema();
  const rows = await queryRows<{ key: string; value: string }>("SELECT key, value FROM iptv_settings");
  return new Map(rows.map((row) => [row.key, row.value]));
}

async function setRawSetting(key: string, value: string) {
  await ensureIptvSchema();
  await pool.query(
    `INSERT INTO iptv_settings (key, value, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value],
  );
}

type IptvProviderKey = "tvplus" | "iotv";

const PROVIDER_SCOPED_SETTINGS = new Set([
  "enabled",
  "default_package_id",
  "default_package_name",
  "retail_margin_percent",
  "demo_enabled",
  "provider_demo_mode",
  "allow_web_trial",
  "allow_mobile_trial",
  "auto_renew_enabled",
  "show_all_provider_packages_web",
  "show_all_provider_packages_mobile",
  "special_promotion_enabled",
  "special_promotion_title",
  "special_promotion_body",
  "special_promotion_badge",
  "special_promotion_button_text",
  "special_promotion_button_url",
  "special_promotion_style",
  "special_promotion_html",
  "special_promotion_price_1_month",
  "special_promotion_price_3_months",
  "special_promotion_price_6_months",
  "special_promotion_price_9_months",
  "special_promotion_price_12_months",
  "special_promotion_email_audience",
  "special_promotion_push_audience",
  "special_offer_enabled",
  "special_offer_title",
  "special_offer_body",
  "special_offer_badge",
  "special_offer_button_text",
  "special_offer_button_url",
  "special_offer_style",
  "special_offer_html",
  "special_offer_price_1_month",
  "special_offer_price_3_months",
  "special_offer_price_6_months",
  "special_offer_price_9_months",
  "special_offer_price_12_months",
  "special_offer_email_audience",
  "special_offer_push_audience",
  "expiry_email_alerts_enabled",
  "expiry_email_alert_every_hours",
  "expiry_push_alerts_enabled",
  "expiry_push_alert_before_hours",
  "payment_wallet_enabled",
  "payment_usdt_enabled",
  "payment_paypal_enabled",
  "payment_card_enabled",
  "payment_priority",
]);

function normalizeIptvProviderKey(value: unknown): IptvProviderKey {
  return String(value || "").toLowerCase() === "iotv" ? "iotv" : "tvplus";
}

function providerScopedSettingKey(provider: IptvProviderKey, key: string) {
  return `${provider}_${key}`;
}

function getProviderScopedSetting(
  settings: Map<string, string>,
  provider: IptvProviderKey,
  key: string,
  fallback?: string,
) {
  return settings.get(providerScopedSettingKey(provider, key)) ?? settings.get(key) ?? fallback;
}

export async function getIptvSettings(): Promise<IptvSettings> {
  const settings = await getRawSettings();
  const activeProvider = normalizeIptvProviderKey(settings.get("active_provider"));
  const providerSetting = (key: string, fallback?: string) =>
    getProviderScopedSetting(settings, activeProvider, key, fallback);

  return {
    enabled: boolFromSetting(providerSetting("enabled")),
    activeProvider,
    apiKeyConfigured: Boolean(settings.get("api_key")),
    apiKeyPreview: maskSecretPreview(settings.get("api_key")),
    baseUrl: settings.get("api_base_url") || TVPLUS_API_BASE_URL,
    defaultPackageId: providerSetting("default_package_id", "all") || "all",
    defaultPackageName: providerSetting("default_package_name", "All Bouquets") || "All Bouquets",
    retailMarginPercent: providerSetting("retail_margin_percent", "20") || "20",
    demoEnabled: boolFromSetting(providerSetting("demo_enabled"), true),
    providerDemoMode: boolFromSetting(providerSetting("provider_demo_mode")),
    iotvTokenConfigured: Boolean(settings.get("iotv_api_token")),
    iotvTokenPreview: maskSecretPreview(settings.get("iotv_api_token"), 6, 4),
    iotvApiBaseUrl: settings.get("iotv_api_base_url") || IOTV_DEFAULT_API_BASE_URL,
    iotvResellerUsernameConfigured: Boolean(settings.get("iotv_reseller_username")),
    iotvResellerUsernamePreview: maskSecretPreview(settings.get("iotv_reseller_username"), 5, 3),
    iotvResellerPasswordConfigured: Boolean(settings.get("iotv_reseller_password")),
    iotvResellerPasswordPreview: maskSecretPreview(settings.get("iotv_reseller_password"), 2, 2),
    iotvPlayerBaseUrl: settings.get("iotv_player_base_url") || settings.get("iotv_api_base_url") || IOTV_DEFAULT_API_BASE_URL,
    allowWebTrial: boolFromSetting(providerSetting("allow_web_trial"), true),
    allowMobileTrial: boolFromSetting(providerSetting("allow_mobile_trial"), true),
    autoRenewEnabled: boolFromSetting(providerSetting("auto_renew_enabled")),
    showAllProviderPackagesWeb: boolFromSetting(providerSetting("show_all_provider_packages_web"), false),
    showAllProviderPackagesMobile: boolFromSetting(providerSetting("show_all_provider_packages_mobile"), false),
    specialPromotionEnabled: boolFromSetting(providerSetting("special_promotion_enabled")),
    specialPromotionTitle: providerSetting("special_promotion_title") || "",
    specialPromotionBody: providerSetting("special_promotion_body") || "",
    specialPromotionBadge: providerSetting("special_promotion_badge") || "",
    specialPromotionButtonText: providerSetting("special_promotion_button_text") || "",
    specialPromotionButtonUrl: providerSetting("special_promotion_button_url") || "",
    specialPromotionStyle: normalizePromotionStyle(providerSetting("special_promotion_style")),
    specialPromotionHtml: providerSetting("special_promotion_html") || "",
    specialPromotionPrice1Month: normalizeOptionalPrice(providerSetting("special_promotion_price_1_month")),
    specialPromotionPrice3Months: normalizeOptionalPrice(providerSetting("special_promotion_price_3_months")),
    specialPromotionPrice6Months: normalizeOptionalPrice(providerSetting("special_promotion_price_6_months")),
    specialPromotionPrice9Months: normalizeOptionalPrice(providerSetting("special_promotion_price_9_months")),
    specialPromotionPrice12Months: normalizeOptionalPrice(providerSetting("special_promotion_price_12_months")),
    specialPromotionEmailAudience: normalizePromotionAudience(providerSetting("special_promotion_email_audience")),
    specialPromotionPushAudience: normalizePromotionAudience(providerSetting("special_promotion_push_audience")),
    specialOfferEnabled: boolFromSetting(providerSetting("special_offer_enabled")),
    specialOfferTitle: providerSetting("special_offer_title") || "",
    specialOfferBody: providerSetting("special_offer_body") || "",
    specialOfferBadge: providerSetting("special_offer_badge") || "",
    specialOfferButtonText: providerSetting("special_offer_button_text") || "",
    specialOfferButtonUrl: providerSetting("special_offer_button_url") || "",
    specialOfferStyle: normalizePromotionStyle(providerSetting("special_offer_style"), "premium"),
    specialOfferHtml: providerSetting("special_offer_html") || "",
    specialOfferPrice1Month: normalizeOptionalPrice(providerSetting("special_offer_price_1_month")),
    specialOfferPrice3Months: normalizeOptionalPrice(providerSetting("special_offer_price_3_months")),
    specialOfferPrice6Months: normalizeOptionalPrice(providerSetting("special_offer_price_6_months")),
    specialOfferPrice9Months: normalizeOptionalPrice(providerSetting("special_offer_price_9_months")),
    specialOfferPrice12Months: normalizeOptionalPrice(providerSetting("special_offer_price_12_months")),
    specialOfferEmailAudience: normalizePromotionAudience(providerSetting("special_offer_email_audience")),
    specialOfferPushAudience: normalizePromotionAudience(providerSetting("special_offer_push_audience")),
    expiryEmailAlertsEnabled: boolFromSetting(providerSetting("expiry_email_alerts_enabled")),
    expiryEmailAlertEveryHours: providerSetting("expiry_email_alert_every_hours", "6") || "6",
    expiryPushAlertsEnabled: boolFromSetting(providerSetting("expiry_push_alerts_enabled")),
    expiryPushAlertBeforeHours: providerSetting("expiry_push_alert_before_hours", "12") || "12",
    paymentWalletEnabled: boolFromSetting(providerSetting("payment_wallet_enabled"), true),
    paymentUsdtEnabled: boolFromSetting(providerSetting("payment_usdt_enabled"), true),
    paymentPaypalEnabled: boolFromSetting(providerSetting("payment_paypal_enabled"), true),
    paymentCardEnabled: boolFromSetting(providerSetting("payment_card_enabled"), true),
    paymentPriority: String(providerSetting("payment_priority", "wallet,usdt,paypal,card") || "wallet,usdt,paypal,card")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    tvplusCurrency: normalizeCurrencyCode(settings.get("tvplus_currency")),
    tvplusCreditsPaidAmount: settings.get("tvplus_credits_paid_amount") || "0",
    tvplusCreditsReceived: settings.get("tvplus_credits_received") || "0",
    tvplusCreditUnitCost: normalizeLongDecimal(
      Number(settings.get("tvplus_credits_received") || 0) > 0
        ? Number(settings.get("tvplus_credits_paid_amount") || 0) / Number(settings.get("tvplus_credits_received") || 0)
        : 0,
    ),
    iotvCurrency: normalizeCurrencyCode(settings.get("iotv_currency")),
    iotvCreditsPaidUsd: settings.get("iotv_credits_paid_usd") || "0",
    iotvCreditsReceived: settings.get("iotv_credits_received") || "0",
    iotvCreditUnitCostUsd: normalizeLongDecimal(
      Number(settings.get("iotv_credits_received") || 0) > 0
        ? Number(settings.get("iotv_credits_paid_usd") || 0) / Number(settings.get("iotv_credits_received") || 0)
        : 0,
    ),
    iotvConnectionPriceMultiplierEnabled: boolFromSetting(settings.get("iotv_connection_price_multiplier_enabled")),
    conversionDisplayCurrency: normalizeCurrencyCode(settings.get("conversion_display_currency"), "EUR"),
  };
}

type IptvContentCatalogRow = {
  id: string;
  name: string;
  countryCode: string;
  category: string;
  language: string;
  quality: string;
  contentType: string;
  metadata: Record<string, any> | null;
};

const ISO_COUNTRY_CODES = (
  "AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI KH CM CA CV KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW"
).split(" ");

let regionDisplayNames: any = undefined;
let countryAliasCache: Map<string, string> | null = null;

function normalizeCountryText(value: string) {
  return value
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getRegionDisplayName(code: string) {
  try {
    if (regionDisplayNames === undefined) {
      regionDisplayNames = typeof Intl.DisplayNames === "function"
        ? new Intl.DisplayNames(["en"], { type: "region" })
        : null;
    }
    return regionDisplayNames?.of(code) || code;
  } catch {
    return code;
  }
}

function getCountryAliasMap() {
  if (countryAliasCache) return countryAliasCache;

  const aliases = new Map<string, string>();
  for (const code of ISO_COUNTRY_CODES) {
    const name = getRegionDisplayName(code);
    aliases.set(normalizeCountryText(name), code);
  }

  const manualAliases: Record<string, string> = {
    UK: "GB",
    "U K": "GB",
    BRITAIN: "GB",
    "GREAT BRITAIN": "GB",
    ENGLAND: "GB",
    SCOTLAND: "GB",
    WALES: "GB",
    USA: "US",
    "U S A": "US",
    US: "US",
    "U S": "US",
    AMERICA: "US",
    "UNITED STATES OF AMERICA": "US",
    UAE: "AE",
    "U A E": "AE",
    KSA: "SA",
    "SAUDI": "SA",
    "SAUDI ARABIA": "SA",
    "SOUTH KOREA": "KR",
    KOREA: "KR",
    RUSSIA: "RU",
    VIETNAM: "VN",
    IRAN: "IR",
    SYRIA: "SY",
    TANZANIA: "TZ",
    MOLDOVA: "MD",
    BOLIVIA: "BO",
    VENEZUELA: "VE",
    LAOS: "LA",
    TURKEY: "TR",
    "CZECH REPUBLIC": "CZ",
    "CAPE VERDE": "CV",
  };

  for (const [alias, code] of Object.entries(manualAliases)) {
    aliases.set(normalizeCountryText(alias), code);
  }

  countryAliasCache = aliases;
  return aliases;
}

function countryNameForCode(code: string) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return normalized;
  return getRegionDisplayName(normalized);
}

function buildAllIptvCountries() {
  return ISO_COUNTRY_CODES
    .map((code) => ({
      code,
      name: countryNameForCode(code),
      channelCount: 0,
      movieCount: 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function countryCodeFromText(value: string) {
  const normalized = normalizeCountryText(value);
  if (!normalized) return "";

  const parts = normalized.split(" ");
  const firstToken = parts[0] || "";
  const aliases = getCountryAliasMap();
  const directToken = aliases.get(firstToken);
  if (directToken) return directToken;
  if (/^[A-Z]{2}$/.test(firstToken) && ISO_COUNTRY_CODES.includes(firstToken)) return firstToken;

  const sortedAliases = Array.from(aliases.entries()).sort((a, b) => b[0].length - a[0].length);
  const padded = ` ${normalized} `;
  for (const [alias, code] of sortedAliases) {
    if (alias.length < 3) continue;
    if (padded.includes(` ${alias} `)) return code;
  }

  return "";
}

function inferCountryCode(...values: string[]) {
  for (const value of values) {
    const code = countryCodeFromText(value);
    if (code) return code;
  }
  return "";
}

export async function getIptvContentCatalog() {
  await ensureIptvSchema();

  const [countryRows, liveRows, mediaRows] = await Promise.all([
    queryRows<IptvContentCatalogRow & {
      country?: string;
      groupName?: string;
      sourceCategory?: string;
      total: string;
    }>(
      `SELECT country_code AS "countryCode",
              category,
              metadata->>'country' AS country,
              metadata->>'group' AS "groupName",
              metadata->>'sourceCategory' AS "sourceCategory",
              COALESCE(metadata->>'contentType', 'live') AS "contentType",
              COUNT(*)::text AS total
       FROM iptv_channels
       WHERE active = true
       GROUP BY country_code, category, metadata->>'country', metadata->>'group',
                metadata->>'sourceCategory', COALESCE(metadata->>'contentType', 'live')`,
    ),
    queryRows<IptvContentCatalogRow>(
      `SELECT id, name, country_code AS "countryCode", category, language, quality,
              COALESCE(metadata->>'contentType', 'live') AS "contentType",
              metadata
       FROM iptv_channels
       WHERE active = true
         AND COALESCE(metadata->>'contentType', 'live') = 'live'
       ORDER BY sort_order ASC, name ASC
       LIMIT 24`,
    ),
    queryRows<IptvContentCatalogRow>(
      `SELECT id, name, country_code AS "countryCode", category, language, quality,
              COALESCE(metadata->>'contentType', 'live') AS "contentType",
              metadata
       FROM iptv_channels
       WHERE active = true
         AND COALESCE(metadata->>'contentType', 'live') IN ('vod', 'series')
       ORDER BY sort_order ASC, name ASC
       LIMIT 24`,
    ),
  ]);

  const countries = new Map(buildAllIptvCountries().map((country) => [country.code, country]));
  const channels: Array<{ id: string; name: string; countryCode: string; category: string; language: string; quality: string }> = [];
  const movies: Array<{ id: string; title: string; genre: string; year: number; runtimeMinutes: number; rating: string; quality: string }> = [];

  for (const row of countryRows) {
    const contentType = String(row.contentType || "live");
    const countryCode = String(row.countryCode || "").trim().toUpperCase()
      || inferCountryCode(row.category, row.country || "", row.groupName || "", row.sourceCategory || "");

    if (!countryCode || !countries.has(countryCode)) continue;

    const country = countries.get(countryCode) || {
      code: countryCode,
      name: countryNameForCode(countryCode),
      channelCount: 0,
      movieCount: 0,
    };
    const total = Number(row.total || 0);
    if (contentType === "vod" || contentType === "series") {
      country.movieCount += total;
    } else {
      country.channelCount += total;
    }
    countries.set(countryCode, country);
  }

  for (const row of liveRows) {
    const metadata = row.metadata || {};
    const countryCode = String(row.countryCode || "").trim().toUpperCase()
      || inferCountryCode(row.category, row.name, metadata.country || "", metadata.group || "", metadata.sourceCategory || "");

    channels.push({
      id: row.id,
      name: row.name,
      countryCode,
      category: row.category,
      language: row.language,
      quality: row.quality,
    });
  }

  for (const row of mediaRows) {
    const metadata = row.metadata || {};
    const contentType = String(row.contentType || "vod");
    movies.push({
      id: row.id,
      title: row.name,
      genre: row.category || (contentType === "series" ? "Series" : "Movies"),
      year: Number(metadata.year || metadata.releaseDate?.slice?.(0, 4)) || new Date().getFullYear(),
      runtimeMinutes: Number(metadata.runtimeMinutes || metadata.duration || 0),
      rating: String(metadata.rating || ""),
      quality: row.quality,
    });
  }

  return {
    countries: Array.from(countries.values()).sort((a, b) => a.name.localeCompare(b.name)),
    channels: channels.length ? channels : IPTV_CONTENT_CATALOG.channels,
    movies: movies.length ? movies : IPTV_CONTENT_CATALOG.movies,
  };
}

function countCatalogItems(payload: any) {
  const directCount = Number(payload?.count);
  if (Number.isFinite(directCount) && directCount >= 0) return directCount;

  const categories = Array.isArray(payload?.categories) ? payload.categories : [];
  return categories.reduce((sum: number, category: any) => {
    const channels = Array.isArray(category?.channels) ? category.channels.length : 0;
    const movies = Array.isArray(category?.movies) ? category.movies.length : 0;
    const series = Array.isArray(category?.series) ? category.series.length : 0;
    const items = Array.isArray(category?.items) ? category.items.length : 0;
    return sum + channels + movies + series + items;
  }, 0);
}

async function fetchCatalogPart(url: string): Promise<IptvCatalogPart> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`catalog request failed with ${response.status}`);
    }

    const payload: any = await response.json();
    const categories = Array.isArray(payload?.categories) ? payload.categories.length : 0;

    return {
      count: countCatalogItems(payload),
      categories,
      updatedAt: payload?.updated_at || payload?.updatedAt || null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getIptvProviderCatalogSummary() {
  const now = Date.now();
  if (iptvResellerHubCatalogCache && iptvResellerHubCatalogCache.expiresAt > now) {
    return iptvResellerHubCatalogCache.data;
  }

  const [liveResult, vodResult, seriesResult] = await Promise.allSettled([
    fetchCatalogPart(IPTV_RESELLER_HUB_CATALOG_ENDPOINTS.live),
    fetchCatalogPart(IPTV_RESELLER_HUB_CATALOG_ENDPOINTS.vod),
    fetchCatalogPart(IPTV_RESELLER_HUB_CATALOG_ENDPOINTS.series),
  ]);

  const errors: string[] = [];
  const readPart = (result: PromiseSettledResult<IptvCatalogPart>, label: string): IptvCatalogPart => {
    if (result.status === "fulfilled") return result.value;
    const message = result.reason instanceof Error ? result.reason.message : "unknown error";
    errors.push(`${label}: ${message}`);
    return { count: 0, categories: 0, updatedAt: null, error: message };
  };

  const live = readPart(liveResult, "Live channels");
  const vod = readPart(vodResult, "Movies");
  const series = readPart(seriesResult, "Series");
  const updatedAt = [live.updatedAt, vod.updatedAt, series.updatedAt].filter(Boolean).sort().pop() || null;

  const data: IptvProviderCatalogSummary = {
    provider: "iotv",
    label: "IPTV Reseller Hub Provider",
    source: IPTV_RESELLER_HUB_CATALOG_SOURCE,
    liveCount: live.count,
    movieCount: vod.count,
    seriesCount: series.count,
    liveCategories: live.categories,
    movieCategories: vod.categories,
    seriesCategories: series.categories,
    updatedAt,
    fetchedAt: new Date().toISOString(),
    errors,
  };

  if (errors.length === 0 || !iptvResellerHubCatalogCache) {
    iptvResellerHubCatalogCache = {
      expiresAt: now + 15 * 60 * 1000,
      data,
    };
  }

  if (errors.length > 0 && iptvResellerHubCatalogCache) {
    return { ...iptvResellerHubCatalogCache.data, errors };
  }

  return data;
}

export async function getTvplusProviderCatalogSummary() {
  await ensureIptvSchema();
  const rows = await queryRows<{ contentType: string; total: string }>(
    `SELECT COALESCE(metadata->>'contentType', 'live') AS "contentType", COUNT(*)::text AS total
     FROM iptv_channels
     WHERE provider = 'tvplus'
     GROUP BY COALESCE(metadata->>'contentType', 'live')`,
  );
  const lastSync = await queryOne<{ updatedAt: string | null }>(
    `SELECT MAX(updated_at)::text AS "updatedAt"
     FROM iptv_channels
     WHERE provider = 'tvplus' AND metadata->>'source' = 'tvplus-player-api'`,
  );
  const countFor = (type: string) => Number(rows.find((row) => row.contentType === type)?.total || 0);
  const ottSummary = await getTvplusOttDinoCatalogSummary();

  return {
    provider: "tvplus" as const,
    label: "TVPLUS",
    source: ottSummary.source,
    liveCount: ottSummary.liveCount || countFor("live"),
    movieCount: ottSummary.movieCount || countFor("vod"),
    seriesCount: ottSummary.seriesCount || countFor("series"),
    liveCategories: 0,
    movieCategories: 0,
    seriesCategories: 0,
    updatedAt: ottSummary.updatedAt || lastSync?.updatedAt || null,
    fetchedAt: new Date().toISOString(),
    errors: ottSummary.errors || [],
  };
}

function parseOttCreditsDinoCounts(html: string) {
  const text = decodeHtmlText(html);
  const numberAfter = (patterns: RegExp[], fallback: number) => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const value = Number(match[1].replace(/,/g, ""));
        if (Number.isFinite(value) && value > 0) return value;
      }
    }
    return fallback;
  };

  return {
    liveCount: numberAfter([/Live\s*Tv\s*:?\s*([\d,]+)/i, /Live\s*TV\s*:?\s*([\d,]+)/i], TVPLUS_OTT_DINO_DEFAULT_COUNTS.liveCount),
    movieCount: numberAfter([/Movies\s*:?\s*([\d,]+)/i], TVPLUS_OTT_DINO_DEFAULT_COUNTS.movieCount),
    seriesCount: numberAfter([/Series\s*:?\s*([\d,]+)/i], TVPLUS_OTT_DINO_DEFAULT_COUNTS.seriesCount),
  };
}

async function getTvplusOttDinoCatalogSummary() {
  const now = Date.now();
  if (tvplusOttDinoCatalogCache && tvplusOttDinoCatalogCache.expiresAt > now) {
    return tvplusOttDinoCatalogCache.data;
  }

  const sourceUrl = TVPLUS_OTT_DINO_CATALOG_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let counts = TVPLUS_OTT_DINO_DEFAULT_COUNTS;
  const errors: string[] = [];

  try {
    const response = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 IPTV Sync",
        accept: "text/html,application/xhtml+xml",
      },
    });
    const html = await response.text();
    if (!response.ok) throw new Error(`OTT Credits Dino page failed with ${response.status}`);
    counts = parseOttCreditsDinoCounts(html);
  } catch (error: any) {
    errors.push(error.message || "Could not fetch OTT Credits Dino IPTV page");
  } finally {
    clearTimeout(timeout);
  }

  const data: IptvProviderCatalogSummary = {
    provider: "tvplus",
    label: "TVPLUS",
    source: sourceUrl,
    liveCount: counts.liveCount,
    movieCount: counts.movieCount,
    seriesCount: counts.seriesCount,
    liveCategories: 0,
    movieCategories: 0,
    seriesCategories: 0,
    updatedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    errors,
  };

  tvplusOttDinoCatalogCache = {
    expiresAt: now + 30 * 60 * 1000,
    data,
  };

  return data;
}

export async function listIptvCurrencyRates() {
  try {
    return await queryRows<{ code: string; conversionRate: string }>(
      `SELECT id, code, name, symbol, conversion_rate AS "conversionRate",
              is_default AS "isDefault", is_enabled AS "isEnabled"
       FROM currency_rates
       WHERE is_enabled = true
       ORDER BY is_default DESC, code ASC`,
    );
  } catch {
    return [{ code: "USD", conversionRate: "1.000000" }];
  }
}

export async function syncIptvCurrencyRatesFromFreeProvider() {
  await ensureIptvSchema();

  const response = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!response.ok) {
    throw new Error(`Currency rate provider failed with ${response.status}`);
  }

  const payload: any = await response.json();
  const rates = payload?.rates || {};
  if (!rates || typeof rates !== "object" || !rates.USD) {
    throw new Error("Currency rate provider returned an invalid response");
  }

  const currencies = await listIptvCurrencyRates();
  const updated: any[] = [];

  for (const currency of currencies) {
    const code = String((currency as any).code || "").toUpperCase();
    const rate = Number(rates[code]);
    if (!code || !Number.isFinite(rate) || rate <= 0) continue;

    const normalizedRate = normalizeLongDecimal(rate);
    await pool.query(
      `UPDATE currency_rates
       SET conversion_rate = $2,
           updated_at = now()
       WHERE code = $1`,
      [code, normalizedRate],
    );
    updated.push({ code, conversionRate: normalizedRate });
  }

  return {
    provider: "open.er-api.com",
    base: "USD",
    updatedAt: payload?.time_last_update_utc || new Date().toISOString(),
    updated,
    currencies: await listIptvCurrencyRates(),
  };
}

export async function listIptvChannelProviders() {
  await ensureIptvSchema();
  const rows = await queryRows<{ provider: string; channelCount: string }>(
    `SELECT provider, COUNT(*)::text AS "channelCount"
     FROM iptv_channels
     GROUP BY provider
     ORDER BY provider`,
  );

  const knownProviders = [
    { id: "tvplus", name: "TVPLUS" },
    { id: "iotv", name: "IPTV Reseller Hub Provider" },
  ];

  return knownProviders.map((provider) => {
    const row = rows.find((item) => item.provider === provider.id);
    return {
      ...provider,
      channelCount: Number(row?.channelCount || 0),
    };
  });
}

export async function listEditableIptvChannels(provider = "iotv") {
  await ensureIptvSchema();
  const selectedProvider = String(provider || "iotv").toLowerCase() === "tvplus" ? "tvplus" : "iotv";
  return queryRows(
    `SELECT id, provider, external_id AS "externalId", name, country_code AS "countryCode",
            category, language, quality, active, sort_order AS "sortOrder",
            metadata, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM iptv_channels
     WHERE provider = $1
     ORDER BY sort_order ASC, name ASC
     LIMIT 500`,
    [selectedProvider],
  );
}

export async function listIptvBouquetContent(input: Record<string, any> = {}) {
  await ensureIptvSchema();
  const provider = String(input.provider || "iotv").toLowerCase() === "tvplus" ? "tvplus" : "iotv";
  const contentType = ["live", "vod", "series"].includes(String(input.contentType || "")) ? String(input.contentType) : "live";
  const category = String(input.category || "").trim();
  const search = String(input.search || "").trim();

  const categoryRows = await queryRows(
    `SELECT category,
            COUNT(*)::integer AS total,
            COUNT(*) FILTER (WHERE active = true)::integer AS active,
            COUNT(*) FILTER (WHERE active = false)::integer AS blocked
     FROM iptv_channels
     WHERE provider = $1
       AND COALESCE(metadata->>'contentType', 'live') = $2
     GROUP BY category
     ORDER BY total DESC, category ASC`,
    [provider, contentType],
  );

  const selectedCategory = category || String(categoryRows[0]?.category || "");
  const params: any[] = [provider, contentType];
  const where = [
    `provider = $1`,
    `COALESCE(metadata->>'contentType', 'live') = $2`,
  ];

  if (selectedCategory) {
    params.push(selectedCategory);
    where.push(`category = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(`name ILIKE $${params.length}`);
  }

  params.push(500);
  const channels = await queryRows(
    `SELECT id, provider, external_id AS "externalId", name, country_code AS "countryCode",
            category, language, quality, active, sort_order AS "sortOrder",
            metadata, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM iptv_channels
     WHERE ${where.join(" AND ")}
     ORDER BY sort_order ASC, name ASC
     LIMIT $${params.length}`,
    params,
  );

  const totals = await queryRows<{ contentType: string; total: string }>(
    `SELECT COALESCE(metadata->>'contentType', 'live') AS "contentType", COUNT(*)::text AS total
     FROM iptv_channels
     WHERE provider = $1
     GROUP BY COALESCE(metadata->>'contentType', 'live')`,
    [provider],
  );

  const countFor = (type: string) => Number(totals.find((item) => item.contentType === type)?.total || 0);

  return {
    provider,
    contentType,
    selectedCategory,
    categories: categoryRows,
    channels,
    totals: {
      live: countFor("live"),
      vod: countFor("vod"),
      series: countFor("series"),
    },
  };
}

export async function updateIptvCategoryStatus(input: Record<string, any>) {
  await ensureIptvSchema();
  const provider = String(input.provider || "iotv").toLowerCase() === "tvplus" ? "tvplus" : "iotv";
  const contentType = ["live", "vod", "series"].includes(String(input.contentType || "")) ? String(input.contentType) : "live";
  const category = String(input.category || "").trim();
  if (!category) throw new Error("Category is required");
  const active = Boolean(input.active);

  await pool.query(
    `UPDATE iptv_channels
     SET active = $4,
         updated_at = now()
     WHERE provider = $1
       AND COALESCE(metadata->>'contentType', 'live') = $2
       AND category = $3`,
    [provider, contentType, category, active],
  );

  return listIptvBouquetContent({ provider, contentType, category });
}

export async function updateEditableIptvChannel(id: string, input: Record<string, any>) {
  await ensureIptvSchema();
  const existing = await queryOne(`SELECT id FROM iptv_channels WHERE id = $1`, [id]);
  if (!existing) throw new Error("IPTV channel not found");

  return queryOne(
    `UPDATE iptv_channels
     SET name = COALESCE($2, name),
         country_code = COALESCE($3, country_code),
         category = COALESCE($4, category),
         language = COALESCE($5, language),
         quality = COALESCE($6, quality),
         active = COALESCE($7, active),
         sort_order = COALESCE($8, sort_order),
         updated_at = now()
     WHERE id = $1
     RETURNING id, provider, external_id AS "externalId", name, country_code AS "countryCode",
               category, language, quality, active, sort_order AS "sortOrder",
               metadata, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      id,
      input.name === undefined ? null : String(input.name),
      input.countryCode === undefined ? null : String(input.countryCode),
      input.category === undefined ? null : String(input.category),
      input.language === undefined ? null : String(input.language),
      input.quality === undefined ? null : String(input.quality),
      input.active === undefined ? null : Boolean(input.active),
      input.sortOrder === undefined ? null : Number(input.sortOrder) || 0,
    ],
  );
}

function detectStreamQuality(name: unknown) {
  const value = String(name || "").toUpperCase();
  if (value.includes(" 4K") || value.includes("UHD")) return "4K";
  if (value.includes("FHD") || value.includes("1080")) return "FHD";
  if (value.includes("HD") || value.includes("720")) return "HD";
  if (value.includes("SD")) return "SD";
  return "";
}

function extractPlayerApiBase(m3uUrl: unknown) {
  const rawUrl = String(m3uUrl || "").trim();
  if (!rawUrl || rawUrl.includes("demo.tvplus.local")) return "";
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "";
  }
}

async function getTvplusPlayerApiCredentials() {
  await ensureIptvSchema();
  const rows = await queryRows(
    `SELECT o.username, o.password, o.m3u_url AS "m3uUrl", o.provider_response AS "providerResponse",
            p.tvplus_package_id AS "tvplusPackageId"
     FROM iptv_orders o
     LEFT JOIN iptv_packages p ON p.id = o.package_id
     WHERE o.device_type = 'm3u'
       AND o.m3u_url IS NOT NULL
       AND o.m3u_url <> ''
       AND o.m3u_url NOT ILIKE '%demo.tvplus.local%'
       AND COALESCE(o.provider_response->>'provider', o.provider_response->>'source', '') NOT IN ('iotv')
       AND COALESCE(p.tvplus_package_id, '') NOT ILIKE 'iotv-%'
     ORDER BY CASE WHEN o.status = 'active' THEN 0 ELSE 1 END, o.created_at DESC
     LIMIT 1`,
  );

  const order = withProviderCredentials(rows[0] || null);
  const baseUrl = extractPlayerApiBase(order?.m3uUrl);
  const username = String(order?.username || "").trim();
  const password = String(order?.password || "").trim();

  if (!baseUrl || !username || !password) {
    throw new Error("No real TVPLUS M3U line is available. TVPLUS Player API sync needs a TVPLUS username/password from a real TVPLUS M3U account; IPTV Reseller Hub lines cannot be used for TVPLUS.");
  }

  return { baseUrl, username, password };
}

async function tvplusPlayerApiRequest(action: string, credentials: { baseUrl: string; username: string; password: string }) {
  const url = new URL(`${credentials.baseUrl.replace(/\/+$/, "")}/player_api.php`);
  url.searchParams.set("username", credentials.username);
  url.searchParams.set("password", credentials.password);
  url.searchParams.set("action", action);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    if (!response.ok) throw new Error(`TVPLUS player API failed with ${response.status}`);
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`TVPLUS player API returned invalid JSON: ${text.slice(0, 120)}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

function buildCategoryMap(categories: any[]) {
  const map = new Map<string, string>();
  for (const category of Array.isArray(categories) ? categories : []) {
    const id = String(category.category_id ?? category.id ?? "").trim();
    const name = String(category.category_name ?? category.name ?? "").trim();
    if (id && name) map.set(id, name);
  }
  return map;
}

function normalizeTvplusContentRows(items: any[], contentType: "live" | "vod" | "series", categories: Map<string, string>) {
  return (Array.isArray(items) ? items : []).map((item: any, index: number) => {
    const rawId = contentType === "series" ? item.series_id : item.stream_id;
    const externalId = `${contentType}-${String(rawId ?? item.num ?? index)}`;
    const categoryId = String(item.category_id || "").trim();
    const name = String(item.name || item.title || `${contentType.toUpperCase()} ${index + 1}`).trim();

    return {
      externalId,
      name,
      countryCode: inferCountryCode(categories.get(categoryId) || categoryId, name),
      category: categories.get(categoryId) || categoryId || contentType.toUpperCase(),
      language: "",
      quality: detectStreamQuality(name),
      sortOrder: index,
      metadata: {
        source: "tvplus-player-api",
        contentType,
        streamId: item.stream_id ?? null,
        seriesId: item.series_id ?? null,
        categoryId,
        icon: item.stream_icon || item.cover || "",
        containerExtension: item.container_extension || "",
      },
    };
  });
}

async function fetchIptvResellerHubCatalogPayload(contentType: "live" | "vod" | "series") {
  const url = IPTV_RESELLER_HUB_CATALOG_ENDPOINTS[contentType];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 IPTV Sync",
        accept: "application/json,text/plain,*/*",
      },
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`IPTV Reseller Hub catalog failed with ${response.status}`);
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`IPTV Reseller Hub catalog returned invalid JSON: ${text.slice(0, 120)}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeIptvResellerHubRows(payload: any, contentType: "live" | "vod" | "series") {
  const rows: Array<Record<string, any>> = [];
  const categories = Array.isArray(payload?.categories) ? payload.categories : [];

  for (const category of categories) {
    const categoryName = String(category?.name || contentType.toUpperCase()).trim();
    const categoryId = String(category?.id ?? "").trim();
    const categoryMeta = category?.meta && typeof category.meta === "object" ? category.meta : {};
    const items = Array.isArray(category?.items)
      ? category.items
      : Array.isArray(category?.channels)
        ? category.channels
        : Array.isArray(category?.movies)
          ? category.movies
          : Array.isArray(category?.series)
            ? category.series
            : [];

    for (const item of items) {
      const rawId = String(item?.id ?? `${categoryId}-${rows.length}`).trim();
      const name = String(item?.name || item?.title || `${contentType.toUpperCase()} ${rows.length + 1}`).trim();
      if (!name) continue;
      const logo = String(item?.logo || item?.poster || item?.cover || "").trim();

      rows.push({
        externalId: `iotv-${contentType}-${rawId}`,
        name,
        countryCode: inferCountryCode(categoryMeta.country || "", categoryName, categoryMeta.group || "", name),
        category: categoryName,
        language: "",
        quality: detectStreamQuality(name),
        sortOrder: rows.length,
        metadata: {
          source: "iptv-reseller-hub-catalog",
          sourceUrl: IPTV_RESELLER_HUB_CATALOG_ENDPOINTS[contentType],
          contentType,
          streamId: rawId,
          categoryId,
          logo,
          cover: logo,
          country: categoryMeta.country || "",
          group: categoryMeta.group || "",
          updatedAt: payload?.updated_at || payload?.updatedAt || "",
        },
      });
    }
  }

  return rows;
}

function decodeHtmlText(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, "-")
    .replace(/&#038;|&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugForExternalId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function inferDinoContentType(name: string): "live" | "vod" | "series" {
  const value = name.toUpperCase();
  if (/\b(VOD|MOVIE|MOVIES|FILM|FILMS|CINEMA|CINE|BOX OFFICE|OSCAR)\b/.test(value)) return "vod";
  if (/\b(SERIES|SERIE|SERIAL|EPISODE|EPISODES|DRAMA)\b/.test(value)) return "series";
  return "live";
}

function inferDinoCategory(name: string, contentType: "live" | "vod" | "series") {
  const value = name.toUpperCase();
  if (contentType === "vod") return "VOD";
  if (contentType === "series") return "Series";
  if (/\bSPORT|ESPN|BEIN|NBA|NFL|MLB|NHL|DAZN|SKY SPORTS\b/.test(value)) return "Sports";
  if (/\bNEWS|CNN|BBC|CNBC|MSNBC|BLOOMBERG|AL JAZEERA|FRANCE 24\b/.test(value)) return "News";
  if (/\bKIDS|DISNEY|NICK|CARTOON|BABY|BOOMERANG\b/.test(value)) return "Kids";
  if (/\bMUSIC|MTV|HITS|RADIO\b/.test(value)) return "Music";
  if (/\bDOCUMENTARY|DISCOVERY|HISTORY|NAT GEO|ANIMAL\b/.test(value)) return "Documentary";
  return "Live TV";
}

function isDinoCategoryHeading(text: string) {
  const value = decodeHtmlText(text);
  if (!value || value.length < 2 || value.length > 80) return false;
  if (/^(skip to content|contact us|buy it now|dino iptv channels list|our worldwide channel list)$/i.test(value)) return false;
  if (/^https?:\/\//i.test(value)) return false;
  if (/^\d+$/.test(value)) return false;
  if (value.includes("@")) return false;
  return /(^[A-Z0-9 .&|/+\-[\]():'’]+$)|(\bHIGH QUALITY\b)|(^[A-Z]{2,4}\s*[-|])|(^\s*(EU|USA|UK|CANADA|ARABIC|SPORT|NEWS|KIDS|MOVIES|SERIES)\b)/.test(value);
}

function parseDinoChannelList(html: string, source: string) {
  const rows: Array<Record<string, any>> = [];
  const seen = new Set<string>();
  const tokens = html.matchAll(/<(h[1-6]|p|strong|b|li)[^>]*>([\s\S]*?)<\/\1>/gi);
  let currentCategory = "";

  for (const match of tokens) {
    const tag = String(match[1] || "").toLowerCase();
    const text = decodeHtmlText(match[2] || "");
    if (!text || text.length < 2) continue;

    if (tag !== "li") {
      if (isDinoCategoryHeading(text)) currentCategory = text;
      continue;
    }

    const name = text;
    if (!name || name.length < 3 || /^skip to content$/i.test(name)) continue;

    const contentType = inferDinoContentType(name);
    const externalId = `dino-${contentType}-${slugForExternalId(name)}`;
    if (seen.has(externalId)) continue;
    seen.add(externalId);

    rows.push({
      externalId,
      name,
      countryCode: inferCountryCode(currentCategory, name),
      category: currentCategory || inferDinoCategory(name, contentType),
      language: "",
      quality: detectStreamQuality(name),
      sortOrder: rows.length,
      metadata: {
        source: "dino-channel-list",
        sourceUrl: source,
        sourceCategory: currentCategory || "",
        contentType,
      },
    });
  }

  return rows;
}

async function fetchDinoChannelListHtml() {
  const errors: string[] = [];

  for (const sourceUrl of TVPLUS_DINO_CHANNEL_LIST_URLS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(sourceUrl, {
        signal: controller.signal,
        headers: {
          "user-agent": "Mozilla/5.0 IPTV Sync",
          accept: "text/html,application/xhtml+xml",
        },
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`Dino channel list failed with ${response.status}`);
      if (!text.includes("<li")) throw new Error("Dino channel list did not include channel rows");
      return { sourceUrl, html: text };
    } catch (error: any) {
      errors.push(`${sourceUrl}: ${error.message || "request failed"}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`Could not load Dino TVPLUS channel list. ${errors.join("; ")}`);
}

async function upsertProviderContentRows(provider: "tvplus" | "iotv", rows: Array<Record<string, any>>) {
  if (rows.length === 0) return 0;

  const batchSize = 1000;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    await pool.query(
      `INSERT INTO iptv_channels (
         provider, external_id, name, country_code, category, language, quality, active, sort_order, metadata, updated_at
       )
       SELECT $2, item."externalId", item.name, item."countryCode", item.category, item.language,
              item.quality, true, item."sortOrder", item.metadata, now()
       FROM jsonb_to_recordset($1::jsonb) AS item(
         "externalId" text,
         name text,
         "countryCode" text,
         category text,
         language text,
         quality text,
         "sortOrder" integer,
         metadata jsonb
       )
       ON CONFLICT (provider, external_id)
       DO UPDATE SET name = EXCLUDED.name,
                     category = EXCLUDED.category,
                     language = EXCLUDED.language,
                     quality = EXCLUDED.quality,
                     sort_order = EXCLUDED.sort_order,
                     metadata = EXCLUDED.metadata,
                     updated_at = now()`,
      [JSON.stringify(batch), provider],
    );
  }

  return rows.length;
}

async function upsertTvplusContentRows(rows: Array<Record<string, any>>) {
  return upsertProviderContentRows("tvplus", rows);
}

export async function syncTvplusDinoContentCatalog() {
  await ensureIptvSchema();
  const { sourceUrl, html } = await fetchDinoChannelListHtml();
  const rows = parseDinoChannelList(html, sourceUrl);
  if (rows.length === 0) throw new Error("Dino channel list returned no TVPLUS content rows");

  await upsertTvplusContentRows(rows);

  const countByType = (type: string) => rows.filter((row) => row.metadata?.contentType === type).length;
  return {
    provider: "tvplus",
    source: sourceUrl,
    liveCount: countByType("live"),
    movieCount: countByType("vod"),
    seriesCount: countByType("series"),
    totalCount: rows.length,
    syncedAt: new Date().toISOString(),
  };
}

export async function syncTvplusContentCatalog() {
  const credentials = await getTvplusPlayerApiCredentials();
  const [
    liveCategories,
    vodCategories,
    seriesCategories,
    liveStreams,
    vodStreams,
    seriesStreams,
  ] = await Promise.all([
    tvplusPlayerApiRequest("get_live_categories", credentials),
    tvplusPlayerApiRequest("get_vod_categories", credentials),
    tvplusPlayerApiRequest("get_series_categories", credentials),
    tvplusPlayerApiRequest("get_live_streams", credentials),
    tvplusPlayerApiRequest("get_vod_streams", credentials),
    tvplusPlayerApiRequest("get_series", credentials),
  ]);

  const liveRows = normalizeTvplusContentRows(liveStreams, "live", buildCategoryMap(liveCategories));
  const vodRows = normalizeTvplusContentRows(vodStreams, "vod", buildCategoryMap(vodCategories));
  const seriesRows = normalizeTvplusContentRows(seriesStreams, "series", buildCategoryMap(seriesCategories));
  await upsertTvplusContentRows([...liveRows, ...vodRows, ...seriesRows]);

  return {
    provider: "tvplus",
    source: `${credentials.baseUrl}/player_api.php`,
    liveCount: liveRows.length,
    movieCount: vodRows.length,
    seriesCount: seriesRows.length,
    totalCount: liveRows.length + vodRows.length + seriesRows.length,
    syncedAt: new Date().toISOString(),
  };
}

export async function syncIptvResellerHubContentCatalog() {
  await ensureIptvSchema();
  const [livePayload, vodPayload, seriesPayload] = await Promise.all([
    fetchIptvResellerHubCatalogPayload("live"),
    fetchIptvResellerHubCatalogPayload("vod"),
    fetchIptvResellerHubCatalogPayload("series"),
  ]);

  const liveRows = normalizeIptvResellerHubRows(livePayload, "live");
  const vodRows = normalizeIptvResellerHubRows(vodPayload, "vod");
  const seriesRows = normalizeIptvResellerHubRows(seriesPayload, "series");
  const rows = [...liveRows, ...vodRows, ...seriesRows];
  if (rows.length === 0) throw new Error("IPTV Reseller Hub catalog returned no content rows");

  await upsertProviderContentRows("iotv", rows);

  iptvResellerHubCatalogCache = null;
  return {
    provider: "iotv",
    source: IPTV_RESELLER_HUB_CATALOG_SOURCE,
    liveCount: liveRows.length,
    movieCount: vodRows.length,
    seriesCount: seriesRows.length,
    totalCount: rows.length,
    syncedAt: new Date().toISOString(),
  };
}

function m3uSafe(value: unknown) {
  return String(value || "").replace(/[\r\n,]/g, " ").trim();
}

function extractM3uCredentials(m3uUrl: unknown) {
  const rawUrl = String(m3uUrl || "").trim();
  if (!rawUrl) return {};

  try {
    const parsed = new URL(rawUrl);
    const username = parsed.searchParams.get("username") || "";
    const password = parsed.searchParams.get("password") || "";
    return {
      username: username.trim() || undefined,
      password: password.trim() || undefined,
    };
  } catch {
    return {};
  }
}

export const IPTV_M3U_FORMATS = [
  {
    key: "m3u_plus_ts",
    label: "M3U Plus - MPEG-TS",
    description: "Best for IPTV Smarters, TiviMate, and most apps.",
    type: "m3u_plus",
    output: "ts",
  },
  {
    key: "m3u_plus_m3u8",
    label: "M3U Plus - HLS",
    description: "Use when your player prefers .m3u8 streams.",
    type: "m3u_plus",
    output: "m3u8",
  },
  {
    key: "m3u_ts",
    label: "Simple M3U - MPEG-TS",
    description: "Plain channel list for basic players.",
    type: "m3u",
    output: "ts",
  },
  {
    key: "m3u_m3u8",
    label: "Simple M3U - HLS",
    description: "Plain channel list with HLS streams.",
    type: "m3u",
    output: "m3u8",
  },
] as const;

export type IptvM3uFormatKey = typeof IPTV_M3U_FORMATS[number]["key"];

export function getIptvM3uFormat(key: unknown) {
  const requested = String(key || "").trim();
  return IPTV_M3U_FORMATS.find((format) => format.key === requested) || IPTV_M3U_FORMATS[0];
}

export function buildIptvM3uUrl(order: Record<string, any> = {}, formatKey?: unknown) {
  const rawUrl = String(order.m3uUrl || "").trim();
  if (!rawUrl) return "";

  const format = getIptvM3uFormat(formatKey);
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.set("type", format.type);
    parsed.searchParams.set("output", format.output);

    if (!parsed.searchParams.get("username") && order.username) {
      parsed.searchParams.set("username", String(order.username));
    }
    if (!parsed.searchParams.get("password") && order.password) {
      parsed.searchParams.set("password", String(order.password));
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export function listIptvM3uFormats(order: Record<string, any> = {}) {
  if (!order?.m3uUrl) return [];
  return IPTV_M3U_FORMATS.map((format) => ({
    key: format.key,
    label: format.label,
    description: format.description,
    type: format.type,
    output: format.output,
    url: buildIptvM3uUrl(order, format.key),
  }));
}

function withProviderCredentials<T extends Record<string, any> | null>(order: T): T {
  if (!order || order.deviceType !== "m3u") return order;
  const credentials = extractM3uCredentials(order.m3uUrl);
  if (!credentials.username && !credentials.password) {
    return {
      ...order,
      m3uFormats: listIptvM3uFormats(order),
    };
  }
  return {
    ...order,
    username: credentials.username || order.username,
    password: credentials.password || order.password,
    m3uFormats: listIptvM3uFormats({
      ...order,
      username: credentials.username || order.username,
      password: credentials.password || order.password,
    }),
  };
}

export function buildIptvM3uPlaylist(order: Record<string, any> = {}) {
  const lines = ["#EXTM3U"];
  const providerOrder = withProviderCredentials(order) || order;
  const username = encodeURIComponent(String(providerOrder.username || "demo"));
  const password = encodeURIComponent(String(providerOrder.password || "demo"));
  const streamBase = "http://demo.tvplus.local";

  IPTV_CONTENT_CATALOG.channels.forEach((channel, index) => {
    lines.push(
      `#EXTINF:-1 tvg-id="${m3uSafe(channel.id)}" tvg-name="${m3uSafe(channel.name)}" group-title="${m3uSafe(channel.countryCode)} ${m3uSafe(channel.category)}",${m3uSafe(channel.name)} ${m3uSafe(channel.quality)}`,
      `${streamBase}/live/${username}/${password}/${1000 + index}.m3u8`,
    );
  });

  IPTV_CONTENT_CATALOG.movies.forEach((movie, index) => {
    lines.push(
      `#EXTINF:-1 tvg-id="${m3uSafe(movie.id)}" tvg-name="${m3uSafe(movie.title)}" group-title="Movies ${m3uSafe(movie.genre)}",${m3uSafe(movie.title)} (${m3uSafe(movie.year)}) ${m3uSafe(movie.quality)}`,
      `${streamBase}/movie/${username}/${password}/${2000 + index}.mp4`,
    );
  });

  lines.push("");
  return lines.join("\n");
}

export async function updateIptvSettings(input: Record<string, any>) {
  const currentSettings = await getRawSettings();
  const targetProvider = normalizeIptvProviderKey(input.active_provider ?? currentSettings.get("active_provider"));
  const allowed = [
    "enabled",
    "active_provider",
    "api_key",
    "api_base_url",
    "default_package_id",
    "default_package_name",
    "retail_margin_percent",
    "demo_enabled",
    "provider_demo_mode",
    "iotv_api_token",
    "iotv_api_base_url",
    "iotv_reseller_username",
    "iotv_reseller_password",
    "iotv_player_base_url",
    "allow_web_trial",
    "allow_mobile_trial",
    "auto_renew_enabled",
    "show_all_provider_packages_web",
    "show_all_provider_packages_mobile",
    "special_promotion_enabled",
    "special_promotion_title",
    "special_promotion_body",
    "special_promotion_badge",
    "special_promotion_button_text",
    "special_promotion_button_url",
    "special_promotion_style",
    "special_promotion_html",
    "special_promotion_price_1_month",
    "special_promotion_price_3_months",
    "special_promotion_price_6_months",
    "special_promotion_price_9_months",
    "special_promotion_price_12_months",
    "special_promotion_email_audience",
    "special_promotion_push_audience",
    "special_offer_enabled",
    "special_offer_title",
    "special_offer_body",
    "special_offer_badge",
    "special_offer_button_text",
    "special_offer_button_url",
    "special_offer_style",
    "special_offer_html",
    "special_offer_price_1_month",
    "special_offer_price_3_months",
    "special_offer_price_6_months",
    "special_offer_price_9_months",
    "special_offer_price_12_months",
    "special_offer_email_audience",
    "special_offer_push_audience",
    "expiry_email_alerts_enabled",
    "expiry_email_alert_every_hours",
    "expiry_push_alerts_enabled",
    "expiry_push_alert_before_hours",
    "payment_wallet_enabled",
    "payment_usdt_enabled",
    "payment_paypal_enabled",
    "payment_card_enabled",
    "payment_priority",
    "tvplus_currency",
    "tvplus_credits_paid_amount",
    "tvplus_credits_received",
    "iotv_currency",
    "iotv_credits_paid_usd",
    "iotv_credits_received",
    "iotv_connection_price_multiplier_enabled",
    "conversion_display_currency",
  ];

  for (const key of allowed) {
    if (input[key] !== undefined) {
      const value = key.endsWith("_currency") || key === "conversion_display_currency"
        ? normalizeCurrencyCode(input[key])
        : key.endsWith("_audience")
          ? normalizePromotionAudience(input[key])
          : key.endsWith("_style")
            ? normalizePromotionStyle(input[key])
            : key.includes("_price_")
              ? normalizeOptionalPrice(input[key])
          : String(input[key]);
      const settingKey = key !== "active_provider" && PROVIDER_SCOPED_SETTINGS.has(key)
        ? providerScopedSettingKey(targetProvider, key)
        : key;
      await setRawSetting(settingKey, value);
    }
  }

  return getIptvSettings();
}

async function listIptvPromotionRecipients(audience: string) {
  const normalizedAudience = normalizePromotionAudience(audience);
  const whereClause = normalizedAudience === "active"
    ? "is_deleted = false AND is_blocked = false"
    : normalizedAudience === "inactive"
      ? "is_deleted = false AND is_blocked = true"
      : "is_deleted = false";

  return queryRows<{
    id: string;
    email: string;
    name: string | null;
    fcmToken: string | null;
  }>(
    `SELECT id, email, name, fcm_token AS "fcmToken"
     FROM users
     WHERE ${whereClause}
     ORDER BY created_at DESC`,
  );
}

async function listActiveMobileTokens(userId: string, fallbackToken?: string | null) {
  const rows = await queryRows<{ token: string }>(
    `SELECT token
     FROM fcm_tokens
     WHERE user_id = $1 AND is_active = true AND token <> ''`,
    [userId],
  );
  const tokens = new Set(rows.map((row) => String(row.token || "").trim()).filter(Boolean));
  const fallback = String(fallbackToken || "").trim();
  if (fallback) tokens.add(fallback);
  return Array.from(tokens);
}

export async function sendIptvPromotionMessage(input: IptvPromotionSendInput) {
  await ensureIptvSchema();
  const kind = input.kind === "offer" ? "offer" : "promotion";
  const channel = input.channel === "push" ? "push" : "email";
  const audience = normalizePromotionAudience(input.audience);
  const fallbackTitle = kind === "offer" ? "Special Offer" : "Special Promotion";
  const title = String(input.title || fallbackTitle).trim() || fallbackTitle;
  const body = String(input.body || "").trim();
  const html = String(input.html || "").trim();
  const buttonText = String(input.buttonText || "Renew Now").trim() || "Renew Now";
  const buttonUrl = String(input.buttonUrl || "/account/iptv").trim() || "/account/iptv";
  if (!body && !html) throw new Error(`${fallbackTitle} details are required before sending`);

  const recipients = await listIptvPromotionRecipients(audience);
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const recipient of recipients) {
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, now())`,
        [
          recipient.id,
          "custom",
          title,
          body,
          JSON.stringify({
            source: "iptv",
            messageKind: kind,
            channel,
            audience,
            buttonText,
            buttonUrl,
          }),
        ],
      );

      if (channel === "email") {
        const email = await generateCustomNotificationEmail(
          title,
          html || body,
          recipient.name || recipient.email,
          recipient.email,
          { text: buttonText, url: buttonUrl },
        );
        await sendEmail({
          to: recipient.email,
          subject: email.subject,
          html: email.html,
          text: body,
        });
        sent += 1;
        continue;
      }

      const tokens = await listActiveMobileTokens(recipient.id, recipient.fcmToken);
      if (tokens.length === 0) {
        skipped += 1;
        continue;
      }

      const messaging = await getAdminMessaging();
      for (const token of tokens) {
        await messaging.send({
          token,
          notification: {
            title,
            body,
          },
          data: {
            type: "iptv_promotion",
            kind,
            audience,
          },
        });
      }
      sent += 1;
    } catch (error) {
      failed += 1;
      console.warn("IPTV promotion send failed:", error);
    }
  }

  return {
    kind,
    channel,
    audience,
    recipients: recipients.length,
    sent,
    skipped,
    failed,
  };
}

async function getApiConfig() {
  const settings = await getRawSettings();
  const apiKey = settings.get("api_key");
  const providerDemoMode = boolFromSetting(settings.get("provider_demo_mode"));
  if (providerDemoMode) {
    return {
      apiKey: "",
      baseUrl: settings.get("api_base_url") || TVPLUS_API_BASE_URL,
      demoMode: true,
    };
  }

  if (!apiKey) {
    return {
      apiKey: "",
      baseUrl: settings.get("api_base_url") || TVPLUS_API_BASE_URL,
      demoMode: false,
    };
  }
  return {
    apiKey,
    baseUrl: settings.get("api_base_url") || TVPLUS_API_BASE_URL,
    demoMode: false,
  };
}

function createMockTvplusResponse(params: Record<string, string | number | undefined>): TvplusResponse {
  const action = String(params.action || "");
  const type = String(params.type || "m3u");
  const seed = Math.random().toString(36).slice(2, 8).toUpperCase();

  if (action === "bouquet") {
    return [
      { id: "all", name: "All Bouquets" },
      { id: "sports", name: "Sports Plus" },
      { id: "movies", name: "Movies & Series" },
      { id: "family", name: "Family Entertainment" },
    ];
  }

  if (action === "reseller_info") {
    return [{ status: "demo", enabled: true, credits: "999.00", note: "Local IPTV demo mode" }];
  }

  if (action === "device_info") {
    return [{
      status: "true",
      username: params.username || `demo_${seed.toLowerCase()}`,
      mac: params.mac || "00:1A:79:00:00:00",
      enabled: true,
      expire: "Demo lookup",
    }];
  }

  if (action === "renew") {
    return [{ status: "true", message: "Demo IPTV renewed successfully" }];
  }

  if (action === "new") {
    if (type === "mag") {
      return [{
        status: "true",
        user_id: `demo-mag-${seed}`,
        mac: params.mac || "00:1A:79:00:00:00",
        url: "http://demo.tvplus.local/c/",
        message: "Demo MAG subscription created",
      }];
    }

    if (type === "protocol") {
      return [{
        status: "true",
        user_id: `demo-protocol-${seed}`,
        code: `PROTO-${seed}`,
        message: "Demo protocol subscription created",
      }];
    }

    const username = `demo_${seed.toLowerCase()}`;
    const password = `pass_${seed.toLowerCase()}`;
    return [{
      status: "true",
      user_id: `demo-m3u-${seed}`,
      username,
      password,
      url: `http://demo.tvplus.local/get.php?username=${username}&password=${password}&type=m3u_plus&output=ts`,
      message: "Demo M3U subscription created",
    }];
  }

  return [{ status: "false", message: "Unsupported demo TVPLUS action" }];
}

async function tvplusRequest(params: Record<string, string | number | undefined>) {
  const config = await getApiConfig();
  if (!config.apiKey && config.demoMode) {
    return createMockTvplusResponse(params);
  }
  if (!config.apiKey) throw new Error("TVPLUS API key is not configured");

  const url = new URL(config.baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });
  url.searchParams.set("api_key", config.apiKey);

  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`TVPLUS request failed with ${response.status}`);
  }

  try {
    return JSON.parse(text) as TvplusResponse;
  } catch {
    throw new Error(`TVPLUS returned invalid JSON: ${text.slice(0, 120)}`);
  }
}

async function getIotvConfig() {
  const settings = await getRawSettings();
  const apiToken = settings.get("iotv_api_token") || "";
  const apiBaseUrl = (settings.get("iotv_api_base_url") || IOTV_DEFAULT_API_BASE_URL).replace(/\/+$/, "");
  const playerBaseUrl = (settings.get("iotv_player_base_url") || apiBaseUrl).replace(/\/+$/, "");
  const resellerUsername = settings.get("iotv_reseller_username") || "";
  const resellerPassword = settings.get("iotv_reseller_password") || "";

  if (!apiToken) throw new Error("IPTV Reseller Hub Provider API token is not configured");
  if (!apiBaseUrl || apiBaseUrl.includes("yourdns.com")) throw new Error("IPTV Reseller Hub Provider portal API base URL is not configured");
  if (!resellerUsername || !resellerPassword) throw new Error("IPTV Reseller Hub Provider reseller username and password are required");

  return { apiToken, apiBaseUrl, playerBaseUrl, resellerUsername, resellerPassword };
}

async function iotvRequest(path: string, body?: Record<string, any>) {
  const config = await getIotvConfig();
  const cleanPath = path.replace(/^\/+/, "");
  const response = await fetch(`${config.apiBaseUrl}/api/wclient/v1/${cleanPath}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiToken}`,
      username: config.resellerUsername,
      password: config.resellerPassword,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`IPTV Reseller Hub Provider request failed with ${response.status}: ${text.slice(0, 160)}`);

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function generateIptvCredential(prefix: string) {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`;
}

function getNestedProviderValue(source: any, keys: string[]) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== "") return source[key];
    if (source?.data?.[key] !== undefined && source?.data?.[key] !== null && source?.data?.[key] !== "") return source.data[key];
    if (source?.line?.[key] !== undefined && source?.line?.[key] !== null && source?.line?.[key] !== "") return source.line[key];
  }
  return null;
}

function getIotvPackageId(selectedPackage: any, subscriptionTerm: IptvSubscriptionTerm) {
  const packageIds = selectedPackage?.metadata?.packageIds || {};
  if (subscriptionTerm.isFree) {
    return Number(
      (subscriptionTerm.termHours === 48 ? packageIds.trial48 : packageIds.trial24)
      || packageIds.trial
      || 7,
    );
  }

  const packageId = packageIds[String(subscriptionTerm.storageMonths)] || packageIds[subscriptionTerm.storageMonths];
  if (packageId) return Number(packageId);

  const directId = Number(String(selectedPackage?.tvplusPackageId || "").replace(/\D/g, ""));
  if (Number.isFinite(directId) && directId > 0) return directId;

  throw new Error(`No IPTV Reseller Hub Provider package ID is mapped for ${subscriptionTerm.storageMonths} months`);
}

async function createIotvLine(selectedPackage: any, deviceType: IptvDeviceType, subscriptionTerm: IptvSubscriptionTerm, input: Record<string, any>) {
  const config = await getIotvConfig();
  const packageId = getIotvPackageId(selectedPackage, subscriptionTerm);
  const username = String(input.username || "").trim() || generateIptvCredential("u");
  const password = String(input.password || "").trim() || generateIptvCredential("p");
  const lineType = deviceType === "mag" ? "mag" : "line";
  const path = subscriptionTerm.isFree ? "create-line/1" : "create-line";
  const description = String(input.note || input.description || "Created from G5 IPTV").trim();

  const response = await iotvRequest(path, {
    line_type: lineType,
    package: packageId,
    description,
    username,
    password,
  });

  const providerId = getNestedProviderValue(response, ["id", "line_id", "lineId", "user_id", "userId"]);
  const responseUsername = String(getNestedProviderValue(response, ["username"]) || username);
  const responsePassword = String(getNestedProviderValue(response, ["password"]) || password);
  const m3uUrl = deviceType === "m3u"
    ? `${config.playerBaseUrl}/get.php?username=${encodeURIComponent(responseUsername)}&password=${encodeURIComponent(responsePassword)}&type=m3u_plus&output=ts`
    : null;
  const portalUrl = deviceType === "mag" ? config.playerBaseUrl : null;

  return {
    status: "true",
    source: "iotv",
    providerId,
    packageId,
    username: responseUsername,
    password: responsePassword,
    url: m3uUrl,
    portalUrl,
    raw: response,
  };
}

async function renewIotvLine(order: Record<string, any>, months: number) {
  const providerId = order.tvplusUserId || getNestedProviderValue(order.providerResponse, ["providerId", "id", "line_id", "lineId"]);
  if (!providerId) throw new Error("IPTV Reseller Hub Provider line ID is missing for this subscription");

  const packageIds = order.providerResponse?.packageMap || {};
  const packageId = packageIds[String(months)] || packageIds[months];
  if (!packageId) throw new Error(`No IPTV Reseller Hub Provider renew package is mapped for ${months} months`);

  const response = await iotvRequest(`extend/${providerId}`, { package: Number(packageId) });
  return { status: "true", source: "iotv", providerId, packageId, raw: response };
}

async function updateIotvLineCredentials(order: Record<string, any>, username: string, password: string) {
  const providerId = order.tvplusUserId || getNestedProviderValue(order.providerResponse, ["providerId", "id", "line_id", "lineId"]);
  if (!providerId) throw new Error("IPTV Reseller Hub Provider line ID is missing for this subscription");

  const response = await iotvRequest(`line/${providerId}`, { username, password });
  const result = getNestedProviderValue(response, ["result", "success", "status"]);
  const success = result === true || String(result || "").toLowerCase() === "true" || String(response?.message || "").toLowerCase().includes("edited");
  if (!success) throw new Error(response?.message || "IPTV Reseller Hub Provider could not update the line credentials");

  return { status: "true", source: "iotv", providerId, username, password, raw: response };
}

export async function syncIptvPackages() {
  await ensureIptvSchema();
  const settings = await getIptvSettings();

  if (settings.activeProvider === "iotv") {
    for (const group of IOTV_PACKAGE_GROUPS) {
      await pool.query(
        `INSERT INTO iptv_packages (tvplus_package_id, name, description, active, sort_order, metadata, last_synced_at, updated_at)
         VALUES ($1, $2, $3, true, $4, $5::jsonb, now(), now())
         ON CONFLICT (tvplus_package_id)
         DO UPDATE SET name = EXCLUDED.name,
                       description = EXCLUDED.description,
                       sort_order = EXCLUDED.sort_order,
                       metadata = EXCLUDED.metadata,
                       last_synced_at = now(),
                       updated_at = now()`,
        [
          `iotv-connections-${group.connections}`,
          group.name,
          `${group.connections} simultaneous connection${group.connections === 1 ? "" : "s"} with 1M, 3M, 6M, 12M, 24h trial, and 48h trial mapping.`,
          group.connections,
          JSON.stringify({ provider: "iotv", connections: group.connections, packageIds: group.packageIds }),
        ],
      );
    }

    await setRawSetting("default_package_id", "iotv-connections-1");
    await setRawSetting("default_package_name", "IPTV Reseller Hub Provider - 1 Connection");
    return listIptvPackages({ includeInactive: true });
  }

  const response = await tvplusRequest({ action: "bouquet" });
  const packages = Array.isArray(response) ? response : [];

  for (const pkg of packages) {
    const packageId = String(pkg.id || "").trim();
    const name = String(pkg.name || "").trim();
    if (!packageId || !name) continue;

    await pool.query(
      `INSERT INTO iptv_packages (tvplus_package_id, name, last_synced_at, updated_at)
       VALUES ($1, $2, now(), now())
       ON CONFLICT (tvplus_package_id)
       DO UPDATE SET name = EXCLUDED.name, last_synced_at = now(), updated_at = now()`,
      [packageId, name],
    );
  }

  return listIptvPackages({ includeInactive: true });
}

export async function listIptvPackages(options: { includeInactive?: boolean; role?: string; trial?: boolean; trialTerm?: string } = {}) {
  await ensureIptvSchema();
  const rows = await queryRows(
    `SELECT id, tvplus_package_id AS "tvplusPackageId", name, description, active,
            sort_order AS "sortOrder", prices, metadata, last_synced_at AS "lastSyncedAt",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM iptv_packages
     ${options.includeInactive ? "" : "WHERE active = true"}
     ORDER BY sort_order ASC, name ASC`,
  );

  const settings = await getIptvSettings();
  const packages = rows.length === 0 ? [{
      id: "all",
      tvplusPackageId: settings.defaultPackageId || "all",
      name: settings.defaultPackageName || "All Bouquets",
      description: "Default TVPLUS bouquet selection",
      active: true,
      sortOrder: 0,
      prices: {},
      metadata: {},
      lastSyncedAt: null,
      createdAt: null,
      updatedAt: null,
    }] : rows;

  const pricedPackages = packages;

  if (!options.role) return pricedPackages;
  return pricedPackages.filter((pkg: any) => isIptvPackageVisibleForRole(pkg, options.role, { trial: options.trial, trialTerm: options.trialTerm }));
}

function providerPackagesForTrialVisibility(packages: any[], provider: "tvplus" | "iotv") {
  return packages.filter((pkg) => getIptvPackageProvider(pkg) === provider);
}

function isTrialTermShownForProvider(packages: any[], provider: "tvplus" | "iotv", term: string) {
  const providerPackages = providerPackagesForTrialVisibility(packages, provider);
  if (providerPackages.length === 0) return true;
  return providerPackages.some((pkg) => {
    const visibility = getIptvPackageVisibility(pkg);
    return visibility.trialUser
      && visibility.trialReseller
      && visibility.trialAgent
      && visibility.trialTerms?.[term]?.user !== false
      && visibility.trialTerms?.[term]?.reseller !== false
      && visibility.trialTerms?.[term]?.agent !== false;
  });
}

function appendIptvTrialSettingPackages(packages: any[], workspaceVisibility: Record<string, boolean> = {}) {
  const withTrials = [...packages];
  for (const provider of ["tvplus", "iotv"] as const) {
    for (const trial of IPTV_PROVIDER_TRIAL_TERMS[provider]) {
      const id = `trial:${provider}:${trial.key}`;
      const active = isTrialTermShownForProvider(packages, provider, trial.key);
      withTrials.push({
        id,
        tvplusPackageId: provider === "iotv" ? `iotv-trial-${trial.key}` : `trial-tvplus-${trial.key}`,
        name: trial.label,
        description: provider === "iotv"
          ? "Free trial option for Package Premium."
          : "Free trial option for Package Standard.",
        active,
        workspaceVisible: workspaceVisibility[id] !== false,
        sortOrder: provider === "iotv" ? 9000 : 8000,
        prices: {},
        metadata: { provider, virtualTrial: true, trialTerm: trial.key },
        lastSyncedAt: null,
        createdAt: null,
        updatedAt: null,
      });
    }
  }
  return withTrials;
}

async function updateVirtualIptvTrialPackage(id: string, input: Record<string, any>) {
  const parsed = parseVirtualIptvTrialPackageId(id);
  if (!parsed || input.active === undefined) return null;

  const packages = await listIptvPackages({ includeInactive: true });
  const providerPackages = providerPackagesForTrialVisibility(packages, parsed.provider);
  const visible = Boolean(input.active);

  for (const pkg of providerPackages) {
    const visibility = getIptvPackageVisibility(pkg);
    const nextVisibility = normalizeIptvPackageVisibility({
      ...visibility,
      trialUser: visible,
      trialReseller: visible,
      trialAgent: visible,
      trialTerms: {
        ...(visibility.trialTerms || {}),
        [parsed.term]: { user: visible, reseller: visible, agent: visible },
      },
    });
    const metadata = {
      ...(pkg.metadata || {}),
      visibility: nextVisibility,
    };
    await pool.query(
      `UPDATE iptv_packages
       SET metadata = $2::jsonb, updated_at = now()
       WHERE id = $1`,
      [pkg.id, JSON.stringify(metadata)],
    );
  }

  return {
    id,
    tvplusPackageId: parsed.provider === "iotv" ? `iotv-trial-${parsed.term}` : `trial-tvplus-${parsed.term}`,
    name: IPTV_PROVIDER_TRIAL_TERMS[parsed.provider].find((item) => item.key === parsed.term)?.label || "Free Trial",
    description: "Free trial visibility option",
    active: visible,
    sortOrder: parsed.provider === "iotv" ? 9000 : 8000,
    prices: {},
    metadata: { provider: parsed.provider, virtualTrial: true, trialTerm: parsed.term },
    lastSyncedAt: null,
    createdAt: null,
    updatedAt: new Date().toISOString(),
  };
}

export async function listIptvSettingPackages(workspaceVisibility: Record<string, boolean> = {}) {
  const packages = await listIptvPackages({ includeInactive: true });
  return appendIptvTrialSettingPackages(packages, workspaceVisibility);
}

export async function updateIptvPackage(id: string, input: Record<string, any>) {
  await ensureIptvSchema();
  const virtualTrialPackage = await updateVirtualIptvTrialPackage(id, input);
  if (virtualTrialPackage) return virtualTrialPackage;

  const settings = await getIptvSettings();
  let packageId = id;
  let existing = await queryOne<{ id: string; metadata?: Record<string, any> | null }>(
    "SELECT id, metadata FROM iptv_packages WHERE id = $1 OR tvplus_package_id = $1",
    [id],
  );

  if (!existing && id === "all") {
    const fallbackTvplusPackageId = settings.defaultPackageId || "all";
    const fallbackName = String(input.name || settings.defaultPackageName || "All Bouquets");
    existing = await queryOne<{ id: string }>(
      `INSERT INTO iptv_packages (
         tvplus_package_id, name, description, active, sort_order, prices, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, now())
       ON CONFLICT (tvplus_package_id)
       DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         active = EXCLUDED.active,
         sort_order = EXCLUDED.sort_order,
         prices = EXCLUDED.prices,
         updated_at = now()
       RETURNING id, metadata`,
      [
        fallbackTvplusPackageId,
        fallbackName,
        input.description === undefined ? "Default TVPLUS bouquet selection" : String(input.description),
        input.active === undefined ? true : Boolean(input.active),
        input.sortOrder === undefined ? 0 : Number(input.sortOrder) || 0,
        JSON.stringify(input.prices || {}),
      ],
    );

    await setRawSetting("default_package_id", fallbackTvplusPackageId);
    await setRawSetting("default_package_name", fallbackName);
  }

  if (!existing) throw new Error("IPTV package not found");
  packageId = existing.id;
  const nextMetadata = input.visibility === undefined
    ? input.metadata === undefined
      ? null
      : { ...(existing.metadata || {}), ...(input.metadata || {}) }
    : { ...(existing.metadata || {}), visibility: normalizeIptvPackageVisibility(input.visibility) };

  await pool.query(
    `UPDATE iptv_packages
     SET name = COALESCE($2, name),
         description = COALESCE($3, description),
         active = COALESCE($4, active),
         sort_order = COALESCE($5, sort_order),
         prices = COALESCE($6::jsonb, prices),
         metadata = COALESCE($7::jsonb, metadata),
         updated_at = now()
     WHERE id = $1`,
    [
      packageId,
      input.name === undefined ? null : String(input.name),
      input.description === undefined ? null : String(input.description),
      input.active === undefined ? null : Boolean(input.active),
      input.sortOrder === undefined ? null : Number(input.sortOrder) || 0,
      input.prices === undefined ? null : JSON.stringify(input.prices || {}),
      nextMetadata === null ? null : JSON.stringify(nextMetadata),
    ],
  );

  return queryOne(
    `SELECT id, tvplus_package_id AS "tvplusPackageId", name, description, active,
            sort_order AS "sortOrder", prices, metadata, last_synced_at AS "lastSyncedAt",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM iptv_packages WHERE id = $1`,
    [packageId],
  );
}

export async function listIptvRetailPrices(userId: string, role: unknown) {
  await ensureIptvSchema();
  const settings = await getIptvSettings();
  const audienceRole = normalizeIptvAudienceRole(role);
  if (audienceRole === "user") throw new Error("Reseller or Agent access required");

  const packages = await listIptvPackages({ includeInactive: false, role: audienceRole });
  const packageIds = packages.map((pkg: any) => String(pkg.id)).filter(Boolean);
  const customRows = packageIds.length
    ? await queryRows<{ packageId: string; prices: Record<string, any>; updatedAt: string }>(
      `SELECT package_id AS "packageId", prices, updated_at AS "updatedAt"
       FROM iptv_reseller_package_prices
       WHERE reseller_id = $1 AND package_id = ANY($2::varchar[])`,
      [userId, packageIds],
    )
    : [];
  const customByPackage = new Map(customRows.map((row) => [row.packageId, row]));

  return packages.map((pkg: any) => {
    const connections = getIotvPackageConnections(pkg);
    const inheritsIotvPricing = false;
    const custom = customByPackage.get(pkg.id);
    const priceSource = pkg.prices || {};
    const basePrices = {
      trial: getTrialPriceForTerm(settings, priceSource, audienceRole),
      1: getPriceForTerm(settings, priceSource, 1, audienceRole),
      3: getPriceForTerm(settings, priceSource, 3, audienceRole),
      6: getPriceForTerm(settings, priceSource, 6, audienceRole),
      9: getPriceForTerm(settings, priceSource, 9, audienceRole),
      12: getPriceForTerm(settings, priceSource, 12, audienceRole),
    };
    const providerCredits = {
      trial: getCostCreditsForTerm(priceSource, "trial"),
      1: getCostCreditsForTerm(priceSource, "1"),
      3: getCostCreditsForTerm(priceSource, "3"),
      6: getCostCreditsForTerm(priceSource, "6"),
      9: getCostCreditsForTerm(priceSource, "9"),
      12: getCostCreditsForTerm(priceSource, "12"),
    };
    const providerCostUsd = {
      trial: getCostUsdForTerm(settings, priceSource, "trial"),
      1: getCostUsdForTerm(settings, priceSource, "1"),
      3: getCostUsdForTerm(settings, priceSource, "3"),
      6: getCostUsdForTerm(settings, priceSource, "6"),
      9: getCostUsdForTerm(settings, priceSource, "9"),
      12: getCostUsdForTerm(settings, priceSource, "12"),
    };
    return {
      packageId: pkg.id,
      tvplusPackageId: pkg.tvplusPackageId,
      name: pkg.name,
      description: pkg.description,
      basePrices,
      providerCredits,
      providerCostUsd,
      providerCreditUnitCostUsd: normalizeLongDecimal(getProviderCreditUnitCostUsd(settings)),
      retailPrices: {
        ...basePrices,
        ...(inheritsIotvPricing ? multiplyRetailPrices(custom?.prices || {}, connections) : custom?.prices || {}),
      },
      hasCustomPrices: Boolean(custom),
      updatedAt: custom?.updatedAt || pkg.updatedAt,
    };
  });
}

export async function updateIptvRetailPrice(userId: string, role: unknown, packageId: string, input: Record<string, any>) {
  await ensureIptvSchema();
  const audienceRole = normalizeIptvAudienceRole(role);
  if (audienceRole === "user") throw new Error("Reseller or Agent access required");

  const packages = await listIptvPackages({ includeInactive: false, role: audienceRole });
  let pkg = packages.find((item: any) => item.id === packageId || item.tvplusPackageId === packageId);
  if (!pkg) throw new Error("IPTV package is not available for your account type");
  const prices = normalizeIptvRetailPrices(input.prices || input);
  await pool.query(
    `INSERT INTO iptv_reseller_package_prices (reseller_id, package_id, prices, updated_at)
     VALUES ($1, $2, $3::jsonb, now())
     ON CONFLICT (reseller_id, package_id)
     DO UPDATE SET prices = EXCLUDED.prices, updated_at = now()`,
    [userId, pkg.id, JSON.stringify(prices)],
  );

  return listIptvRetailPrices(userId, audienceRole);
}

function normalizeWorkspacePackageVisibility(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, visible]) => [String(key), visible !== false])
      .filter(([key]) => Boolean(key)),
  );
}

function normalizeIptvAccountSettings(input: Record<string, any> = {}) {
  const activeProvider = String(input.activeProvider || input.active_provider || "tvplus").toLowerCase() === "iotv"
    ? "iotv"
    : "tvplus";
  return {
    activeProvider,
    enabled: input.enabled !== false,
    storeName: String(input.storeName || "").trim(),
    supportEmail: String(input.supportEmail || "").trim(),
    supportWhatsapp: String(input.supportWhatsapp || "").trim(),
    allowTrials: input.allowTrials !== false,
    allowRenewals: input.allowRenewals !== false,
    paymentPriority: Array.isArray(input.paymentPriority)
      ? input.paymentPriority.map((item) => String(item).trim()).filter(Boolean)
      : String(input.paymentPriority || "wallet,usdt,paypal,card")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    promotionEnabled: input.promotionEnabled === true,
    promotionTitle: String(input.promotionTitle || "").trim(),
    promotionBody: String(input.promotionBody || "").trim(),
    allowWebTrial: input.allowWebTrial !== false,
    allowMobileTrial: input.allowMobileTrial !== false,
    autoRenewEnabled: input.autoRenewEnabled === true,
    specialPromotionEnabled: input.specialPromotionEnabled === true,
    specialPromotionTitle: String(input.specialPromotionTitle || input.promotionTitle || "").trim(),
    specialPromotionBody: String(input.specialPromotionBody || input.promotionBody || "").trim(),
    specialPromotionBadge: String(input.specialPromotionBadge || "").trim(),
    specialPromotionButtonText: String(input.specialPromotionButtonText || "").trim(),
    specialPromotionButtonUrl: String(input.specialPromotionButtonUrl || "").trim(),
    specialPromotionStyle: normalizePromotionStyle(input.specialPromotionStyle),
    specialPromotionHtml: String(input.specialPromotionHtml || "").trim(),
    specialPromotionPrice1Month: String(input.specialPromotionPrice1Month || "").trim(),
    specialPromotionPrice3Months: String(input.specialPromotionPrice3Months || "").trim(),
    specialPromotionPrice6Months: String(input.specialPromotionPrice6Months || "").trim(),
    specialPromotionPrice9Months: String(input.specialPromotionPrice9Months || "").trim(),
    specialPromotionPrice12Months: String(input.specialPromotionPrice12Months || "").trim(),
    specialPromotionEmailAudience: normalizePromotionAudience(input.specialPromotionEmailAudience),
    specialPromotionPushAudience: normalizePromotionAudience(input.specialPromotionPushAudience),
    specialOfferEnabled: input.specialOfferEnabled === true,
    specialOfferTitle: String(input.specialOfferTitle || "").trim(),
    specialOfferBody: String(input.specialOfferBody || "").trim(),
    specialOfferBadge: String(input.specialOfferBadge || "").trim(),
    specialOfferButtonText: String(input.specialOfferButtonText || "").trim(),
    specialOfferButtonUrl: String(input.specialOfferButtonUrl || "").trim(),
    specialOfferStyle: normalizePromotionStyle(input.specialOfferStyle),
    specialOfferHtml: String(input.specialOfferHtml || "").trim(),
    specialOfferPrice1Month: String(input.specialOfferPrice1Month || "").trim(),
    specialOfferPrice3Months: String(input.specialOfferPrice3Months || "").trim(),
    specialOfferPrice6Months: String(input.specialOfferPrice6Months || "").trim(),
    specialOfferPrice9Months: String(input.specialOfferPrice9Months || "").trim(),
    specialOfferPrice12Months: String(input.specialOfferPrice12Months || "").trim(),
    specialOfferEmailAudience: normalizePromotionAudience(input.specialOfferEmailAudience),
    specialOfferPushAudience: normalizePromotionAudience(input.specialOfferPushAudience),
    expiryEmailAlertsEnabled: input.expiryEmailAlertsEnabled === true,
    expiryEmailAlertEveryHours: String(input.expiryEmailAlertEveryHours || "6").trim(),
    expiryPushAlertsEnabled: input.expiryPushAlertsEnabled === true,
    expiryPushAlertBeforeHours: String(input.expiryPushAlertBeforeHours || "12").trim(),
    paymentWalletEnabled: input.paymentWalletEnabled !== false,
    paymentUsdtEnabled: input.paymentUsdtEnabled !== false,
    paymentPaypalEnabled: input.paymentPaypalEnabled !== false,
    paymentCardEnabled: input.paymentCardEnabled !== false,
    packageVisibility: normalizeWorkspacePackageVisibility(input.packageVisibility),
  };
}

export async function mergeIptvSettingsForAccount(
  settings: IptvSettings,
  userId: string | null,
  role: unknown,
) {
  const audienceRole = normalizeIptvAudienceRole(role);
  if (!userId || audienceRole === "user") return settings;

  const row = await queryOne<{ settings: Record<string, any> }>(
    `SELECT settings FROM iptv_account_settings WHERE user_id = $1`,
    [userId],
  );
  const workspace = normalizeIptvAccountSettings(row?.settings || {});

  return {
    ...settings,
    enabled: settings.enabled && workspace.enabled,
    activeProvider: workspace.activeProvider,
    allowWebTrial: settings.allowWebTrial && workspace.allowTrials && workspace.allowWebTrial,
    allowMobileTrial: settings.allowMobileTrial && workspace.allowTrials && workspace.allowMobileTrial,
    autoRenewEnabled: settings.autoRenewEnabled && workspace.allowRenewals && workspace.autoRenewEnabled,
    specialPromotionEnabled: workspace.specialPromotionEnabled,
    specialPromotionTitle: workspace.specialPromotionTitle,
    specialPromotionBody: workspace.specialPromotionBody,
    specialPromotionBadge: workspace.specialPromotionBadge,
    specialPromotionButtonText: workspace.specialPromotionButtonText,
    specialPromotionButtonUrl: workspace.specialPromotionButtonUrl,
    specialPromotionStyle: workspace.specialPromotionStyle,
    specialPromotionHtml: workspace.specialPromotionHtml,
    specialOfferEnabled: workspace.specialOfferEnabled,
    specialOfferTitle: workspace.specialOfferTitle,
    specialOfferBody: workspace.specialOfferBody,
    specialOfferBadge: workspace.specialOfferBadge,
    specialOfferButtonText: workspace.specialOfferButtonText,
    specialOfferButtonUrl: workspace.specialOfferButtonUrl,
    specialOfferStyle: workspace.specialOfferStyle,
    specialOfferHtml: workspace.specialOfferHtml,
    expiryEmailAlertsEnabled: workspace.expiryEmailAlertsEnabled,
    expiryEmailAlertEveryHours: workspace.expiryEmailAlertEveryHours,
    expiryPushAlertsEnabled: workspace.expiryPushAlertsEnabled,
    expiryPushAlertBeforeHours: workspace.expiryPushAlertBeforeHours,
    paymentWalletEnabled: settings.paymentWalletEnabled && workspace.paymentWalletEnabled,
    paymentUsdtEnabled: settings.paymentUsdtEnabled && workspace.paymentUsdtEnabled,
    paymentPaypalEnabled: settings.paymentPaypalEnabled && workspace.paymentPaypalEnabled,
    paymentCardEnabled: settings.paymentCardEnabled && workspace.paymentCardEnabled,
    paymentPriority: workspace.paymentPriority,
  };
}

export async function getIptvAccountSettings(userId: string, role: unknown) {
  await ensureIptvSchema();
  const audienceRole = normalizeIptvAudienceRole(role);
  if (audienceRole === "user") throw new Error("Reseller or Agent access required");

  const row = await queryOne<{ settings: Record<string, any>; updatedAt: string | null }>(
    `SELECT settings, updated_at AS "updatedAt"
     FROM iptv_account_settings
     WHERE user_id = $1`,
    [userId],
  );

  const normalized = normalizeIptvAccountSettings(row?.settings || {});
  const packages = appendIptvTrialSettingPackages(
    await listIptvPackages({ includeInactive: false, role: audienceRole }),
    normalized.packageVisibility,
  );

  return {
    ...normalized,
    packages: packages.map((pkg: any) => ({
      ...pkg,
      workspaceVisible: normalized.packageVisibility[pkg.id] !== false,
    })),
    updatedAt: row?.updatedAt || null,
  };
}

export async function updateIptvAccountSettings(userId: string, role: unknown, input: Record<string, any>) {
  await ensureIptvSchema();
  const audienceRole = normalizeIptvAudienceRole(role);
  if (audienceRole === "user") throw new Error("Reseller or Agent access required");

  const current = await getIptvAccountSettings(userId, audienceRole);
  const settings = normalizeIptvAccountSettings({ ...current, ...(input || {}) });
  await pool.query(
    `INSERT INTO iptv_account_settings (user_id, settings, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (user_id)
     DO UPDATE SET settings = EXCLUDED.settings, updated_at = now()`,
    [userId, JSON.stringify(settings)],
  );

  return getIptvAccountSettings(userId, audienceRole);
}

export async function filterIptvPackagesForAccount(
  packages: any[],
  userId: string | null,
  role: unknown,
  options: { trial?: boolean; trialTerm?: string } = {},
) {
  const audienceRole = normalizeIptvAudienceRole(role);
  if (!userId || audienceRole === "user") return packages;

  const row = await queryOne<{ settings: Record<string, any> }>(
    `SELECT settings FROM iptv_account_settings WHERE user_id = $1`,
    [userId],
  );
  const visibility = normalizeWorkspacePackageVisibility(row?.settings?.packageVisibility);
  if (options.trial) {
    const term = normalizeIptvTrialTermKey(options.trialTerm);
    for (const provider of ["tvplus", "iotv"] as const) {
      const virtualId = `trial:${provider}:${term}`;
      if (term && visibility[virtualId] === false) {
        packages = packages.filter((pkg: any) => getIptvPackageProvider(pkg) !== provider);
      }
    }
  }
  return packages.filter((pkg: any) => visibility[pkg.id] !== false);
}

async function getIptvRetailOverrideForPackage(
  userId: string | null,
  role: unknown,
  pkg: any,
  settings: IptvSettings,
) {
  const audienceRole = normalizeIptvAudienceRole(role);
  if (!userId || audienceRole === "user" || !pkg?.id) return {};

  let lookupPackageId = pkg.id;
  let multiplier = 1;
  const inheritedPackageId = String(pkg.metadata?.inheritedPricingFromPackageId || "");
  const inheritedMultiplier = Number(pkg.metadata?.inheritedPricingMultiplier || 1);
  if (
    settings.iotvConnectionPriceMultiplierEnabled
    && inheritedPackageId
    && Number.isFinite(inheritedMultiplier)
    && inheritedMultiplier > 1
  ) {
    lookupPackageId = inheritedPackageId;
    multiplier = inheritedMultiplier;
  }

  const row = await queryOne<{ prices: Record<string, any> }>(
    `SELECT prices
     FROM iptv_reseller_package_prices
     WHERE reseller_id = $1 AND package_id = $2
     LIMIT 1`,
    [userId, lookupPackageId],
  );
  if (!row?.prices) return {};
  return multiplier > 1 ? multiplyRetailPrices(row.prices, multiplier) : row.prices;
}

function getPriceForTerm(settings: IptvSettings, prices: Record<string, any>, months: number, role: unknown = "user") {
  const audienceRole = normalizeIptvAudienceRole(role);
  const key = months === 99 ? "demo" : `${months}`;
  return normalizePrice(
    firstConfiguredPrice(
      prices?.[audienceRole]?.[key],
      prices?.user?.[key],
      prices?.[key],
      prices?.[`${months}_months`],
      getCreditBasedRetailPrice(settings, prices, key),
    ),
  );
}

function getTrialPriceForTerm(settings: IptvSettings, prices: Record<string, any>, role: unknown = "user", trialTerm?: string) {
  const audienceRole = normalizeIptvAudienceRole(role);
  const termKey = normalizeIptvTrialTermKey(trialTerm);
  return normalizePrice(
    firstConfiguredPrice(
      termKey ? prices?.trialTerms?.[audienceRole]?.[termKey] : undefined,
      prices?.[audienceRole]?.trial,
      termKey ? prices?.trialTerms?.user?.[termKey] : undefined,
      prices?.user?.trial,
      prices?.demo,
      getCreditBasedRetailPrice(settings, prices, "trial"),
    ),
  );
}

function getSettingsTermPrice(settings: IptvSettings, prefix: "specialOffer" | "specialPromotion", months: number) {
  const key = `${prefix}Price${months}Month${months === 1 ? "" : "s"}` as keyof IptvSettings;
  return normalizeOptionalPrice(settings[key]);
}

function getRenewalPrice(settings: IptvSettings, packagePrices: Record<string, any>, months: number, role: unknown = "user") {
  if (settings.specialOfferEnabled) {
    const offerPrice = getSettingsTermPrice(settings, "specialOffer", months);
    if (offerPrice) return offerPrice;
  }
  if (settings.specialPromotionEnabled) {
    const promotionPrice = getSettingsTermPrice(settings, "specialPromotion", months);
    if (promotionPrice) return promotionPrice;
  }
  return getPriceForTerm(settings, packagePrices || {}, months, role);
}

export async function createIptvOrder(userId: string | null, input: Record<string, any>) {
  await ensureIptvSchema();
  const audienceRole = normalizeIptvAudienceRole(input.requesterRole || input.role);
  const settings = await mergeIptvSettingsForAccount(await getIptvSettings(), userId, audienceRole);
  if (!settings.enabled) throw new Error("IPTV service is currently disabled");
  const assignedUserId = String(input.assignedUserId || "").trim();
  const orderUserId = assignedUserId || userId;

  const deviceType = normalizeDeviceType(input.deviceType);
  const subscriptionTerm = normalizeSubscriptionTerm(input);
  if (subscriptionTerm.tvplusSub === 99 && !settings.demoEnabled) {
    throw new Error("IPTV demos are currently disabled");
  }
  const clientPlatform = String(input.clientPlatform || input.platform || "web").toLowerCase();
  if (subscriptionTerm.isFree && clientPlatform === "mobile" && !settings.allowMobileTrial) {
    throw new Error("IPTV mobile app trials are currently disabled");
  }
  if (subscriptionTerm.isFree && clientPlatform !== "mobile" && !settings.allowWebTrial) {
    throw new Error("IPTV web trials are currently disabled");
  }
  if (subscriptionTerm.isFree && !isIptvTrialTermSupportedForProvider(settings.activeProvider, input.subscriptionTerm)) {
    throw new Error(settings.activeProvider === "iotv"
      ? "IPTV Reseller Hub Provider supports only 24 Hours and 48 Hours free trials"
      : "TVPLUS supports only 1-6 Hours and 1 Day free trials");
  }

  const packageId = String(input.packageId || "").trim();
  const visiblePackages = await listIptvPackages({
    includeInactive: false,
    role: audienceRole,
    trial: subscriptionTerm.isFree,
    trialTerm: String(input.subscriptionTerm || ""),
  });
  const packages = await filterIptvPackagesForAccount(visiblePackages, userId, audienceRole, {
    trial: subscriptionTerm.isFree,
    trialTerm: String(input.subscriptionTerm || ""),
  });
  const selectedPackage = packageId
    ? packages.find((pkg: any) => pkg.id === packageId || pkg.tvplusPackageId === packageId)
    : packages[0];
  if (packageId && !selectedPackage) throw new Error("This IPTV package is not available for your account type");
  if (!selectedPackage) throw new Error("No active IPTV package is available for your account type");

  const macAddress = String(input.macAddress || "").trim();
  if (deviceType === "mag" && !macAddress) {
    throw new Error("MAC address is required for MAG devices");
  }

  const note = String(input.note || "").trim();
  const retailOverride = await getIptvRetailOverrideForPackage(userId, audienceRole, selectedPackage, settings);
  const orderPrice = subscriptionTerm.isFree
    ? normalizePrice(firstConfiguredPrice(
      retailOverride.trial,
      getTrialPriceForTerm(settings, selectedPackage.prices || {}, audienceRole, String(input.subscriptionTerm || "")),
    ))
    : normalizePrice(firstConfiguredPrice(
      retailOverride[String(subscriptionTerm.storageMonths)],
      getPriceForTerm(settings, selectedPackage.prices || {}, subscriptionTerm.storageMonths, audienceRole),
    ));
  let walletPayment: Awaited<ReturnType<typeof debitIptvWalletPayment>> = null;

  if (toMoneyNumber(orderPrice) > 0) {
    const paymentMethod = String(input.paymentMethod || "").trim().toLowerCase();
    if (paymentMethod !== "wallet") {
      throw new Error("Payment is required before creating a paid IPTV subscription");
    }
    walletPayment = await debitIptvWalletPayment(userId, orderPrice, {
      source: "iptv",
      action: "create",
      packageId: selectedPackage.id,
      packageName: selectedPackage.name,
      subscriptionTerm: subscriptionTerm.label,
      deviceType,
      clientPlatform,
      description: `IPTV subscription paid from wallet (${selectedPackage.name || "IPTV Package"})`,
    });
  }

  let response: any[];
  try {
    response = settings.activeProvider === "iotv"
      ? [await createIotvLine(selectedPackage, deviceType, subscriptionTerm, { ...input, note })]
      : await tvplusRequest({
        action: "new",
        type: deviceType,
        sub: subscriptionTerm.tvplusSub,
        pack: selectedPackage.tvplusPackageId || settings.defaultPackageId || "all",
        mac: deviceType === "mag" ? macAddress : undefined,
        note,
      });
  } catch (error: any) {
    await refundIptvWalletPayment(walletPayment, error.message || "Provider could not create IPTV order");
    throw error;
  }
  const item = getFirstResponseItem(response);
  const success = String(item.status || "").toLowerCase() === "true";
  const m3uCredentials = extractM3uCredentials(deviceType === "m3u" ? item.url : "");
  const providerResponse = {
    ...item,
    provider: settings.activeProvider,
    packageMap: selectedPackage.metadata?.packageIds || {},
    payment: walletPayment ? { method: "wallet", walletTransactionId: walletPayment.id, amount: walletPayment.amount } : null,
  };

  let order: { id: string } | null = null;
  try {
    order = await queryOne(
      `INSERT INTO iptv_orders (
         user_id, created_by_user_id, package_id, tvplus_user_id, device_type, subscription_months,
         subscription_term_type, subscription_hours, subscription_label, status,
         username, password, mac_address, portal_url, m3u_url, protocol_code,
         customer_note, price, provider_response, expires_at
       )
       VALUES ($1, $2, NULLIF($3, 'all'), $4, $5, $6, $7, $8::integer, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb,
         CASE
           WHEN $7 = 'hours' THEN now() + ($8::integer::text || ' hours')::interval
           WHEN $6 = 99 THEN now() + interval '1 day'
           ELSE now() + ($6::text || ' months')::interval
         END)
       RETURNING id`,
      [
        orderUserId,
        assignedUserId ? userId : null,
        selectedPackage.id,
        item.providerId || item.user_id || null,
        deviceType,
        subscriptionTerm.storageMonths,
        subscriptionTerm.termType,
        subscriptionTerm.termHours,
        subscriptionTerm.label,
        success ? "active" : "failed",
        m3uCredentials.username || item.username || null,
        m3uCredentials.password || item.password || null,
        deviceType === "mag" ? macAddress || item.mac || null : null,
        deviceType === "mag" ? item.portalUrl || item.url || null : null,
        deviceType === "m3u" ? item.url || null : null,
        deviceType === "protocol" ? item.code || null : null,
        note || null,
        orderPrice,
        JSON.stringify(providerResponse),
      ],
    );
    await attachIptvWalletPayment(walletPayment?.id, order!.id);
  } catch (error: any) {
    await refundIptvWalletPayment(walletPayment, error.message || "IPTV order could not be saved");
    throw error;
  }

  if (!success) {
    await refundIptvWalletPayment(walletPayment, item.message || item.messasge || "Provider rejected IPTV order");
    throw new Error(item.message || item.messasge || "TVPLUS could not create the IPTV subscription");
  }

  return getIptvOrderById(order!.id);
}

export async function importIptvProviderLine(input: Record<string, any>) {
  await ensureIptvSchema();

  const deviceType = normalizeDeviceType(input.deviceType || "m3u");
  const username = String(input.username || "").trim();
  const password = String(input.password || "").trim();
  const m3uUrl = String(input.m3uUrl || "").trim();
  const portalUrl = String(input.portalUrl || "").trim();
  const protocolCode = String(input.protocolCode || "").trim();
  const macAddress = String(input.macAddress || "").trim();
  const note = String(input.note || "Imported from TVPLUS panel").trim();
  const subscriptionMonths = normalizeSubscriptionMonths(input.subscriptionMonths || 1);

  if (deviceType === "m3u" && (!username || !password)) {
    throw new Error("Username and password are required for M3U lines");
  }
  if (deviceType === "mag" && (!macAddress || !portalUrl)) {
    throw new Error("MAC address and portal URL are required for MAG lines");
  }
  if (deviceType === "protocol" && !protocolCode) {
    throw new Error("Protocol code is required");
  }

  const packages = await listIptvPackages({ includeInactive: true });
  const requestedPackageId = String(input.packageId || "").trim();
  const selectedPackage = packages.find((pkg: any) => pkg.id === requestedPackageId || pkg.tvplusPackageId === requestedPackageId) || packages[0] || null;

  const expiresAtInput = String(input.expiresAt || "").trim();
  const expiresAt = expiresAtInput ? new Date(expiresAtInput) : null;
  const hasValidExpiresAt = expiresAt && !Number.isNaN(expiresAt.getTime());

  const existing = username
    ? await queryOne<{ id: string }>(
      "SELECT id FROM iptv_orders WHERE device_type = 'm3u' AND username = $1 ORDER BY created_at DESC LIMIT 1",
      [username],
    )
    : null;

  if (existing?.id) {
    await pool.query(
      `UPDATE iptv_orders
       SET package_id = $2,
           subscription_months = $3,
           subscription_term_type = 'months',
           subscription_hours = NULL,
           subscription_label = $4,
           status = 'active',
           username = NULLIF($5, ''),
           password = NULLIF($6, ''),
           mac_address = NULLIF($7, ''),
           portal_url = NULLIF($8, ''),
           m3u_url = NULLIF($9, ''),
           protocol_code = NULLIF($10, ''),
           admin_note = NULLIF($11, ''),
           provider_response = $12::jsonb,
           expires_at = COALESCE($13::timestamp, expires_at),
           updated_at = now()
       WHERE id = $1`,
      [
        existing.id,
        selectedPackage?.id || null,
        subscriptionMonths,
        `${subscriptionMonths} Month${subscriptionMonths === 1 ? "" : "s"}`,
        username,
        password,
        macAddress,
        portalUrl,
        m3uUrl,
        protocolCode,
        note,
        JSON.stringify({ imported: true, source: "tvplus-panel", username }),
        hasValidExpiresAt ? expiresAt!.toISOString() : null,
      ],
    );
    return getIptvOrderById(existing.id);
  }

  const order = await queryOne(
    `INSERT INTO iptv_orders (
       user_id, package_id, tvplus_user_id, device_type, subscription_months,
       subscription_term_type, subscription_hours, subscription_label, status,
       username, password, mac_address, portal_url, m3u_url, protocol_code,
       admin_note, price, provider_response, expires_at
     )
     VALUES (NULL, $1, NULL, $2, $3, 'months', NULL, $4, 'active', NULLIF($5, ''), NULLIF($6, ''),
       NULLIF($7, ''), NULLIF($8, ''), NULLIF($9, ''), NULLIF($10, ''), NULLIF($11, ''), '0.00',
       $12::jsonb, COALESCE($13::timestamp, now() + ($3::text || ' months')::interval))
     RETURNING id`,
    [
      selectedPackage?.id || null,
      deviceType,
      subscriptionMonths,
      `${subscriptionMonths} Month${subscriptionMonths === 1 ? "" : "s"}`,
      username,
      password,
      macAddress,
      portalUrl,
      m3uUrl,
      protocolCode,
      note,
      JSON.stringify({ imported: true, source: "tvplus-panel", username }),
      hasValidExpiresAt ? expiresAt!.toISOString() : null,
    ],
  );

  return getIptvOrderById(order!.id);
}

export async function renewIptvOrder(orderId: string, userId: string | null, months: unknown) {
  await ensureIptvSchema();
  const settings = await getIptvSettings();
  const renewInput = typeof months === "object" && months !== null ? months as Record<string, any> : { subscriptionMonths: months };
  const audienceRole = normalizeIptvAudienceRole(renewInput.requesterRole || renewInput.role);
  const subscriptionMonths = normalizeSubscriptionMonths(renewInput.subscriptionMonths);
  if (subscriptionMonths === 99) throw new Error("Demo subscriptions cannot be renewed");

  const order = await getIptvOrderById(orderId, userId);
  if (!order) throw new Error("IPTV order not found");
  const currentPackage = order.packageId ? await getPackageById(order.packageId) : null;
  const renewalPrice = getRenewalPrice(settings, currentPackage?.prices || {}, subscriptionMonths, audienceRole);
  let walletPayment: Awaited<ReturnType<typeof debitIptvWalletPayment>> = null;

  if (userId && toMoneyNumber(renewalPrice) > 0) {
    const paymentMethod = String(renewInput.paymentMethod || "").trim().toLowerCase();
    if (paymentMethod !== "wallet") {
      throw new Error("Payment is required before renewing a paid IPTV subscription");
    }
    walletPayment = await debitIptvWalletPayment(userId, renewalPrice, {
      source: "iptv",
      action: "renew",
      referenceId: orderId,
      iptvOrderId: orderId,
      packageId: order.packageId,
      packageName: order.packageName,
      subscriptionTerm: `${subscriptionMonths} Month${subscriptionMonths === 1 ? "" : "s"}`,
      deviceType: order.deviceType,
      description: `IPTV renewal paid from wallet (${order.packageName || "IPTV Package"})`,
    });
  }
  await attachIptvWalletPayment(walletPayment?.id, orderId);

  const providerName = String(order.providerResponse?.provider || order.providerResponse?.source || "").toLowerCase();
  if (providerName === "iotv" || String(order.tvplusPackageId || "").startsWith("iotv-")) {
    let item: any;
    try {
      item = await renewIotvLine(order, subscriptionMonths);
    } catch (error: any) {
      await refundIptvWalletPayment(walletPayment, error.message || "Provider could not renew IPTV order");
      throw error;
    }

    await pool.query(
      `UPDATE iptv_orders
       SET subscription_months = $2,
           subscription_term_type = 'months',
           subscription_hours = NULL,
           subscription_label = ($2::text || ' Month' || CASE WHEN $2 = 1 THEN '' ELSE 's' END),
           status = 'active',
           provider_response = $3::jsonb,
           price = $4,
           expires_at = GREATEST(COALESCE(expires_at, now()), now()) + ($2::text || ' months')::interval,
           updated_at = now()
       WHERE id = $1`,
      [
        orderId,
        subscriptionMonths,
        JSON.stringify({
          ...(order.providerResponse || {}),
          ...item,
          provider: "iotv",
          packageMap: order.providerResponse?.packageMap || {},
          payment: walletPayment ? { method: "wallet", walletTransactionId: walletPayment.id, amount: walletPayment.amount } : order.providerResponse?.payment || null,
        }),
        renewalPrice,
      ],
    );

    return getIptvOrderById(orderId, userId);
  }

  let response: any[];
  try {
    response = await tvplusRequest({
      action: "renew",
      type: order.deviceType,
      username: order.deviceType === "m3u" ? order.username : undefined,
      password: order.deviceType === "m3u" ? order.password : undefined,
      mac: order.deviceType === "mag" ? order.macAddress : undefined,
      sub: subscriptionMonths,
    });
  } catch (error: any) {
    await refundIptvWalletPayment(walletPayment, error.message || "Provider could not renew IPTV order");
    throw error;
  }
  const item = getFirstResponseItem(response);
  const success = String(item.status || "").toLowerCase() === "true";

  await pool.query(
    `UPDATE iptv_orders
     SET subscription_months = $2,
         subscription_term_type = 'months',
         subscription_hours = NULL,
         subscription_label = ($2::text || ' Month' || CASE WHEN $2 = 1 THEN '' ELSE 's' END),
         status = $3,
         provider_response = $4::jsonb,
         price = $5,
         expires_at = GREATEST(COALESCE(expires_at, now()), now()) + ($2::text || ' months')::interval,
         updated_at = now()
     WHERE id = $1`,
    [
      orderId,
      subscriptionMonths,
      success ? "active" : "failed",
      JSON.stringify({
        ...item,
        payment: walletPayment ? { method: "wallet", walletTransactionId: walletPayment.id, amount: walletPayment.amount } : order.providerResponse?.payment || null,
      }),
      renewalPrice,
    ],
  );

  if (!success) {
    await refundIptvWalletPayment(walletPayment, item.message || item.messasge || "Provider rejected IPTV renewal");
    throw new Error(item.message || item.messasge || "TVPLUS could not renew the IPTV subscription");
  }
  return getIptvOrderById(orderId, userId);
}

export async function getIptvOrderById(id: string, userId: string | null = null) {
  const params: any[] = [id];
  const userClause = userId ? "AND (o.user_id = $2 OR o.created_by_user_id = $2)" : "";
  if (userId) params.push(userId);

  const order = await queryOne(
    `SELECT o.id, o.user_id AS "userId", o.created_by_user_id AS "createdByUserId",
            o.tvplus_user_id AS "tvplusUserId",
            o.device_type AS "deviceType", o.subscription_months AS "subscriptionMonths",
            o.subscription_term_type AS "subscriptionTermType",
            o.subscription_hours AS "subscriptionHours",
            o.subscription_label AS "subscriptionLabel",
            o.status, o.username, o.password, o.mac_address AS "macAddress",
            o.portal_url AS "portalUrl", o.m3u_url AS "m3uUrl", o.protocol_code AS "protocolCode",
            o.customer_note AS "customerNote", o.admin_note AS "adminNote",
            o.price, o.currency, o.provider_response AS "providerResponse",
            o.expires_at AS "expiresAt", o.created_at AS "createdAt", o.updated_at AS "updatedAt",
            p.id AS "packageId", p.name AS "packageName", p.tvplus_package_id AS "tvplusPackageId",
            u.email AS "userEmail", u.name AS "userName"
     FROM iptv_orders o
     LEFT JOIN iptv_packages p ON p.id = o.package_id
     LEFT JOIN users u ON u.id = o.user_id
     WHERE o.id = $1 ${userClause}`,
    params,
  );
  return withProviderCredentials(order);
}

export async function listIptvOrders(options: { userId?: string; status?: string; limit?: number } = {}) {
  await ensureIptvSchema();
  const params: any[] = [];
  const where: string[] = [];

  if (options.userId) {
    params.push(options.userId);
    where.push(`(o.user_id = $${params.length} OR o.created_by_user_id = $${params.length})`);
  }
  if (options.status) {
    params.push(options.status);
    where.push(`o.status = $${params.length}`);
  }

  params.push(Math.min(Math.max(Number(options.limit) || 100, 1), 500));

  const rows = await queryRows(
    `SELECT o.id, o.user_id AS "userId", o.created_by_user_id AS "createdByUserId",
            o.tvplus_user_id AS "tvplusUserId",
            o.device_type AS "deviceType", o.subscription_months AS "subscriptionMonths",
            o.subscription_term_type AS "subscriptionTermType",
            o.subscription_hours AS "subscriptionHours",
            o.subscription_label AS "subscriptionLabel",
            o.status, o.username, o.password, o.mac_address AS "macAddress",
            o.portal_url AS "portalUrl", o.m3u_url AS "m3uUrl", o.protocol_code AS "protocolCode",
            o.customer_note AS "customerNote", o.admin_note AS "adminNote",
            o.price, o.currency, o.provider_response AS "providerResponse",
            o.expires_at AS "expiresAt", o.created_at AS "createdAt", o.updated_at AS "updatedAt",
            p.id AS "packageId", p.name AS "packageName", p.tvplus_package_id AS "tvplusPackageId",
            u.email AS "userEmail", u.name AS "userName"
     FROM iptv_orders o
     LEFT JOIN iptv_packages p ON p.id = o.package_id
     LEFT JOIN users u ON u.id = o.user_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY o.created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return rows.map((order) => withProviderCredentials(order));
}

export async function listIptvAssignableUsers(ownerUserId: string, role: unknown) {
  await ensureIptvSchema();
  const accountRole = String(role || "").toLowerCase();
  if (accountRole !== "reseller" && accountRole !== "agent") return [];

  return queryRows(
    `SELECT u.id, u.display_user_id AS "displayUserId", u.email, u.name, u.role
     FROM reseller_customer_links l
     INNER JOIN users u ON u.id = l.customer_id
     WHERE l.reseller_id = $1
       AND u.is_deleted = false
       AND u.is_blocked = false
     ORDER BY u.name NULLS LAST, u.email
     LIMIT 250`,
    [ownerUserId],
  );
}

export async function canAssignIptvOrderToUser(ownerUserId: string, role: unknown, assignedUserId: string) {
  const targetUserId = String(assignedUserId || "").trim();
  if (!targetUserId || targetUserId === ownerUserId) return true;
  const accountRole = String(role || "").toLowerCase();
  if (accountRole !== "reseller" && accountRole !== "agent") return false;

  const row = await queryOne(
    `SELECT 1
     FROM reseller_customer_links l
     INNER JOIN users u ON u.id = l.customer_id
     WHERE l.reseller_id = $1
       AND l.customer_id = $2
       AND u.is_deleted = false
       AND u.is_blocked = false
     LIMIT 1`,
    [ownerUserId, targetUserId],
  );
  return Boolean(row);
}

export async function updateIptvOrderStatus(id: string, status: IptvOrderStatus, adminNote?: string) {
  await pool.query(
    `UPDATE iptv_orders
     SET status = $2, admin_note = COALESCE($3, admin_note), updated_at = now()
     WHERE id = $1`,
    [id, status, adminNote || null],
  );
  return getIptvOrderById(id);
}

export async function updateIptvOrderCredentials(id: string, input: Record<string, any>) {
  await ensureIptvSchema();
  const username = String(input.username || "").trim();
  const password = String(input.password || "").trim();
  const adminNote = String(input.adminNote || "").trim();
  if (!username || !password) throw new Error("Username and password are required");

  const order = await getIptvOrderById(id);
  if (!order) throw new Error("IPTV order not found");

  const providerName = String(order.providerResponse?.provider || order.providerResponse?.source || "").toLowerCase();
  const isIotvOrder = providerName === "iotv" || String(order.tvplusPackageId || "").startsWith("iotv-");
  if (!isIotvOrder) {
    throw new Error("Only IPTV Reseller Hub Provider credentials can be changed from this panel");
  }

  const item = await updateIotvLineCredentials(order, username, password);
  const playerBaseUrl = (await getIptvSettings()).iotvPlayerBaseUrl.replace(/\/+$/, "");
  const m3uUrl = order.deviceType === "m3u"
    ? `${playerBaseUrl}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=ts`
    : order.m3uUrl;

  await pool.query(
    `UPDATE iptv_orders
     SET username = NULLIF($2, ''),
         password = NULLIF($3, ''),
         m3u_url = COALESCE(NULLIF($4, ''), m3u_url),
         provider_response = $5::jsonb,
         admin_note = COALESCE(NULLIF($6, ''), admin_note),
         updated_at = now()
     WHERE id = $1`,
    [
      id,
      username,
      password,
      m3uUrl || "",
      JSON.stringify({
        ...(order.providerResponse || {}),
        ...item,
        provider: "iotv",
        packageMap: order.providerResponse?.packageMap || {},
      }),
      adminNote || "IPTV Reseller Hub Provider credentials changed from admin panel",
    ],
  );

  return getIptvOrderById(id);
}

export async function getIptvResellerInfo() {
  const settings = await getIptvSettings();
  if (settings.activeProvider === "iotv") {
    const [normalPackages, trialPackages] = await Promise.all([
      iotvRequest("lines/packages/0").catch((error: any) => ({ error: error.message })),
      iotvRequest("lines/packages/1").catch((error: any) => ({ error: error.message })),
    ]);
    return {
      status: "configured",
      enabled: settings.enabled,
      provider: "IPTV Reseller Hub Provider",
      normalPackages,
      trialPackages,
    };
  }

  const response = await tvplusRequest({ action: "reseller_info" });
  return getFirstResponseItem(response);
}

export async function lookupIptvDevice(input: Record<string, any>) {
  const deviceType = normalizeDeviceType(input.deviceType);
  const response = await tvplusRequest({
    action: "device_info",
    username: deviceType === "m3u" ? String(input.username || "").trim() : undefined,
    password: deviceType === "m3u" ? String(input.password || "").trim() : undefined,
    mac: deviceType === "mag" ? String(input.macAddress || "").trim() : undefined,
  });
  return getFirstResponseItem(response);
}
