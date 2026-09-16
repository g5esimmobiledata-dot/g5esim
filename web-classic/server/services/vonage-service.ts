import axios from 'axios';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from 'server/db';
import { sendEmail } from 'server/email';
import { storage } from 'server/storage';
import {
  getOrCreateUserSipAccount,
  toPublicUserSipAccount,
} from 'server/services/user-sip-service';
import {
  users,
  resellerCustomerLinks,
  walletTransactions,
  userVirtualNumbers,
  virtualNumberInventory,
  virtualNumberApplications,
  virtualSmsMessages,
  virtualVoiceCalls,
  virtualVoicemails,
} from '@shared/schema';

type VonageConfig = {
  enabled: boolean;
  apiKey: string;
  apiSecret: string;
  applicationId: string;
  privateKey: string;
  brandName: string;
  inboundWebhookUrl: string;
  statusWebhookUrl: string;
  defaultCountry: string;
  autoAssign: boolean;
  messagesApiPrice: string;
  messagesApiNotes: string;
  pricing: {
    setupFee: string;
    monthlyFee: string;
    inboundFee: string;
    outboundFee: string;
    standardMonthPackagePrice: string;
    standardThreeMonthPackagePrice: string;
    standardSixMonthPackagePrice: string;
    standardNineMonthPackagePrice: string;
    standardYearPackagePrice: string;
    premiumSetupFee: string;
    premiumMonthlyFee: string;
    premiumInboundFee: string;
    premiumOutboundFee: string;
    premiumMonthPackagePrice: string;
    premiumThreeMonthPackagePrice: string;
    premiumSixMonthPackagePrice: string;
    premiumNineMonthPackagePrice: string;
    premiumYearPackagePrice: string;
  };
};

type InventoryPricingInput = {
  isPremium?: boolean;
  providerSetupCost?: string | null;
  providerMonthlyCost?: string | null;
  providerInboundCost?: string | null;
  providerOutboundCost?: string | null;
  providerSmsCost?: string | null;
  providerMmsCost?: string | null;
  providerVoiceCost?: string | null;
  setupFee?: string | null;
  monthlyFee?: string | null;
  inboundFee?: string | null;
  outboundFee?: string | null;
  smsFee?: string | null;
  mmsFee?: string | null;
  voiceFee?: string | null;
  resellerDiscountPercent?: string | null;
  agentDiscountPercent?: string | null;
  customPackagePrices?: {
    oneMonth?: string | null;
    threeMonths?: string | null;
    sixMonths?: string | null;
    nineMonths?: string | null;
    twelveMonths?: string | null;
  } | null;
  packageTerm?: '1_month' | '3_months' | '6_months' | '9_months' | '1_year';
  paymentMethod?: 'wallet' | 'other';
  assignedUserId?: string | null;
  forwardingType?: 'none' | 'international' | 'sip' | 'voicemail';
  forwardingDestination?: string | null;
  autoRenew?: boolean;
  reminderDays?: number | string | null;
  cancelAtPeriodEnd?: boolean;
};

type VirtualNumberSubscriptionMeta = {
  packageTerm: '1_month' | '3_months' | '6_months' | '9_months' | '1_year';
  billingMonths: number;
  paymentMethod: 'wallet' | 'other';
  packagePrice: string;
  renewalPrice: string;
  autoRenew: boolean;
  reminderDays: number;
  activeUntil: string | null;
  nextChargeAt: string | null;
  renewalStatus: string;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string | null;
  canceledByAdmin?: boolean;
  reminderSentFor?: string | null;
  lastReminderAt?: string | null;
  lastRenewedAt?: string | null;
  manualRenewalRequiredAt?: string | null;
  expiredAt?: string | null;
  expiryNoticeSentAt?: string | null;
};

type VonageCountryAvailabilityOptions = {
  type?: string;
  features?: string;
  searchPattern?: number;
  forceRefresh?: boolean;
};

type VonageCountrySearchCacheValue = {
  totalCount: number;
  numbers: Array<{
    msisdn: string;
    type: string;
    features: string;
    monthlyCost: string;
    setupCost: string;
  }>;
};

type NormalizedOwnedVonageNumber = {
  msisdn: string;
  countryCode: string;
  type: string;
  features: string[];
  providerSetupCost: string;
  providerMonthlyCost: string;
  raw: Record<string, any>;
};

let ensurePromise: Promise<void> | null = null;
const vonageCountryAvailabilityCache = new Map<
  string,
  { expiresAt: number; value: VonageCountrySearchCacheValue }
>();
let vonageRateLimitedUntil = 0;

function trim(value: unknown) {
  return String(value || '').trim();
}

async function getPublicSipAccountForUser(userId: string) {
  try {
    const account = await getOrCreateUserSipAccount(userId);
    return toPublicUserSipAccount(account);
  } catch (error: any) {
    console.error('[SIP] Failed to load customer SIP account:', error.message || error);
    return null;
  }
}

function normalizeMoney(value: unknown, fallback = '0.00') {
  const parsed = Number.parseFloat(trim(value));
  if (!Number.isFinite(parsed)) return fallback;
  return parsed.toFixed(2);
}

function moneyValue(value: unknown) {
  const parsed = Number.parseFloat(trim(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeInteger(value: unknown, fallback = 3) {
  const parsed = Number.parseInt(trim(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
}

function normalizePrivateKey(value: unknown) {
  const raw = trim(value);
  if (!raw) return '';
  return raw.replace(/\\n/g, '\n');
}

function getVonageAvailabilityCacheKey(
  countryCode: string,
  options?: VonageCountryAvailabilityOptions,
) {
  const normalizedCountry = trim(countryCode).toUpperCase();
  const normalizedType = trim(options?.type).toLowerCase() || 'any';
  const normalizedFeatures = trim(options?.features).toUpperCase() || 'any';
  const normalizedSearchPattern =
    options?.searchPattern === 0 || options?.searchPattern === 2 ? options.searchPattern : 1;

  return `${normalizedCountry}|${normalizedType}|${normalizedFeatures}|${normalizedSearchPattern}`;
}

function getCachedVonageCountryAvailability(cacheKey: string, allowExpired = false) {
  const cached = vonageCountryAvailabilityCache.get(cacheKey);
  if (!cached) return null;
  if (!allowExpired && cached.expiresAt <= Date.now()) return null;
  return cached.value;
}

function setCachedVonageCountryAvailability(
  cacheKey: string,
  value: VonageCountrySearchCacheValue,
) {
  vonageCountryAvailabilityCache.set(cacheKey, {
    expiresAt: Date.now() + 1000 * 60 * 15,
    value,
  });
}

function normalizeVonageNumberSearchRows(numbers: any[]): VonageCountrySearchCacheValue['numbers'] {
  return numbers
    .map((item: any) => ({
      msisdn: trim(item?.msisdn),
      type: trim(item?.type),
      features: trim(item?.features),
      monthlyCost: normalizeMoney(item?.cost || item?.monthly_cost || item?.base_cost),
      setupCost: normalizeMoney(item?.initialPrice || item?.setup_cost || item?.initial_price),
    }))
    .filter((item: { msisdn: string }) => item.msisdn);
}

function normalizeVonageFeatureList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => trim(item).toUpperCase()).filter(Boolean);
  }

  return trim(value)
    .split(/[,\s]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function getVonageNumberCapabilities(features: string[]) {
  const normalized = new Set(features.map((feature) => feature.toUpperCase()));
  const hasKnownFeatures = normalized.size > 0;

  return {
    sms: normalized.has('SMS') || !hasKnownFeatures,
    mms: normalized.has('MMS'),
    voice: normalized.has('VOICE') || normalized.has('SIP') || !hasKnownFeatures,
    inbound: true,
    outbound: true,
  };
}

function normalizeOwnedVonageNumber(
  item: any,
  defaultCountry: string,
): NormalizedOwnedVonageNumber | null {
  const msisdn = trim(item?.msisdn || item?.number || item?.phoneNumber || item?.phone_number);
  if (!msisdn) return null;

  const rawCountry = trim(
    item?.country ||
      item?.countryCode ||
      item?.country_code ||
      item?.isoCountry ||
      item?.iso_country,
  ).toUpperCase();
  const fallbackCountry = trim(defaultCountry).toUpperCase();
  const countryCode =
    rawCountry.length === 2
      ? rawCountry
      : fallbackCountry.length === 2
        ? fallbackCountry
        : 'US';
  const features = normalizeVonageFeatureList(item?.features);

  return {
    msisdn,
    countryCode,
    type: trim(item?.type),
    features,
    providerSetupCost: normalizeMoney(
      item?.initialPrice || item?.setup_cost || item?.initial_price,
      '0.00',
    ),
    providerMonthlyCost: normalizeMoney(
      item?.cost || item?.monthly_cost || item?.base_cost,
      '0.00',
    ),
    raw: item && typeof item === 'object' ? item : {},
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency = 8,
) {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const runners = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length || 1)) },
    async () => {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) break;
        results[index] = await worker(items[index], index);
      }
    },
  );

  await Promise.all(runners);
  return results;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getHeaderValue(headers: unknown, name: string) {
  if (!headers || typeof headers !== 'object') return '';

  const record = headers as Record<string, unknown>;
  const normalizedName = name.toLowerCase();
  const value = record[name] ?? record[normalizedName];

  if (Array.isArray(value)) return trim(value[0]);
  if (value) return trim(value);

  const getter = (headers as { get?: (header: string) => unknown }).get;
  if (typeof getter === 'function') {
    const getterValue = getter.call(headers, name);
    if (Array.isArray(getterValue)) return trim(getterValue[0]);
    return trim(getterValue);
  }

  return '';
}

function getRetryAfterMs(error: unknown, fallbackMs: number) {
  if (!axios.isAxiosError(error)) return fallbackMs;

  const retryAfter = getHeaderValue(error.response?.headers, 'retry-after');
  if (!retryAfter) return fallbackMs;

  const seconds = Number.parseFloat(retryAfter);
  if (Number.isFinite(seconds)) {
    return Math.max(500, seconds * 1000);
  }

  const retryDateMs = Date.parse(retryAfter);
  if (Number.isFinite(retryDateMs)) {
    return Math.max(500, retryDateMs - Date.now());
  }

  return fallbackMs;
}

function isRetryableVonageError(error: unknown) {
  if (!axios.isAxiosError(error)) return false;

  const status = error.response?.status || 0;
  if (status === 429 || status >= 500) return true;

  return ['ECONNABORTED', 'ECONNRESET', 'ETIMEDOUT'].includes(trim(error.code));
}

async function withVonageRetry<T>(operation: () => Promise<T>, attempts = 3) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      if (Date.now() < vonageRateLimitedUntil) {
        const waitMs = vonageRateLimitedUntil - Date.now();
        await sleep(Math.min(15000, waitMs) + Math.floor(Math.random() * 500));
      }
      return await operation();
    } catch (error) {
      lastError = error;
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const retryAfterMs = getRetryAfterMs(error, 30000);
        vonageRateLimitedUntil = Math.max(vonageRateLimitedUntil, Date.now() + retryAfterMs);
      }
      if (attempt >= attempts || !isRetryableVonageError(error)) {
        throw error;
      }

      const fallbackMs = 900 * attempt;
      const retryAfterMs = getRetryAfterMs(error, fallbackMs);
      await sleep(Math.min(15000, retryAfterMs + attempt * 250));
    }
  }

  throw lastError;
}

function addMonths(dateInput: Date | string, months: number) {
  const date = new Date(dateInput);
  const next = new Date(date.getTime());
  next.setMonth(next.getMonth() + months);
  return next;
}

function toIsoOrNull(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parsePackageTerm(term: unknown): {
  term: '1_month' | '3_months' | '6_months' | '9_months' | '1_year';
  months: number;
} {
  switch (String(term || '').trim()) {
    case '3_months':
      return { term: '3_months', months: 3 };
    case '6_months':
      return { term: '6_months', months: 6 };
    case '9_months':
      return { term: '9_months', months: 9 };
    case '1_year':
      return { term: '1_year', months: 12 };
    default:
      return { term: '1_month', months: 1 };
  }
}

function getVirtualUsageProviderCost(
  inventoryItem: typeof virtualNumberInventory.$inferSelect | null | undefined,
  usageType: 'sms' | 'voice',
  direction: 'inbound' | 'outbound',
) {
  if (!inventoryItem) return '0.00';
  if (usageType === 'sms') {
    return normalizeMoney(
      inventoryItem.providerSmsCost || inventoryItem.providerOutboundCost || '0.00',
    );
  }
  if (direction === 'inbound') {
    return normalizeMoney(inventoryItem.providerInboundCost || '0.00');
  }
  return normalizeMoney(
    inventoryItem.providerVoiceCost || inventoryItem.providerOutboundCost || '0.00',
  );
}

function applyDiscountPercent(amount: string, discountPercent: unknown) {
  const value = Number.parseFloat(normalizeMoney(amount, '0.00'));
  const discount = Math.max(0, Number.parseFloat(normalizeMoney(discountPercent, '0.00')));
  const next = value - value * (discount / 100);
  return normalizeMoney(next.toFixed(2), '0.00');
}

function getRoleDiscountPercent(
  metadata: Record<string, any>,
  role: 'admin' | 'reseller' | 'agent',
) {
  if (role === 'reseller')
    return normalizeMoney(metadata.rolePricing?.resellerDiscountPercent, '0.00');
  if (role === 'agent') return normalizeMoney(metadata.rolePricing?.agentDiscountPercent, '0.00');
  return '0.00';
}

async function resolveVirtualNumberBillingRole(user: typeof users.$inferSelect) {
  const role = String(user.role || 'customer').toLowerCase();
  if (role === 'reseller' || role === 'agent') {
    return role as 'reseller' | 'agent';
  }

  const [managedByReseller] = await db
    .select({ resellerId: resellerCustomerLinks.resellerId })
    .from(resellerCustomerLinks)
    .where(eq(resellerCustomerLinks.customerId, user.id))
    .limit(1);

  return managedByReseller ? 'reseller' : 'admin';
}

function getVirtualUsageRetailRate(
  inventoryItem: typeof virtualNumberInventory.$inferSelect | null | undefined,
  usageType: 'sms' | 'voice',
  direction: 'inbound' | 'outbound',
) {
  if (!inventoryItem) return '0.00';
  if (usageType === 'sms')
    return normalizeMoney((inventoryItem as any).smsFee, normalizeMoney(inventoryItem.outboundFee));
  if (direction === 'inbound') return normalizeMoney(inventoryItem.inboundFee);
  return normalizeMoney((inventoryItem as any).voiceFee, normalizeMoney(inventoryItem.outboundFee));
}

async function getRoleAdjustedUsageRate({
  inventoryItem,
  usageType,
  direction,
  billingRole,
}: {
  inventoryItem: typeof virtualNumberInventory.$inferSelect | null | undefined;
  usageType: 'sms' | 'voice';
  direction: 'inbound' | 'outbound';
  billingRole: 'admin' | 'reseller' | 'agent';
}) {
  const retailRate = getVirtualUsageRetailRate(inventoryItem, usageType, direction);
  if (billingRole === 'admin') return { retailRate, chargeAmount: retailRate };

  const settingPrefix = inventoryItem?.isPremium ? 'vonage_premium' : 'vonage_standard';
  const usageKey = usageType === 'sms' ? 'sms' : direction === 'inbound' ? 'inbound' : 'voice';
  const configuredRoleRate = normalizeMoney(
    await getSettingValue(`${settingPrefix}_${usageKey}_${billingRole}_price`),
    '0.00',
  );

  if (Number.parseFloat(configuredRoleRate) > 0) {
    return { retailRate, chargeAmount: configuredRoleRate };
  }

  const inventoryMetadata = (inventoryItem?.metadata as Record<string, any>) || {};
  return {
    retailRate,
    chargeAmount: normalizeMoney(
      applyDiscountPercent(retailRate, getRoleDiscountPercent(inventoryMetadata, billingRole)),
    ),
  };
}

async function findInventoryForVirtualNumber(number: typeof userVirtualNumbers.$inferSelect) {
  const metadata = (number.metadata as Record<string, any>) || {};
  const inventoryId = trim(metadata.inventoryId);

  if (inventoryId) {
    const [inventoryItem] = await db
      .select()
      .from(virtualNumberInventory)
      .where(eq(virtualNumberInventory.id, inventoryId))
      .limit(1);
    if (inventoryItem) return inventoryItem;
  }

  const [inventoryItem] = await db
    .select()
    .from(virtualNumberInventory)
    .where(eq(virtualNumberInventory.msisdn, number.msisdn))
    .limit(1);

  return inventoryItem || null;
}

async function suspendVirtualNumberForLowBalance(
  number: typeof userVirtualNumbers.$inferSelect,
  inventoryItem: typeof virtualNumberInventory.$inferSelect | null,
  reason: string,
) {
  const now = new Date();
  const numberMetadata = (number.metadata as Record<string, any>) || {};
  const inventoryMetadata = (inventoryItem?.metadata as Record<string, any>) || {};

  await db
    .update(userVirtualNumbers)
    .set({
      status: 'suspended',
      metadata: {
        ...numberMetadata,
        billingSuspendedAt: now.toISOString(),
        billingSuspendedReason: reason,
      },
      updatedAt: now,
    })
    .where(eq(userVirtualNumbers.id, number.id));

  if (inventoryItem) {
    await db
      .update(virtualNumberInventory)
      .set({
        metadata: {
          ...inventoryMetadata,
          billingSuspendedAt: now.toISOString(),
          billingSuspendedReason: reason,
        },
        updatedAt: now,
      })
      .where(eq(virtualNumberInventory.id, inventoryItem.id));
  }
}

async function chargeVirtualNumberUsage({
  userId,
  number,
  inventoryItem,
  usageType,
  direction,
  description,
  referenceId,
  metadata,
}: {
  userId: string;
  number: typeof userVirtualNumbers.$inferSelect;
  inventoryItem: typeof virtualNumberInventory.$inferSelect | null;
  usageType: 'sms' | 'voice';
  direction: 'inbound' | 'outbound';
  description: string;
  referenceId: string;
  metadata?: Record<string, any>;
}) {
  const [account] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!account) throw new Error('Billing account was not found');

  const billingRole = await resolveVirtualNumberBillingRole(account);
  const { retailRate, chargeAmount } = await getRoleAdjustedUsageRate({
    inventoryItem,
    usageType,
    direction,
    billingRole,
  });
  const chargeValue = Number.parseFloat(chargeAmount);
  const providerCost = getVirtualUsageProviderCost(inventoryItem, usageType, direction);

  if (!Number.isFinite(chargeValue) || chargeValue < 0) {
    throw new Error('Invalid virtual number usage rate');
  }

  if (chargeValue === 0) {
    return {
      charged: false,
      amount: '0.00',
      billingRole,
      balanceAfter: normalizeMoney(account.walletBalance),
    };
  }

  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const [updatedUser] = await tx
      .update(users)
      .set({
        walletBalance: sql`${users.walletBalance}::numeric - ${chargeValue}`,
        updatedAt: now,
      })
      .where(and(eq(users.id, userId), sql`${users.walletBalance}::numeric >= ${chargeValue}`))
      .returning({ walletBalance: users.walletBalance });

    if (!updatedUser) {
      return null;
    }

    const balanceAfter = Number.parseFloat(String(updatedUser.walletBalance || '0.00'));
    const balanceBefore = balanceAfter + chargeValue;

    const [transaction] = await tx
      .insert(walletTransactions)
      .values({
        userId,
        type: 'purchase_debit',
        status: 'completed',
        amount: chargeAmount,
        currency: 'USD',
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        provider: 'vonage',
        referenceId,
        description,
        metadata: {
          provider: 'vonage',
          msisdn: number.msisdn,
          virtualNumberId: number.id,
          inventoryId: inventoryItem?.id || null,
          usageType,
          direction,
          billingRole,
          retailRate,
          providerCost,
          ...metadata,
        },
        completedAt: now,
      })
      .returning();

    return { transaction, balanceAfter: balanceAfter.toFixed(2) };
  });

  if (!result) {
    await suspendVirtualNumberForLowBalance(number, inventoryItem, 'insufficient_wallet_balance');
    await storage.createNotification({
      userId,
      type: 'wallet',
      title: 'Virtual number suspended',
      message: `Your virtual number ${number.msisdn} was suspended because your wallet balance is too low for the next ${direction} ${usageType}.`,
      read: false,
      metadata: {
        provider: 'vonage',
        virtualNumberId: number.id,
        msisdn: number.msisdn,
        usageType,
        direction,
        requiredAmount: chargeAmount,
      },
    });
    throw new Error(`Insufficient wallet balance for ${direction} ${usageType}`);
  }

  return { charged: true, amount: chargeAmount, billingRole, balanceAfter: result.balanceAfter };
}

