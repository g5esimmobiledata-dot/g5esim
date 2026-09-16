import { Router } from "express";
import multer from "multer";
import { eq } from "drizzle-orm";
import { db } from "server/db";
import * as ApiResponse from "server/utils/response";
import { requireAuth } from "server/middleware/auth";
import { storage } from "server/storage";
import { resellerCustomerLinks, users } from "@shared/schema";
import { getRequestStorefrontReseller } from "server/helpers/packagePricing";
import { openAIService } from "server/services/ai/openai-service";
import {
  activateConciergePlan,
  cancelConciergePlan,
  ensureConciergeSchema,
  getConciergeThread,
  getConciergeStatus,
  renewConciergePlan,
  sendConciergeMessage,
  startConciergeThread,
  startConciergeTrial,
} from "server/services/concierge-service";

const router = Router();
const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(async (_req, _res, next) => {
  try {
    await ensureConciergeSchema();
    next();
  } catch (error) {
    next(error);
  }
});

router.get("/status", requireAuth, async (req: any, res) => {
  try {
    const status = await getConciergeStatus(req.userId, { req });
    return ApiResponse.success(res, "Concierge status retrieved successfully", status);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load Concierge status");
  }
});

function normalizeSipUri(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^sips?:/i.test(trimmed) ? trimmed : `sip:${trimmed}`;
}

type CallCenterSipTarget = {
  enabled: boolean;
  label: string;
  uri: string;
  source: "admin" | "owner";
  ownerRole?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function firstText(config: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = config[key];
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function firstBoolean(config: Record<string, unknown>, keys: string[], fallback = false) {
  for (const key of keys) {
    const value = config[key];
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "boolean") return value;
    const text = String(value).trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(text)) return true;
    if (["false", "0", "no", "off"].includes(text)) return false;
  }
  return fallback;
}

function sipConfigFromStorefrontConfig(configValue: unknown, ownerRole?: string | null): CallCenterSipTarget {
  const config = asRecord(configValue);
  const nested = {
    ...asRecord(config.callCenterSip),
    ...asRecord(config.supportSip),
    ...asRecord(config.conciergeSip),
  };
  const merged = { ...config, ...nested };
  const label = firstText(merged, [
    "supportSipLabel",
    "callCenterSipLabel",
    "conciergeSipLabel",
    "sipLabel",
  ]) || "Call Center";
  const configuredUri = firstText(merged, [
    "supportSipUri",
    "callCenterSipUri",
    "conciergeSipUri",
    "sipUri",
  ]);
  const server = firstText(merged, [
    "supportSipServer",
    "callCenterSipServer",
    "conciergeSipServer",
    "sipServer",
  ]);
  const username = firstText(merged, [
    "supportSipUsername",
    "callCenterSipUsername",
    "conciergeSipUsername",
    "sipUsername",
  ]);
  const extension = firstText(merged, [
    "supportSipExtension",
    "callCenterSipExtension",
    "conciergeSipExtension",
    "sipExtension",
  ]);
  const sharedAccountTarget = username && server ? `${username}@${server}` : "";
  const generatedUri = extension && server ? `${extension}@${server}` : "";
  const uri = normalizeSipUri(configuredUri || sharedAccountTarget || generatedUri);
  const enabled = firstBoolean(merged, [
    "supportSipEnabled",
    "callCenterSipEnabled",
    "conciergeSipEnabled",
    "sipEnabled",
  ], false);

  return {
    enabled: Boolean(enabled && uri),
    label,
    uri,
    source: "owner",
    ownerRole,
  };
}

async function getGlobalSipTarget(): Promise<CallCenterSipTarget> {
  const [
    enabledSetting,
    labelSetting,
    uriSetting,
    serverSetting,
    extensionSetting,
    usernameSetting,
  ] = await Promise.all([
    storage.getSettingByKey("concierge_sip_enabled"),
    storage.getSettingByKey("concierge_sip_label"),
    storage.getSettingByKey("concierge_sip_uri"),
    storage.getSettingByKey("concierge_sip_server"),
    storage.getSettingByKey("concierge_sip_extension"),
    storage.getSettingByKey("concierge_sip_username"),
  ]);

  const enabled = enabledSetting?.value !== "false";
  const label = labelSetting?.value || "Call Center";
  const configuredUri = uriSetting?.value || "";
  const sharedAccountTarget =
    usernameSetting?.value && serverSetting?.value
      ? `${usernameSetting.value}@${serverSetting.value}`
      : "";
  const generatedUri =
    extensionSetting?.value && serverSetting?.value
      ? `${extensionSetting.value}@${serverSetting.value}`
      : "";
  const uri = normalizeSipUri(configuredUri || sharedAccountTarget || generatedUri);

  return {
    enabled: Boolean(enabled && uri),
    label,
    uri,
    source: "admin",
    ownerRole: "admin",
  };
}

