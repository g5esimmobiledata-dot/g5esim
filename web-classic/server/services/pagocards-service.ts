import axios, { type AxiosRequestConfig } from "axios";
import { eq } from "drizzle-orm";
import { db } from "server/db";
import { platformSettings } from "@shared/schema";

export type PagoCardsEndpointKey =
  | "mastercard.create"
  | "mastercard.createAddon"
  | "mastercard.listByUser"
  | "mastercard.details"
  | "mastercard.check3ds"
  | "mastercard.approve3ds"
  | "mastercard.walletOtp"
  | "mastercard.block"
  | "mastercard.fund"
  | "mastercard.unblock"
  | "mastercard.spendControl"
  | "mastercard.deleteSpendControl"
  | "visa.create"
  | "visa.fund"
  | "visa.listByUser"
  | "visa.details"
  | "visa.block"
  | "visa.unblock"
  | "giftcards.catalog"
  | "giftcards.catalogBySku"
  | "giftcards.availability"
  | "giftcards.exchangeRates"
  | "giftcards.purchase"
  | "giftcards.categories"
  | "giftcards.countries"
  | "giftcards.order"
  | "giftcards.orderHistory";

export type PagoCardsConfig = {
  enabled: boolean;
  mode: "test" | "live";
  apiBaseUrl: string;
  publicKey: string;
  secretKey: string;
  endpoints: Record<PagoCardsEndpointKey, string>;
};

const SETTINGS_KEY = "pagocards_issuing_config";
const CARD_REGISTRY_KEY = "pagocards_card_registry";
const CARD_EMAILS_KEY = "pagocards_provider_customer_emails";

export const DEFAULT_PAGOCARDS_ENDPOINTS: Record<PagoCardsEndpointKey, string> = {
  "mastercard.create": "/api/mastercard/createcard",
  "mastercard.createAddon": "/api/mastercard/createaddon",
  "mastercard.listByUser": "/api/mastercard/getallcards",
  "mastercard.details": "/api/mastercard/getcarddetails",
  "mastercard.check3ds": "/api/mastercard/check3ds",
  "mastercard.approve3ds": "/api/mastercard/approve3ds",
  "mastercard.walletOtp": "/api/mastercard/checkwallet",
  "mastercard.block": "/api/mastercard/blockdigital",
  "mastercard.fund": "/api/mastercard/fundcard",
  "mastercard.unblock": "/api/mastercard/unblockdigital",
  "mastercard.spendControl": "/api/mastercard/spendcontrol",
  "mastercard.deleteSpendControl": "/api/mastercard/deletespendcontrol",
  "visa.create": "/api/visacard/createcard",
  "visa.fund": "/api/visacard/fundcard",
  "visa.listByUser": "/api/visacard/getallcards",
  "visa.details": "/api/visacard/getcard",
  "visa.block": "/api/visacard/blockcard",
  "visa.unblock": "/api/visacard/unblockcard",
  "giftcards.catalog": "/api/getgiftcards",
  "giftcards.catalogBySku": "/api/getgiftcard/:sku",
  "giftcards.availability": "/api/checkskuavailability/:sku",
  "giftcards.exchangeRates": "/api/getexchangerates",
  "giftcards.purchase": "/api/purchasegiftcard",
  "giftcards.categories": "/api/getgiftcardcategories",
  "giftcards.countries": "/api/getgiftcardcountries",
  "giftcards.order": "/api/getgiftcardorder/:referenceCode",
  "giftcards.orderHistory": "/api/getgiftcardorderhistory",
};

const GET_ENDPOINTS = new Set<PagoCardsEndpointKey>([
  "giftcards.catalog",
  "giftcards.catalogBySku",
  "giftcards.availability",
  "giftcards.exchangeRates",
  "giftcards.categories",
  "giftcards.countries",
  "giftcards.order",
  "giftcards.orderHistory",
]);

export function getDefaultPagoCardsConfig(): PagoCardsConfig {
  return {
    enabled: false,
    mode: "live",
    apiBaseUrl: "https://pagocards.com",
    publicKey: "",
    secretKey: "",
    endpoints: { ...DEFAULT_PAGOCARDS_ENDPOINTS },
  };
}

function safeParseConfig(value?: string | null) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

async function readJsonSetting<T>(key: string, fallback: T): Promise<T> {
  const [row] = await db.select().from(platformSettings).where(eq(platformSettings.key, key)).limit(1);
  return (safeParseConfig(row?.value) as T) || fallback;
}

async function writeJsonSetting(key: string, value: unknown, description: string) {
  await db
    .insert(platformSettings)
    .values({
      key,
      value: JSON.stringify(value),
      description,
      category: "debit_cards",
    })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: {
        value: JSON.stringify(value),
        description,
        category: "debit_cards",
        updatedAt: new Date(),
      },
    });
}