export async function chargeUserVirtualVoiceAccess(
  userId: string,
  options?: {
    direction?: 'inbound' | 'outbound';
    referenceNumber?: string | null;
    backend?: string;
    virtualNumberId?: string | null;
  },
) {
  await ensureVonageSchema();
  const selectedNumberId = trim(options?.virtualNumberId || '');
  const number = selectedNumberId
    ? await getUserVirtualNumberById(userId, selectedNumberId)
    : await getUserVirtualNumber(userId);
  if (!number) {
    throw new Error('No active virtual number found for this account');
  }
  if (number.status !== 'active') {
    throw new Error('This virtual number is not active right now');
  }

  const inventoryItem = await findInventoryForVirtualNumber(number);
  const direction = options?.direction === 'inbound' ? 'inbound' : 'outbound';

  return chargeVirtualNumberUsage({
    userId,
    number,
    inventoryItem,
    usageType: 'voice',
    direction,
    description: `Virtual number ${direction} voice access for ${number.msisdn}`,
    referenceId: `${number.msisdn}:voice:${direction}:${Date.now()}`,
    metadata: {
      referenceNumber: trim(options?.referenceNumber || '') || null,
      backend: trim(options?.backend || 'voice'),
      chargePoint: 'voice_session',
    },
  });
}

async function getVirtualNumberBillingStatus(
  userId: string,
  number: typeof userVirtualNumbers.$inferSelect,
) {
  const [account] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!account) {
    return null;
  }

  const inventoryItem = await findInventoryForVirtualNumber(number);
  const billingRole = await resolveVirtualNumberBillingRole(account);
  const walletBalance = normalizeMoney(account.walletBalance);
  const walletBalanceValue = Number.parseFloat(walletBalance);
  const [smsOutbound, smsInbound, voiceOutbound, voiceInbound] = await Promise.all([
    getRoleAdjustedUsageRate({
      inventoryItem,
      usageType: 'sms',
      direction: 'outbound',
      billingRole,
    }),
    getRoleAdjustedUsageRate({
      inventoryItem,
      usageType: 'sms',
      direction: 'inbound',
      billingRole,
    }),
    getRoleAdjustedUsageRate({
      inventoryItem,
      usageType: 'voice',
      direction: 'outbound',
      billingRole,
    }),
    getRoleAdjustedUsageRate({
      inventoryItem,
      usageType: 'voice',
      direction: 'inbound',
      billingRole,
    }),
  ]);

  const canCover = (amount: string) => {
    const value = Number.parseFloat(amount);
    return (
      Number.isFinite(walletBalanceValue) &&
      Number.isFinite(value) &&
      walletBalanceValue + 0.0001 >= value
    );
  };

  return {
    walletBalance,
    billingRole,
    rates: {
      smsOutbound: smsOutbound.chargeAmount,
      smsInbound: smsInbound.chargeAmount,
      voiceOutbound: voiceOutbound.chargeAmount,
      voiceInbound: voiceInbound.chargeAmount,
      retail: {
        smsOutbound: smsOutbound.retailRate,
        smsInbound: smsInbound.retailRate,
        voiceOutbound: voiceOutbound.retailRate,
        voiceInbound: voiceInbound.retailRate,
      },
    },
    canSendSms: canCover(smsOutbound.chargeAmount),
    canReceiveSms: canCover(smsInbound.chargeAmount),
    canStartOutboundCall: canCover(voiceOutbound.chargeAmount),
    canReceiveInboundCall: canCover(voiceInbound.chargeAmount),
  };
}

function buildVirtualNumberSubscriptionMeta({
  packageTerm,
  packageMonths,
  packagePrice,
  paymentMethod,
  purchasedAt,
  existing,
}: {
  packageTerm: '1_month' | '3_months' | '6_months' | '9_months' | '1_year';
  packageMonths: number;
  packagePrice: string;
  paymentMethod: 'wallet' | 'other';
  purchasedAt: Date | string;
  existing?: Partial<VirtualNumberSubscriptionMeta> | null;
}): VirtualNumberSubscriptionMeta {
  const baseDate = new Date(purchasedAt);
  const existingActiveUntil = existing?.activeUntil ? new Date(existing.activeUntil) : null;
  const computedActiveUntil =
    existingActiveUntil && !Number.isNaN(existingActiveUntil.getTime())
      ? existingActiveUntil
      : addMonths(baseDate, packageMonths);

  return {
    packageTerm,
    billingMonths: packageMonths,
    paymentMethod,
    packagePrice: normalizeMoney(packagePrice),
    renewalPrice: normalizeMoney(existing?.renewalPrice, normalizeMoney(packagePrice)),
    autoRenew: existing?.autoRenew ?? true,
    reminderDays: normalizeInteger(existing?.reminderDays, 3),
    activeUntil: toIsoOrNull(computedActiveUntil),
    nextChargeAt: toIsoOrNull(existing?.nextChargeAt || computedActiveUntil),
    renewalStatus: existing?.renewalStatus || 'active',
    cancelAtPeriodEnd: Boolean(existing?.cancelAtPeriodEnd),
    canceledAt: existing?.canceledAt || null,
    canceledByAdmin: Boolean(existing?.canceledByAdmin),
    reminderSentFor: existing?.reminderSentFor || null,
    lastReminderAt: existing?.lastReminderAt || null,
    lastRenewedAt: existing?.lastRenewedAt || null,
    manualRenewalRequiredAt: existing?.manualRenewalRequiredAt || null,
    expiredAt: existing?.expiredAt || null,
    expiryNoticeSentAt: existing?.expiryNoticeSentAt || null,
  };
}

function getVirtualNumberSubscriptionMeta(metadata: Record<string, any> | null | undefined) {
  const candidate = metadata?.subscription as Partial<VirtualNumberSubscriptionMeta> | undefined;
  if (!candidate) return null;
  const parsedTerm = parsePackageTerm(candidate.packageTerm);
  return buildVirtualNumberSubscriptionMeta({
    packageTerm: parsedTerm.term,
    packageMonths: Number.isFinite(candidate.billingMonths)
      ? Number(candidate.billingMonths)
      : parsedTerm.months,
    packagePrice: normalizeMoney(candidate.packagePrice, '0.00'),
    paymentMethod: candidate.paymentMethod === 'wallet' ? 'wallet' : 'other',
    purchasedAt: candidate.lastRenewedAt || candidate.activeUntil || new Date(),
    existing: candidate,
  });
}

function basicAuthHeader(apiKey: string, apiSecret: string) {
  const token = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  return `Basic ${token}`;
}

function getAxiosErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  const status = error.response?.status;
  const providerMessage =
    trim((error.response?.data as any)?.title) ||
    trim((error.response?.data as any)?.detail) ||
    trim((error.response?.data as any)?.error_title) ||
    trim((error.response?.data as any)?.error_description) ||
    trim((error.response?.data as any)?.error?.message) ||
    trim((error.response?.data as any)?.message);

  if (status === 401 || status === 403) {
    return providerMessage
      ? `Vonage rejected the pricing request (${status}): ${providerMessage}. Check the API key, secret, and whether this account can access the Pricing API.`
      : `Vonage rejected the pricing request (${status}). Check the API key, secret, and whether this account can access the Pricing API.`;
  }

  if (providerMessage) {
    return `${fallback}: ${providerMessage}`;
  }

  if (status) {
    return `${fallback} (provider status ${status})`;
  }

  return error.message || fallback;
}

function buildApiForm(params: Record<string, string>) {
  const form = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '') form.append(key, value);
  });
  return form;
}

async function getSettingValue(key: string) {
  return (await storage.getSettingByKey(key))?.value || '';
}

