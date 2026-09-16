"use strict";

import crypto from "crypto";
import { airaloAPI } from "./airalo-sdk";
import type { ProviderUsageData } from "../../providers/provider-interface";

export function generatePackageSlug(
  location: string,
  data: string,
  validity: number,
  operator: string
): string {
  const slugParts = [
    location.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    data.toLowerCase().replace(/[^a-z0-9]+/g, ''),
    `${validity}days`,
    operator.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  ];
  return slugParts.join('-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export async function getAiraloUsageData(iccid: string): Promise<ProviderUsageData> {
  try {
    const response = await airaloAPI.getUsage(iccid);

    if (response.data) {
      const usage = response.data;
      const totalBytes = parseFloat(usage.total || '0');
      const usedBytes = Number(usage.total) - Number(usage.remaining);
      const percentageUsed = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;

      return {
        iccid,
        dataUsed: usedBytes,
        dataTotal: totalBytes,
        dataRemaining: totalBytes - usedBytes,
        percentageUsed: Math.round(percentageUsed * 100) / 100,
        expiresAt: usage.expired_at ? new Date(usage.expired_at) : undefined,
        status: usage.status?.toLowerCase() === 'active' ? 'active' : 'inactive',
        isUnlimited: usage.is_unlimited,
        voiceRemaining: usage.remaining_voice,
        voiceTotal: usage.total_voice,
        textRemaining: usage.remaining_text,
        textTotal: usage.total_text,
        voiceUsed: usage.total_voice - usage.remaining_voice,
        textUsed: usage.total_text - usage.remaining_text,
        voicePercentageUsed: usage.total_voice > 0 ? (usage.total_voice - usage.remaining_voice) / usage.total_voice : 0,
        textPercentageUsed: usage.total_text > 0 ? (usage.total_text - usage.remaining_text) / usage.total_text : 0,
      };
    }

    throw new Error('Usage data not available');
  } catch (error) {
    throw new Error(`Failed to get usage data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function validateAiraloWebhook(
  payload: string | object,
  signature: string | undefined,
  webhookSecret: string
): { isValid: boolean; reason?: string } {
  try {
    if (!signature) {
      return { isValid: false, reason: 'No signature provided' };
    }

    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
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

export function parseAiraloWebhookPayload(payload: object): {
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

  if (data.event === 'low_data' || data.alert_type === 'LOW_DATA' || data.threshold) {
    type = 'low_data';
  } else if (data.event === 'order_completed' || data.order_id || data.request_id) {
    type = 'order_status';
  }

  return {
    type,
    providerOrderId: data.order_id ? String(data.order_id) : undefined,
    requestId: data.request_id ? String(data.request_id) : undefined,
    iccid: data.iccid,
    status: data.status,
    data: {
      ...payload as Record<string, unknown>,
      qrCode: data.qr_code || data.qrcode,
      smdpAddress: data.smdp_address,
      activationCode: data.activation_code,
      threshold: data.threshold,
      dataRemaining: data.remaining_data ? String(data.remaining_data) : undefined,
      expiryDate: data.expiry_date,
    },
    timestamp: data.timestamp || new Date().toISOString(),
  };
}

export async function checkAiraloHealth(): Promise<{
  healthy: boolean;
  responseTime?: number;
  errorMessage?: string;
}> {
  const startTime = Date.now();

  try {
    await airaloAPI.getPackages({ limit: 1 });
    const responseTime = Date.now() - startTime;

    return {
      healthy: true,
      responseTime,
    };
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