export function normalizePagoCardsConfig(input: any): PagoCardsConfig {
  const defaults = getDefaultPagoCardsConfig();
  const endpoints = { ...defaults.endpoints, ...(input?.endpoints || {}) };
  for (const [key, value] of Object.entries(endpoints)) {
    const path = String(value || "").trim();
    if (/^https?:\/\/pagocards\.com\/(?!api\/)/i.test(path)) {
      endpoints[key as PagoCardsEndpointKey] = path.replace(/^(https?:\/\/pagocards\.com\/)/i, "$1api/");
    } else {
      endpoints[key as PagoCardsEndpointKey] =
        path && !/^https?:\/\//i.test(path) && !/^\/?api\//i.test(path)
          ? `/api/${path.replace(/^\/+/, "")}`
          : path;
    }
  }
  return {
    ...defaults,
    ...input,
    enabled: Boolean(input?.enabled),
    mode: input?.mode === "test" ? "test" : "live",
    apiBaseUrl: String(input?.apiBaseUrl || defaults.apiBaseUrl).trim().replace(/\/+$/g, ""),
    publicKey: String(input?.publicKey || "").trim(),
    secretKey: String(input?.secretKey || "").trim(),
    endpoints,
  };
}

export async function getPagoCardsConfig() {
  const [row] = await db.select().from(platformSettings).where(eq(platformSettings.key, SETTINGS_KEY)).limit(1);
  return normalizePagoCardsConfig(safeParseConfig(row?.value));
}

export async function savePagoCardsConfig(config: Partial<PagoCardsConfig>, adminId?: string | null) {
  const current = await getPagoCardsConfig();
  const publicKey =
    config.publicKey === undefined ? current.publicKey : config.publicKey.includes("...") ? current.publicKey : config.publicKey;
  const secretKey =
    config.secretKey === undefined ? current.secretKey : config.secretKey.includes("...") ? current.secretKey : config.secretKey;
  const next = normalizePagoCardsConfig({
    ...current,
    ...config,
    publicKey,
    secretKey,
    endpoints: {
      ...current.endpoints,
      ...(config.endpoints || {}),
    },
  });

  await db
    .insert(platformSettings)
    .values({
      key: SETTINGS_KEY,
      value: JSON.stringify(next),
      description: "PagoCards issuing platform configuration",
      category: "debit_cards",
      updatedBy: adminId || null,
    })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: {
        value: JSON.stringify(next),
        description: "PagoCards issuing platform configuration",
        category: "debit_cards",
        updatedAt: new Date(),
        updatedBy: adminId || null,
      },
    });

  return next;
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function joinUrl(baseUrl: string, path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const cleanPath = trimSlashes(path || "");
  return cleanPath ? `${baseUrl.replace(/\/+$/g, "")}/${cleanPath}` : baseUrl;
}

function applyPathParams(path: string, payload: Record<string, any> = {}) {
  const used = new Set<string>();
  const nextPath = path.replace(/:([A-Za-z0-9_]+)/g, (_match, key) => {
    if (payload[key] === undefined || payload[key] === null || payload[key] === "") {
      throw new Error(`PagoCards endpoint requires ${key}`);
    }
    used.add(key);
    return encodeURIComponent(String(payload[key]));
  });
  const remaining = { ...payload };
  used.forEach((key) => delete remaining[key]);
  return { path: nextPath, payload: remaining };
}

export function maskPagoCardsConfig(config: PagoCardsConfig) {
  const preview = (value: string) => (value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "");
  return {
    ...config,
    publicKey: preview(config.publicKey),
    secretKey: preview(config.secretKey),
    hasPublicKey: Boolean(config.publicKey),
    hasSecretKey: Boolean(config.secretKey),
  };
}

export async function getPagoCardsConfigOrThrow() {
  const config = await getPagoCardsConfig();
  if (!config.enabled) throw new Error("PagoCards issuing platform is disabled");
  if (!config.publicKey || !config.secretKey) throw new Error("PagoCards public key and secret key are required");
  return config;
}

export async function pagocardsRequest<T = any>({
  endpoint,
  method,
  data,
}: {
  endpoint: PagoCardsEndpointKey;
  method?: "GET" | "POST";
  data?: Record<string, any>;
}) {
  const config = await getPagoCardsConfigOrThrow();
  const requestMethod = method || (GET_ENDPOINTS.has(endpoint) ? "GET" : "POST");
  const { path, payload } = applyPathParams(config.endpoints[endpoint] || DEFAULT_PAGOCARDS_ENDPOINTS[endpoint], data || {});
  const url = joinUrl(config.apiBaseUrl, path);

  const requestConfig: AxiosRequestConfig = {
    method: requestMethod,
    url,
    params: requestMethod === "GET" ? payload : undefined,
    data: requestMethod === "GET" ? undefined : payload,
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      publickey: config.publicKey,
      secretkey: config.secretKey,
    },
  };

  try {
    const response = await axios.request<T>(requestConfig);
    return response.data;
  } catch (error: any) {
    const status = error?.response?.status;
    const rawString = typeof error?.response?.data === "string" ? error.response.data : "";
    const html404 =
      status === 404 && /<!doctype html|<html|Page Not Found|404 \| PagoCards/i.test(rawString)
        ? "PagoCards endpoint not found. Check the saved endpoint path in Debit Cards settings."
        : "";
    const providerMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      html404 ||
      (rawString ? rawString.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220) : "") ||
      error?.message ||
      "PagoCards request failed";
    throw new Error(status ? `PagoCards request failed with ${status}: ${providerMessage}` : providerMessage);
  }
}