export async function ensureVonageSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS virtual_number_applications (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider text NOT NULL DEFAULT 'vonage',
          status text NOT NULL DEFAULT 'pending',
          country_code text NOT NULL,
          desired_number text,
          notes text,
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `);
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_number_applications_user_id_idx ON virtual_number_applications(user_id)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_number_applications_status_idx ON virtual_number_applications(status)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_number_applications_provider_idx ON virtual_number_applications(provider)`,
      );

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS user_virtual_numbers (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider text NOT NULL DEFAULT 'vonage',
          msisdn text NOT NULL UNIQUE,
          country_code text NOT NULL,
          status text NOT NULL DEFAULT 'active',
          capabilities jsonb DEFAULT '{}'::jsonb,
          webhook_url text,
          application_id varchar REFERENCES virtual_number_applications(id) ON DELETE SET NULL,
          metadata jsonb DEFAULT '{}'::jsonb,
          assigned_at timestamp NOT NULL DEFAULT now(),
          released_at timestamp,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `);
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS user_virtual_numbers_user_id_idx ON user_virtual_numbers(user_id)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS user_virtual_numbers_msisdn_idx ON user_virtual_numbers(msisdn)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS user_virtual_numbers_status_idx ON user_virtual_numbers(status)`,
      );

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS virtual_number_inventory (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          provider text NOT NULL DEFAULT 'vonage',
          msisdn text NOT NULL UNIQUE,
          country_code text NOT NULL,
          status text NOT NULL DEFAULT 'available',
          is_premium boolean NOT NULL DEFAULT false,
          provider_setup_cost numeric(10,2) NOT NULL DEFAULT 0.00,
          provider_monthly_cost numeric(10,2) NOT NULL DEFAULT 0.00,
          provider_inbound_cost numeric(10,2) NOT NULL DEFAULT 0.00,
          provider_outbound_cost numeric(10,2) NOT NULL DEFAULT 0.00,
          provider_sms_cost numeric(10,2) NOT NULL DEFAULT 0.00,
          provider_mms_cost numeric(10,2) NOT NULL DEFAULT 0.00,
          provider_voice_cost numeric(10,2) NOT NULL DEFAULT 0.00,
          setup_fee numeric(10,2) NOT NULL DEFAULT 0.00,
          monthly_fee numeric(10,2) NOT NULL DEFAULT 0.00,
          inbound_fee numeric(10,2) NOT NULL DEFAULT 0.00,
          outbound_fee numeric(10,2) NOT NULL DEFAULT 0.00,
          sms_fee numeric(10,2) NOT NULL DEFAULT 0.00,
          mms_fee numeric(10,2) NOT NULL DEFAULT 0.00,
          voice_fee numeric(10,2) NOT NULL DEFAULT 0.00,
          capabilities jsonb DEFAULT '{}'::jsonb,
          notes text,
          assigned_user_id varchar REFERENCES users(id) ON DELETE SET NULL,
          assigned_virtual_number_id varchar REFERENCES user_virtual_numbers(id) ON DELETE SET NULL,
          purchased_at timestamp NOT NULL DEFAULT now(),
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `);
      await db.execute(
        sql`ALTER TABLE virtual_number_inventory ADD COLUMN IF NOT EXISTS provider_setup_cost numeric(10,2) NOT NULL DEFAULT 0.00`,
      );
      await db.execute(
        sql`ALTER TABLE virtual_number_inventory ADD COLUMN IF NOT EXISTS provider_monthly_cost numeric(10,2) NOT NULL DEFAULT 0.00`,
      );
      await db.execute(
        sql`ALTER TABLE virtual_number_inventory ADD COLUMN IF NOT EXISTS provider_inbound_cost numeric(10,2) NOT NULL DEFAULT 0.00`,
      );
      await db.execute(
        sql`ALTER TABLE virtual_number_inventory ADD COLUMN IF NOT EXISTS provider_outbound_cost numeric(10,2) NOT NULL DEFAULT 0.00`,
      );
      await db.execute(
        sql`ALTER TABLE virtual_number_inventory ADD COLUMN IF NOT EXISTS provider_sms_cost numeric(10,2) NOT NULL DEFAULT 0.00`,
      );
      await db.execute(
        sql`ALTER TABLE virtual_number_inventory ADD COLUMN IF NOT EXISTS provider_mms_cost numeric(10,2) NOT NULL DEFAULT 0.00`,
      );
      await db.execute(
        sql`ALTER TABLE virtual_number_inventory ADD COLUMN IF NOT EXISTS provider_voice_cost numeric(10,2) NOT NULL DEFAULT 0.00`,
      );
      await db.execute(
        sql`ALTER TABLE virtual_number_inventory ADD COLUMN IF NOT EXISTS sms_fee numeric(10,2) NOT NULL DEFAULT 0.00`,
      );
      await db.execute(
        sql`ALTER TABLE virtual_number_inventory ADD COLUMN IF NOT EXISTS mms_fee numeric(10,2) NOT NULL DEFAULT 0.00`,
      );
      await db.execute(
        sql`ALTER TABLE virtual_number_inventory ADD COLUMN IF NOT EXISTS voice_fee numeric(10,2) NOT NULL DEFAULT 0.00`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_number_inventory_msisdn_idx ON virtual_number_inventory(msisdn)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_number_inventory_country_code_idx ON virtual_number_inventory(country_code)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_number_inventory_status_idx ON virtual_number_inventory(status)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_number_inventory_is_premium_idx ON virtual_number_inventory(is_premium)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_number_inventory_assigned_user_id_idx ON virtual_number_inventory(assigned_user_id)`,
      );

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS virtual_sms_messages (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          virtual_number_id varchar NOT NULL REFERENCES user_virtual_numbers(id) ON DELETE CASCADE,
          provider text NOT NULL DEFAULT 'vonage',
          direction text NOT NULL,
          from_number text NOT NULL,
          to_number text NOT NULL,
          text text NOT NULL,
          provider_message_id text,
          status text NOT NULL DEFAULT 'received',
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `);
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_sms_messages_user_id_idx ON virtual_sms_messages(user_id)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_sms_messages_virtual_number_id_idx ON virtual_sms_messages(virtual_number_id)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_sms_messages_direction_idx ON virtual_sms_messages(direction)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_sms_messages_provider_message_id_idx ON virtual_sms_messages(provider_message_id)`,
      );

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS virtual_voice_calls (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          virtual_number_id varchar NOT NULL REFERENCES user_virtual_numbers(id) ON DELETE CASCADE,
          provider text NOT NULL DEFAULT 'vonage',
          direction text NOT NULL DEFAULT 'outbound',
          from_number text NOT NULL,
          to_number text NOT NULL,
          status text NOT NULL DEFAULT 'session_created',
          provider_call_id text,
          conversation_id text,
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `);
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_voice_calls_user_id_idx ON virtual_voice_calls(user_id)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_voice_calls_virtual_number_id_idx ON virtual_voice_calls(virtual_number_id)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_voice_calls_direction_idx ON virtual_voice_calls(direction)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_voice_calls_status_idx ON virtual_voice_calls(status)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_voice_calls_provider_call_id_idx ON virtual_voice_calls(provider_call_id)`,
      );

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS virtual_voicemails (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          virtual_number_id varchar NOT NULL REFERENCES user_virtual_numbers(id) ON DELETE CASCADE,
          provider text NOT NULL DEFAULT 'vonage',
          from_number text NOT NULL,
          to_number text NOT NULL,
          recording_url text,
          recording_uuid text,
          duration_seconds integer NOT NULL DEFAULT 0,
          status text NOT NULL DEFAULT 'recorded',
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `);
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_voicemails_user_id_idx ON virtual_voicemails(user_id)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_voicemails_virtual_number_id_idx ON virtual_voicemails(virtual_number_id)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_voicemails_recording_uuid_idx ON virtual_voicemails(recording_uuid)`,
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS virtual_voicemails_status_idx ON virtual_voicemails(status)`,
      );
    })();
  }

  return ensurePromise;
}

export async function getVonageConfig(): Promise<VonageConfig> {
  const [
    enabled,
    apiKey,
    apiSecret,
    applicationId,
    privateKey,
    brandName,
    inboundWebhookUrl,
    statusWebhookUrl,
    defaultCountry,
    autoAssign,
    setupFee,
    monthlyFee,
    inboundFee,
    outboundFee,
    standardMonthPackagePrice,
    standardThreeMonthPackagePrice,
    standardSixMonthPackagePrice,
    standardNineMonthPackagePrice,
    standardYearPackagePrice,
    premiumSetupFee,
    premiumMonthlyFee,
    premiumInboundFee,
    premiumOutboundFee,
    premiumMonthPackagePrice,
    premiumThreeMonthPackagePrice,
    premiumSixMonthPackagePrice,
    premiumNineMonthPackagePrice,
    premiumYearPackagePrice,
    messagesApiPrice,
    messagesApiNotes,
  ] = await Promise.all([
    getSettingValue('vonage_enabled'),
    getSettingValue('vonage_api_key'),
    getSettingValue('vonage_api_secret'),
    getSettingValue('vonage_application_id'),
    getSettingValue('vonage_private_key'),
    getSettingValue('vonage_brand_name'),
    getSettingValue('vonage_inbound_webhook_url'),
    getSettingValue('vonage_status_webhook_url'),
    getSettingValue('vonage_virtual_number_default_country'),
    getSettingValue('vonage_virtual_number_auto_assign'),
    getSettingValue('vonage_setup_fee'),
    getSettingValue('vonage_monthly_fee'),
    getSettingValue('vonage_inbound_fee'),
    getSettingValue('vonage_outbound_fee'),
    getSettingValue('vonage_standard_month_package_price'),
    getSettingValue('vonage_standard_three_month_package_price'),
    getSettingValue('vonage_standard_six_month_package_price'),
    getSettingValue('vonage_standard_nine_month_package_price'),
    getSettingValue('vonage_standard_year_package_price'),
    getSettingValue('vonage_premium_setup_fee'),
    getSettingValue('vonage_premium_monthly_fee'),
    getSettingValue('vonage_premium_inbound_fee'),
    getSettingValue('vonage_premium_outbound_fee'),
    getSettingValue('vonage_premium_month_package_price'),
    getSettingValue('vonage_premium_three_month_package_price'),
    getSettingValue('vonage_premium_six_month_package_price'),
    getSettingValue('vonage_premium_nine_month_package_price'),
    getSettingValue('vonage_premium_year_package_price'),
    getSettingValue('vonage_messages_api_price'),
    getSettingValue('vonage_messages_api_notes'),
  ]);

  return {
    enabled: enabled === 'true',
    apiKey: trim(apiKey),
    apiSecret: trim(apiSecret),
    applicationId: trim(applicationId),
    privateKey: normalizePrivateKey(privateKey),
    brandName: trim(brandName) || 'eSIMConnect',
    inboundWebhookUrl: trim(inboundWebhookUrl),
    statusWebhookUrl: trim(statusWebhookUrl),
    defaultCountry: trim(defaultCountry).toUpperCase() || 'US',
    autoAssign: autoAssign !== 'false',
    messagesApiPrice: normalizeMoney(messagesApiPrice),
    messagesApiNotes: trim(messagesApiNotes),
    pricing: {
      setupFee: normalizeMoney(setupFee),
      monthlyFee: normalizeMoney(monthlyFee),
      inboundFee: normalizeMoney(inboundFee),
      outboundFee: normalizeMoney(outboundFee),
      standardMonthPackagePrice: normalizeMoney(
        standardMonthPackagePrice,
        (
          Number.parseFloat(normalizeMoney(setupFee)) +
          Number.parseFloat(normalizeMoney(monthlyFee))
        ).toFixed(2),
      ),
      standardThreeMonthPackagePrice: normalizeMoney(
        standardThreeMonthPackagePrice,
        (
          Number.parseFloat(normalizeMoney(setupFee)) +
          Number.parseFloat(normalizeMoney(monthlyFee)) * 3
        ).toFixed(2),
      ),
      standardSixMonthPackagePrice: normalizeMoney(
        standardSixMonthPackagePrice,
        (
          Number.parseFloat(normalizeMoney(setupFee)) +
          Number.parseFloat(normalizeMoney(monthlyFee)) * 6
        ).toFixed(2),
      ),
      standardNineMonthPackagePrice: normalizeMoney(
        standardNineMonthPackagePrice,
        (
          Number.parseFloat(normalizeMoney(setupFee)) +
          Number.parseFloat(normalizeMoney(monthlyFee)) * 9
        ).toFixed(2),
      ),
      standardYearPackagePrice: normalizeMoney(
        standardYearPackagePrice,
        (
          Number.parseFloat(normalizeMoney(setupFee)) +
          Number.parseFloat(normalizeMoney(monthlyFee)) * 12
        ).toFixed(2),
      ),
      premiumSetupFee: normalizeMoney(premiumSetupFee, normalizeMoney(setupFee)),
      premiumMonthlyFee: normalizeMoney(premiumMonthlyFee, normalizeMoney(monthlyFee)),
      premiumInboundFee: normalizeMoney(premiumInboundFee, normalizeMoney(inboundFee)),
      premiumOutboundFee: normalizeMoney(premiumOutboundFee, normalizeMoney(outboundFee)),
      premiumMonthPackagePrice: normalizeMoney(
        premiumMonthPackagePrice,
        (
          Number.parseFloat(normalizeMoney(premiumSetupFee, normalizeMoney(setupFee))) +
          Number.parseFloat(normalizeMoney(premiumMonthlyFee, normalizeMoney(monthlyFee)))
        ).toFixed(2),
      ),
      premiumThreeMonthPackagePrice: normalizeMoney(
        premiumThreeMonthPackagePrice,
        (
          Number.parseFloat(normalizeMoney(premiumSetupFee, normalizeMoney(setupFee))) +
          Number.parseFloat(normalizeMoney(premiumMonthlyFee, normalizeMoney(monthlyFee))) * 3
        ).toFixed(2),
      ),
      premiumSixMonthPackagePrice: normalizeMoney(
        premiumSixMonthPackagePrice,
        (
          Number.parseFloat(normalizeMoney(premiumSetupFee, normalizeMoney(setupFee))) +
          Number.parseFloat(normalizeMoney(premiumMonthlyFee, normalizeMoney(monthlyFee))) * 6
        ).toFixed(2),
      ),
      premiumNineMonthPackagePrice: normalizeMoney(
        premiumNineMonthPackagePrice,
        (
          Number.parseFloat(normalizeMoney(premiumSetupFee, normalizeMoney(setupFee))) +
          Number.parseFloat(normalizeMoney(premiumMonthlyFee, normalizeMoney(monthlyFee))) * 9
        ).toFixed(2),
      ),
      premiumYearPackagePrice: normalizeMoney(
        premiumYearPackagePrice,
        (
          Number.parseFloat(normalizeMoney(premiumSetupFee, normalizeMoney(setupFee))) +
          Number.parseFloat(normalizeMoney(premiumMonthlyFee, normalizeMoney(monthlyFee))) * 12
        ).toFixed(2),
      ),
    },
  };
}

function buildVonageApplicationJwt(config: VonageConfig) {
  if (!config.applicationId || !config.privateKey) {
    throw new Error('Vonage Application ID and private key are required for Voice SDK sessions');
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 15 * 60;

  return jwt.sign(
    {
      application_id: config.applicationId,
      iat: issuedAt,
      exp: expiresAt,
      jti: randomUUID(),
    },
    config.privateKey,
    {
      algorithm: 'RS256',
      noTimestamp: true,
    },
  );
}

function buildVonageClientJwt(config: VonageConfig, username: string) {
  if (!config.applicationId || !config.privateKey) {
    throw new Error('Vonage Application ID and private key are required for Voice SDK sessions');
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 15 * 60;

  return jwt.sign(
    {
      application_id: config.applicationId,
      sub: username,
      iat: issuedAt,
      exp: expiresAt,
      jti: randomUUID(),
      acl: {
        paths: {
          '/*/rtc/**': {},
          '/*/users/**': {},
          '/*/conversations/**': {},
          '/*/sessions/**': {},
          '/*/devices/**': {},
          '/*/push/**': {},
          '/*/knocking/**': {},
          '/*/legs/**': {},
        },
      },
    },
    config.privateKey,
    {
      algorithm: 'RS256',
      noTimestamp: true,
    },
  );
}

async function ensureVonageVoiceUser(config: VonageConfig, username: string, displayName: string) {
  const applicationJwt = buildVonageApplicationJwt(config);

  try {
    await axios.post(
      'https://api.nexmo.com/v1/users',
      {
        name: username,
        display_name: displayName,
      },
      {
        headers: {
          Authorization: `Bearer ${applicationJwt}`,
          'Content-Type': 'application/json',
        },
      },
    );
    return { created: true };
  } catch (error: any) {
    const status = Number(error?.response?.status || 0);
    const detail = String(
      error?.response?.data?.detail ||
        error?.response?.data?.title ||
        error?.response?.data?.type ||
        error?.message ||
        '',
    ).toLowerCase();

    if (status === 409 || detail.includes('exists') || detail.includes('conflict')) {
      return { created: false };
    }

    throw error;
  }
}

export async function createVonageVoiceSession(
  userId: string,
  options?: {
    direction?: 'inbound' | 'outbound';
    referenceNumber?: string | null;
    virtualNumberId?: string | null;
    callType?: 'international' | 'sip';
    spokenMessage?: string | null;
  },
) {
  const config = await getVonageConfig();
  if (!config.apiKey || !config.apiSecret || !config.applicationId || !config.privateKey) {
    throw new Error('eRoaming voice is not fully configured.');
  }

  const user = await storage.getUser(userId);
  if (!user) throw new Error('User not found');

  const selectedNumberId = trim(options?.virtualNumberId || '');
  const number = selectedNumberId
    ? await getUserVirtualNumberById(userId, selectedNumberId)
    : await getUserVirtualNumber(userId);
  if (!number) {
    throw new Error('No active virtual number found for this account');
  }
  if (number.status !== 'active') {
    throw new Error('This virtual number is not active right now');
  }

  const direction = options?.direction === 'inbound' ? 'inbound' : 'outbound';
  const referenceNumber = trim(options?.referenceNumber || '');
  const callType = options?.callType === 'sip' ? 'sip' : 'international';
  const spokenMessage = trim(options?.spokenMessage || '');
  const normalizedDestination =
    direction === 'outbound'
      ? normalizeOutboundVoiceDestination(referenceNumber, number.countryCode)
      : '';
  const usageCharge = await chargeUserVirtualVoiceAccess(userId, {
    ...options,
    direction,
    referenceNumber,
    virtualNumberId: number.id,
    backend: 'vonage',
  });

  const username = `app-user-${user.id}`;
  const displayName = trim(user.name) || trim(user.email) || username;
  const { created } = await ensureVonageVoiceUser(config, username, displayName);
  const token = buildVonageClientJwt(config, username);

  const [voiceCall] = await db
    .insert(virtualVoiceCalls)
    .values({
      userId,
      virtualNumberId: number.id,
      provider: 'vonage',
      direction,
      fromNumber: number.msisdn,
      toNumber: referenceNumber || '',
      status: 'session_created',
      metadata: {
        backend: 'vonage',
        callType,
        spokenMessage: spokenMessage || null,
        normalizedDestination: normalizedDestination || null,
        charge: usageCharge,
      },
    })
    .returning();

  return {
    username,
    displayName,
    token,
    applicationId: config.applicationId,
    brandName: 'eRoaming',
    defaultCountry: config.defaultCountry,
    virtualNumberId: number.id,
    fromNumber: number.msisdn,
    toNumber: referenceNumber || null,
    outboundDestination: normalizedDestination || null,
    callRecordId: voiceCall?.id || null,
    customData: {
      from_user: username,
      fromUser: username,
      virtualNumberId: number.id,
      callRecordId: voiceCall?.id || null,
      to: referenceNumber || null,
      destination: referenceNumber || null,
      callType,
      spokenMessage: spokenMessage || null,
    },
    createdUser: created,
    expiresInSeconds: 15 * 60,
  };
}

function phoneDigits(value: unknown) {
  return trim(value).replace(/\D/g, '');
}

const COUNTRY_CALLING_CODES: Record<string, string> = {
  AE: '971',
  AR: '54',
  AT: '43',
  AU: '61',
  BE: '32',
  BR: '55',
  CA: '1',
  CH: '41',
  CZ: '420',
  DE: '49',
  DK: '45',
  EG: '20',
  ES: '34',
  FI: '358',
  FR: '33',
  GB: '44',
  GR: '30',
  HK: '852',
  ID: '62',
  IE: '353',
  IL: '972',
  IN: '91',
  IT: '39',
  JP: '81',
  KR: '82',
  LB: '961',
  MX: '52',
  MY: '60',
  NL: '31',
  NO: '47',
  PH: '63',
  PL: '48',
  PT: '351',
  RO: '40',
  SA: '966',
  SE: '46',
  SG: '65',
  TH: '66',
  TR: '90',
  US: '1',
  ZA: '27',
};

function toVonagePhoneNumber(value: unknown) {
  const digits = phoneDigits(value);
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : '';
}

function normalizeOutboundVoiceDestination(value: unknown, countryCode?: string | null) {
  const raw = trim(value);
  const normalized = raw.startsWith('00') ? `+${raw.slice(2)}` : raw;
  if (/^\+[1-9]\d{7,14}$/.test(normalized)) return normalized.replace(/\D/g, '');

  const countryPrefix = COUNTRY_CALLING_CODES[trim(countryCode).toUpperCase()];
  const localDigits = phoneDigits(raw).replace(/^0+/, '');
  if (countryPrefix && /^[1-9]\d{3,13}$/.test(localDigits)) {
    const localCandidate = `${countryPrefix}${localDigits}`;
    if (/^[1-9]\d{7,14}$/.test(localCandidate)) return localCandidate;
  }

  return '';
}

function parseVonageCustomData(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string') return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function findActiveVirtualNumberByMsisdn(value: unknown) {
  const digits = phoneDigits(value);
  if (!digits) return null;

  const [number] = await db
    .select()
    .from(userVirtualNumbers)
    .where(
      and(
        eq(userVirtualNumbers.status, 'active'),
        sql`regexp_replace(${userVirtualNumbers.msisdn}, '[^0-9]', '', 'g') = ${digits}`,
      ),
    )
    .limit(1);

  return number || null;
}

function voiceWebhookBaseUrl(baseUrl: string) {
  return trim(baseUrl).replace(/\/$/, '');
}

function voiceEventUrl(baseUrl: string) {
  return `${voiceWebhookBaseUrl(baseUrl)}/api/webhooks/vonage/voice/events`;
}

function voiceVoicemailUrl(baseUrl: string) {
  return `${voiceWebhookBaseUrl(baseUrl)}/api/webhooks/vonage/voice/voicemail`;
}

function voiceUnavailableNcco(message = 'This eRoaming number is not available right now.') {
  return [
    {
      action: 'talk',
      text: message,
    },
  ];
}

export async function buildVonageVoiceAnswerNcco(payload: Record<string, any>, baseUrl: string) {
  await ensureVonageSchema();

  const config = await getVonageConfig();
  if (!config.enabled || !config.applicationId || !config.privateKey) {
    return voiceUnavailableNcco('eRoaming voice is not configured right now.');
  }

  const customData = parseVonageCustomData(payload.custom_data);
  const fromUser = trim(payload.from_user || customData.from_user || customData.fromUser);
  const requestedVirtualNumberId = trim(customData.virtualNumberId || customData.virtual_number_id);
  const rawOutboundDestination =
    customData.to || customData.callee || customData.number || customData.destination;

  if (fromUser && rawOutboundDestination) {
    const userId = fromUser.startsWith('app-user-') ? fromUser.replace(/^app-user-/, '') : '';
    if (!userId) {
      return voiceUnavailableNcco('We could not identify the calling eRoaming user.');
    }

    const number = requestedVirtualNumberId
      ? await getUserVirtualNumberById(userId, requestedVirtualNumberId)
      : await getUserVirtualNumber(userId);
    if (!number) {
      return voiceUnavailableNcco('No active eRoaming number is assigned to this account.');
    }
    if (number.status !== 'active') {
      return voiceUnavailableNcco('This eRoaming number is not active right now.');
    }

    const fromNumber = toVonagePhoneNumber(number.msisdn);
    if (!fromNumber) {
      return voiceUnavailableNcco(
        'The assigned eRoaming number is not valid for outbound calling.',
      );
    }

    const outboundDestination = normalizeOutboundVoiceDestination(
      rawOutboundDestination,
      number.countryCode,
    );
    if (!outboundDestination) {
      return voiceUnavailableNcco('The destination number is not valid for outbound calling.');
    }

    return [
      {
        action: 'connect',
        from: fromNumber,
        timeout: 45,
        eventUrl: [voiceEventUrl(baseUrl)],
        endpoint: [
          {
            type: 'phone',
            number: outboundDestination,
          },
        ],
      },
    ];
  }

  const inboundNumber = await findActiveVirtualNumberByMsisdn(payload.to);
  if (!inboundNumber) {
    return voiceUnavailableNcco('This eRoaming number is not assigned.');
  }

  const user = await storage.getUser(inboundNumber.userId);
  if (!user) {
    return voiceUnavailableNcco('The eRoaming user for this number was not found.');
  }

  const username = `app-user-${user.id}`;
  const displayName = trim(user.name) || trim(user.email) || username;
  await ensureVonageVoiceUser(config, username, displayName);
  const routing = ((inboundNumber.metadata as Record<string, any>) || {}).routing || {};
  const routingType = trim(routing.type || 'none').toLowerCase();
  const routingDestination = trim(routing.destination);

  if (routingType === 'voicemail') {
    return [
      {
        action: 'talk',
        text: 'Please leave a message after the tone.',
      },
      {
        action: 'record',
        eventUrl: [`${voiceVoicemailUrl(baseUrl)}?virtualNumberId=${inboundNumber.id}`],
        endOnSilence: 3,
        beepStart: true,
        format: 'mp3',
      },
      {
        action: 'talk',
        text: 'Thank you. Your message has been saved.',
      },
    ];
  }

  if (routingType === 'international' && routingDestination) {
    const destination = normalizeOutboundVoiceDestination(
      routingDestination,
      inboundNumber.countryCode,
    );
    if (destination) {
      return [
        {
          action: 'connect',
          from: toVonagePhoneNumber(inboundNumber.msisdn) || phoneDigits(payload.to),
          timeout: 45,
          eventUrl: [voiceEventUrl(baseUrl)],
          endpoint: [
            {
              type: 'phone',
              number: destination,
            },
          ],
        },
      ];
    }
  }

  if (routingType === 'sip' && routingDestination) {
    return [
      {
        action: 'connect',
        from: toVonagePhoneNumber(inboundNumber.msisdn) || phoneDigits(payload.to),
        timeout: 45,
        eventUrl: [voiceEventUrl(baseUrl)],
        endpoint: [
          {
            type: 'sip',
            uri: routingDestination,
          },
        ],
      },
    ];
  }

  return [
    {
      action: 'connect',
      from: toVonagePhoneNumber(inboundNumber.msisdn) || phoneDigits(payload.to),
      timeout: 45,
      eventUrl: [voiceEventUrl(baseUrl)],
      endpoint: [
        {
          type: 'app',
          user: username,
        },
      ],
    },
  ];
}

export async function handleVonageVoiceEvent(payload: Record<string, any>) {
  await ensureVonageSchema();

  const status = trim(payload.status).toLowerCase();
  const direction = trim(payload.direction).toLowerCase();
  if (!status) return;

  const missedStatuses = new Set([
    'busy',
    'cancelled',
    'failed',
    'rejected',
    'timeout',
    'unanswered',
  ]);
  if (direction !== 'inbound' || !missedStatuses.has(status)) return;

  const number = await findActiveVirtualNumberByMsisdn(payload.to);
  if (!number) return;

  const from = trim(payload.from) || 'Unknown caller';
  await storage.createNotification({
    userId: number.userId,
    type: 'voice',
    title: 'Missed eRoaming call',
    message: `Missed call from ${from} to ${number.msisdn}.`,
    read: false,
    metadata: {
      provider: 'vonage',
      virtualNumberId: number.id,
      status,
      direction,
      callId: trim(payload.uuid),
      conversationId: trim(payload.conversation_uuid),
    },
  });
}

export async function storeVonageVoicemail(payload: Record<string, any>) {
  await ensureVonageSchema();

  const requestedVirtualNumberId = trim(payload.virtualNumberId || payload.virtual_number_id);
  let number: typeof userVirtualNumbers.$inferSelect | null = null;

  if (requestedVirtualNumberId) {
    const [row] = await db
      .select()
      .from(userVirtualNumbers)
      .where(eq(userVirtualNumbers.id, requestedVirtualNumberId))
      .limit(1);
    number = row || null;
  }

  if (!number) {
    number = await findActiveVirtualNumberByMsisdn(payload.to);
  }

  if (!number) return null;

  const from = trim(payload.from || payload.msisdn || payload.caller || payload.from_number) || 'Unknown caller';
  const to = trim(payload.to || payload.called || payload.to_number) || number.msisdn;
  const recordingUrl = trim(payload.recording_url || payload.recordingUrl || payload.url);
  const recordingUuid = trim(
    payload.recording_uuid || payload.recordingUuid || payload.uuid || payload.call_uuid,
  );
  const durationSeconds = Math.max(
    0,
    Math.trunc(Number(payload.duration || payload.duration_seconds || 0) || 0),
  );

  const [voicemail] = await db
    .insert(virtualVoicemails)
    .values({
      userId: number.userId,
      virtualNumberId: number.id,
      provider: 'vonage',
      fromNumber: from,
      toNumber: to,
      recordingUrl: recordingUrl || null,
      recordingUuid: recordingUuid || null,
      durationSeconds,
      status: recordingUrl ? 'recorded' : 'received',
      metadata: payload,
    })
    .returning();

  await storage.createNotification({
    userId: number.userId,
    type: 'voice',
    title: 'New eRoaming voicemail',
    message: `New voicemail from ${from} to ${number.msisdn}.`,
    read: false,
    metadata: {
      provider: 'vonage',
      virtualNumberId: number.id,
      voicemailId: voicemail.id,
      recordingUuid: recordingUuid || null,
    },
  });

  return voicemail;
}

function hasCredentials(config: VonageConfig) {
  return Boolean(config.apiKey && config.apiSecret);
}

function getPricingSnapshot(config: VonageConfig, overrides?: InventoryPricingInput) {
  const isPremium = Boolean(overrides?.isPremium);
  const defaultOutboundFee = isPremium
    ? config.pricing.premiumOutboundFee
    : config.pricing.outboundFee;
  return {
    isPremium,
    setupFee: normalizeMoney(
      overrides?.setupFee,
      isPremium ? config.pricing.premiumSetupFee : config.pricing.setupFee,
    ),
    monthlyFee: normalizeMoney(
      overrides?.monthlyFee,
      isPremium ? config.pricing.premiumMonthlyFee : config.pricing.monthlyFee,
    ),
    inboundFee: normalizeMoney(
      overrides?.inboundFee,
      isPremium ? config.pricing.premiumInboundFee : config.pricing.inboundFee,
    ),
    outboundFee: normalizeMoney(overrides?.outboundFee, defaultOutboundFee),
    smsFee: normalizeMoney(overrides?.smsFee, defaultOutboundFee),
    mmsFee: normalizeMoney(overrides?.mmsFee, config.messagesApiPrice),
    voiceFee: normalizeMoney(overrides?.voiceFee, defaultOutboundFee),
  };
}

function getPackageRetailPrice(
  config: VonageConfig,
  pricing: ReturnType<typeof getPricingSnapshot>,
) {
  const isPremium = pricing.isPremium;
  return {
    oneMonth: isPremium
      ? config.pricing.premiumMonthPackagePrice
      : config.pricing.standardMonthPackagePrice,
    oneYear: isPremium
      ? config.pricing.premiumYearPackagePrice
      : config.pricing.standardYearPackagePrice,
  };
}

async function getVonageAccountBalance(config: VonageConfig) {
  const response = await axios.get('https://rest.nexmo.com/account/get-balance', {
    params: {
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    },
    headers: {
      Authorization: basicAuthHeader(config.apiKey, config.apiSecret),
    },
  });

  return {
    value: normalizeMoney(response.data?.value, '0.00'),
    autoReload: Boolean(response.data?.autoReload),
    currency: 'EUR',
  };
}

async function listVonageOwnedNumbersPage(
  config: VonageConfig,
  options?: {
    countryCode?: string;
    pageIndex?: number;
    pageSize?: number;
  },
) {
  const countryCode = trim(options?.countryCode).toUpperCase();
  const size = Math.max(1, Math.min(Number(options?.pageSize || 100), 100));
  const index = Math.max(1, Number(options?.pageIndex || 1));

  const response = await withVonageRetry(
    () =>
      axios.get('https://rest.nexmo.com/account/numbers', {
        params: {
          api_key: config.apiKey,
          api_secret: config.apiSecret,
          size,
          index,
          ...(countryCode.length === 2 ? { country: countryCode } : {}),
        },
        headers: {
          Authorization: basicAuthHeader(config.apiKey, config.apiSecret),
        },
      }),
    3,
  );

  const numbers = Array.isArray(response.data?.numbers) ? response.data.numbers : [];
  const totalCount = Number.parseInt(
    String(
      response.data?.count ??
        response.data?.total_count ??
        response.data?.totalCount ??
        response.data?.total ??
        numbers.length,
    ),
    10,
  );

  return {
    numbers,
    totalCount: Number.isFinite(totalCount) ? totalCount : numbers.length,
    pageSize: size,
    pageIndex: index,
  };
}

async function searchVonageAvailableNumbers(
  config: VonageConfig,
  countryCode: string,
  desiredNumber?: string,
  options?: {
    type?: string;
    features?: string;
    searchPattern?: number;
  },
) {
  const result = await searchVonageAvailableNumbersPage(config, countryCode, desiredNumber, options);
  return result.numbers;
}

async function searchVonageAvailableNumbersPage(
  config: VonageConfig,
  countryCode: string,
  desiredNumber?: string,
  options?: {
    type?: string;
    features?: string;
    searchPattern?: number;
    size?: number;
    index?: number;
    retryAttempts?: number;
  },
) {
  const normalizedType = trim(options?.type);
  const normalizedFeatures = trim(options?.features);
  const normalizedSearchPattern =
    options?.searchPattern === 0 || options?.searchPattern === 2 ? options.searchPattern : 1;
  const size = Math.max(1, Math.min(Number(options?.size || 100), 100));
  const index = Math.max(1, Number(options?.index || 1));

  const response = await withVonageRetry(
    () =>
      axios.get('https://rest.nexmo.com/number/search', {
        params: {
          api_key: config.apiKey,
          api_secret: config.apiSecret,
          country: countryCode,
          size,
          index,
          ...(normalizedFeatures && normalizedFeatures.toLowerCase() !== 'any'
            ? { features: normalizedFeatures }
            : {}),
          ...(normalizedType && normalizedType !== 'any' ? { type: normalizedType } : {}),
          ...(desiredNumber ? { pattern: desiredNumber, search_pattern: normalizedSearchPattern } : {}),
        },
      }),
    options?.retryAttempts ?? 3,
  );

  const numbers = Array.isArray(response.data?.numbers) ? response.data.numbers : [];
  const totalCount = Number.parseInt(
    String(
      response.data?.count ??
        response.data?.total_count ??
        response.data?.totalCount ??
        response.data?.total ??
        numbers.length,
    ),
    10,
  );

  return {
    numbers,
    totalCount: Number.isFinite(totalCount) ? totalCount : numbers.length,
    pageSize: size,
    pageIndex: index,
  };
}

async function searchAvailableVonageNumber(
  config: VonageConfig,
  countryCode: string,
  desiredNumber?: string,
) {
  const numbers = await searchVonageAvailableNumbers(config, countryCode, desiredNumber);
  return numbers[0] || null;
}

async function buyVonageNumber(config: VonageConfig, countryCode: string, msisdn: string) {
  const form = buildApiForm({
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    country: countryCode,
    msisdn,
  });

  const response = await axios.post('https://rest.nexmo.com/number/buy', form.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuthHeader(config.apiKey, config.apiSecret),
    },
  });

  return response.data;
}

async function getVonageOutboundPricing(
  config: VonageConfig,
  product: 'sms-outbound' | 'voice-outbound',
  countryCode: string,
) {
  try {
    const response = await axios.get(`https://api.nexmo.com/v2/account/pricing/${product}`, {
      params: {
        country: countryCode,
        page_size: 100,
      },
      headers: {
        Authorization: basicAuthHeader(config.apiKey, config.apiSecret),
      },
    });
    const countries = Array.isArray(response.data?._embedded?.countries)
      ? response.data._embedded.countries
      : [];

    return {
      rows: countries,
      source: 'v2' as const,
    };
  } catch (error) {
    if (!axios.isAxiosError(error) || ![401, 403].includes(error.response?.status || 0)) {
      throw new Error(getAxiosErrorMessage(error, `Failed to load Vonage ${product} pricing`));
    }
  }

  const legacyType = product === 'sms-outbound' ? 'sms' : 'voice';

  try {
    const response = await axios.get(
      `https://rest.nexmo.com/account/get-pricing/outbound/${legacyType}`,
      {
        params: {
          api_key: config.apiKey,
          api_secret: config.apiSecret,
          country: countryCode,
        },
      },
    );

    const networks = Array.isArray(response.data?.networks) ? response.data.networks : [];
    const fallbackRows = networks.length
      ? networks.map((network: any) => ({
          country_name: response.data?.countryName || countryCode,
          dialing_prefix: response.data?.dialingPrefix || '',
          dest_network_type: network?.type || 'ALL',
          rate_increment: '',
          currency: network?.currency || response.data?.currency || '',
          price: network?.price || response.data?.defaultPrice || '0',
        }))
      : [
          {
            country_name: response.data?.countryName || countryCode,
            dialing_prefix: response.data?.dialingPrefix || '',
            dest_network_type: 'ALL',
            rate_increment: '',
            currency: response.data?.currency || '',
            price: response.data?.defaultPrice || '0',
          },
        ];

    return {
      rows: fallbackRows,
      source: 'v1' as const,
    };
  } catch (fallbackError) {
    throw new Error(
      getAxiosErrorMessage(fallbackError, `Failed to load Vonage ${product} pricing`),
    );
  }
}

