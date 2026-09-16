import axios, { type AxiosRequestConfig } from "axios";
import { eq } from "drizzle-orm";
import { db } from "server/db";
import { platformSettings } from "@shared/schema";

export type SudoAfricaEndpointKey =
  | "customers.create"
  | "customers.list"
  | "cards.create"
  | "cards.list"
  | "cards.details"
  | "cards.update"
  | "cards.token"
  | "cards.transactions"
  | "cards.authorizations";

export type SudoAfricaConfig = {
  enabled: boolean;
  mode: "sandbox" | "live";
  apiBaseUrl: string;
  apiKey: string;
  endpoints: Record<SudoAfricaEndpointKey, string>;
};

const SETTINGS_KEY = "sudoafrica_cards_config";

export const DEFAULT_SUDOAFRICA_ENDPOINTS: Record<SudoAfricaEndpointKey, string> = {
  "customers.create": "/customers",
  "customers.list": "/customers",
  "cards.create": "/cards",
  "cards.list": "/cards",
  "cards.details": "/cards/:cardId",
  "cards.update": "/cards/:cardId",
  "cards.token": "/cards/:cardId/token",
  "cards.transactions": "/cards/:cardId/transactions",
  "cards.authorizations": "/cards/:cardId/authorizations",
};

const GET_ENDPOINTS = new Set<SudoAfricaEndpointKey>([
  "customers.list",
  "cards.list",
  "cards.details",
  "cards.token",
  "cards.transactions",
  "cards.authorizations",
]);

const PATCH_ENDPOINTS = new Set<SudoAfricaEndpointKey>(["cards.update"]);

function safeParseConfig(value?: string | null) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
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
      throw new Error(`Sudo Africa endpoint requires ${key}`);
    }
    used.add(key);
    return encodeURIComponent(String(payload[key]));
  });
  const remaining = { ...payload };
  used.forEach((key) => delete remaining[key]);
  return { path: nextPath, payload: remaining };
}

function preview(value: string) {
  return value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "";
}

export function getDefaultSudoAfricaConfig(): SudoAfricaConfig {
  return {
    enabled: false,
    mode: "sandbox",
    apiBaseUrl: "https://api.sandbox.sudo.africa",
    apiKey: "",
    endpoints: { ...DEFAULT_SUDOAFRICA_ENDPOINTS },
  };
}

export function normalizeSudoAfricaConfig(input: any): SudoAfricaConfig {
  const defaults = getDefaultSudoAfricaConfig();
  return {
    ...defaults,
    ...input,
    enabled: Boolean(input?.enabled),
    mode: input?.mode === "live" ? "live" : "sandbox",
    apiBaseUrl: String(input?.apiBaseUrl || defaults.apiBaseUrl).trim().replace(/\/+$/g, ""),
    apiKey: String(input?.apiKey || "").trim(),
    endpoints: { ...defaults.endpoints, ...(input?.endpoints || {}) },
  };
}

export function maskSudoAfricaConfig(config: SudoAfricaConfig) {
  return {
    ...config,
    apiKey: preview(config.apiKey),
    hasApiKey: Boolean(config.apiKey),
  };
}

export async function getSudoAfricaConfig() {
  const [row] = await db.select().from(platformSettings).where(eq(platformSettings.key, SETTINGS_KEY)).limit(1);
  return normalizeSudoAfricaConfig(safeParseConfig(row?.value));
}

export async function saveSudoAfricaConfig(config: Partial<SudoAfricaConfig>, adminId?: string | null) {
  const current = await getSudoAfricaConfig();
  const apiKey = config.apiKey === undefined ? current.apiKey : config.apiKey.includes("...") ? current.apiKey : config.apiKey;
  const next = normalizeSudoAfricaConfig({
    ...current,
    ...config,
    apiKey,
    endpoints: { ...current.endpoints, ...(config.endpoints || {}) },
  });

  await db
    .insert(platformSettings)
    .values({
      key: SETTINGS_KEY,
      value: JSON.stringify(next),
      description: "Sudo Africa cards issuing configuration",
      category: "debit_cards",
      updatedBy: adminId || null,
    })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: {
        value: JSON.stringify(next),
        description: "Sudo Africa cards issuing configuration",
        category: "debit_cards",
        updatedAt: new Date(),
        updatedBy: adminId || null,
      },
    });

  return next;
}

export async function getSudoAfricaConfigOrThrow() {
  const config = await getSudoAfricaConfig();
  if (!config.enabled) throw new Error("Sudo Africa cards provider is disabled");
  if (!config.apiKey) throw new Error("Sudo Africa API key is required");
  return config;
}

export async function sudoAfricaRequest<T = any>(endpoint: SudoAfricaEndpointKey, data: Record<string, any> = {}) {
  const config = await getSudoAfricaConfigOrThrow();
  const method: "GET" | "POST" | "PATCH" = GET_ENDPOINTS.has(endpoint) ? "GET" : PATCH_ENDPOINTS.has(endpoint) ? "PATCH" : "POST";
  const { path, payload } = applyPathParams(config.endpoints[endpoint] || DEFAULT_SUDOAFRICA_ENDPOINTS[endpoint], data);
  const requestConfig: AxiosRequestConfig = {
    method,
    url: joinUrl(config.apiBaseUrl, path),
    params: method === "GET" ? payload : undefined,
    data: method === "GET" ? undefined : payload,
    timeout: 30000,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
  };

  try {
    const response = await axios.request<T>(requestConfig);
    return response.data;
  } catch (error: any) {
    const status = error?.response?.status;
    const rawString = typeof error?.response?.data === "string" ? error.response.data : "";
    const providerMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      (rawString ? rawString.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220) : "") ||
      error?.message ||
      "Sudo Africa request failed";
    throw new Error(status ? `Sudo Africa request failed with ${status}: ${providerMessage}` : providerMessage);
  }
}
