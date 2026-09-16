"use strict";

import crypto from "crypto";

const MAYA_BASE_URL = "https://api.maya.net/connectivity/v1";
const MIN_REQUEST_INTERVAL = 500;

let lastRequestTime = 0;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }
  
  lastRequestTime = Date.now();
}

function getBasicAuthHeader(apiKey: string, apiSecret: string): string {
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  return `Basic ${credentials}`;
}

export async function makeMayaRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body: object | undefined,
  apiKey: string,
  apiSecret: string
): Promise<T> {
  await enforceRateLimit();
  
  const url = `${MAYA_BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": getBasicAuthHeader(apiKey, apiSecret),
    },
    body: body ? JSON.stringify(body) : undefined,
  };
  
  console.log(`[Maya API] ${method} ${endpoint}`);
  
  const response = await fetch(url, options);
  const responseText = await response.text();
  
  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Maya API returned invalid JSON: ${responseText.substring(0, 200)}`);
  }
  
  if (!response.ok) {
    const errorMessage = data?.message || data?.developer_message || `HTTP ${response.status}`;
    console.error(`[Maya API] Error: ${errorMessage}`, data);
    throw new Error(`Maya API error: ${errorMessage}`);
  }
  
  if (data.result !== undefined && data.result !== 1 && data.result !== 0) {
    console.warn(`[Maya API] Non-standard result code: ${data.result}`);
  }
  
  return data;
}

export async function getMayaProducts(
  apiKey: string,
  apiSecret: string,
  filters?: { country?: string; region?: string }
): Promise<any> {
  let endpoint = "/account/products";
  const params = new URLSearchParams();
  
  if (filters?.country) {
    params.append("country", filters.country);
  }
  if (filters?.region) {
    params.append("region", filters.region);
  }
  
  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }
  
  return makeMayaRequest(endpoint, "GET", undefined, apiKey, apiSecret);
}

export async function getMayaProduct(
  productUid: string,
  apiKey: string,
  apiSecret: string
): Promise<any> {
  return makeMayaRequest(`/account/products/${productUid}`, "GET", undefined, apiKey, apiSecret);
}

export async function getMayaRegions(
  apiKey: string,
  apiSecret: string
): Promise<any> {
  return makeMayaRequest("/regions", "GET", undefined, apiKey, apiSecret);
}

export async function getMayaNetworks(
  apiKey: string,
  apiSecret: string,
  countryCode?: string
): Promise<any> {
  let endpoint = "/network";
  if (countryCode) {
    endpoint += `?country=${countryCode}`;
  }
  return makeMayaRequest(endpoint, "GET", undefined, apiKey, apiSecret);
}

export async function createMayaEsim(
  productUid: string,
  apiKey: string,
  apiSecret: string,
  reference?: string
): Promise<any> {
  return makeMayaRequest("/esim", "POST", {
    plan_type_id: productUid,
    reference,
  }, apiKey, apiSecret);
}

export async function getMayaEsim(
  esimId: string,
  apiKey: string,
  apiSecret: string
): Promise<any> {
  return makeMayaRequest(`/esim/${esimId}`, "GET", undefined, apiKey, apiSecret);
}

export async function changeMayaEsim(
  esimId: string,
  action: "add_package" | "suspend" | "reactivate",
  apiKey: string,
  apiSecret: string,
  productUid?: string
): Promise<any> {
  const body: Record<string, any> = { action };
  if (productUid) {
    body.product_uid = productUid;
  }
  
  return makeMayaRequest(`/esim/${esimId}`, "PATCH", body, apiKey, apiSecret);
}

export async function deleteMayaEsim(
  esimId: string,
  apiKey: string,
  apiSecret: string
): Promise<any> {
  return makeMayaRequest(`/esim/${esimId}`, "DELETE", undefined, apiKey, apiSecret);
}

export async function getMayaEsimPlans(
  esimId: string,
  apiKey: string,
  apiSecret: string
): Promise<any> {
  return makeMayaRequest(`/esim/${esimId}/plans`, "GET", undefined, apiKey, apiSecret);
}

export function validateMayaWebhook(
  payload: string | object,
  signature: string | undefined,
  webhookSecret: string
): { isValid: boolean; reason?: string } {
  try {
    if (!signature) {
      return { isValid: false, reason: "No signature provided" };
    }
    
    const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payloadStr)
      .digest("hex")
      .toLowerCase();
    
    const providedSignature = signature.toLowerCase().replace("sha256=", "");
    
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(providedSignature)
    );
    
    return {
      isValid,
      reason: isValid ? undefined : "Signature mismatch",
    };
  } catch (error) {
    return {
      isValid: false,
      reason: error instanceof Error ? error.message : "Validation error",
    };
  }
}

export function parseMayaWebhookPayload(payload: object): {
  type: "order_status" | "low_data" | "expiring" | "esim_status" | "other";
  providerOrderId?: string;
  esimId?: string;
  iccid?: string;
  status?: string;
  data: Record<string, unknown>;
  timestamp: string;
} {
  const data = payload as any;
  
  let type: "order_status" | "low_data" | "expiring" | "esim_status" | "other" = "other";
  
  const event = data.event?.toLowerCase() || "";
  
  if (event.includes("data_low") || event.includes("data_depleted")) {
    type = "low_data";
  } else if (event.includes("expir")) {
    type = "expiring";
  } else if (event.includes("order") || event.includes("created") || event.includes("completed")) {
    type = "order_status";
  } else if (event.includes("esim") || event.includes("activated") || event.includes("suspended")) {
    type = "esim_status";
  }
  
  let threshold: string | undefined;
  if (type === "low_data" && data.data_remaining_mb !== undefined && data.data_quota_mb) {
    const percentageRemaining = (data.data_remaining_mb / data.data_quota_mb) * 100;
    if (percentageRemaining <= 10) threshold = "90_percent";
    else if (percentageRemaining <= 25) threshold = "75_percent";
    else if (percentageRemaining <= 50) threshold = "50_percent";
  }
  
  return {
    type,
    providerOrderId: data.order_id || data.request_id,
    esimId: data.esim_id,
    iccid: data.iccid,
    status: data.status,
    data: {
      ...(payload as Record<string, unknown>),
      threshold,
      dataRemaining: data.data_remaining_mb?.toString(),
      expiryDate: data.end_date,
    },
    timestamp: data.timestamp || new Date().toISOString(),
  };
}