async function getLinkedOwner(userId: string) {
  const [row] = await db
    .select({ owner: users })
    .from(resellerCustomerLinks)
    .innerJoin(users, eq(resellerCustomerLinks.resellerId, users.id))
    .where(eq(resellerCustomerLinks.customerId, userId))
    .limit(1);

  return row?.owner || null;
}

async function resolveCallCenterSipTarget(req: any): Promise<CallCenterSipTarget> {
  const user = await storage.getUser(req.userId);
  const isOwner = user?.role === "reseller" || user?.role === "agent";

  if (isOwner) {
    return sipConfigFromStorefrontConfig(user?.resellerStoreConfig, user?.role);
  }

  const linkedOwner = user?.id ? await getLinkedOwner(user.id) : null;
  if (linkedOwner?.role === "reseller" || linkedOwner?.role === "agent") {
    return sipConfigFromStorefrontConfig(linkedOwner.resellerStoreConfig, linkedOwner.role);
  }

  const storefrontOwner = await getRequestStorefrontReseller(req).catch(() => null);
  if (storefrontOwner) {
    return sipConfigFromStorefrontConfig(storefrontOwner.resellerStoreConfig, "reseller");
  }

  return getGlobalSipTarget();
}

const languageNames: Record<string, string> = {
  en: "English",
  ar: "Arabic",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  zh: "Chinese",
  ja: "Japanese",
  hi: "Hindi",
  pl: "Polish",
  sv: "Swedish",
};

async function getConciergeVoiceRuntimeSettings(languageCode?: string) {
  const [enabled, readMode, translationEnabled, translationLanguage, voiceTranslationEnabled] = await Promise.all([
    storage.getSettingByKey("concierge_voice_enabled"),
    storage.getSettingByKey("concierge_voice_read_mode"),
    storage.getSettingByKey("concierge_translation_enabled"),
    storage.getSettingByKey("concierge_translation_language"),
    storage.getSettingByKey("concierge_voice_translation_enabled"),
  ]);
  const configuredLanguage = String(translationLanguage?.value || "auto").trim() || "auto";
  const targetCode = configuredLanguage === "auto"
    ? String(languageCode || "en").trim().toLowerCase()
    : configuredLanguage.toLowerCase();

  return {
    enabled: enabled?.value !== "false",
    readMode: readMode?.value === "browser" ? "browser" : "openai",
    translationEnabled: translationEnabled?.value === "true",
    voiceTranslationEnabled: voiceTranslationEnabled?.value === "true",
    targetLanguageCode: targetCode || "en",
    targetLanguageName: languageNames[targetCode] || targetCode,
  };
}

async function translateConciergeText(text: string, targetLanguageName: string) {
  if (!text.trim() || targetLanguageName.toLowerCase() === "english") return text;

  const result = await openAIService.chatCompletion(text, {
    maxTokens: 1200,
    temperature: 0.1,
    systemPrompt: [
      `Translate the user's text into ${targetLanguageName}.`,
      "Keep names, prices, package codes, URLs, phone numbers, and technical terms accurate.",
      "Return only the translated text, with no explanation.",
    ].join("\n"),
  });

  return result.success && result.content?.trim() ? result.content.trim() : text;
}

router.get("/sip", requireAuth, async (req: any, res) => {
  try {
    const status = await getConciergeStatus(req.userId, { req });
    if (!status.enabled) {
      return ApiResponse.success(res, "Concierge SIP calling is disabled", {
        enabled: false,
        label: "Free SIP Call",
        uri: null,
      });
    }

    if (!status.hasAccess) {
      return ApiResponse.forbidden(res, "Activate VIP Concierge before using SIP calling");
    }

    const sipTarget = await resolveCallCenterSipTarget(req);

    return ApiResponse.success(res, "Concierge SIP settings retrieved successfully", {
      enabled: sipTarget.enabled,
      label: sipTarget.label,
      uri: sipTarget.enabled && sipTarget.uri ? sipTarget.uri : null,
      targetName: sipTarget.label || "Call Center",
      source: sipTarget.source,
      ownerRole: sipTarget.ownerRole || null,
      sharedCallCenterAccount: true,
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load Concierge SIP settings");
  }
});

router.post("/trial", requireAuth, async (req: any, res) => {
  try {
    await startConciergeTrial(req.userId, { req });
    const status = await getConciergeStatus(req.userId, { req });
    return ApiResponse.success(res, "Concierge free trial started", status);
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to start Concierge free trial",
    });
  }
});