async function getSafeVonageOutboundPricing(
  config: VonageConfig,
  product: 'sms-outbound' | 'voice-outbound',
  countryCode: string,
) {
  try {
    return {
      ...(await getVonageOutboundPricing(config, product, countryCode)),
      error: null as string | null,
    };
  } catch (error) {
    return {
      rows: [],
      source: 'unavailable' as const,
      error: error instanceof Error ? error.message : `Failed to load Vonage ${product} pricing`,
    };
  }
}

async function updateVonageNumberWebhook(
  config: VonageConfig,
  countryCode: string,
  msisdn: string,
  webhookUrl: string,
) {
  const form = buildApiForm({
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    country: countryCode,
    msisdn,
    moHttpUrl: webhookUrl,
    ...(config.applicationId ? { app_id: config.applicationId } : {}),
  });

  const response = await axios.post('https://rest.nexmo.com/number/update', form.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuthHeader(config.apiKey, config.apiSecret),
    },
  });

  return response.data;
}

export async function sendVonageSms(config: VonageConfig, from: string, to: string, text: string) {
  const form = buildApiForm({
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    from,
    to,
    text,
    'status-report-req': 'true',
    ...(config.statusWebhookUrl ? { callback: config.statusWebhookUrl } : {}),
  });

  const response = await axios.post('https://rest.nexmo.com/sms/json', form.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuthHeader(config.apiKey, config.apiSecret),
    },
  });

  return response.data;
}

function getVonagePayloadValue(payload: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = trim(payload[key]);
    if (value) return value;
  }
  return '';
}

function normalizeVonageDeliveryStatus(payload: Record<string, any>) {
  const rawStatus = getVonagePayloadValue(payload, [
    'status',
    'messageStatus',
    'message-status',
    'deliveryStatus',
    'delivery-status',
  ]).toLowerCase();

  if (!rawStatus) return 'delivery_update';

  const statusMap: Record<string, string> = {
    accepted: 'sent',
    submitted: 'sent',
    buffered: 'queued',
    delivered: 'delivered',
    rejected: 'failed',
    failed: 'failed',
    expired: 'failed',
    undeliverable: 'failed',
    unknown: 'failed',
  };

  return statusMap[rawStatus] || rawStatus;
}

export async function storeVonageSmsDeliveryStatus(payload: Record<string, any>) {
  await ensureVonageSchema();

  const providerMessageId = getVonagePayloadValue(payload, [
    'messageId',
    'message-id',
    'message_id',
    'messageUUID',
    'message_uuid',
    'uuid',
  ]);

  if (!providerMessageId) {
    return null;
  }

  const [message] = await db
    .select()
    .from(virtualSmsMessages)
    .where(eq(virtualSmsMessages.providerMessageId, providerMessageId))
    .limit(1);

  if (!message) {
    return null;
  }

  const metadata = (message.metadata as Record<string, any>) || {};
  const receipts = Array.isArray(metadata.deliveryReceipts)
    ? metadata.deliveryReceipts.slice(-9)
    : [];
  const deliveryReceipt = {
    ...payload,
    providerMessageId,
    normalizedStatus: normalizeVonageDeliveryStatus(payload),
    receivedAt: new Date().toISOString(),
  };

  const [updated] = await db
    .update(virtualSmsMessages)
    .set({
      status: deliveryReceipt.normalizedStatus,
      metadata: {
        ...metadata,
        deliveryReceipt,
        deliveryReceipts: [...receipts, deliveryReceipt],
      },
      updatedAt: new Date(),
    })
    .where(eq(virtualSmsMessages.id, message.id))
    .returning();

  return updated || null;
}

export async function getUserVirtualNumber(userId: string) {
  await ensureVonageSchema();
  await processVirtualNumberSubscriptionLifecycle();
  const [number] = await db
    .select()
    .from(userVirtualNumbers)
    .where(and(eq(userVirtualNumbers.userId, userId), eq(userVirtualNumbers.status, 'active')))
    .orderBy(desc(userVirtualNumbers.createdAt))
    .limit(1);

  return number || null;
}

export async function getUserVirtualNumbers(userId: string) {
  await ensureVonageSchema();
  await processVirtualNumberSubscriptionLifecycle();
  return db
    .select()
    .from(userVirtualNumbers)
    .where(eq(userVirtualNumbers.userId, userId))
    .orderBy(desc(userVirtualNumbers.createdAt));
}

export async function getUserVirtualNumberById(userId: string, virtualNumberId: string) {
  await ensureVonageSchema();
  await processVirtualNumberSubscriptionLifecycle();
  const [number] = await db
    .select()
    .from(userVirtualNumbers)
    .where(
      and(
        eq(userVirtualNumbers.id, virtualNumberId),
        eq(userVirtualNumbers.userId, userId),
      ),
    )
    .limit(1);

  return number || null;
}

