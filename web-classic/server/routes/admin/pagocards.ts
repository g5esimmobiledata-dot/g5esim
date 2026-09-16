import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAdmin } from "server/lib/middleware";
import * as ApiResponse from "server/utils/response";
import {
  callPagoCardsIssuingApi,
  getDefaultPagoCardsConfig,
  getPagoCardsConfig,
  listPagoCardsProviderEmails,
  listPagoCardsRegistry,
  maskPagoCardsConfig,
  normalizePagoCardsListResponse,
  recordPagoCardsIssuedCard,
  savePagoCardsProviderEmails,
  savePagoCardsConfig,
  upsertPagoCardsRegistry,
  type PagoCardsEndpointKey,
} from "server/services/pagocards-service";

const router = Router();

router.use(requireAdmin);

const configSchema = z.object({
  enabled: z.coerce.boolean().optional(),
  mode: z.enum(["test", "live"]).optional(),
  apiBaseUrl: z.string().trim().min(1).optional(),
  publicKey: z.string().optional(),
  secretKey: z.string().optional(),
  endpoints: z.record(z.string()).optional(),
});

const callSchema = z.object({
  endpoint: z.string().min(1),
  payload: z.record(z.any()).default({}),
});

const providerEmailsSchema = z.object({
  emails: z.array(z.string()).default([]),
});

const syncProviderCardsSchema = z.object({
  emails: z.array(z.string()).optional(),
});

const requiredFields: Record<string, string[]> = {
  "mastercard.create": ["firstname", "lastname", "email"],
  "mastercard.createAddon": ["firstname", "lastname", "email", "cardid"],
  "mastercard.listByUser": ["email"],
  "mastercard.fund": ["cardid", "email", "amount"],
  "mastercard.details": ["cardid", "email"],
  "mastercard.check3ds": ["cardid", "email"],
  "mastercard.approve3ds": ["cardid", "email", "eventId"],
  "mastercard.walletOtp": ["cardid", "email"],
  "mastercard.block": ["cardid", "email"],
  "mastercard.unblock": ["cardid", "email"],
  "mastercard.spendControl": ["cardid", "email", "amount"],
  "mastercard.deleteSpendControl": ["cardid", "email"],
  "visa.create": ["first_name", "last_name", "email"],
  "visa.fund": ["cardid", "email", "amount"],
  "visa.listByUser": ["email"],
  "visa.details": ["cardid", "email"],
  "visa.block": ["cardid", "email"],
  "visa.unblock": ["cardid", "email"],
  "giftcards.catalogBySku": ["sku"],
  "giftcards.availability": ["sku", "item_count", "price"],
  "giftcards.purchase": ["sku", "quantity", "amount"],
  "giftcards.order": ["referenceCode"],
};

const payloadFields: Record<string, string[]> = {
  "mastercard.create": ["firstname", "lastname", "email", "initialload"],
  "mastercard.createAddon": ["firstname", "lastname", "email", "cardid"],
  "mastercard.listByUser": ["email"],
  "mastercard.fund": ["cardid", "email", "amount"],
  "mastercard.details": ["cardid", "email"],
  "mastercard.check3ds": ["cardid", "email"],
  "mastercard.approve3ds": ["cardid", "email", "eventId"],
  "mastercard.walletOtp": ["cardid", "email"],
  "mastercard.block": ["cardid", "email"],
  "mastercard.unblock": ["cardid", "email"],
  "mastercard.spendControl": ["cardid", "email", "amount"],
  "mastercard.deleteSpendControl": ["cardid", "email"],
  "visa.create": ["first_name", "last_name", "email"],
  "visa.fund": ["cardid", "email", "amount"],
  "visa.listByUser": ["email"],
  "visa.details": ["cardid", "email"],
  "visa.block": ["cardid", "email"],
  "visa.unblock": ["cardid", "email"],
  "giftcards.catalog": [],
  "giftcards.catalogBySku": ["sku"],
  "giftcards.availability": ["sku", "item_count", "price"],
  "giftcards.exchangeRates": [],
  "giftcards.purchase": ["sku", "quantity", "amount"],
  "giftcards.categories": [],
  "giftcards.countries": [],
  "giftcards.order": ["referenceCode"],
  "giftcards.orderHistory": ["limit", "page"],
};

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function sanitizePayload(endpoint: string, payload: Record<string, any>) {
  const fields = payloadFields[endpoint];
  if (!fields) return payload;
  return Object.fromEntries(fields.filter((field) => hasValue(payload[field])).map((field) => [field, payload[field]]));
}

