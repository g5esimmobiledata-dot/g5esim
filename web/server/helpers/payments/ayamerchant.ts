import axios from "axios";

const DEFAULT_API_BASE = "https://ayamerchant.com/api";

type AyaMerchantGateway = {
  secretKey?: string | null;
  config?: Record<string, any> | null;
};

type InitAyaMerchantPaymentArgs = {
  gateway: AyaMerchantGateway;
  amount: number;
  currency: string;
  txRef: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  description?: string;
  callbackUrl?: string;
  returnUrl?: string;
  metadata?: Record<string, any>;
};

type VerifyAyaMerchantPaymentArgs = {
  gateway: AyaMerchantGateway;
  txRef: string;
};

function getGatewayConfig(gateway: AyaMerchantGateway) {
  return (gateway.config || {}) as Record<string, any>;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getAyaMerchantApiBase(gateway: AyaMerchantGateway) {
  const config = getGatewayConfig(gateway);
  return trimTrailingSlash(String(config.apiBaseUrl || process.env.AYAMERCHANT_API_BASE || DEFAULT_API_BASE));
}

function getAyaMerchantApiKey(gateway: AyaMerchantGateway) {
  const config = getGatewayConfig(gateway);
  return String(gateway.secretKey || config.apiKey || process.env.AYAMERCHANT_API_KEY || "").trim();
}

function mapAyaMerchantError(error: any) {
  const details = error?.response?.data;
  if (details?.message) return details.message;
  if (details?.error) return typeof details.error === "string" ? details.error : JSON.stringify(details.error);
  if (typeof details === "string") return details;
  return error?.message || "AYAMERCHANT request failed";
}

function parseMetadata(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" ? (value as Record<string, any>) : {};
}

export function isAyaMerchantConfigured(gateway: AyaMerchantGateway) {
  return Boolean(getAyaMerchantApiKey(gateway));
}

export async function initAyaMerchantPayment({
  gateway,
  amount,
  currency,
  txRef,
  email,
  name,
  phone,
  description,
  callbackUrl,
  returnUrl,
  metadata,
}: InitAyaMerchantPaymentArgs) {
  const apiKey = getAyaMerchantApiKey(gateway);
  if (!apiKey) {
    throw new Error("AYAMERCHANT API key is not configured");
  }

  if (!email) {
    throw new Error("Customer email is required for AYAMERCHANT payment");
  }

  const customer: Record<string, unknown> = { email };
  if (name) customer.name = name;
  if (phone) customer.phone = phone;

  const payload: Record<string, unknown> = {
    amount: Number(amount.toFixed(2)),
    currency: currency.toUpperCase(),
    tx_ref: txRef,
    customer,
  };

  if (description) payload.description = description;
  if (callbackUrl) payload.callback_url = callbackUrl;
  if (returnUrl) payload.return_url = returnUrl;
  if (metadata) payload.metadata = metadata;

  try {
    const { data } = await axios.post(`${getAyaMerchantApiBase(gateway)}/payment`, payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    const checkoutUrl = String(data?.data?.checkout_url || "");
    if (String(data?.status || "").toLowerCase() !== "success" || !checkoutUrl) {
      throw new Error(data?.message || "AYAMERCHANT did not return a checkout URL");
    }

    return {
      provider: "ayamerchant" as const,
      txRef,
      orderId: txRef,
      checkoutUrl,
      redirectUrl: checkoutUrl,
      amount,
      currency: currency.toUpperCase(),
      raw: data,
    };
  } catch (error: any) {
    throw new Error(mapAyaMerchantError(error));
  }
}

export async function verifyAyaMerchantPayment({ gateway, txRef }: VerifyAyaMerchantPaymentArgs) {
  const apiKey = getAyaMerchantApiKey(gateway);
  if (!apiKey) {
    return { success: false, message: "AYAMERCHANT API key is not configured" };
  }

  if (!txRef) {
    return { success: false, message: "AYAMERCHANT transaction reference is missing" };
  }

  try {
    const { data } = await axios.get(`${getAyaMerchantApiBase(gateway)}/transaction/${encodeURIComponent(txRef)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 30000,
    });

    const transaction = data?.data || data;
    const providerStatus = String(transaction?.status || data?.status || "").toLowerCase();
    const successStatuses = new Set(["success", "successful", "paid", "completed"]);
    const metadata = {
      ...parseMetadata(transaction?.metadata),
      ayamerchant: {
        status: providerStatus,
        txRef: transaction?.tx_ref || txRef,
        transactionId: transaction?.id || transaction?.transaction_id || transaction?.reference || txRef,
        raw: transaction,
      },
    };

    if (String(data?.status || "").toLowerCase() !== "success" || !successStatuses.has(providerStatus)) {
      return {
        success: false,
        pending: !providerStatus || ["pending", "processing"].includes(providerStatus),
        status: providerStatus || "unknown",
        message: transaction?.message || `AYAMERCHANT payment is ${providerStatus || "not completed"}`,
        metadata,
      };
    }

    return {
      success: true,
      provider: "ayamerchant",
      referenceId: String(transaction?.tx_ref || txRef),
      transactionId: String(transaction?.id || transaction?.transaction_id || transaction?.reference || txRef),
      amount: Number(transaction?.amount || 0),
      currency: String(transaction?.currency || "USD").toUpperCase(),
      status: providerStatus,
      metadata,
    };
  } catch (error: any) {
    return {
      success: false,
      message: mapAyaMerchantError(error),
    };
  }
}
