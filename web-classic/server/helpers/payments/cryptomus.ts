import axios from "axios";
import crypto from "crypto";
import type { Request } from "express";
import QRCode from "qrcode";

const CRYPTOMUS_API_BASE = "https://api.cryptomus.com/v1";
const DEFAULT_CURRENCY = "USDT";
const DEFAULT_NETWORK = "tron";

type CryptomusGateway = {
  publicKey?: string | null;
  secretKey?: string | null;
  webhookSecret?: string | null;
  config?: Record<string, any> | null;
};

type InitCryptomusPaymentArgs = {
  gateway: CryptomusGateway;
  amount: number;
  currency: string;
  walletTransactionId: string;
  userId: string;
  req: Request;
  callbackUrl?: string;
};

function getGatewayConfig(gateway: CryptomusGateway) {
  return (gateway.config || {}) as Record<string, any>;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getCryptomusApiBase(gateway: CryptomusGateway) {
  const config = getGatewayConfig(gateway);
  return trimTrailingSlash(String(config.apiBaseUrl || process.env.CRYPTOMUS_API_BASE_URL || CRYPTOMUS_API_BASE));
}

function getCryptomusMerchant(gateway: CryptomusGateway) {
  const config = getGatewayConfig(gateway);
  return String(gateway.publicKey || config.merchantUuid || process.env.CRYPTOMUS_MERCHANT_UUID || "").trim();
}

function getCryptomusPaymentKey(gateway: CryptomusGateway) {
  const config = getGatewayConfig(gateway);
  return String(gateway.secretKey || config.paymentApiKey || process.env.CRYPTOMUS_PAYMENT_API_KEY || "").trim();
}

function getCryptomusWebhookKey(gateway: CryptomusGateway) {
  const config = getGatewayConfig(gateway);
  return String(
    gateway.webhookSecret ||
      config.webhookSecret ||
      gateway.secretKey ||
      process.env.CRYPTOMUS_WEBHOOK_SECRET ||
      process.env.CRYPTOMUS_PAYMENT_API_KEY ||
      "",
  ).trim();
}

export function getCryptomusCurrency(gateway: CryptomusGateway) {
  const config = getGatewayConfig(gateway);
  return String(config.toCurrency || DEFAULT_CURRENCY).trim().toUpperCase();
}

export function getCryptomusNetwork(gateway: CryptomusGateway) {
  const config = getGatewayConfig(gateway);
  return String(config.network || DEFAULT_NETWORK).trim().toLowerCase();
}

export function getCryptomusNetworkLabel(network: string, currency = "USDT") {
  const normalized = network.toLowerCase();
  const labels: Record<string, string> = {
    tron: "TRC20",
    eth: "ERC20",
    bsc: "BEP20",
    polygon: "Polygon",
    ton: "TON",
    arbitrum: "Arbitrum",
    optimism: "Optimism",
  };
  return `${currency.toUpperCase()} ${labels[normalized] || normalized.toUpperCase()}`;
}

function getRequestBaseUrl(req: Request) {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || req.protocol || "https";
  const host = req.get("host");
  return `${proto}://${host}`;
}

function getCryptomusCallbackUrl(req: Request, gateway: CryptomusGateway) {
  const config = getGatewayConfig(gateway);
  return String(
    config.callbackUrl ||
      process.env.CRYPTOMUS_CALLBACK_URL ||
      `${getRequestBaseUrl(req)}/api/wallet/crypto/cryptomus/webhook`,
  );
}

function mapCryptomusError(error: any) {
  const details = error?.response?.data;
  if (details?.message) return details.message;
  if (details?.error) return typeof details.error === "string" ? details.error : JSON.stringify(details.error);
  if (typeof details === "string") return details;
  return error?.message || "Cryptomus request failed";
}

export function createCryptomusSignature(payload: unknown, apiKey: string) {
  const json = JSON.stringify(payload || {});
  const base64 = Buffer.from(json).toString("base64");
  return crypto.createHash("md5").update(base64 + apiKey).digest("hex");
}

async function postCryptomus<T>(gateway: CryptomusGateway, path: string, payload: Record<string, unknown>) {
  const merchant = getCryptomusMerchant(gateway);
  const paymentKey = getCryptomusPaymentKey(gateway);

  if (!merchant) {
    throw new Error("Cryptomus merchant UUID is not configured");
  }

  if (!paymentKey) {
    throw new Error("Cryptomus payment API key is not configured");
  }

  const { data } = await axios.post<T>(`${getCryptomusApiBase(gateway)}${path}`, payload, {
    headers: {
      "Content-Type": "application/json",
      merchant,
      sign: createCryptomusSignature(payload, paymentKey),
    },
    timeout: 30000,
  });

  return data;
}

function getPaymentResult(response: any) {
  return response?.result || response?.data?.result || response?.data || response;
}

export async function initCryptomusPayment({
  gateway,
  amount,
  currency,
  walletTransactionId,
  userId,
  req,
  callbackUrl,
}: InitCryptomusPaymentArgs) {
  const config = getGatewayConfig(gateway);
  const toCurrency = getCryptomusCurrency(gateway);
  const network = getCryptomusNetwork(gateway);
  const resolvedCallbackUrl = callbackUrl || getCryptomusCallbackUrl(req, gateway);

  const payload: Record<string, unknown> = {
    amount: amount.toFixed(2),
    currency: currency.toUpperCase(),
    order_id: walletTransactionId,
    url_callback: resolvedCallbackUrl,
    to_currency: toCurrency,
    network,
  };

  if (config.lifetime) payload.lifetime = Number(config.lifetime);
  if (config.subtract) payload.subtract = Number(config.subtract);
  if (config.accuracyPaymentPercent) payload.accuracy_payment_percent = Number(config.accuracyPaymentPercent);
  if (config.fromReferralCode) payload.from_referral_code = String(config.fromReferralCode);

  try {
    const response = await postCryptomus<any>(gateway, "/payment", payload);
    const result = getPaymentResult(response);
    const paymentUrl = result.url || result.payment_url || null;
    const address = result.address || result.wallet_address || "";
    const qrPayload = address || paymentUrl || "";
    const qrCode = qrPayload ? await QRCode.toDataURL(qrPayload) : null;

    return {
      provider: "cryptomus" as const,
      paymentId: String(result.uuid || result.payment_uuid || result.id || walletTransactionId),
      paymentStatus: String(result.status || "check"),
      payAddress: String(address),
      payAmount: Number(result.payer_amount || result.to_amount || result.amount || amount),
      payCurrency: String(result.payer_currency || result.to_currency || toCurrency).toUpperCase(),
      network: getCryptomusNetworkLabel(String(result.network || network), toCurrency),
      priceAmount: Number(result.amount || amount),
      priceCurrency: String(result.currency || currency).toUpperCase(),
      orderId: String(result.order_id || walletTransactionId),
      paymentUrl,
      qrCode,
      userId,
      raw: result,
    };
  } catch (error: any) {
    throw new Error(mapCryptomusError(error));
  }
}

export function isCryptomusSuccessStatus(status: string) {
  return new Set(["paid", "paid_over"]).has(status.toLowerCase());
}

export function isCryptomusFailureStatus(status: string) {
  return new Set(["fail", "cancel", "system_fail", "locked"]).has(status.toLowerCase());
}

export async function verifyCryptomusPayment({
  gateway,
  paymentId,
  orderId,
}: {
  gateway: CryptomusGateway;
  paymentId?: string;
  orderId?: string;
}) {
  const payload = paymentId ? { uuid: paymentId } : { order_id: orderId };

  if (!paymentId && !orderId) {
    return { success: false, message: "Cryptomus payment reference is missing" };
  }

  try {
    const response = await postCryptomus<any>(gateway, "/payment/info", payload);
    const data = getPaymentResult(response);
    const status = String(data.status || "").toLowerCase();
    const metadata = {
      status,
      uuid: data.uuid,
      orderId: data.order_id,
      amount: data.amount,
      currency: data.currency,
      payerAmount: data.payer_amount,
      payerCurrency: data.payer_currency,
      address: data.address,
      network: data.network,
      txid: data.txid,
      raw: data,
    };

    if (!isCryptomusSuccessStatus(status)) {
      return {
        success: false,
        pending: !isCryptomusFailureStatus(status),
        finalFailure: isCryptomusFailureStatus(status),
        status,
        message: isCryptomusFailureStatus(status)
          ? `Cryptomus payment ${status}`
          : `Cryptomus payment is ${status || "waiting for payment"}`,
        metadata,
      };
    }

    return {
      success: true,
      provider: "cryptomus",
      referenceId: String(data.uuid || paymentId || orderId),
      paymentId: String(data.uuid || paymentId || orderId),
      amount: Number(data.amount || 0),
      currency: String(data.currency || "USD").toUpperCase(),
      metadata,
    };
  } catch (error: any) {
    return {
      success: false,
      message: mapCryptomusError(error),
    };
  }
}

export function verifyCryptomusWebhookSignature(body: any, gateway: CryptomusGateway) {
  const receivedSignature = String(body?.sign || "");
  if (!receivedSignature) return false;

  const webhookKey = getCryptomusWebhookKey(gateway);
  if (!webhookKey) return false;

  const { sign: _sign, ...payload } = body || {};
  const expected = createCryptomusSignature(payload, webhookKey);
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(receivedSignature, "hex");

  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