router.post("/activate", requireAuth, async (req: any, res) => {
  try {
    const paymentMethod = req.body?.paymentMethod === "other" ? "other" : "wallet";
    const result = await activateConciergePlan(req.userId, paymentMethod, { req });
    const status = await getConciergeStatus(req.userId, { req });
    return ApiResponse.success(
      res,
      "message" in result ? result.message : "Concierge activated",
      status,
    );
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to activate Concierge",
    });
  }
});

router.post("/renew", requireAuth, async (req: any, res) => {
  try {
    const paymentMethod = req.body?.paymentMethod === "other" ? "other" : "wallet";
    await renewConciergePlan(req.userId, paymentMethod, { req });
    const status = await getConciergeStatus(req.userId, { req });
    return ApiResponse.success(res, "Concierge renewed successfully", status);
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to renew Concierge",
    });
  }
});

router.post("/cancel", requireAuth, async (req: any, res) => {
  try {
    await cancelConciergePlan(req.userId);
    const status = await getConciergeStatus(req.userId, { req });
    return ApiResponse.success(res, "Concierge subscription cancelled", status);
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to cancel Concierge",
    });
  }
});

router.get("/thread", requireAuth, async (req: any, res) => {
  try {
    const thread = await getConciergeThread(req.userId, { req });
    return ApiResponse.success(res, "Concierge thread retrieved successfully", thread);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load Concierge thread");
  }
});

router.post("/thread/start", requireAuth, async (req: any, res) => {
  try {
    const thread = await startConciergeThread(req.userId, { req });
    return ApiResponse.success(res, "Concierge thread started successfully", thread);
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to start Concierge thread",
    });
  }
});

router.post("/thread/message", requireAuth, async (req: any, res) => {
  try {
    const thread = await sendConciergeMessage(req.userId, req.body?.message, { req });
    return ApiResponse.success(res, "Concierge message sent successfully", thread);
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to send Concierge message",
    });
  }
});

router.post("/thread/voice", requireAuth, voiceUpload.single("audio"), async (req: any, res) => {
  try {
    const voiceSettings = await getConciergeVoiceRuntimeSettings(req.body?.languageCode);
    if (!voiceSettings.enabled) {
      return res.status(403).json({ success: false, message: "Concierge voice messages are disabled" });
    }

    const file = req.file as Express.Multer.File | undefined;
    if (!file?.buffer?.length) {
      return res.status(400).json({ success: false, message: "Voice audio is required" });
    }

    const transcription = await openAIService.transcribeAudio(
      file.buffer,
      file.originalname || "concierge-voice.webm",
    );

    if (!transcription.success || !transcription.text) {
      return res.status(400).json({
        success: false,
        message: transcription.error || "Could not understand the voice message",
      });
    }

    const thread = await sendConciergeMessage(req.userId, transcription.text, { req });
    return ApiResponse.success(res, "Concierge voice message sent successfully", {
      transcript: transcription.text,
      thread,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to send Concierge voice message",
    });
  }
});

router.post("/voice/speak", requireAuth, async (req: any, res) => {
  try {
    const voiceSettings = await getConciergeVoiceRuntimeSettings(req.body?.languageCode);
    if (!voiceSettings.enabled) {
      return res.status(403).json({ success: false, message: "Concierge voice replies are disabled" });
    }

    const text = String(req.body?.text || "").trim();
    if (!text) {
      return res.status(400).json({ success: false, message: "Text is required" });
    }

    const speechText =
      voiceSettings.translationEnabled && voiceSettings.voiceTranslationEnabled
        ? await translateConciergeText(text, voiceSettings.targetLanguageName)
        : text;

    const speech = await openAIService.textToSpeech(speechText);
    if (!speech.success || !speech.audio) {
      return res.status(400).json({ success: false, message: speech.error || "Unable to create voice reply" });
    }

    res.setHeader("Content-Type", speech.contentType);
    res.setHeader("Cache-Control", "no-store");
    return res.send(speech.audio);
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to create Concierge voice reply",
    });
  }
});

export default router;