export async function callPagoCardsIssuingApi(endpoint: PagoCardsEndpointKey, payload: Record<string, any> = {}) {
  return pagocardsRequest({
    endpoint,
    method: GET_ENDPOINTS.has(endpoint) ? "GET" : "POST",
    data: payload,
  });
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function extractCardRows(response: any) {
  if (Array.isArray(response?.cards)) return response.cards;
  if (Array.isArray(response?.data?.cards)) return response.data.cards;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function normalizeIssuedCard(endpoint: PagoCardsEndpointKey, payload: Record<string, any>, response: any) {
  const data = response?.data || response || {};
  const brand = endpoint.startsWith("visa.") ? "visa" : "mastercard";
  const cardId = firstString(data.cardid, data.card_id, data.id, response?.cardid, response?.card_id);
  if (!cardId) return null;
  return {
    cardid: cardId,
    brand,
    email: firstString(data.useremail, data.email, payload.email),
    name: firstString(data.nameoncard, data.name, `${payload.firstname || payload.first_name || ""} ${payload.lastname || payload.last_name || ""}`.trim()),
    status: firstString(data.status, data.physicalstatus, "active"),
    type: firstString(data.type, "virtual"),
    lastfour: firstString(data.lastfour, data.last_four_digit, data.last4),
    expiryMonth: data.expirymonth || data.expiry_month || "",
    expiryYear: data.expiryyear || data.expiry_year || "",
    balance: data.balance ?? data.balance_amount ?? "",
    createdAt: new Date().toISOString(),
    source: "admin-api",
  };
}

export async function listPagoCardsRegistry() {
  const rows = await readJsonSetting<any[]>(CARD_REGISTRY_KEY, []);
  return Array.isArray(rows) ? rows : [];
}

export async function savePagoCardsRegistry(rows: any[]) {
  await writeJsonSetting(CARD_REGISTRY_KEY, rows, "PagoCards locally tracked card registry");
  return rows;
}

export async function listPagoCardsProviderEmails() {
  const rows = await readJsonSetting<string[]>(CARD_EMAILS_KEY, []);
  return Array.isArray(rows) ? rows.filter(Boolean) : [];
}

export async function savePagoCardsProviderEmails(emails: string[]) {
  const uniqueEmails = Array.from(
    new Set(
      emails
        .map((email) => String(email || "").trim().toLowerCase())
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
    ),
  );
  await writeJsonSetting(CARD_EMAILS_KEY, uniqueEmails, "PagoCards provider customer emails used for card sync");
  return uniqueEmails;
}

export async function upsertPagoCardsRegistry(cards: any[]) {
  const rows = await listPagoCardsRegistry();
  const normalizedCards = cards
    .map((card) => ({
      ...card,
      cardid: firstString(card.cardid, card.card_id, card.id),
      email: firstString(card.email, card.useremail),
      updatedAt: new Date().toISOString(),
    }))
    .filter((card) => card.cardid);
  const seen = new Set<string>();
  const next = [...normalizedCards, ...rows]
    .filter((card) => {
      const key = String(card.cardid || "").toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 2000);
  await savePagoCardsRegistry(next);
  return next;
}

export async function recordPagoCardsIssuedCard(endpoint: PagoCardsEndpointKey, payload: Record<string, any>, response: any) {
  if (!["mastercard.create", "mastercard.createAddon", "visa.create"].includes(endpoint)) return;
  const card = normalizeIssuedCard(endpoint, payload, response);
  if (!card) return;
  await upsertPagoCardsRegistry([card]);
}

export function normalizePagoCardsListResponse(endpoint: PagoCardsEndpointKey, response: any) {
  const rows = extractCardRows(response);
  if (!rows.length) return response;
  const brand = endpoint.startsWith("visa.") ? "visa" : "mastercard";
  return {
    cards: rows.map((row: any) => ({
      cardid: firstString(row.cardid, row.card_id, row.id),
      brand: firstString(row.brand, brand),
      email: firstString(row.useremail, row.email),
      name: firstString(row.nameoncard, row.name),
      status: firstString(row.status, row.physicalstatus),
      type: firstString(row.type),
      lastfour: firstString(row.lastfour, row.last_four_digit, row.last4),
      expiryMonth: row.expirymonth || row.expiry_month || "",
      expiryYear: row.expiryyear || row.expiry_year || "",
      balance: row.balance ?? row.balance_amount ?? "",
      source: "provider-api",
    })),
    raw: response,
  };
}
