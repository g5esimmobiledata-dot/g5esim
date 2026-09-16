import axios from "axios";
import crypto from "crypto";
import type { Request } from "express";
import QRCode from "qrcode";

const LIVE_API_BASE = "https://api.nowpayments.io/v1";
const SANDBOX_API_BASE = "https://api-sandbox.nowpayments.io/v1";
const DEFAULT_USDT_CURRENCY = "usdttrc20";

type NowPaymentsGateway = {
  secretKey?: string | null;
  webhookSecret?: string | null;
  displayName?: string | null;
  config?: Record<string, any> | null;
};

type InitNowPaymentsPaymentArgs = {
  gateway: NowPaymentsGateway;
  amount: number;
  currency: string;
  walletTransactionId: string;
  userId: string;
  req: Request;
  callbackUrl?: string;
  description?: string;
};

type VerifyNowPaymentsPaymentArgs = {
  gateway: NowPaymentsGateway;
  paymentId: string;
};

function getGatewayConfig(gateway: NowPaymentsGateway) {
  return (gateway.config || {}) as Record<string, any>;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getNowPaymentsApiBase(gateway: NowPaymentsGateway) {
  const config = getGatewayConfig(gateway);
  if (config.apiBaseUrl) {
    return trimTrailingSlash(String(config.apiBaseUrl));
  }

  const mode = String(config.mode || "live").toLowerCase();
  return mode === "sandbox" || mode === "test" ? SANDBOX_API_BASE : LIVE_API_BASE;
}

function getNowPaymentsApiKey(gateway: NowPaymentsGateway) {
  const config = getGatewayConfig(gateway);
  return String(gateway.secretKey || config.apiKey || process.env.NOWPAYMENTS_API_KEY || "").trim();
}

export function getNowPaymentsPayCurrency(gateway: NowPaymentsGateway) {
  const config = getGatewayConfig(gateway);
  return String(config.payCurrency || config.currency || DEFAULT_USDT_CURRENCY).trim().toLowerCase();
}

export function getNowPaymentsNetworkLabel(payCurrency: string) {
  const normalized = payCurrency.toLowerCase();
  const labels: Record<string, string> = {
    usdttrc20: "USDT TRC20",
    usdterc20: "USDT ERC20",
    usdtbsc: "USDT BEP20",
    usdtmatic: "USDT Polygon",
    usdtton: "USDT TON",
    usdtarb: "USDT Arbitrum",
    usdtop: "USDT Optimism",
  };
  return labels[normalized] || normalized.toUpperCase();
}

function getRequestBaseUrl(req: Request) {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || req.protocol || "https";
  const host = req.get("host");
  return `${proto}://${host}`;
}

function getNowPaymentsIpnCallbackUrl(req: Request, gateway: NowPaymentsGateway) {
  const config = getGatewayConfig(gateway);
  return String(
    config.ipnCallbackUrl ||
      process.env.NOWPAYMENTS_IPN_CALLBACK_URL ||
      `${getRequestBaseUrl(req)}/api/wallet/crypto/nowpayments/ipn`,
  );
}

function mapNowPaymentsError(error: any) {
  const details = error?.response?.data;
  if (details?.message) return details.message;
  if (details?.error) return details.error;
  if (typeof details === "string") return details;
  return error?.message || "NOWPayments request failed";
}

export async function initNowPaymentsPayment({
  gateway,
  amount,
  currency,
  walletTransactionId,
  userId,
  req,
  callbackUrl,
  description,
}: InitNowPaymentsPaymentArgs) {
  const apiKey = getNowPaymentsApiKey(gateway);
  if (!apiKey) {
    throw new Error("NOWPayments API key is not configured");
  }

  const config = getGatewayConfig(gateway);
  const payCurrency = getNowPaymentsPayCurrency(gateway);
  const payload: Record<string, unknown> = {
    price_amount: amount,
    price_currency: currency.toLowerCase(),
    pay_currency: payCurrency,
    order_id: walletTransactionId,
    order_description: description || `Wallet top-up ${walletTransactionId}`,
    ipn_callback_url: callbackUrl || getNowPaymentsIpnCallbackUrl(req, gateway),
  };

  if (typeof config.isFixedRate === "boolean") {
    payload.is_fixed_rate = config.isFixedRate;
  }

  if (typeof config.isFeePaidByUser === "boolean") {
    payload.is_fee_paid_by_user = config.isFeePaidByUser;
  }

  try {
    const { data } = await axios.post(`${getNowPaymentsApiBase(gateway)}/payment`, payload, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      timeout: 30000,
    });

    const paymentId = String(data.payment_id || "");
    const payAddress = String(data.pay_address || "");
    const qrCode = payAddress ? await QRCode.toDataURL(payAddress) : null;

    return {
      provider: "nowpayments" as const,
      paymentId,
      paymentStatus: String(data.payment_status || "waiting"),
      payAddress,
      payAmount: Number(data.pay_amount || 0),
      payCurrency: String(data.pay_currency || payCurrency).toLowerCase(),
      network: getNowPaymentsNetworkLabel(String(data.pay_currency || payCurrency)),
      priceAmount: Number(data.price_amount || amount),
      priceCurrency: String(data.price_currency || currency).toUpperCase(),
      orderId: String(data.order_id || walletTransactionId),
      purchaseId: data.purchase_id ? String(data.purchase_id) : null,
      paymentUrl: data.payment_url || data.invoice_url || null,
      qrCode,
      userId,
      raw: data,
    };
  } catch (error: any) {
    throw new Error(mapNowPaymentsError(error));
  }
}

