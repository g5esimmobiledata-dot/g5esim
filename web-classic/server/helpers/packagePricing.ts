import type { Request } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { resellerPackagePrices, resellerProviderSettings, users } from "@shared/schema";
import { verifyToken } from "../utils/auth";

type PriceValue = string | number | null | undefined;

type PriceablePackage = {
  id?: string;
  wholesalePrice?: PriceValue;
  retailPrice?: PriceValue;
  resellerPrice?: PriceValue;
};

export type ResellerPackagePriceRow = typeof resellerPackagePrices.$inferSelect;
export type ResellerProviderSettingRow = typeof resellerProviderSettings.$inferSelect;
export type StorefrontReseller = Pick<
  typeof users.$inferSelect,
  | "id"
  | "email"
  | "name"
  | "resellerSubdomain"
  | "resellerStoreName"
  | "resellerStoreTagline"
  | "resellerContactEmail"
  | "resellerDefaultCurrency"
  | "resellerStoreConfig"
  | "resellerLogoUrl"
  | "resellerStoreActive"
  | "whatsappNumber"
>;

type CurrencyRate = {
  code: string;
  conversionRate: PriceValue;
};

function parseMoney(value: PriceValue): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getPackageBasePriceUsd(
  pkg: PriceablePackage,
  useResellerPrice = false,
  resellerSellingPrice?: PriceValue,
): number {
  const customResellerSellingPrice = parseMoney(resellerSellingPrice);
  const resellerPrice = parseMoney(pkg.resellerPrice);
  const retailPrice = parseMoney(pkg.retailPrice);
  const wholesalePrice = parseMoney(pkg.wholesalePrice);

  if (useResellerPrice && customResellerSellingPrice !== null) {
    return customResellerSellingPrice;
  }

  if (useResellerPrice && resellerPrice !== null) {
    return resellerPrice;
  }

  return retailPrice ?? wholesalePrice ?? 0;
}

export function convertUsdPrice(
  amountUsd: number,
  requestedCurrency: string,
  currencies: CurrencyRate[],
): number {
  const fromCurrency = currencies.find((currency) => currency.code === "USD");
  const toCurrency = currencies.find((currency) => currency.code === requestedCurrency);

  if (requestedCurrency === "USD" || !fromCurrency || !toCurrency) {
    return Number(amountUsd.toFixed(2));
  }

  const fromRate = Number(fromCurrency.conversionRate);
  const toRate = Number(toCurrency.conversionRate);

  if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate <= 0) {
    return Number(amountUsd.toFixed(2));
  }

  return Number(((amountUsd / fromRate) * toRate).toFixed(2));
}

export function getDisplayPackagePrice(
  pkg: PriceablePackage,
  isReseller: boolean,
  requestedCurrency: string,
  currencies: CurrencyRate[],
  resellerSellingPrice?: PriceValue,
): number {
  const baseUsd = getPackageBasePriceUsd(pkg, isReseller, resellerSellingPrice);
  return convertUsdPrice(baseUsd, requestedCurrency, currencies);
}

export async function getResellerPackagePriceMap(
  userId?: string | null,
  packageIds: string[] = [],
): Promise<Map<string, ResellerPackagePriceRow>> {
  if (!userId || packageIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select()
    .from(resellerPackagePrices)
    .where(and(
      eq(resellerPackagePrices.resellerId, userId),
      inArray(resellerPackagePrices.packageId, packageIds),
    ));

  return new Map(rows.map((row) => [row.packageId, row]));
}

export function getResellerSellingPriceForPackage(
  packageId: string,
  resellerPriceMap: Map<string, ResellerPackagePriceRow>,
): PriceValue | null {
  const resellerPrice = resellerPriceMap.get(packageId);
  if (resellerPrice?.isEnabled === false) return null;
  return resellerPrice?.sellingPrice;
}

export async function getResellerProviderSettingsMap(
  userId?: string | null,
): Promise<Map<string, boolean>> {
  if (!userId) {
    return new Map();
  }

  const rows = await db
    .select()
    .from(resellerProviderSettings)
    .where(eq(resellerProviderSettings.resellerId, userId));

  return new Map(rows.map((row) => [row.providerId, row.isEnabled]));
}

export async function getResellerDisabledProviderIds(
  userId?: string | null,
): Promise<string[]> {
  if (!userId) {
    return [];
  }

  const rows = await db
    .select({ providerId: resellerProviderSettings.providerId })
    .from(resellerProviderSettings)
    .where(and(
      eq(resellerProviderSettings.resellerId, userId),
      eq(resellerProviderSettings.isEnabled, false),
    ));

  return rows.map((row) => row.providerId);
}

export function isProviderEnabledForReseller(
  providerId: string | null | undefined,
  providerSettingsMap: Map<string, boolean>,
): boolean {
  if (!providerId) return true;
  return providerSettingsMap.get(providerId) !== false;
}

export async function isUserReseller(userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  const user = await storage.getUser(userId);
  return user?.role === "reseller" || user?.role === "agent";
}

const RESERVED_SUBDOMAINS = new Set([
  "admin",
  "api",
  "app",
  "assets",
  "cdn",
  "dashboard",
  "help",
  "localhost",
  "mail",
  "reseller",
  "support",
  "www",
]);

function stripPort(host: string): string {
  return host.replace(/:\d+$/, "");
}

function isIpAddress(host: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(":");
}

function getBaseDomains(): string[] {
  const configured = [
    process.env.RESELLER_BASE_DOMAIN,
    process.env.BASE_DOMAIN,
    process.env.PUBLIC_BASE_DOMAIN,
  ]
    .flatMap((value) => String(value || "").split(","))
    .map((value) => stripPort(value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0]))
    .filter(Boolean);

  if (process.env.BASE_URL) {
    try {
      configured.push(stripPort(new URL(process.env.BASE_URL).hostname.toLowerCase()));
    } catch {
      // Ignore malformed env URLs; host fallback still works.
    }
  }

  return Array.from(new Set(configured));
}

