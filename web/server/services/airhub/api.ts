"use strict";

const BASE_URL = "https://api.airhubapp.com";
const TOKEN_TTL_MS = 50 * 60 * 1000;

let cachedToken: string | null = null;
let cachedTokenAt = 0;
let cachedPartnerCode: number | null = null;

function extractToken(response: any): string | null {
  if (!response || typeof response !== "object") return null;
  for (const key of ["token", "accessToken", "access_token", "jwt", "bearerToken"]) {
    if (response[key]) return String(response[key]);
  }
  for (const key of ["data", "result", "response"]) {
    const nested = extractToken(response[key]);
    if (nested) return nested;
  }
  return null;
}

async function login(username: string, password: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/Authentication/UserLogin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName: username, password }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Airhub login failed: ${response.status} - ${text}`);
  }

  const data = text ? JSON.parse(text) : {};
  const token = extractToken(data) || (typeof data === "string" ? data : null);
  if (!token) throw new Error("Airhub login did not return a bearer token");

  const partnerCode = Number.parseInt(
    String(data?.partnerCode || data?.data?.partnerCode || data?.data?.partnercode || ""),
    10
  );
  if (Number.isFinite(partnerCode)) {
    cachedPartnerCode = partnerCode;
  }

  return token.replace(/^Bearer\s+/i, "");
}

export async function getAirhubToken(username: string, password: string): Promise<string> {
  const envToken = process.env.AIRHUB_API_TOKEN?.trim();
  if (envToken) return envToken.replace(/^Bearer\s+/i, "");

  if (cachedToken && Date.now() - cachedTokenAt < TOKEN_TTL_MS) {
    return cachedToken;
  }

  cachedToken = await login(username, password);
  cachedTokenAt = Date.now();
  return cachedToken;
}

export async function getAirhubPartnerCode(username: string, password: string): Promise<number> {
  if (cachedPartnerCode) return cachedPartnerCode;

  await getAirhubToken(username, password);
  if (cachedPartnerCode) return cachedPartnerCode;

  const envValue = Number.parseInt(String(process.env.AIRHUB_PARTNER_CODE || ""), 10);
  if (Number.isFinite(envValue)) return envValue;

  throw new Error("Airhub login did not return a partner code");
}

export async function makeAirhubRequest<T>(
  endpoint: string,
  method: "GET" | "POST",
  body: object | undefined,
  token: string
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Airhub API error: ${response.status} - ${text}`);
  }

  return text ? JSON.parse(text) : ({} as T);
}

export function parseAirhubWebhookPayload(payload: object) {
  const data = payload as any;
  return {
    type: "order_status" as const,
    providerOrderId: data.orderId || data.orderID || data.orderid,
    requestId: data.unique_order_id || data.uniqueOrderId,
    iccid: data.iccid || data.ICCID,
    status: data.status,
    data: payload as Record<string, unknown>,
    timestamp: data.timestamp || new Date().toISOString(),
  };
}
