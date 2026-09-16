"use strict";

import crypto from "crypto";

const BASE_URL = "https://api.esim-go.com/v2.5";
const MIN_REQUEST_INTERVAL = 1000;

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

export async function makeEsimGoRequest<T>(
  endpoint: string,
  method: "GET" | "POST",
  body: object | undefined,
  apiKey: string
): Promise<T> {
  await enforceRateLimit();

  const url = `${BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  // console.log("eSIM Go API request:", {
  //   url,
  //   options
  // });

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`eSIM Go API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.error || data.errors) {
    throw new Error(`eSIM Go API error: ${JSON.stringify(data.error || data.errors)}`);
  }

  return data;
}

export function validateEsimGoWebhook(
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

export function parseEsimGoWebhookPayload(payload: object): {
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

  if (data.event === 'esim.data_low' || data.event === 'esim.data_depleted') {
    type = 'low_data';
  } else if (data.event === 'order.completed' || data.event === 'order.failed' || data.order) {
    type = 'order_status';
  }

  let threshold: string | undefined;
  if (data.event === 'esim.data_low' && data.esim?.dataRemaining) {
    const percentageRemaining = (data.esim.dataRemaining / data.esim.dataTotal) * 100;
    if (percentageRemaining <= 10) threshold = '90_percent';
    else if (percentageRemaining <= 25) threshold = '75_percent';
  }

  return {
    type,
    providerOrderId: data.order?.id,
    requestId: data.order?.reference || data.reference,
    iccid: data.esim?.iccid,
    status: data.order?.status,
    data: {
      ...payload as Record<string, unknown>,
      qrCode: data.esim?.qrCode || data.esim?.lpa,
      smdpAddress: data.esim?.smdpAddress,
      activationCode: data.esim?.activationCode || data.esim?.matchingId,
      threshold,
      dataRemaining: data.esim?.dataRemaining?.toString(),
      expiryDate: data.esim?.expiryDate,
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