export function normalizeResellerSubdomainInput(value: unknown): string | null {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;

  const withoutProtocol = raw.replace(/^https?:\/\//, "").split("/")[0];
  const hostname = stripPort(withoutProtocol);
  const subdomain = hostname.includes(".") ? hostname.split(".")[0] : hostname;
  const normalized = subdomain
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (normalized.length < 3 || normalized.length > 63) return null;
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/.test(normalized)) return null;
  if (RESERVED_SUBDOMAINS.has(normalized)) return null;

  return normalized;
}

export function getRequestHost(req: Request): string | null {
  const forwardedHost = req.headers["x-forwarded-host"];
  const rawHost = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost || req.get("host");

  if (!rawHost) return null;

  return stripPort(String(rawHost).split(",")[0].trim().toLowerCase());
}

export function getResellerSubdomainFromHost(req: Request): string | null {
  const host = getRequestHost(req);
  if (!host || host === "localhost" || isIpAddress(host)) return null;

  if (host.endsWith(".localhost")) {
    return normalizeResellerSubdomainInput(host.split(".localhost")[0].split(".").pop());
  }

  for (const baseDomain of getBaseDomains()) {
    if (!baseDomain || host === baseDomain || host === `www.${baseDomain}`) continue;
    if (host.endsWith(`.${baseDomain}`)) {
      const prefix = host.slice(0, -(baseDomain.length + 1));
      return normalizeResellerSubdomainInput(prefix.split(".").pop());
    }
  }

  const parts = host.split(".");
  if (parts.length >= 3) {
    return normalizeResellerSubdomainInput(parts[0]);
  }

  return null;
}

export async function getRequestStorefrontReseller(req: Request): Promise<StorefrontReseller | null> {
  const subdomain = getResellerSubdomainFromHost(req);
  if (!subdomain) return null;

  const [reseller] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      resellerSubdomain: users.resellerSubdomain,
      resellerStoreName: users.resellerStoreName,
      resellerStoreTagline: users.resellerStoreTagline,
      resellerContactEmail: users.resellerContactEmail,
      resellerDefaultCurrency: users.resellerDefaultCurrency,
      resellerStoreConfig: users.resellerStoreConfig,
      resellerLogoUrl: users.resellerLogoUrl,
      resellerStoreActive: users.resellerStoreActive,
      whatsappNumber: users.whatsappNumber,
    })
    .from(users)
    .where(and(
      eq(users.resellerSubdomain, subdomain),
      eq(users.resellerStoreActive, true),
      inArray(users.role, ["reseller", "agent"]),
      eq(users.isBlocked, false),
      eq(users.isDeleted, false),
    ))
    .limit(1);

  return reseller || null;
}

export function getRequestUserId(req: Request): string | null {
  const sessionUserId = (req as any).session?.userId;
  if (sessionUserId) return sessionUserId;

  const requestUserId = (req as any).userId;
  if (requestUserId) return requestUserId;

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const decoded: any = verifyToken(authHeader.split(" ")[1]);
    return decoded.userId || decoded.id || null;
  } catch {
    return null;
  }
}

export async function getRequestPricingRole(req: Request) {
  const actualUserId = getRequestUserId(req);
  const storefrontReseller = await getRequestStorefrontReseller(req);

  if (storefrontReseller) {
    return {
      userId: storefrontReseller.id,
      actualUserId,
      isReseller: true,
      priceType: "reseller",
      source: "storefront",
      resellerId: storefrontReseller.id,
      storefrontHost: getRequestHost(req),
      storefrontSubdomain: storefrontReseller.resellerSubdomain,
      storefrontStoreName: storefrontReseller.resellerStoreName,
      storefrontLogoUrl: storefrontReseller.resellerLogoUrl,
    };
  }

  const isReseller = await isUserReseller(actualUserId);

  return {
    userId: actualUserId,
    actualUserId,
    isReseller,
    priceType: isReseller ? "reseller" : "retail",
    source: isReseller ? "auth" : "retail",
    resellerId: isReseller ? actualUserId : null,
    storefrontHost: null,
    storefrontSubdomain: null,
    storefrontStoreName: null,
    storefrontLogoUrl: null,
  };
}