async function sendVirtualNumberReminderEmail(
  userEmail: string,
  msisdn: string,
  subscription: VirtualNumberSubscriptionMeta,
) {
  const renewAt = subscription.nextChargeAt
    ? new Date(subscription.nextChargeAt).toLocaleString()
    : 'your renewal date';
  const amount = normalizeMoney(subscription.renewalPrice, subscription.packagePrice);
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin-bottom:12px;">Virtual Number Renewal Reminder</h2>
      <p>Your virtual number <strong>${msisdn}</strong> is scheduled to renew on <strong>${renewAt}</strong>.</p>
      <p>Renewal amount: <strong>$${amount}</strong></p>
      <p>Auto renew is currently <strong>${subscription.autoRenew ? 'enabled' : 'disabled'}</strong>.</p>
      <p>If you do not want the number to renew again, contact support or disable auto renew before the renewal date.</p>
    </div>
  `;

  await sendEmail({
    to: userEmail,
    subject: `Virtual Number Renewal Reminder for ${msisdn}`,
    html,
  });
}

async function sendVirtualNumberExpiredEmail(userEmail: string, msisdn: string) {
  await sendEmail({
    to: userEmail,
    subject: `Virtual Number Subscription Ended for ${msisdn}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin-bottom:12px;">Virtual Number Subscription Ended</h2>
        <p>Your virtual number <strong>${msisdn}</strong> has reached its expiry date and will no longer renew.</p>
        <p>If you want to activate it again, please contact support or request a new renewal from your dashboard.</p>
      </div>
    `,
  });
}

async function processVirtualNumberSubscriptionLifecycle() {
  await ensureVonageSchema();
  const inventory = await db.select().from(virtualNumberInventory);
  const now = new Date();

  for (const item of inventory) {
    const metadata = (item.metadata as Record<string, any>) || {};
    const subscription = getVirtualNumberSubscriptionMeta(metadata);
    if (!subscription) continue;

    const assignedUserId = item.assignedUserId || null;
    const nextChargeAt = subscription.nextChargeAt ? new Date(subscription.nextChargeAt) : null;
    const activeUntil = subscription.activeUntil ? new Date(subscription.activeUntil) : null;
    const reminderSentFor = subscription.reminderSentFor || null;

    if (
      assignedUserId &&
      nextChargeAt &&
      !Number.isNaN(nextChargeAt.getTime()) &&
      reminderSentFor !== subscription.nextChargeAt &&
      nextChargeAt.getTime() - now.getTime() <= subscription.reminderDays * 24 * 60 * 60 * 1000 &&
      nextChargeAt.getTime() > now.getTime()
    ) {
      const [account] = await db.select().from(users).where(eq(users.id, assignedUserId)).limit(1);
      if (account) {
        await storage.createNotification({
          userId: assignedUserId,
          type: 'wallet',
          title: 'Virtual number renewal reminder',
          message: `Your virtual number ${item.msisdn} renews on ${nextChargeAt.toLocaleString()}.`,
          read: false,
          metadata: {
            provider: 'vonage',
            msisdn: item.msisdn,
            renewalPrice: subscription.renewalPrice,
            nextChargeAt: subscription.nextChargeAt,
          },
        });

        if (trim(account.email)) {
          await sendVirtualNumberReminderEmail(account.email, item.msisdn, subscription);
        }
      }

      subscription.reminderSentFor = subscription.nextChargeAt;
      subscription.lastReminderAt = now.toISOString();

      await db
        .update(virtualNumberInventory)
        .set({
          metadata: {
            ...metadata,
            subscription,
          },
          updatedAt: now,
        })
        .where(eq(virtualNumberInventory.id, item.id));
    }

    if (
      !activeUntil ||
      Number.isNaN(activeUntil.getTime()) ||
      activeUntil.getTime() > now.getTime()
    ) {
      continue;
    }

    if (subscription.autoRenew && subscription.paymentMethod === 'wallet' && assignedUserId) {
      const [account] = await db.select().from(users).where(eq(users.id, assignedUserId)).limit(1);
      const chargeAmount = Number.parseFloat(
        subscription.renewalPrice || subscription.packagePrice || '0',
      );
      const balanceBefore = Number.parseFloat(String(account?.walletBalance || '0.00'));
      const billingMonths = Math.max(
        1,
        Number(subscription.billingMonths || parsePackageTerm(subscription.packageTerm).months),
      );
      const providerCost = moneyValue(item.providerMonthlyCost) * billingMonths;

      if (account && Number.isFinite(chargeAmount) && balanceBefore + 0.0001 >= chargeAmount) {
        const balanceAfter = balanceBefore - chargeAmount;
        const nextActiveUntil = addMonths(activeUntil, billingMonths);

        await db.transaction(async (tx) => {
          await tx
            .update(users)
            .set({
              walletBalance: balanceAfter.toFixed(2),
              updatedAt: now,
            })
            .where(eq(users.id, assignedUserId));

          await tx.insert(walletTransactions).values({
            userId: assignedUserId,
            type: 'purchase_debit',
            status: 'completed',
            amount: normalizeMoney(subscription.renewalPrice),
            currency: 'USD',
            balanceBefore: balanceBefore.toFixed(2),
            balanceAfter: balanceAfter.toFixed(2),
            provider: 'admin',
            referenceId: item.msisdn,
            description: `Virtual number ${item.msisdn} auto renewal`,
            metadata: {
              provider: 'vonage',
              autoRenew: true,
              msisdn: item.msisdn,
              inventoryId: item.id,
              billingMonths,
              providerCost: providerCost.toFixed(2),
              providerMonthlyCost: normalizeMoney(item.providerMonthlyCost),
              packageTerm: subscription.packageTerm,
            },
            completedAt: now,
          });
        });

        subscription.activeUntil = nextActiveUntil.toISOString();
        subscription.nextChargeAt = nextActiveUntil.toISOString();
        subscription.renewalStatus = 'active';
        subscription.lastRenewedAt = now.toISOString();
        subscription.reminderSentFor = null;
        subscription.manualRenewalRequiredAt = null;

        await db
          .update(virtualNumberInventory)
          .set({
            status: item.assignedUserId ? 'assigned' : item.status,
            metadata: {
              ...metadata,
              subscription,
            },
            updatedAt: now,
          })
          .where(eq(virtualNumberInventory.id, item.id));

        if (item.assignedVirtualNumberId) {
          const [linkedNumber] = await db
            .select()
            .from(userVirtualNumbers)
            .where(eq(userVirtualNumbers.id, item.assignedVirtualNumberId))
            .limit(1);

          if (linkedNumber) {
            await db
              .update(userVirtualNumbers)
              .set({
                status: 'active',
                metadata: {
                  ...((linkedNumber.metadata as Record<string, any>) || {}),
                  subscription,
                },
                updatedAt: now,
              })
              .where(eq(userVirtualNumbers.id, linkedNumber.id));
          }
        }

        continue;
      }

      subscription.renewalStatus = 'past_due';
      subscription.manualRenewalRequiredAt = now.toISOString();
    }

    if (
      !subscription.autoRenew ||
      subscription.cancelAtPeriodEnd ||
      subscription.paymentMethod !== 'wallet' ||
      !assignedUserId
    ) {
      subscription.renewalStatus =
        subscription.cancelAtPeriodEnd || !subscription.autoRenew
          ? 'expired'
          : 'manual_renewal_due';
      subscription.expiredAt = now.toISOString();

      await db
        .update(virtualNumberInventory)
        .set({
          status: 'archived',
          metadata: {
            ...metadata,
            subscription,
          },
          updatedAt: now,
        })
        .where(eq(virtualNumberInventory.id, item.id));

      if (item.assignedVirtualNumberId) {
        const [linkedNumber] = await db
          .select()
          .from(userVirtualNumbers)
          .where(eq(userVirtualNumbers.id, item.assignedVirtualNumberId))
          .limit(1);

        if (linkedNumber) {
          await db
            .update(userVirtualNumbers)
            .set({
              status: 'suspended',
              releasedAt: now,
              metadata: {
                ...((linkedNumber.metadata as Record<string, any>) || {}),
                subscription,
              },
              updatedAt: now,
            })
            .where(eq(userVirtualNumbers.id, linkedNumber.id));

          if (!subscription.expiryNoticeSentAt) {
            const [account] = await db
              .select()
              .from(users)
              .where(eq(users.id, linkedNumber.userId))
              .limit(1);
            if (account) {
              await storage.createNotification({
                userId: linkedNumber.userId,
                type: 'wallet',
                title: 'Virtual number subscription ended',
                message: `Your virtual number ${item.msisdn} is no longer active because the subscription period ended.`,
                read: false,
                metadata: {
                  provider: 'vonage',
                  msisdn: item.msisdn,
                },
              });

              if (trim(account.email)) {
                await sendVirtualNumberExpiredEmail(account.email, item.msisdn);
              }
            }
            subscription.expiryNoticeSentAt = now.toISOString();

            await db
              .update(virtualNumberInventory)
              .set({
                metadata: {
                  ...metadata,
                  subscription,
                },
                updatedAt: now,
              })
              .where(eq(virtualNumberInventory.id, item.id));
          }
        }
      }
    }
  }
}

async function getAvailableInventoryNumber(countryCode: string, desiredNumber?: string) {
  const conditions = [
    eq(virtualNumberInventory.provider, 'vonage'),
    eq(virtualNumberInventory.countryCode, countryCode),
    eq(virtualNumberInventory.status, 'available'),
    eq(virtualNumberInventory.isPremium, false),
  ];

  if (trim(desiredNumber)) {
    conditions.push(ilike(virtualNumberInventory.msisdn, `%${trim(desiredNumber)}%`) as any);
  }

  const [number] = await db
    .select()
    .from(virtualNumberInventory)
    .where(and(...conditions))
    .orderBy(asc(virtualNumberInventory.isPremium), asc(virtualNumberInventory.createdAt))
    .limit(1);

  return number || null;
}

async function fulfillApplicationWithAssignedNumber({
  application,
  userId,
  countryCode,
  msisdn,
  webhookUrl,
  metadata,
  pricing,
  inventoryId,
}: {
  application: typeof virtualNumberApplications.$inferSelect;
  userId: string;
  countryCode: string;
  msisdn: string;
  webhookUrl: string;
  metadata: Record<string, any>;
  pricing: ReturnType<typeof getPricingSnapshot>;
  inventoryId?: string;
}) {
  const [assignedNumber] = await db
    .insert(userVirtualNumbers)
    .values({
      userId,
      provider: 'vonage',
      msisdn,
      countryCode,
      status: 'active',
      webhookUrl,
      applicationId: application.id,
      capabilities: {
        sms: true,
        inbound: true,
        outbound: true,
      },
      metadata: {
        ...metadata,
        inventoryId: inventoryId || null,
        pricing,
      },
    })
    .returning();

  await db
    .update(virtualNumberApplications)
    .set({
      status: 'fulfilled',
      updatedAt: new Date(),
      metadata: {
        ...((application.metadata as Record<string, unknown>) || {}),
        assignedMsisdn: msisdn,
        inventoryId: inventoryId || null,
        pricing,
      },
    })
    .where(eq(virtualNumberApplications.id, application.id));

  if (inventoryId) {
    await db
      .update(virtualNumberInventory)
      .set({
        status: 'assigned',
        assignedUserId: userId,
        assignedVirtualNumberId: assignedNumber.id,
        updatedAt: new Date(),
      })
      .where(eq(virtualNumberInventory.id, inventoryId));
  }

  await storage.createNotification({
    userId,
    type: 'wallet',
    title: 'Virtual number assigned',
    message: `Your eRoaming virtual number ${msisdn} is now active.`,
    read: false,
    metadata: { provider: 'vonage', msisdn, pricing },
  });

  return assignedNumber;
}

export async function getLatestVirtualNumberApplication(userId: string) {
  await ensureVonageSchema();
  const [application] = await db
    .select()
    .from(virtualNumberApplications)
    .where(eq(virtualNumberApplications.userId, userId))
    .orderBy(desc(virtualNumberApplications.createdAt))
    .limit(1);

  return application || null;
}

export async function getUserVirtualSmsMessages(userId: string) {
  await ensureVonageSchema();
  return db
    .select()
    .from(virtualSmsMessages)
    .where(eq(virtualSmsMessages.userId, userId))
    .orderBy(desc(virtualSmsMessages.createdAt))
    .limit(100);
}

export async function createVirtualNumberApplication({
  userId,
  countryCode,
  desiredNumber,
  notes,
  webhookUrl,
  inventoryId,
  quantity,
  packageTerm,
  paymentMethod,
  autoRenew,
  reminderDays,
  forwardingType,
  forwardingDestination,
}: {
  userId: string;
  countryCode: string;
  desiredNumber?: string;
  notes?: string;
  webhookUrl: string;
  inventoryId?: string;
  quantity?: number;
  packageTerm?: '1_month' | '3_months' | '6_months' | '9_months' | '1_year';
  paymentMethod?: 'wallet' | 'other';
  autoRenew?: boolean;
  reminderDays?: number | string | null;
  forwardingType?: 'none' | 'international' | 'sip' | 'voicemail';
  forwardingDestination?: string | null;
}) {
  await ensureVonageSchema();

  const config = await getVonageConfig();
  if (!config.enabled) {
    throw new Error('eRoaming virtual numbers are not available');
  }

  const requestedQuantity = Math.max(1, Math.trunc(Number(quantity) || 1));
  const parsedPackageTerm = parsePackageTerm(packageTerm);
  const normalizedPaymentMethod = paymentMethod === 'other' ? 'other' : 'wallet';
  const normalizedForwardingType =
    forwardingType === 'international' || forwardingType === 'sip' || forwardingType === 'voicemail'
      ? forwardingType
      : forwardingType === 'none'
        ? 'none'
        : 'sip';
  const normalizedReminderDays = Math.max(1, Math.trunc(Number(reminderDays) || 3));
  const normalizedForwardingDestination =
    normalizedForwardingType === 'sip'
      ? trim(forwardingDestination) || (await getOrCreateUserSipAccount(userId)).uri
      : trim(forwardingDestination) || null;

  if (trim(inventoryId) && requestedQuantity > 1) {
    throw new Error(
      'Exact number selection supports quantity 1 only. Use a general request for multiple numbers.',
    );
  }

  const [application] = await db
    .insert(virtualNumberApplications)
    .values({
      userId,
      provider: 'vonage',
      status: 'pending',
      countryCode,
      desiredNumber: trim(desiredNumber) || null,
      notes: trim(notes) || null,
      metadata: {
        requestedWebhookUrl: webhookUrl,
        requestedInventoryId: trim(inventoryId) || null,
        requestQuantity: requestedQuantity,
        packageTerm: parsedPackageTerm.term,
        paymentMethod: normalizedPaymentMethod,
        autoRenew: autoRenew !== false,
        reminderDays: normalizedReminderDays,
        forwardingType: normalizedForwardingType,
        forwardingDestination: normalizedForwardingDestination,
      },
    })
    .returning();

  const selectedInventoryId = trim(inventoryId);
  if (selectedInventoryId) {
    const [selectedInventory] = await db
      .select()
      .from(virtualNumberInventory)
      .where(
        and(
          eq(virtualNumberInventory.id, selectedInventoryId),
          eq(virtualNumberInventory.countryCode, countryCode),
          eq(virtualNumberInventory.status, 'available'),
        ),
      )
      .limit(1);

    if (!selectedInventory) {
      throw new Error('The selected virtual number is no longer available');
    }
    const selectedPricing = {
      isPremium: selectedInventory.isPremium,
      setupFee: normalizeMoney(selectedInventory.setupFee),
      monthlyFee: normalizeMoney(selectedInventory.monthlyFee),
      inboundFee: normalizeMoney(selectedInventory.inboundFee),
      outboundFee: normalizeMoney(selectedInventory.outboundFee),
    };

    await db
      .update(virtualNumberApplications)
      .set({
        status: 'pending_payment',
        updatedAt: new Date(),
        metadata: {
          ...((application.metadata as Record<string, unknown>) || {}),
          selectedInventoryId: selectedInventory.id,
          selectedMsisdn: selectedInventory.msisdn,
          selectedPricing,
          requestQuantity: requestedQuantity,
          packageTerm: parsedPackageTerm.term,
          paymentMethod: normalizedPaymentMethod,
          autoRenew: autoRenew !== false,
          reminderDays: normalizedReminderDays,
          forwardingType: normalizedForwardingType,
          forwardingDestination: normalizedForwardingDestination,
          requestMode: 'pending_payment',
        },
      })
      .where(eq(virtualNumberApplications.id, application.id));

    return {
      application: {
        ...application,
        status: 'pending_payment',
      },
      assignedNumber: null,
      mode: 'pending_payment' as const,
    };
  }

  return {
    application,
    assignedNumber: null,
    mode: 'manual_review' as const,
  };
}

async function sendUserVirtualSmsWithNumber(
  userId: string,
  number: typeof userVirtualNumbers.$inferSelect,
  to: string,
  text: string,
  config: VonageConfig,
) {
  const inventoryItem = await findInventoryForVirtualNumber(number);
  const usageCharge = await chargeVirtualNumberUsage({
    userId,
    number,
    inventoryItem,
    usageType: 'sms',
    direction: 'outbound',
    description: `Virtual number outbound SMS from ${number.msisdn}`,
    referenceId: `${number.msisdn}:sms:outbound:${Date.now()}`,
    metadata: {
      to,
      textLength: text.length,
      chargePoint: 'before_provider_send',
    },
  });

  const response = await sendVonageSms(config, number.msisdn, to, text);
  const message = Array.isArray(response?.messages) ? response.messages[0] : null;
  const status = String(message?.status || '') === '0' ? 'sent' : 'failed';

  const [sms] = await db
    .insert(virtualSmsMessages)
    .values({
      userId,
      virtualNumberId: number.id,
      provider: 'vonage',
      direction: 'outbound',
      fromNumber: number.msisdn,
      toNumber: to,
      text,
      providerMessageId: message?.['message-id'] || null,
      status,
      metadata: {
        ...response,
        billing: usageCharge,
      },
    })
    .returning();

  if (status !== 'sent') {
    throw new Error(message?.['error-text'] || 'eRoaming could not send the SMS');
  }

  return sms;
}

export async function sendUserVirtualSms(userId: string, to: string, text: string) {
  await ensureVonageSchema();
  const config = await getVonageConfig();
  if (!config.enabled) throw new Error('eRoaming SMS is not available');
  if (!hasCredentials(config)) throw new Error('eRoaming SMS is not configured');

  const number = await getUserVirtualNumber(userId);
  if (!number) {
    throw new Error('No active virtual number found for this account');
  }
  if (number.status !== 'active') {
    throw new Error('This virtual number is not active right now');
  }

  return sendUserVirtualSmsWithNumber(userId, number, to, text, config);
}

export async function sendUserVirtualSmsFromNumber(
  userId: string,
  virtualNumberId: string,
  to: string,
  text: string,
) {
  await ensureVonageSchema();
  const config = await getVonageConfig();
  if (!config.enabled) throw new Error('eRoaming SMS is not available');
  if (!hasCredentials(config)) throw new Error('eRoaming SMS is not configured');

  const number = await getUserVirtualNumberById(userId, virtualNumberId);
  if (!number) {
    throw new Error('Virtual number not found');
  }
  if (number.status !== 'active') {
    throw new Error('This virtual number is not active right now');
  }

  return sendUserVirtualSmsWithNumber(userId, number, to, text, config);
}

export async function updateUserVirtualNumberSettings(
  userId: string,
  virtualNumberId: string,
  updates: {
    autoRenew?: boolean;
    reminderDays?: number | string | null;
    forwardingType?: 'none' | 'international' | 'sip' | 'voicemail';
    forwardingDestination?: string | null;
    cancelAtPeriodEnd?: boolean;
  },
) {
  await ensureVonageSchema();

  const [number] = await db
    .select()
    .from(userVirtualNumbers)
    .where(and(eq(userVirtualNumbers.id, virtualNumberId), eq(userVirtualNumbers.userId, userId)))
    .limit(1);

  if (!number) {
    throw new Error('Virtual number not found');
  }

  const inventoryId = ((number.metadata as Record<string, any>) || {}).inventoryId as
    | string
    | undefined;
  if (!inventoryId) {
    throw new Error('Linked inventory record was not found for this number');
  }

  return updateVirtualNumberInventoryItem(inventoryId, {
    autoRenew: updates.autoRenew,
    reminderDays: updates.reminderDays,
    forwardingType: updates.forwardingType,
    forwardingDestination: updates.forwardingDestination,
    cancelAtPeriodEnd: updates.cancelAtPeriodEnd,
    assignedUserId: userId,
    status: 'assigned',
  });
}

export async function storeInboundVonageSms(payload: Record<string, any>) {
  await ensureVonageSchema();
  const to = trim(payload.to);
  const from = trim(payload.msisdn || payload.from);
  const text = trim(payload.text);

  if (!to || !from) {
    return null;
  }

  const [number] = await db
    .select()
    .from(userVirtualNumbers)
    .where(and(eq(userVirtualNumbers.msisdn, to), eq(userVirtualNumbers.status, 'active')))
    .limit(1);

  if (!number) return null;

  const inventoryItem = await findInventoryForVirtualNumber(number);
  const usageCharge = await chargeVirtualNumberUsage({
    userId: number.userId,
    number,
    inventoryItem,
    usageType: 'sms',
    direction: 'inbound',
    description: `Virtual number inbound SMS to ${number.msisdn}`,
    referenceId: `${number.msisdn}:sms:inbound:${trim(payload.messageId) || Date.now()}`,
    metadata: {
      from,
      textLength: text.length,
      providerMessageId: trim(payload.messageId),
      chargePoint: 'before_store_inbound',
    },
  });

  const [sms] = await db
    .insert(virtualSmsMessages)
    .values({
      userId: number.userId,
      virtualNumberId: number.id,
      provider: 'vonage',
      direction: 'inbound',
      fromNumber: from,
      toNumber: to,
      text,
      providerMessageId: trim(payload.messageId),
      status: 'received',
      metadata: {
        ...payload,
        billing: usageCharge,
      },
    })
    .returning();

  await storage.createNotification({
    userId: number.userId,
    type: 'support',
    title: 'New SMS received',
    message: `New message from ${from}${text ? `: ${text.slice(0, 80)}` : ''}`,
    read: false,
    metadata: { provider: 'vonage', virtualNumberId: number.id, messageId: sms.id },
  });

  return sms;
}

export async function getAdminVirtualNumberDashboard() {
  await ensureVonageSchema();
  await processVirtualNumberSubscriptionLifecycle();

  const [
    config,
    inventory,
    applications,
    activeNumbers,
    recentWalletTransactions,
    recentSmsMessages,
    allUsers,
  ] = await Promise.all([
    getVonageConfig(),
    db.select().from(virtualNumberInventory).orderBy(desc(virtualNumberInventory.createdAt)),
    db.select().from(virtualNumberApplications).orderBy(desc(virtualNumberApplications.createdAt)),
    db
      .select()
      .from(userVirtualNumbers)
      .where(eq(userVirtualNumbers.status, 'active'))
      .orderBy(desc(userVirtualNumbers.createdAt)),
    db.select().from(walletTransactions).orderBy(desc(walletTransactions.createdAt)).limit(500),
    db.select().from(virtualSmsMessages).orderBy(desc(virtualSmsMessages.createdAt)).limit(500),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users),
  ]);

  let accountBalance: { value: string; autoReload: boolean; currency: string } | null = null;
  let accountBalanceError: string | null = null;

  if (hasCredentials(config)) {
    try {
      accountBalance = await getVonageAccountBalance(config);
    } catch (error) {
      accountBalanceError = getAxiosErrorMessage(error, 'Could not load Vonage account balance');
    }
  }

  const activeInventoryItems = inventory.filter(
    (item) =>
      ['assigned', 'active'].includes(String(item.status || '').toLowerCase()) ||
      Boolean(item.assignedUserId) ||
      Boolean(item.assignedVirtualNumberId),
  );

  const summary = {
    totalInventory: inventory.length,
    availableInventory: inventory.filter((item) => item.status === 'available').length,
    assignedInventory: activeInventoryItems.length,
    activeNumbers: activeNumbers.length,
    premiumInventory: inventory.filter((item) => item.isPremium).length,
    pendingApplications: applications.filter((item) =>
      ['pending', 'pending_payment', 'manual_review'].includes(
        String(item.status || '').toLowerCase(),
      ),
    ).length,
  };

  const inventoryById = new Map(inventory.map((item) => [item.id, item]));
  const inventoryByMsisdn = new Map(inventory.map((item) => [trim(item.msisdn), item]));
  const activeNumberById = new Map(activeNumbers.map((item) => [item.id, item]));
  const userById = new Map(allUsers.map((item) => [item.id, item]));

  const isVonageVirtualTransaction = (transaction: typeof walletTransactions.$inferSelect) => {
    const metadata = (transaction.metadata as Record<string, any>) || {};
    const description = trim(transaction.description).toLowerCase();
    return (
      trim(transaction.provider).toLowerCase() === 'vonage' ||
      trim(metadata.provider).toLowerCase() === 'vonage' ||
      description.includes('virtual number')
    );
  };

  const getInventoryForTransaction = (metadata: Record<string, any>) => {
    const inventoryId = trim(metadata.inventoryId);
    const msisdn = trim(metadata.msisdn);
    return (
      (inventoryId && inventoryById.get(inventoryId)) ||
      (msisdn && inventoryByMsisdn.get(msisdn)) ||
      null
    );
  };

  const usageTransactions = recentWalletTransactions
    .filter(isVonageVirtualTransaction)
    .map((transaction) => {
      const metadata = (transaction.metadata as Record<string, any>) || {};
      const inventoryItem = getInventoryForTransaction(metadata);
      const usageType =
        trim(metadata.usageType) || (metadata.autoRenew ? 'renewal' : 'virtual_number');
      const direction = trim(metadata.direction);
      const billingMonths = Math.max(
        1,
        Number(metadata.billingMonths || parsePackageTerm(metadata.packageTerm).months),
      );
      const fallbackProviderCost =
        usageType === 'sms' || usageType === 'voice'
          ? getVirtualUsageProviderCost(
              inventoryItem,
              usageType === 'voice' ? 'voice' : 'sms',
              direction === 'inbound' ? 'inbound' : 'outbound',
            )
          : metadata.autoRenew
            ? normalizeMoney(
                (moneyValue(inventoryItem?.providerMonthlyCost) * billingMonths).toFixed(2),
              )
            : '0.00';
      const customerCharge = normalizeMoney(transaction.amount);
      const providerCost = normalizeMoney(metadata.providerCost, fallbackProviderCost);
      const user = userById.get(transaction.userId);

      return {
        id: transaction.id,
        userId: transaction.userId,
        userName: user?.name || null,
        userEmail: user?.email || null,
        userRole: user?.role || null,
        type: transaction.type,
        status: transaction.status,
        description: transaction.description || '',
        provider: transaction.provider || metadata.provider || 'vonage',
        msisdn: metadata.msisdn || inventoryItem?.msisdn || transaction.referenceId || '',
        virtualNumberId: metadata.virtualNumberId || null,
        inventoryId: metadata.inventoryId || inventoryItem?.id || null,
        usageType,
        direction: direction || null,
        chargePoint: metadata.chargePoint || (metadata.autoRenew ? 'auto_renewal' : null),
        billingRole: metadata.billingRole || null,
        customerCharge,
        retailRate: normalizeMoney(metadata.retailRate, customerCharge),
        providerCost,
        grossProfit: normalizeMoney(
          (moneyValue(customerCharge) - moneyValue(providerCost)).toFixed(2),
        ),
        balanceBefore: normalizeMoney(transaction.balanceBefore),
        balanceAfter: normalizeMoney(transaction.balanceAfter),
        referenceId: transaction.referenceId || null,
        completedAt: toIsoOrNull(transaction.completedAt),
        createdAt: toIsoOrNull(transaction.createdAt) || new Date().toISOString(),
        metadata,
      };
    })
    .slice(0, 200);

  const usageMessages = recentSmsMessages
    .filter((message) => trim(message.provider).toLowerCase() === 'vonage')
    .map((message) => {
      const metadata = (message.metadata as Record<string, any>) || {};
      const number = activeNumberById.get(message.virtualNumberId);
      const inventoryItem = (number && inventoryByMsisdn.get(number.msisdn)) || null;
      const billing = (metadata.billing as Record<string, any>) || {};
      const providerCost = normalizeMoney(
        billing.providerCost || metadata.providerCost,
        getVirtualUsageProviderCost(
          inventoryItem,
          'sms',
          message.direction === 'inbound' ? 'inbound' : 'outbound',
        ),
      );
      const user = userById.get(message.userId);

      return {
        id: message.id,
        userId: message.userId,
        userName: user?.name || null,
        userEmail: user?.email || null,
        virtualNumberId: message.virtualNumberId,
        msisdn: number?.msisdn || message.fromNumber,
        direction: message.direction,
        fromNumber: message.fromNumber,
        toNumber: message.toNumber,
        text: message.text,
        status: message.status,
        providerMessageId: message.providerMessageId || null,
        customerCharge: normalizeMoney(billing.amount || '0.00'),
        providerCost,
        grossProfit: normalizeMoney(
          (moneyValue(billing.amount) - moneyValue(providerCost)).toFixed(2),
        ),
        createdAt: toIsoOrNull(message.createdAt) || new Date().toISOString(),
      };
    })
    .slice(0, 200);

  const usageSummary = usageTransactions.reduce(
    (acc, transaction) => {
      const customerCharge = moneyValue(transaction.customerCharge);
      const providerCost = moneyValue(transaction.providerCost);
      acc.totalCustomerCharges += customerCharge;
      acc.totalEstimatedVonageCost += providerCost;
      acc.totalEstimatedProfit += customerCharge - providerCost;

      if (transaction.usageType === 'sms') {
        acc.smsCount += 1;
        acc.totalSmsCustomerCharges += customerCharge;
        acc.totalSmsProviderCost += providerCost;
        if (transaction.direction === 'inbound') acc.inboundSmsCount += 1;
        else acc.outboundSmsCount += 1;
      } else if (transaction.usageType === 'voice') {
        acc.voiceSessionCount += 1;
        acc.totalVoiceCustomerCharges += customerCharge;
        acc.totalVoiceProviderCost += providerCost;
        if (transaction.direction === 'inbound') acc.inboundVoiceCount += 1;
        else acc.outboundVoiceCount += 1;
      } else if (transaction.chargePoint === 'auto_renewal' || transaction.metadata?.autoRenew) {
        acc.renewalCount += 1;
        acc.totalRenewalCustomerCharges += customerCharge;
        acc.totalRenewalProviderCost += providerCost;
      }
      return acc;
    },
    {
      totalCustomerCharges: 0,
      totalEstimatedVonageCost: 0,
      totalEstimatedProfit: 0,
      smsCount: 0,
      voiceSessionCount: 0,
      renewalCount: 0,
      outboundSmsCount: 0,
      inboundSmsCount: 0,
      outboundVoiceCount: 0,
      inboundVoiceCount: 0,
      totalSmsCustomerCharges: 0,
      totalSmsProviderCost: 0,
      totalVoiceCustomerCharges: 0,
      totalVoiceProviderCost: 0,
      totalRenewalCustomerCharges: 0,
      totalRenewalProviderCost: 0,
    },
  );

  const formattedUsageSummary = Object.fromEntries(
    Object.entries(usageSummary).map(([key, value]) => [
      key,
      key.toLowerCase().includes('count') ? value : normalizeMoney(value),
    ]),
  );

  return {
    provider: 'vonage',
    enabled: config.enabled,
    hasCredentials: hasCredentials(config),
    defaultCountry: config.defaultCountry,
    autoAssign: config.autoAssign,
    accountBalance,
    accountBalanceError,
    settings: {
      pricing: config.pricing,
      inboundWebhookUrl: config.inboundWebhookUrl,
      statusWebhookUrl: config.statusWebhookUrl,
    },
    summary,
    usageSummary: formattedUsageSummary,
    usageTransactions,
    usageMessages,
    inventory,
    applications,
    activeNumbers,
  };
}

export async function syncAdminVonageOwnedNumbers(options?: {
  countryCodes?: string[];
  updateWebhooks?: boolean;
}) {
  await ensureVonageSchema();
  const config = await getVonageConfig();

  if (!hasCredentials(config)) {
    throw new Error('Vonage credentials are missing in admin settings');
  }

  const requestedCountryCodes = Array.from(
    new Set(
      (options?.countryCodes || [])
        .map((code) => trim(code).toUpperCase())
        .filter((code) => code.length === 2),
    ),
  );
  const pageSize = 100;
  const now = new Date();
  const fetchedNumbers: NormalizedOwnedVonageNumber[] = [];
  const skippedRows: Array<{ reason: string; row: any }> = [];
  let providerTotalCount = 0;

  const countryScopes = requestedCountryCodes.length ? requestedCountryCodes : [''];

  for (const countryCode of countryScopes) {
    let pageIndex = 1;
    let totalCount = 0;

    while (pageIndex <= 1000) {
      const page = await listVonageOwnedNumbersPage(config, {
        countryCode,
        pageIndex,
        pageSize,
      });

      totalCount = Math.max(totalCount, page.totalCount);
      providerTotalCount += pageIndex === 1 ? page.totalCount : 0;

      for (const rawNumber of page.numbers) {
        const normalized = normalizeOwnedVonageNumber(rawNumber, countryCode || config.defaultCountry);
        if (normalized) fetchedNumbers.push(normalized);
        else skippedRows.push({ reason: 'missing_msisdn', row: rawNumber });
      }

      if (page.numbers.length === 0 || pageIndex * pageSize >= page.totalCount) break;
      pageIndex += 1;
    }

    if (totalCount === 0 && fetchedNumbers.length === 0) {
      continue;
    }
  }

  const ownedByMsisdn = new Map<string, NormalizedOwnedVonageNumber>();
  for (const item of fetchedNumbers) {
    ownedByMsisdn.set(item.msisdn, item);
  }

  const [existingInventory, existingAssignedNumbers] = await Promise.all([
    db.select().from(virtualNumberInventory),
    db.select().from(userVirtualNumbers),
  ]);

  const inventoryByMsisdn = new Map(
    existingInventory.map((item) => [trim(item.msisdn), item] as const).filter(([msisdn]) => msisdn),
  );
  const assignedByMsisdn = new Map(
    existingAssignedNumbers.map((item) => [trim(item.msisdn), item] as const).filter(([msisdn]) => msisdn),
  );
  const pricing = getPricingSnapshot(config, {});

  let importedCount = 0;
  let updatedCount = 0;
  let linkedAssignedCount = 0;
  let webhookUpdatedCount = 0;
  const failedWebhookUpdates: Array<{ msisdn: string; error: string }> = [];

  for (const ownedNumber of Array.from(ownedByMsisdn.values())) {
    const existingItem = inventoryByMsisdn.get(ownedNumber.msisdn) || null;
    const assignedNumber = assignedByMsisdn.get(ownedNumber.msisdn) || null;
    const capabilities = getVonageNumberCapabilities(ownedNumber.features);
    const existingMetadata = ((existingItem?.metadata as Record<string, any>) || {}) as Record<
      string,
      any
    >;
    const syncMetadata = {
      ...existingMetadata,
      provider: 'vonage',
      boughtFrom: existingMetadata.boughtFrom || 'vonage',
      syncSource: 'vonage_account_numbers',
      syncedFromVonageAccount: true,
      lastOwnedSyncAt: now.toISOString(),
      accountNumber: {
        countryCode: ownedNumber.countryCode,
        type: ownedNumber.type,
        features: ownedNumber.features,
      },
      providerRaw: {
        ...(existingMetadata.providerRaw || {}),
        ownedNumber: ownedNumber.raw,
      },
    };

    let inventoryItem = existingItem;
    if (existingItem) {
      const [updatedItem] = await db
        .update(virtualNumberInventory)
        .set({
          provider: 'vonage',
          countryCode: existingItem.countryCode || ownedNumber.countryCode,
          status: assignedNumber ? 'assigned' : existingItem.status,
          capabilities: {
            ...((existingItem.capabilities as Record<string, any>) || {}),
            ...capabilities,
          },
          assignedUserId: existingItem.assignedUserId || assignedNumber?.userId || null,
          assignedVirtualNumberId: existingItem.assignedVirtualNumberId || assignedNumber?.id || null,
          metadata: syncMetadata,
          updatedAt: now,
        })
        .where(eq(virtualNumberInventory.id, existingItem.id))
        .returning();

      inventoryItem = updatedItem || existingItem;
      updatedCount += 1;
    } else {
      const [createdItem] = await db
        .insert(virtualNumberInventory)
        .values({
          provider: 'vonage',
          msisdn: ownedNumber.msisdn,
          countryCode: ownedNumber.countryCode,
          status: assignedNumber ? 'assigned' : 'available',
          isPremium: false,
          providerSetupCost: ownedNumber.providerSetupCost,
          providerMonthlyCost: ownedNumber.providerMonthlyCost,
          providerInboundCost: '0.00',
          providerOutboundCost: '0.00',
          providerSmsCost: '0.00',
          providerMmsCost: normalizeMoney(config.messagesApiPrice),
          providerVoiceCost: '0.00',
          setupFee: pricing.setupFee,
          monthlyFee: pricing.monthlyFee,
          inboundFee: pricing.inboundFee,
          outboundFee: pricing.outboundFee,
          smsFee: pricing.smsFee,
          mmsFee: pricing.mmsFee,
          voiceFee: pricing.voiceFee,
          capabilities,
          assignedUserId: assignedNumber?.userId || null,
          assignedVirtualNumberId: assignedNumber?.id || null,
          notes: 'Synced From Existing Vonage Account DID Inventory',
          purchasedAt: now,
          metadata: syncMetadata,
        })
        .returning();

      inventoryItem = createdItem || null;
      if (createdItem) {
        inventoryByMsisdn.set(createdItem.msisdn, createdItem);
      }
      importedCount += 1;
    }

    if (assignedNumber && inventoryItem) {
      const assignedMetadata = ((assignedNumber.metadata as Record<string, any>) || {}) as Record<
        string,
        any
      >;
      if (trim(assignedMetadata.inventoryId) !== inventoryItem.id) {
        await db
          .update(userVirtualNumbers)
          .set({
            metadata: {
              ...assignedMetadata,
              provider: 'vonage',
              inventoryId: inventoryItem.id,
              syncedFromVonageAccount: true,
              lastOwnedSyncAt: now.toISOString(),
            },
            updatedAt: now,
          })
          .where(eq(userVirtualNumbers.id, assignedNumber.id));
        linkedAssignedCount += 1;
      }
    }

    if (options?.updateWebhooks && config.inboundWebhookUrl) {
      try {
        await updateVonageNumberWebhook(
          config,
          ownedNumber.countryCode,
          ownedNumber.msisdn,
          config.inboundWebhookUrl,
        );
        webhookUpdatedCount += 1;
      } catch (error) {
        failedWebhookUpdates.push({
          msisdn: ownedNumber.msisdn,
          error: getAxiosErrorMessage(error, 'Could not update Vonage DID webhook'),
        });
      }
    }
  }

  return {
    provider: 'vonage',
    supported: true,
    syncedAt: now.toISOString(),
    providerTotalCount,
    fetchedCount: fetchedNumbers.length,
    uniqueCount: ownedByMsisdn.size,
    importedCount,
    updatedCount,
    linkedAssignedCount,
    skippedCount: skippedRows.length,
    webhookUpdatedCount,
    failedWebhookUpdates,
    countries: Array.from(new Set(Array.from(ownedByMsisdn.values()).map((item) => item.countryCode))).sort(),
  };
}

export async function getAdminVonageCountryPricing(countryCode: string) {
  await ensureVonageSchema();
  const config = await getVonageConfig();
  return getAdminVonageCountryPricingWithConfig(countryCode, config);
}

export async function getAdminVonageCountryPricingWithConfig(
  countryCode: string,
  configOverrides?: Partial<VonageConfig>,
) {
  await ensureVonageSchema();
  const savedConfig = await getVonageConfig();
  const config: VonageConfig = {
    ...savedConfig,
    ...configOverrides,
    pricing: savedConfig.pricing,
  };

  if (!hasCredentials(config)) {
    throw new Error('Vonage credentials are missing in admin settings');
  }

  const normalizedCountry = trim(countryCode).toUpperCase();
  if (!normalizedCountry || normalizedCountry.length !== 2) {
    throw new Error('A valid 2-letter country code is required');
  }

  const [smsOutbound, voiceOutbound, sampleNumber] = await Promise.all([
    getSafeVonageOutboundPricing(config, 'sms-outbound', normalizedCountry),
    getSafeVonageOutboundPricing(config, 'voice-outbound', normalizedCountry),
    searchAvailableVonageNumber(config, normalizedCountry).catch(() => null),
  ]);

  const pricingWarnings = [smsOutbound.error, voiceOutbound.error].filter(Boolean) as string[];
  const numberPricingPreview = sampleNumber
    ? {
        msisdn: trim(sampleNumber.msisdn),
        monthlyCost: normalizeMoney(
          sampleNumber.cost || sampleNumber.monthly_cost || sampleNumber.base_cost,
        ),
        setupCost: normalizeMoney(
          sampleNumber.initialPrice || sampleNumber.setup_cost || sampleNumber.initial_price,
        ),
      }
    : null;

  return {
    countryCode: normalizedCountry,
    smsApiPricing: smsOutbound.rows,
    voiceApiPricing: voiceOutbound.rows,
    messagesApiPricing:
      config.messagesApiPrice !== '0.00'
        ? [
            {
              country_name: normalizedCountry,
              dest_network_type: 'MANUAL',
              currency: 'USD',
              price: config.messagesApiPrice,
            },
          ]
        : [],
    smsApiNote:
      smsOutbound.source === 'v2'
        ? 'Loaded live from the official Vonage Pricing API v2 using the sms-outbound product.'
        : smsOutbound.source === 'v1'
          ? 'Loaded live from the official Vonage Pricing API v1 fallback using the outbound sms route.'
          : smsOutbound.error ||
            'Live SMS API pricing is unavailable for this account right now, so keep using your saved provider cost.',
    voiceApiNote:
      voiceOutbound.source === 'v2'
        ? 'Loaded live from the official Vonage Pricing API v2 using the voice-outbound product.'
        : voiceOutbound.source === 'v1'
          ? 'Loaded live from the official Vonage Pricing API v1 fallback using the outbound voice route.'
          : voiceOutbound.error ||
            'Live Voice API pricing is unavailable for this account right now, so keep using your saved provider cost.',
    messagesApiNote:
      config.messagesApiNotes ||
      'Vonage public pricing pages list Messages API rates, but the public Pricing API does not expose a matching messages product endpoint, so this section is reference/manual for now.',
    numberPricingPreview,
    numberPricingNote: numberPricingPreview
      ? `Loaded setup and monthly cost preview from live Vonage number search using sample number ${numberPricingPreview.msisdn}.`
      : 'Vonage did not return a sample number cost preview for this country, so keep using your saved setup and monthly provider costs.',
    pricingWarnings,
  };
}

export async function getUserVirtualNumberSelection(countryCode?: string, search?: string) {
  await ensureVonageSchema();
  const config = await getVonageConfig();

  const conditions = [
    eq(virtualNumberInventory.provider, 'vonage'),
    eq(virtualNumberInventory.status, 'available'),
  ];

  const normalizedCountry = trim(countryCode).toUpperCase();
  if (normalizedCountry) {
    conditions.push(eq(virtualNumberInventory.countryCode, normalizedCountry) as any);
  }

  const normalizedSearch = trim(search);
  if (normalizedSearch) {
    conditions.push(
      or(
        ilike(virtualNumberInventory.msisdn, `%${normalizedSearch}%`),
        ilike(virtualNumberInventory.notes, `%${normalizedSearch}%`),
      ) as any,
    );
  }

  const [inventory, allAvailableInventory] = await Promise.all([
    db
      .select()
      .from(virtualNumberInventory)
      .where(and(...conditions))
      .orderBy(
        asc(virtualNumberInventory.countryCode),
        asc(virtualNumberInventory.isPremium),
        asc(virtualNumberInventory.msisdn),
      )
      .limit(200),
    db
      .select({
        countryCode: virtualNumberInventory.countryCode,
      })
      .from(virtualNumberInventory)
      .where(
        and(
          eq(virtualNumberInventory.provider, 'vonage'),
          eq(virtualNumberInventory.status, 'available'),
        ),
      ),
  ]);

  const countryMap = new Map<string, number>();
  for (const item of allAvailableInventory) {
    countryMap.set(item.countryCode, (countryMap.get(item.countryCode) || 0) + 1);
  }

  const countries = Array.from(countryMap.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => a.code.localeCompare(b.code));

  return {
    enabled: config.enabled,
    countries,
    numbers: inventory.map((item) => ({
      id: item.id,
      msisdn: item.msisdn,
      countryCode: item.countryCode,
      isPremium: item.isPremium,
      setupFee: normalizeMoney(item.setupFee),
      monthlyFee: normalizeMoney(item.monthlyFee),
      inboundFee: normalizeMoney(item.inboundFee),
      outboundFee: normalizeMoney(item.outboundFee),
      notes: item.notes,
    })),
  };
}

export async function searchAdminVonageNumbers(
  countryCode: string,
  desiredNumber?: string,
  options?: {
    type?: string;
    features?: string;
    searchPattern?: number;
    pageIndex?: number;
    pageSize?: number;
  },
) {
  await ensureVonageSchema();
  const config = await getVonageConfig();

  if (!config.enabled) {
    throw new Error('Vonage virtual numbers are disabled');
  }
  if (!hasCredentials(config)) {
    throw new Error('Vonage credentials are missing in admin settings');
  }

  const normalizedCountry = trim(countryCode).toUpperCase();
  if (!normalizedCountry || normalizedCountry.length !== 2) {
    throw new Error('A valid 2-letter country code is required');
  }

  const pageIndex = Math.max(1, Number(options?.pageIndex || 1));
  const pageSize = Math.max(1, Math.min(Number(options?.pageSize || 100), 100));

  const [searchResult, smsOutboundPricing, voiceOutboundPricing] = await Promise.all([
    searchVonageAvailableNumbersPage(config, normalizedCountry, trim(desiredNumber), {
      ...options,
      index: pageIndex,
      size: pageSize,
    }),
    getVonageOutboundPricing(config, 'sms-outbound', normalizedCountry).catch(() => []),
    getVonageOutboundPricing(config, 'voice-outbound', normalizedCountry).catch(() => []),
  ]);
  const [existingInventory, assignedNumbers] = await Promise.all([
    db.select({ msisdn: virtualNumberInventory.msisdn }).from(virtualNumberInventory),
    db.select({ msisdn: userVirtualNumbers.msisdn }).from(userVirtualNumbers),
  ]);
  const ownedNumbers = new Set([
    ...existingInventory.map((item) => item.msisdn),
    ...assignedNumbers.map((item) => item.msisdn),
  ]);

  const totalCount = Math.max(searchResult.totalCount, searchResult.numbers.length);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    pricingDefaults: config.pricing,
    page: {
      countryCode: normalizedCountry,
      pageIndex,
      pageSize,
      returnedCount: searchResult.numbers.length,
      totalCount,
      totalPages,
      hasPreviousPage: pageIndex > 1,
      hasNextPage: pageIndex < totalPages,
      searchPattern: trim(desiredNumber),
    },
    providerPricing: {
      smsApiPricing: smsOutboundPricing,
      voiceApiPricing: voiceOutboundPricing,
      messagesApiPricing:
        config.messagesApiPrice !== '0.00'
          ? [
              {
                country_name: normalizedCountry,
                dest_network_type: 'MANUAL',
                currency: 'USD',
                price: config.messagesApiPrice,
              },
            ]
          : [],
      smsApiNote:
        'Loaded live from the official Vonage Pricing API using the sms-outbound product.',
      voiceApiNote:
        'Loaded live from the official Vonage Pricing API using the voice-outbound product.',
      messagesApiNote:
        config.messagesApiNotes ||
        'Vonage public pricing pages list Messages API rates, but the public Pricing API does not expose a matching messages product endpoint, so this section is reference/manual for now.',
    },
    results: searchResult.numbers.map((item: any) => ({
      msisdn: trim(item.msisdn),
      countryCode: normalizedCountry,
      type: trim(item.type),
      features: trim(item.features),
      monthlyCost: trim(item.cost || item.monthly_cost || item.base_cost),
      setupCost: trim(item.initialPrice || item.setup_cost || item.initial_price),
      searchPattern: trim(desiredNumber),
      availableToBuy: trim(item.msisdn) ? !ownedNumbers.has(trim(item.msisdn)) : false,
      raw: item,
    })),
  };
}

export async function getAdminVonageCountriesAvailability(
  countryCodes: string[],
  options?: VonageCountryAvailabilityOptions,
) {
  await ensureVonageSchema();
  const config = await getVonageConfig();

  if (!hasCredentials(config)) {
    throw new Error('Vonage credentials are missing in admin settings');
  }

  const normalizedCountryCodes = Array.from(
    new Set(
      (countryCodes || [])
        .map((code) => trim(code).toUpperCase())
        .filter((code) => code.length === 2),
    ),
  );

  if (normalizedCountryCodes.length === 0) {
    throw new Error('At least one valid 2-letter country code is required');
  }

  const [existingInventory, assignedNumbers] = await Promise.all([
    db.select({ msisdn: virtualNumberInventory.msisdn }).from(virtualNumberInventory),
    db.select({ msisdn: userVirtualNumbers.msisdn }).from(userVirtualNumbers),
  ]);

  const ownedNumbers = new Set([
    ...existingInventory.map((item) => trim(item.msisdn)).filter(Boolean),
    ...assignedNumbers.map((item) => trim(item.msisdn)).filter(Boolean),
  ]);

  const buildCountryRow = (
    countryCode: string,
    searchResult: VonageCountrySearchCacheValue,
  ) => {
    const availableCount = Math.max(searchResult.totalCount, searchResult.numbers.length);
    const ownedReturnedCount = searchResult.numbers.filter(
      (item: { msisdn: string }) => !ownedNumbers.has(item.msisdn),
    ).length;
    const buyReadyCount = availableCount - (searchResult.numbers.length - ownedReturnedCount);
    const preview = searchResult.numbers[0] || null;

    return {
      countryCode,
      availableCount,
      buyReadyCount: Math.max(0, buyReadyCount),
      hasAvailable: availableCount > 0,
      previewMsisdn: preview?.msisdn || '',
      previewType: preview?.type || '',
      previewFeatures: preview?.features || '',
      providerSetupCost: preview?.setupCost || '0.00',
      providerMonthlyCost: preview?.monthlyCost || '0.00',
      error: null as string | null,
    };
  };

  const countries = await mapWithConcurrency(
    normalizedCountryCodes,
    async (countryCode) => {
      const cacheKey = getVonageAvailabilityCacheKey(countryCode, options);
      const cachedSearchResult = options?.forceRefresh
        ? null
        : getCachedVonageCountryAvailability(cacheKey);

      if (cachedSearchResult) {
        return buildCountryRow(countryCode, cachedSearchResult);
      }

      try {
        const searchResult = await searchVonageAvailableNumbersPage(config, countryCode, undefined, {
          ...options,
          size: 1,
          retryAttempts: options?.forceRefresh ? 4 : 2,
        });
        const normalizedSearchResult = {
          numbers: normalizeVonageNumberSearchRows(searchResult.numbers),
          totalCount: searchResult.totalCount,
        };
        setCachedVonageCountryAvailability(cacheKey, normalizedSearchResult);

        return buildCountryRow(countryCode, normalizedSearchResult);
      } catch (error) {
        const staleSearchResult = getCachedVonageCountryAvailability(cacheKey, true);
        if (staleSearchResult) {
          return buildCountryRow(countryCode, staleSearchResult);
        }

        return {
          countryCode,
          availableCount: 0,
          buyReadyCount: 0,
          hasAvailable: false,
          previewMsisdn: '',
          previewType: '',
          previewFeatures: '',
          providerSetupCost: '0.00',
          providerMonthlyCost: '0.00',
          error: getAxiosErrorMessage(error, `Could not load DID availability for ${countryCode}`),
        };
      }
    },
    options?.forceRefresh ? 2 : 2,
  );

  return {
    defaultCountry: config.defaultCountry,
    feature: trim(options?.features) || 'any',
    type: trim(options?.type) || 'any',
    scan: {
      requestedCountries: normalizedCountryCodes.length,
      successfulCountries: countries.filter((country) => !country.error).length,
      errorCountries: countries.filter((country) => country.error).length,
      isPartial: countries.some((country) => country.error),
    },
    countries,
  };
}

export async function buyAdminVirtualNumberInventory({
  countryCode,
  msisdn,
  notes,
  ...pricingInput
}: {
  countryCode: string;
  msisdn: string;
  notes?: string;
} & InventoryPricingInput) {
  await ensureVonageSchema();

  const config = await getVonageConfig();
  if (!config.enabled) {
    throw new Error('Vonage virtual numbers are disabled');
  }
  if (!hasCredentials(config)) {
    throw new Error('Vonage credentials are missing in admin settings');
  }

  const normalizedCountry = trim(countryCode).toUpperCase();
  const normalizedMsisdn = trim(msisdn);

  if (!normalizedCountry || normalizedCountry.length !== 2) {
    throw new Error('A valid 2-letter country code is required');
  }
  if (!normalizedMsisdn) {
    throw new Error('Number is required');
  }

  const [existingInventoryItem] = await db
    .select()
    .from(virtualNumberInventory)
    .where(eq(virtualNumberInventory.msisdn, normalizedMsisdn))
    .limit(1);
  if (existingInventoryItem) {
    throw new Error('This number already exists in your inventory');
  }

  const [existingAssignedNumber] = await db
    .select()
    .from(userVirtualNumbers)
    .where(eq(userVirtualNumbers.msisdn, normalizedMsisdn))
    .limit(1);
  if (existingAssignedNumber) {
    throw new Error('This number is already assigned in the system');
  }

  await buyVonageNumber(config, normalizedCountry, normalizedMsisdn);
  if (config.inboundWebhookUrl) {
    await updateVonageNumberWebhook(
      config,
      normalizedCountry,
      normalizedMsisdn,
      config.inboundWebhookUrl,
    );
  }

  const pricing = getPricingSnapshot(config, pricingInput);
  const parsedPackageTerm = parsePackageTerm(pricingInput.packageTerm);
  const packageTerm = parsedPackageTerm.term;
  const paymentMethod = pricingInput.paymentMethod === 'wallet' ? 'wallet' : 'other';
  const assignedUserId = trim(pricingInput.assignedUserId || '') || null;
  const forwardingType =
    pricingInput.forwardingType === 'international' ||
    pricingInput.forwardingType === 'sip' ||
    pricingInput.forwardingType === 'voicemail'
      ? pricingInput.forwardingType
      : pricingInput.forwardingType === 'none'
        ? 'none'
        : assignedUserId
          ? 'sip'
          : 'none';
  const forwardingDestination =
    forwardingType === 'sip' && assignedUserId
      ? trim(pricingInput.forwardingDestination || '') ||
        (await getOrCreateUserSipAccount(assignedUserId)).uri
      : trim(pricingInput.forwardingDestination || '') || null;
  const packagePricing = getPackageRetailPrice(config, pricing);
  const customPackagePrices = {
    oneMonth: normalizeMoney(pricingInput.customPackagePrices?.oneMonth, packagePricing.oneMonth),
    threeMonths: normalizeMoney(
      pricingInput.customPackagePrices?.threeMonths,
      (Number.parseFloat(pricing.setupFee) + Number.parseFloat(pricing.monthlyFee) * 3).toFixed(2),
    ),
    sixMonths: normalizeMoney(
      pricingInput.customPackagePrices?.sixMonths,
      (Number.parseFloat(pricing.setupFee) + Number.parseFloat(pricing.monthlyFee) * 6).toFixed(2),
    ),
    nineMonths: normalizeMoney(
      pricingInput.customPackagePrices?.nineMonths,
      (Number.parseFloat(pricing.setupFee) + Number.parseFloat(pricing.monthlyFee) * 9).toFixed(2),
    ),
    twelveMonths: normalizeMoney(
      pricingInput.customPackagePrices?.twelveMonths,
      packagePricing.oneYear,
    ),
  };
  const resellerDiscountPercent = normalizeMoney(pricingInput.resellerDiscountPercent, '0.00');
  const agentDiscountPercent = normalizeMoney(pricingInput.agentDiscountPercent, '0.00');
  const packagePriceMap: Record<string, string> = {
    '1_month': customPackagePrices.oneMonth,
    '3_months': customPackagePrices.threeMonths,
    '6_months': customPackagePrices.sixMonths,
    '9_months': customPackagePrices.nineMonths,
    '1_year': customPackagePrices.twelveMonths,
  };
  const packagePrice = packagePriceMap[packageTerm] || customPackagePrices.oneMonth;
  const packageMonths = parsedPackageTerm.months;
  const subscription = buildVirtualNumberSubscriptionMeta({
    packageTerm,
    packageMonths,
    packagePrice,
    paymentMethod,
    purchasedAt: new Date(),
  });

  if (paymentMethod === 'wallet' && !assignedUserId) {
    throw new Error('Assign the number to a user, agent, or reseller before paying from wallet');
  }

  const inventoryItem = await db.transaction(async (tx) => {
    if (paymentMethod === 'wallet' && assignedUserId) {
      const [account] = await tx.select().from(users).where(eq(users.id, assignedUserId)).limit(1);

      if (!account) {
        throw new Error('Assigned account was not found');
      }

      const chargeAmount = Number.parseFloat(packagePrice);
      const balanceBefore = Number.parseFloat(String(account.walletBalance || '0.00'));
      if (!Number.isFinite(balanceBefore) || balanceBefore + 0.0001 < chargeAmount) {
        throw new Error('Assigned account has insufficient wallet balance for this package');
      }

      const balanceAfter = balanceBefore - chargeAmount;

      await tx
        .update(users)
        .set({
          walletBalance: balanceAfter.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(users.id, assignedUserId));

      await tx.insert(walletTransactions).values({
        userId: assignedUserId,
        type: 'purchase_debit',
        status: 'completed',
        amount: packagePrice,
        currency: 'USD',
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        provider: 'admin',
        referenceId: normalizedMsisdn,
        description: `Virtual number ${normalizedMsisdn} ${packageMonths} month package`,
        metadata: {
          provider: 'vonage',
          packageTerm,
          countryCode: normalizedCountry,
        },
        completedAt: new Date(),
      });
    }

    const [createdInventoryItem] = await tx
      .insert(virtualNumberInventory)
      .values({
        provider: 'vonage',
        msisdn: normalizedMsisdn,
        countryCode: normalizedCountry,
        status: assignedUserId ? 'assigned' : 'available',
        isPremium: pricing.isPremium,
        providerSetupCost: normalizeMoney(pricingInput.providerSetupCost),
        providerMonthlyCost: normalizeMoney(pricingInput.providerMonthlyCost),
        providerInboundCost: normalizeMoney(pricingInput.providerInboundCost),
        providerOutboundCost: normalizeMoney(pricingInput.providerOutboundCost),
        providerSmsCost: normalizeMoney(
          pricingInput.providerSmsCost,
          normalizeMoney(pricingInput.providerOutboundCost),
        ),
        providerMmsCost: normalizeMoney(pricingInput.providerMmsCost, config.messagesApiPrice),
        providerVoiceCost: normalizeMoney(
          pricingInput.providerVoiceCost,
          normalizeMoney(pricingInput.providerOutboundCost),
        ),
        setupFee: pricing.setupFee,
        monthlyFee: pricing.monthlyFee,
        inboundFee: pricing.inboundFee,
        outboundFee: pricing.outboundFee,
        smsFee: pricing.smsFee,
        mmsFee: pricing.mmsFee,
        voiceFee: pricing.voiceFee,
        capabilities: {
          sms: true,
          mms: true,
          voice: true,
          inbound: true,
          outbound: true,
        },
        assignedUserId,
        notes: trim(notes) || null,
        metadata: {
          boughtFrom: 'vonage',
          pricing,
          customPackagePrices,
          rolePricing: {
            resellerDiscountPercent,
            agentDiscountPercent,
            resellerPackages: {
              oneMonth: applyDiscountPercent(customPackagePrices.oneMonth, resellerDiscountPercent),
              threeMonths: applyDiscountPercent(
                customPackagePrices.threeMonths,
                resellerDiscountPercent,
              ),
              sixMonths: applyDiscountPercent(
                customPackagePrices.sixMonths,
                resellerDiscountPercent,
              ),
              nineMonths: applyDiscountPercent(
                customPackagePrices.nineMonths,
                resellerDiscountPercent,
              ),
              twelveMonths: applyDiscountPercent(
                customPackagePrices.twelveMonths,
                resellerDiscountPercent,
              ),
            },
            agentPackages: {
              oneMonth: applyDiscountPercent(customPackagePrices.oneMonth, agentDiscountPercent),
              threeMonths: applyDiscountPercent(
                customPackagePrices.threeMonths,
                agentDiscountPercent,
              ),
              sixMonths: applyDiscountPercent(customPackagePrices.sixMonths, agentDiscountPercent),
              nineMonths: applyDiscountPercent(
                customPackagePrices.nineMonths,
                agentDiscountPercent,
              ),
              twelveMonths: applyDiscountPercent(
                customPackagePrices.twelveMonths,
                agentDiscountPercent,
              ),
            },
          },
          package: {
            term: packageTerm,
            months: packageMonths,
            price: packagePrice,
            paymentMethod,
          },
          subscription,
          routing: {
            type: forwardingType,
            destination: forwardingDestination,
          },
          providerPricing: {
            setupCost: normalizeMoney(pricingInput.providerSetupCost),
            monthlyCost: normalizeMoney(pricingInput.providerMonthlyCost),
            inboundCost: normalizeMoney(pricingInput.providerInboundCost),
            outboundCost: normalizeMoney(pricingInput.providerOutboundCost),
            smsCost: normalizeMoney(
              pricingInput.providerSmsCost,
              normalizeMoney(pricingInput.providerOutboundCost),
            ),
            mmsCost: normalizeMoney(pricingInput.providerMmsCost, config.messagesApiPrice),
            voiceCost: normalizeMoney(
              pricingInput.providerVoiceCost,
              normalizeMoney(pricingInput.providerOutboundCost),
            ),
          },
        },
      })
      .returning();

    return createdInventoryItem;
  });

  return inventoryItem;
}

export async function updateVirtualNumberInventoryItem(
  id: string,
  updates: {
    isPremium?: boolean;
    providerSetupCost?: string;
    providerMonthlyCost?: string;
    providerInboundCost?: string;
    providerOutboundCost?: string;
    providerSmsCost?: string;
    providerMmsCost?: string;
    providerVoiceCost?: string;
    setupFee?: string;
    monthlyFee?: string;
    inboundFee?: string;
    outboundFee?: string;
    smsFee?: string;
    mmsFee?: string;
    voiceFee?: string;
    notes?: string;
    status?: string;
    assignedUserId?: string | null;
    forwardingType?: 'none' | 'international' | 'sip' | 'voicemail';
    forwardingDestination?: string | null;
    autoRenew?: boolean;
    reminderDays?: number | string | null;
    cancelAtPeriodEnd?: boolean;
    packageTerm?: '1_month' | '3_months' | '6_months' | '9_months' | '1_year';
  },
) {
  await ensureVonageSchema();

  const [currentItem] = await db
    .select()
    .from(virtualNumberInventory)
    .where(eq(virtualNumberInventory.id, id))
    .limit(1);

  if (!currentItem) {
    throw new Error('Inventory number not found');
  }

  const nextIsPremium = updates.isPremium ?? currentItem.isPremium;
  const nextPricing = {
    isPremium: nextIsPremium,
    providerSetupCost: normalizeMoney(
      updates.providerSetupCost,
      normalizeMoney(currentItem.providerSetupCost),
    ),
    providerMonthlyCost: normalizeMoney(
      updates.providerMonthlyCost,
      normalizeMoney(currentItem.providerMonthlyCost),
    ),
    providerInboundCost: normalizeMoney(
      updates.providerInboundCost,
      normalizeMoney(currentItem.providerInboundCost),
    ),
    providerOutboundCost: normalizeMoney(
      updates.providerOutboundCost,
      normalizeMoney(currentItem.providerOutboundCost),
    ),
    providerSmsCost: normalizeMoney(
      updates.providerSmsCost,
      normalizeMoney((currentItem as any).providerSmsCost),
    ),
    providerMmsCost: normalizeMoney(
      updates.providerMmsCost,
      normalizeMoney((currentItem as any).providerMmsCost),
    ),
    providerVoiceCost: normalizeMoney(
      updates.providerVoiceCost,
      normalizeMoney((currentItem as any).providerVoiceCost),
    ),
    setupFee: normalizeMoney(updates.setupFee, normalizeMoney(currentItem.setupFee)),
    monthlyFee: normalizeMoney(updates.monthlyFee, normalizeMoney(currentItem.monthlyFee)),
    inboundFee: normalizeMoney(updates.inboundFee, normalizeMoney(currentItem.inboundFee)),
    outboundFee: normalizeMoney(updates.outboundFee, normalizeMoney(currentItem.outboundFee)),
    smsFee: normalizeMoney(updates.smsFee, normalizeMoney((currentItem as any).smsFee)),
    mmsFee: normalizeMoney(updates.mmsFee, normalizeMoney((currentItem as any).mmsFee)),
    voiceFee: normalizeMoney(updates.voiceFee, normalizeMoney((currentItem as any).voiceFee)),
  };

  const assignedUserIdForRouting =
    updates.assignedUserId !== undefined
      ? trim(updates.assignedUserId || '') || null
      : currentItem.assignedUserId;
  const currentRoutingType = (currentItem.metadata as any)?.routing?.type;
  const shouldDefaultAssignedNumberToSip =
    updates.forwardingType === undefined &&
    updates.assignedUserId !== undefined &&
    Boolean(assignedUserIdForRouting) &&
    (!currentRoutingType || currentRoutingType === 'none');
  const nextForwardingType =
    updates.forwardingType === 'international' ||
    updates.forwardingType === 'sip' ||
    updates.forwardingType === 'voicemail'
      ? updates.forwardingType
      : updates.forwardingType === 'none'
        ? 'none'
        : shouldDefaultAssignedNumberToSip
          ? 'sip'
          : currentRoutingType || 'none';
  const requestedForwardingDestination =
    updates.forwardingDestination !== undefined
      ? trim(updates.forwardingDestination || '') || null
      : ((currentItem.metadata as any)?.routing?.destination ?? null);
  const nextForwardingDestination =
    nextForwardingType === 'sip' && !requestedForwardingDestination && assignedUserIdForRouting
      ? (await getOrCreateUserSipAccount(assignedUserIdForRouting)).uri
      : requestedForwardingDestination;
  const currentMetadata = (currentItem.metadata as Record<string, any>) || {};
  const currentSubscription = getVirtualNumberSubscriptionMeta(currentMetadata);
  const parsedPackageTerm =
    updates.packageTerm !== undefined ? parsePackageTerm(updates.packageTerm) : null;
  const metadataCustomPackagePrices =
    (currentMetadata.customPackagePrices as Record<string, string> | undefined) || {};
  const packagePriceMap = {
    '1_month': normalizeMoney(metadataCustomPackagePrices.oneMonth, nextPricing.monthlyFee),
    '3_months': normalizeMoney(
      metadataCustomPackagePrices.threeMonths,
      normalizeMoney((Number.parseFloat(nextPricing.monthlyFee || '0') * 3).toFixed(2)),
    ),
    '6_months': normalizeMoney(
      metadataCustomPackagePrices.sixMonths,
      normalizeMoney((Number.parseFloat(nextPricing.monthlyFee || '0') * 6).toFixed(2)),
    ),
    '9_months': normalizeMoney(
      metadataCustomPackagePrices.nineMonths,
      normalizeMoney((Number.parseFloat(nextPricing.monthlyFee || '0') * 9).toFixed(2)),
    ),
    '1_year': normalizeMoney(
      metadataCustomPackagePrices.twelveMonths,
      normalizeMoney((Number.parseFloat(nextPricing.monthlyFee || '0') * 12).toFixed(2)),
    ),
  };
  const nextSubscription = currentSubscription
    ? {
        ...currentSubscription,
        packageTerm: parsedPackageTerm?.term || currentSubscription.packageTerm,
        billingMonths: parsedPackageTerm?.months || currentSubscription.billingMonths,
        renewalPrice: parsedPackageTerm?.term
          ? packagePriceMap[parsedPackageTerm.term]
          : normalizeMoney(
              currentSubscription.renewalPrice,
              packagePriceMap[currentSubscription.packageTerm || '1_month'],
            ),
        autoRenew:
          updates.autoRenew !== undefined
            ? Boolean(updates.autoRenew)
            : currentSubscription.autoRenew,
        reminderDays:
          updates.reminderDays !== undefined
            ? normalizeInteger(updates.reminderDays, currentSubscription.reminderDays)
            : currentSubscription.reminderDays,
        cancelAtPeriodEnd:
          updates.cancelAtPeriodEnd !== undefined
            ? Boolean(updates.cancelAtPeriodEnd)
            : (currentSubscription.cancelAtPeriodEnd ?? false),
        canceledAt:
          updates.cancelAtPeriodEnd !== undefined && Boolean(updates.cancelAtPeriodEnd)
            ? new Date().toISOString()
            : updates.autoRenew === true
              ? null
              : currentSubscription.canceledAt || null,
        canceledByAdmin:
          updates.cancelAtPeriodEnd !== undefined
            ? Boolean(updates.cancelAtPeriodEnd)
            : (currentSubscription.canceledByAdmin ?? false),
        renewalStatus:
          updates.cancelAtPeriodEnd !== undefined
            ? Boolean(updates.cancelAtPeriodEnd)
              ? 'cancel_pending_expiry'
              : 'active'
            : updates.autoRenew === false
              ? 'cancel_pending_expiry'
              : updates.autoRenew === true
                ? 'active'
                : currentSubscription.renewalStatus,
      }
    : null;

  const [updatedItem] = await db
    .update(virtualNumberInventory)
    .set({
      isPremium: nextIsPremium,
      providerSetupCost: nextPricing.providerSetupCost,
      providerMonthlyCost: nextPricing.providerMonthlyCost,
      providerInboundCost: nextPricing.providerInboundCost,
      providerOutboundCost: nextPricing.providerOutboundCost,
      providerSmsCost: nextPricing.providerSmsCost,
      providerMmsCost: nextPricing.providerMmsCost,
      providerVoiceCost: nextPricing.providerVoiceCost,
      setupFee: nextPricing.setupFee,
      monthlyFee: nextPricing.monthlyFee,
      inboundFee: nextPricing.inboundFee,
      outboundFee: nextPricing.outboundFee,
      smsFee: nextPricing.smsFee,
      mmsFee: nextPricing.mmsFee,
      voiceFee: nextPricing.voiceFee,
      assignedUserId:
        updates.assignedUserId !== undefined
          ? trim(updates.assignedUserId || '') || null
          : currentItem.assignedUserId,
      notes: updates.notes !== undefined ? trim(updates.notes) || null : currentItem.notes,
      status:
        updates.status ||
        (updates.assignedUserId !== undefined
          ? trim(updates.assignedUserId || '')
            ? 'assigned'
            : 'available'
          : currentItem.status),
      metadata: {
        ...currentMetadata,
        pricing: {
          isPremium: nextPricing.isPremium,
          setupFee: nextPricing.setupFee,
          monthlyFee: nextPricing.monthlyFee,
          inboundFee: nextPricing.inboundFee,
          outboundFee: nextPricing.outboundFee,
          smsFee: nextPricing.smsFee,
          mmsFee: nextPricing.mmsFee,
          voiceFee: nextPricing.voiceFee,
        },
        providerPricing: {
          setupCost: nextPricing.providerSetupCost,
          monthlyCost: nextPricing.providerMonthlyCost,
          inboundCost: nextPricing.providerInboundCost,
          outboundCost: nextPricing.providerOutboundCost,
          smsCost: nextPricing.providerSmsCost,
          mmsCost: nextPricing.providerMmsCost,
          voiceCost: nextPricing.providerVoiceCost,
        },
        assignment: {
          assignedUserId:
            updates.assignedUserId !== undefined
              ? trim(updates.assignedUserId || '') || null
              : currentItem.assignedUserId,
        },
        routing: {
          type: nextForwardingType,
          destination: nextForwardingDestination,
        },
        ...(nextSubscription ? { subscription: nextSubscription } : {}),
      },
      updatedAt: new Date(),
    })
    .where(eq(virtualNumberInventory.id, id))
    .returning();

  let linkedNumber: typeof userVirtualNumbers.$inferSelect | null = null;
  if (updatedItem.assignedVirtualNumberId) {
    [linkedNumber] = await db
      .select()
      .from(userVirtualNumbers)
      .where(eq(userVirtualNumbers.id, updatedItem.assignedVirtualNumberId))
      .limit(1);
  }

  if (!linkedNumber && updatedItem.assignedUserId) {
    [linkedNumber] = await db
      .select()
      .from(userVirtualNumbers)
      .where(eq(userVirtualNumbers.msisdn, updatedItem.msisdn))
      .limit(1);
  }

  const linkedNumberMetadata = {
    inventoryId: updatedItem.id,
    pricing: {
      isPremium: nextPricing.isPremium,
      setupFee: nextPricing.setupFee,
      monthlyFee: nextPricing.monthlyFee,
      inboundFee: nextPricing.inboundFee,
      outboundFee: nextPricing.outboundFee,
      smsFee: nextPricing.smsFee,
      mmsFee: nextPricing.mmsFee,
      voiceFee: nextPricing.voiceFee,
    },
    routing: {
      type: nextForwardingType,
      destination: nextForwardingDestination,
    },
    ...(nextSubscription ? { subscription: nextSubscription } : {}),
  };

  if (linkedNumber) {
    await db
      .update(userVirtualNumbers)
      .set({
        userId: updatedItem.assignedUserId || linkedNumber.userId,
        status:
          nextSubscription?.renewalStatus === 'expired'
            ? 'suspended'
            : updatedItem.status === 'available'
              ? 'suspended'
              : 'active',
        metadata: {
          ...((linkedNumber.metadata as Record<string, any>) || {}),
          ...linkedNumberMetadata,
        },
        updatedAt: new Date(),
      })
      .where(eq(userVirtualNumbers.id, linkedNumber.id));

    if (!updatedItem.assignedVirtualNumberId) {
      await db
        .update(virtualNumberInventory)
        .set({
          assignedVirtualNumberId: linkedNumber.id,
          updatedAt: new Date(),
        })
        .where(eq(virtualNumberInventory.id, updatedItem.id));

      return {
        ...updatedItem,
        assignedVirtualNumberId: linkedNumber.id,
      };
    }
  } else if (updatedItem.assignedUserId) {
    const config = await getVonageConfig();
    const [createdLinkedNumber] = await db
      .insert(userVirtualNumbers)
      .values({
        userId: updatedItem.assignedUserId,
        provider: updatedItem.provider || 'vonage',
        msisdn: updatedItem.msisdn,
        countryCode: updatedItem.countryCode,
        status: updatedItem.status === 'available' ? 'suspended' : 'active',
        webhookUrl: config.inboundWebhookUrl || null,
        capabilities: {
          sms: true,
          mms: true,
          voice: true,
          inbound: true,
          outbound: true,
        },
        metadata: linkedNumberMetadata,
      })
      .returning();

    await db
      .update(virtualNumberInventory)
      .set({
        assignedVirtualNumberId: createdLinkedNumber.id,
        updatedAt: new Date(),
      })
      .where(eq(virtualNumberInventory.id, updatedItem.id));

    return {
      ...updatedItem,
      assignedVirtualNumberId: createdLinkedNumber.id,
    };
  }

  return updatedItem;
}

async function getLinkedVirtualNumberForInventory(
  item: typeof virtualNumberInventory.$inferSelect,
) {
  if (item.assignedVirtualNumberId) {
    const [linkedNumber] = await db
      .select()
      .from(userVirtualNumbers)
      .where(eq(userVirtualNumbers.id, item.assignedVirtualNumberId))
      .limit(1);
    if (linkedNumber) return linkedNumber;
  }

  if (item.assignedUserId) {
    const [linkedNumber] = await db
      .select()
      .from(userVirtualNumbers)
      .where(and(eq(userVirtualNumbers.userId, item.assignedUserId), eq(userVirtualNumbers.msisdn, item.msisdn)))
      .limit(1);
    if (linkedNumber) return linkedNumber;
  }

  const [linkedNumber] = await db
    .select()
    .from(userVirtualNumbers)
    .where(eq(userVirtualNumbers.msisdn, item.msisdn))
    .limit(1);
  return linkedNumber || null;
}

export async function getAdminVirtualNumberInventoryWorkspace(inventoryId: string) {
  await ensureVonageSchema();
  await processVirtualNumberSubscriptionLifecycle();

  const [inventoryItem] = await db
    .select()
    .from(virtualNumberInventory)
    .where(eq(virtualNumberInventory.id, inventoryId))
    .limit(1);
  if (!inventoryItem) throw new Error('Inventory number not found');

  const linkedNumber = await getLinkedVirtualNumberForInventory(inventoryItem);
  const assignedAccount = inventoryItem.assignedUserId
    ? await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, inventoryItem.assignedUserId))
        .limit(1)
        .then((rows) => rows[0] || null)
    : null;
  const billing = linkedNumber
    ? await getVirtualNumberBillingStatus(linkedNumber.userId, linkedNumber)
    : null;

  const [messages, voiceCalls, voicemails] = linkedNumber
    ? await Promise.all([
        db
          .select()
          .from(virtualSmsMessages)
          .where(eq(virtualSmsMessages.virtualNumberId, linkedNumber.id))
          .orderBy(desc(virtualSmsMessages.createdAt))
          .limit(200),
        db
          .select()
          .from(virtualVoiceCalls)
          .where(eq(virtualVoiceCalls.virtualNumberId, linkedNumber.id))
          .orderBy(desc(virtualVoiceCalls.createdAt))
          .limit(100),
        db
          .select()
          .from(virtualVoicemails)
          .where(eq(virtualVoicemails.virtualNumberId, linkedNumber.id))
          .orderBy(desc(virtualVoicemails.createdAt))
          .limit(100),
      ])
    : [[], [], []];

  return {
    inventoryItem,
    assignedAccount,
    selectedNumber: linkedNumber ? toPublicVirtualNumber(linkedNumber, billing) : null,
    messages,
    receivingMessages: messages.filter((message) => message.direction === 'inbound'),
    sendingMessages: messages.filter((message) => message.direction === 'outbound'),
    voiceCalls,
    voicemails,
  };
}

export async function sendAdminVirtualSmsFromInventory(
  inventoryId: string,
  to: string,
  text: string,
) {
  await ensureVonageSchema();
  const [inventoryItem] = await db
    .select()
    .from(virtualNumberInventory)
    .where(eq(virtualNumberInventory.id, inventoryId))
    .limit(1);
  if (!inventoryItem) throw new Error('Inventory number not found');
  if (!inventoryItem.assignedUserId) throw new Error('Assign this DID before sending SMS');

  const linkedNumber = await getLinkedVirtualNumberForInventory(inventoryItem);
  if (!linkedNumber || linkedNumber.status !== 'active') {
    throw new Error('This DID is not active for the assigned account yet');
  }

  return sendUserVirtualSmsFromNumber(linkedNumber.userId, linkedNumber.id, to, text);
}

export async function createAdminVirtualVoiceSessionFromInventory(
  inventoryId: string,
  to: string,
  options?: {
    callType?: 'international' | 'sip';
    spokenMessage?: string | null;
  },
) {
  await ensureVonageSchema();
  const [inventoryItem] = await db
    .select()
    .from(virtualNumberInventory)
    .where(eq(virtualNumberInventory.id, inventoryId))
    .limit(1);
  if (!inventoryItem) throw new Error('Inventory number not found');
  if (!inventoryItem.assignedUserId) throw new Error('Assign this DID before starting calls');

  const linkedNumber = await getLinkedVirtualNumberForInventory(inventoryItem);
  if (!linkedNumber || linkedNumber.status !== 'active') {
    throw new Error('This DID is not active for the assigned account yet');
  }

  return createVonageVoiceSession(linkedNumber.userId, {
    direction: 'outbound',
    referenceNumber: to,
    virtualNumberId: linkedNumber.id,
    callType: options?.callType,
    spokenMessage: options?.spokenMessage,
  });
}

export async function getVonageUserDashboard(userId: string) {
  await processVirtualNumberSubscriptionLifecycle();
  const [config, number, numbers, application, messages, account, sipAccount] = await Promise.all([
    getVonageConfig(),
    getUserVirtualNumber(userId),
    getUserVirtualNumbers(userId),
    getLatestVirtualNumberApplication(userId),
    getUserVirtualSmsMessages(userId),
    db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((rows) => rows[0] || null),
    getPublicSipAccountForUser(userId),
  ]);
  const billingByNumberId = new Map<
    string,
    Awaited<ReturnType<typeof getVirtualNumberBillingStatus>>
  >();
  for (const item of numbers) {
    billingByNumberId.set(item.id, await getVirtualNumberBillingStatus(userId, item));
  }

  return {
    enabled: config.enabled,
    hasCredentials: hasCredentials(config),
    provider: 'eRoaming',
    brandName: 'eRoaming',
    defaultCountry: config.defaultCountry,
    autoAssign: config.autoAssign,
    pricingDefaults: config.pricing,
    walletBalance: normalizeMoney(account?.walletBalance),
    billingRole: account ? await resolveVirtualNumberBillingRole(account) : 'admin',
    sipAccount,
    number: number
      ? {
          ...number,
          provider: 'eRoaming',
          billing: billingByNumberId.get(number.id) || null,
        }
      : null,
    numbers: numbers.map((item) => ({
      ...item,
      provider: 'eRoaming',
      subscription: getVirtualNumberSubscriptionMeta((item.metadata as Record<string, any>) || {}),
      routing: ((item.metadata as Record<string, any>) || {}).routing || null,
      pricing: ((item.metadata as Record<string, any>) || {}).pricing || null,
      billing: billingByNumberId.get(item.id) || null,
    })),
    application,
    messages,
  };
}

function toPublicVirtualNumber(
  item: typeof userVirtualNumbers.$inferSelect,
  billing?: Awaited<ReturnType<typeof getVirtualNumberBillingStatus>> | null,
) {
  const metadata = (item.metadata as Record<string, any>) || {};
  return {
    ...item,
    provider: 'eRoaming',
    subscription: getVirtualNumberSubscriptionMeta(metadata),
    routing: metadata.routing || null,
    pricing: metadata.pricing || null,
    billing: billing || null,
  };
}

export async function getUserVirtualNumberWorkspace(userId: string, virtualNumberId?: string) {
  await processVirtualNumberSubscriptionLifecycle();
  const [config, numbers, account, sipAccount] = await Promise.all([
    getVonageConfig(),
    getUserVirtualNumbers(userId),
    db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((rows) => rows[0] || null),
    getPublicSipAccountForUser(userId),
  ]);

  const selectedId = trim(virtualNumberId);
  if (selectedId && !numbers.some((item) => item.id === selectedId)) {
    throw new Error('Virtual number not found');
  }

  const selectedNumber =
    (selectedId ? numbers.find((item) => item.id === selectedId) : null) ||
    numbers.find((item) => item.status === 'active') ||
    numbers[0] ||
    null;

  const billingByNumberId = new Map<
    string,
    Awaited<ReturnType<typeof getVirtualNumberBillingStatus>>
  >();
  for (const item of numbers) {
    billingByNumberId.set(item.id, await getVirtualNumberBillingStatus(userId, item));
  }

  const [messages, voiceCalls, voicemails] = selectedNumber
    ? await Promise.all([
        db
          .select()
          .from(virtualSmsMessages)
          .where(
            and(
              eq(virtualSmsMessages.userId, userId),
              eq(virtualSmsMessages.virtualNumberId, selectedNumber.id),
            ),
          )
          .orderBy(desc(virtualSmsMessages.createdAt))
          .limit(200),
        db
          .select()
          .from(virtualVoiceCalls)
          .where(
            and(
              eq(virtualVoiceCalls.userId, userId),
              eq(virtualVoiceCalls.virtualNumberId, selectedNumber.id),
            ),
          )
          .orderBy(desc(virtualVoiceCalls.createdAt))
          .limit(100),
        db
          .select()
          .from(virtualVoicemails)
          .where(
            and(
              eq(virtualVoicemails.userId, userId),
              eq(virtualVoicemails.virtualNumberId, selectedNumber.id),
            ),
          )
          .orderBy(desc(virtualVoicemails.createdAt))
          .limit(100),
      ])
    : [[], [], []];

  return {
    enabled: config.enabled,
    hasCredentials: hasCredentials(config),
    provider: 'eRoaming',
    brandName: 'eRoaming',
    defaultCountry: config.defaultCountry,
    walletBalance: normalizeMoney(account?.walletBalance),
    billingRole: account ? await resolveVirtualNumberBillingRole(account) : 'admin',
    sipAccount,
    numbers: numbers.map((item) => toPublicVirtualNumber(item, billingByNumberId.get(item.id))),
    selectedNumber: selectedNumber
      ? toPublicVirtualNumber(selectedNumber, billingByNumberId.get(selectedNumber.id))
      : null,
    messages,
    receivingMessages: messages.filter((message) => message.direction === 'inbound'),
    sendingMessages: messages.filter((message) => message.direction === 'outbound'),
    voiceCalls,
    voicemails,
  };
}

export async function getUserVirtualNumberVoicemails(userId: string, virtualNumberId: string) {
  await ensureVonageSchema();
  const number = await getUserVirtualNumberById(userId, virtualNumberId);
  if (!number) throw new Error('Virtual number not found');

  return db
    .select()
    .from(virtualVoicemails)
    .where(
      and(
        eq(virtualVoicemails.userId, userId),
        eq(virtualVoicemails.virtualNumberId, number.id),
      ),
    )
    .orderBy(desc(virtualVoicemails.createdAt))
    .limit(100);
}