function getCreditStatusSet(gateway: NowPaymentsGateway) {
  const config = getGatewayConfig(gateway);
  const creditOn = String(config.creditOn || "finished").toLowerCase();
  if (creditOn === "confirmed") {
    return new Set(["confirmed", "sending", "finished"]);
  }
  return new Set(["finished"]);
}

export function isNowPaymentsFailureStatus(status: string) {
  return new Set(["failed", "refunded", "expired"]).has(status.toLowerCase());
}

export async function verifyNowPaymentsPayment({ gateway, paymentId }: VerifyNowPaymentsPaymentArgs) {
  const apiKey = getNowPaymentsApiKey(gateway);
  if (!apiKey) {
    return { success: false, message: "NOWPayments API key is not configured" };
  }

  if (!paymentId) {
    return { success: false, message: "NOWPayments payment id is missing" };
  }

  try {
    const { data } = await axios.get(`${getNowPaymentsApiBase(gateway)}/payment/${paymentId}`, {
      headers: { "x-api-key": apiKey },
      timeout: 30000,
    });

    const status = String(data.payment_status || "").toLowerCase();
    const creditableStatuses = getCreditStatusSet(gateway);
    const metadata = {
      paymentStatus: status,
      payAddress: data.pay_address,
      payAmount: data.pay_amount,
      actuallyPaid: data.actually_paid,
      payCurrency: data.pay_currency,
      priceAmount: data.price_amount,
      priceCurrency: data.price_currency,
      orderId: data.order_id,
      purchaseId: data.purchase_id,
      outcomeAmount: data.outcome_amount,
      outcomeCurrency: data.outcome_currency,
      raw: data,
    };

    if (!creditableStatuses.has(status)) {
      return {
        success: false,
        pending: !isNowPaymentsFailureStatus(status),
        finalFailure: isNowPaymentsFailureStatus(status),
        status,
        message: isNowPaymentsFailureStatus(status)
          ? `USDT payment ${status}`
          : `USDT payment is ${status || "waiting for payment"}`,
        metadata,
      };
    }

    return {
      success: true,
      provider: "nowpayments",
      referenceId: String(data.payment_id || paymentId),
      paymentId: String(data.payment_id || paymentId),
      amount: Number(data.price_amount || 0),
      currency: String(data.price_currency || "USD").toUpperCase(),
      metadata,
    };
  } catch (error: any) {
    return {
      success: false,
      message: mapNowPaymentsError(error),
    };
  }
}

function sortForNowPaymentsSignature(value: any): any {
  if (Array.isArray(value)) {
    return value.map(sortForNowPaymentsSignature);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, any>>((acc, key) => {
        acc[key] = sortForNowPaymentsSignature(value[key]);
        return acc;
      }, {});
  }

  return value;
}

export function createNowPaymentsIpnSignature(body: unknown, ipnSecret: string) {
  return crypto
    .createHmac("sha512", ipnSecret.trim())
    .update(JSON.stringify(sortForNowPaymentsSignature(body)))
    .digest("hex");
}

export function verifyNowPaymentsIpnSignature(body: unknown, signature: string | undefined, ipnSecret: string | null | undefined) {
  if (!signature || !ipnSecret) return false;

  const expected = createNowPaymentsIpnSignature(body, ipnSecret);
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");

  return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
