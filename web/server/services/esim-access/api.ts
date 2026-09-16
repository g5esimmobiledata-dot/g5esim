"use strict";

import crypto from "crypto";
import type { Provider } from "@shared/schema";
import { EsimOrderStatusResponse } from ".";

const BASE_URL = "https://api.esimaccess.com";
const MIN_REQUEST_INTERVAL = 125;

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

function generateSignature(
  timestamp: string,
  requestId: string,
  accessCode: string,
  body: string,
  secretKey: string
): string {
  const signData = timestamp + requestId + accessCode + body;
  return crypto.createHmac('sha256', secretKey).update(signData).digest('hex').toLowerCase();
}

export async function makeEsimAccessRequest<T>(
  endpoint: string,
  method: "GET" | "POST",
  body: object | undefined,
  accessCode: string,
  secretKey: string
): Promise<T> {
  await enforceRateLimit();
  
  const timestamp = Date.now().toString();
  const requestId = crypto.randomUUID().replace(/-/g, '');
  const bodyStr = body ? JSON.stringify(body) : '';
  const signature = generateSignature(timestamp, requestId, accessCode, bodyStr, secretKey);
  
  const url = `${BASE_URL}${endpoint}`;
  // console.log(`eSIM Access API Request: ${method} ${url} - Body: ${bodyStr}` , {endpoint, method, body, accessCode, secretKey});
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'RT-AccessCode': accessCode,
      'RT-RequestID': requestId,
      'RT-Timestamp': timestamp,
      'RT-Signature': signature,
    },
    body: bodyStr || undefined,
  };
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`eSIM Access API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();

  // console.log(`eSIM Access API Response:`, data);
  
  if (!data.success) {
    throw new Error(`eSIM Access API error: ${data.errorCode} - ${data.errorMsg || 'Unknown error'}`);
  }
  
  return data;
}

export function validateEsimAccessWebhook(
  payload: string | object,
  signature: string | undefined,
  secretKey: string
): { isValid: boolean; reason?: string } {
  try {
    if (!signature) {
      return { isValid: false, reason: 'No signature provided' };
    }
    
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(payloadStr)
      .digest('hex')
      .toLowerCase();
    
    const isValid = signature.toLowerCase() === expectedSignature;
    
    return {
      isValid,
      reason: isValid ? undefined : 'Signature mismatch',
    };
  } catch (error) {
    return {
      isValid: false,
      reason: error instanceof Error ? error.message : 'Validation error',
    };
  }
}

export function parseEsimAccessWebhookPayload(payload: object): {
  type: 'order_status' | 'low_data' | 'expiring' | 'other';
  providerOrderId?: string;
  requestId?: string;
  iccid?: string;
  status?: string;
  data: Record<string, unknown>;
  timestamp: string;
} {
  const data = payload as any;
  
  let type: 'order_status' | 'low_data' | 'expiring' | 'other' = 'other';
  
  if (data.alert === 'LOW_DATA_25' || data.alert === 'LOW_DATA_10' || data.percentRemaining) {
    type = 'low_data';
  } else if (data.status || data.orderNo || data.reference) {
    type = 'order_status';
  }
  
  let threshold: string | undefined;
  if (data.alert === 'LOW_DATA_25') threshold = '75_percent';
  else if (data.alert === 'LOW_DATA_10') threshold = '90_percent';
  
  return {
    type,
    providerOrderId: data.orderNo,
    requestId: data.reference,
    iccid: data.iccid,
    status: data.status,
    data: {
      ...payload as Record<string, unknown>,
      qrCode: data.qrCode || data.lpa,
      smdpAddress: data.smdpAddress,
      activationCode: data.activationCode || data.matchingId,
      threshold,
      dataRemaining: data.dataRemaining?.toString(),
      expiryDate: data.expiryDate,
    },
    timestamp: data.timestamp || new Date().toISOString(),
  };
}

export function formatDataAmount(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  const mb = bytes / (1024 * 1024);
  
  if (gb >= 1) {
    return `${Math.round(gb * 10) / 10}GB`;
  } else {
    return `${Math.round(mb)}MB`;
  }
}


export async function getEsimOrderStatus(
  orderNo: string,
  accessCode: string,
  secretKey: string
): Promise<EsimOrderStatusResponse> {
  return makeEsimAccessRequest<EsimOrderStatusResponse>(
    "/v1/order/status",
    "POST",
    {
      orderNo,
    },
    accessCode,
    secretKey
  );
}