function sameCardId(left: unknown, right: unknown) {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

async function getCardDetailsFallback(endpoint: string, payload: Record<string, any>, error: any) {
  const message = String(error?.message || "");
  if (!/endpoint not found|failed with 404/i.test(message)) throw error;

  const listEndpoint = endpoint === "visa.details" ? "visa.listByUser" : "mastercard.listByUser";
  const listResponse = await callPagoCardsIssuingApi(listEndpoint as PagoCardsEndpointKey, { email: payload.email });
  const normalized = normalizePagoCardsListResponse(listEndpoint as PagoCardsEndpointKey, listResponse);
  const cards = Array.isArray((normalized as any)?.cards) ? (normalized as any).cards : [];
  const card = cards.find((row: any) => sameCardId(row.cardid || row.card_id || row.id, payload.cardid));

  if (!card) {
    return {
      data: null,
      cards,
      providerDetailsUnavailable: true,
      message:
        "PagoCards Details endpoint returned 404, and this card was not returned by the customer's List Cards API response.",
      originalError: message,
    };
  }

  return {
    data: {
      ...card,
      providerDetailsUnavailable: true,
      note: "PagoCards Details endpoint returned 404, so this is the matching card record from List Cards.",
    },
    providerDetailsUnavailable: true,
    originalError: message,
  };
}

const allowedEndpoints = new Set<PagoCardsEndpointKey>([
  "mastercard.create",
  "mastercard.createAddon",
  "mastercard.listByUser",
  "mastercard.fund",
  "mastercard.details",
  "mastercard.check3ds",
  "mastercard.approve3ds",
  "mastercard.walletOtp",
  "mastercard.block",
  "mastercard.unblock",
  "mastercard.spendControl",
  "mastercard.deleteSpendControl",
  "visa.create",
  "visa.fund",
  "visa.listByUser",
  "visa.details",
  "visa.block",
  "visa.unblock",
  "giftcards.catalog",
  "giftcards.catalogBySku",
  "giftcards.availability",
  "giftcards.exchangeRates",
  "giftcards.purchase",
  "giftcards.categories",
  "giftcards.countries",
  "giftcards.order",
  "giftcards.orderHistory",
]);

router.get("/settings", async (_req: Request, res: Response) => {
  try {
    const config = await getPagoCardsConfig();
    return ApiResponse.success(res, "PagoCards settings loaded successfully", {
      config: maskPagoCardsConfig(config),
      defaults: getDefaultPagoCardsConfig(),
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load PagoCards settings");
  }
});

router.put("/settings", async (req: Request, res: Response) => {
  try {
    const data = configSchema.parse(req.body);
    const config = await savePagoCardsConfig(data, req.session.adminId || null);
    return ApiResponse.success(res, "PagoCards settings saved successfully", maskPagoCardsConfig(config));
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to save PagoCards settings");
  }
});

router.get("/status", async (_req: Request, res: Response) => {
  try {
    const config = await getPagoCardsConfig();
    return ApiResponse.success(res, "PagoCards status loaded successfully", {
      enabled: config.enabled,
      connected: Boolean(config.enabled && config.publicKey && config.secretKey),
      hasPublicKey: Boolean(config.publicKey),
      hasSecretKey: Boolean(config.secretKey),
      mode: config.mode,
      apiBaseUrl: config.apiBaseUrl,
    });
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "PagoCards provider is not ready");
  }
});

router.get("/provider-emails", async (_req: Request, res: Response) => {
  try {
    const emails = await listPagoCardsProviderEmails();
    return ApiResponse.success(res, "PagoCards provider emails loaded successfully", { emails });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load PagoCards provider emails");
  }
});

router.put("/provider-emails", async (req: Request, res: Response) => {
  try {
    const data = providerEmailsSchema.parse(req.body);
    const emails = await savePagoCardsProviderEmails(data.emails);
    return ApiResponse.success(res, "PagoCards provider emails saved successfully", { emails });
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to save PagoCards provider emails");
  }
});

router.get("/cards", async (_req: Request, res: Response) => {
  try {
    const cards = await listPagoCardsRegistry();
    return ApiResponse.success(res, "PagoCards card registry loaded successfully", { cards });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load PagoCards card registry");
  }
});

router.post("/sync-mastercard-cards", async (req: Request, res: Response) => {
  try {
    const parsed = syncProviderCardsSchema.parse(req.body);
    const emails = parsed.emails?.length ? await savePagoCardsProviderEmails(parsed.emails) : await listPagoCardsProviderEmails();
    if (!emails.length) {
      return ApiResponse.badRequest(res, "Please save or paste at least one PagoCards customer email first");
    }

    const results = await Promise.all(
      emails.map(async (email) => {
        try {
          const raw = await callPagoCardsIssuingApi("mastercard.listByUser", { email });
          const normalized = normalizePagoCardsListResponse("mastercard.listByUser", raw);
          const cards = Array.isArray((normalized as any)?.cards) ? (normalized as any).cards : [];
          return { email, cards, error: "" };
        } catch (error: any) {
          return { email, cards: [], error: error.message || "Sync failed" };
        }
      }),
    );

    const cards = results.flatMap((row) => row.cards.map((card: any) => ({ ...card, email: card.email || card.useremail || row.email })));
    await upsertPagoCardsRegistry(cards);
    return ApiResponse.success(res, "PagoCards Mastercard provider cards synced successfully", {
      cards,
      checkedEmails: emails.length,
      errors: results.filter((row) => row.error).map(({ email, error }) => ({ email, error })),
    });
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to sync PagoCards Mastercard cards");
  }
});

router.post("/call", async (req: Request, res: Response) => {
  try {
    const parsed = callSchema.parse(req.body);
    const endpoint = parsed.endpoint;
    const payload = sanitizePayload(endpoint, parsed.payload);
    if (!allowedEndpoints.has(endpoint as PagoCardsEndpointKey)) {
      return ApiResponse.badRequest(res, "Unsupported PagoCards endpoint");
    }
    const missing = (requiredFields[endpoint] || []).filter((field) => !hasValue(payload[field]));
    if (missing.length > 0) {
      return ApiResponse.badRequest(res, `Missing required parameter${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
    }
    let rawData;
    try {
      rawData = await callPagoCardsIssuingApi(endpoint as PagoCardsEndpointKey, payload);
    } catch (error: any) {
      if (endpoint === "mastercard.details" || endpoint === "visa.details") {
        rawData = await getCardDetailsFallback(endpoint, payload, error);
      } else {
        throw error;
      }
    }
    await recordPagoCardsIssuedCard(endpoint as PagoCardsEndpointKey, payload, rawData);
    const data =
      endpoint === "mastercard.listByUser" || endpoint === "visa.listByUser"
        ? normalizePagoCardsListResponse(endpoint as PagoCardsEndpointKey, rawData)
        : rawData;
    return ApiResponse.success(res, "PagoCards API call completed successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "PagoCards API call failed");
  }
});

export default router;
