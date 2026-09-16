import axios from "axios";
import { desc, eq, or, sql } from "drizzle-orm";
import { db } from "server/db";
import { storage } from "server/storage";
import { queueAdminAlert } from "server/services/admin-alert-service";
import { users, whatsappMessages } from "@shared/schema";

type WhatsAppCloudConfig = {
  enabled: boolean;
  mode: "link" | "cloud_api";
  phoneNumber: string;
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  apiVersion: string;
  pwaUrl: string;
};

let ensurePromise: Promise<void> | null = null;
const DEFAULT_PWA_URL = "https://g5esim.mobile";

function trim(value: unknown) {
  return String(value || "").trim();
}

export function normalizePhoneDigits(value?: string | null) {
  return trim(value).replace(/[^\d]/g, "");
}

async function getSettingValue(key: string) {
  return (await storage.getSettingByKey(key))?.value || "";
}

function firstTrimmed(...values: unknown[]) {
  for (const value of values) {
    const text = trim(value);
    if (text) return text;
  }

  return "";
}

function parseBoolean(value: unknown, fallback = true) {
  const normalized = trim(value).toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) return true;
  if (["0", "false", "no", "off", "disabled"].includes(normalized)) return false;
  return fallback;
}

function normalizeApiVersion(value: unknown) {
  const apiVersion = trim(value).replace(/^\/+/, "");
  if (!apiVersion) return "v23.0";
  return apiVersion.startsWith("v") ? apiVersion : `v${apiVersion}`;
}

function normalizeBaseUrl(value: unknown) {
  return (trim(value) || DEFAULT_PWA_URL).replace(/\/+$/, "");
}

export async function ensureWhatsAppCloudSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS whatsapp_messages (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id varchar REFERENCES users(id) ON DELETE SET NULL,
          direction text NOT NULL,
          from_number text NOT NULL,
          to_number text NOT NULL,
          text text NOT NULL,
          profile_name text,
          wa_message_id text,
          status text NOT NULL DEFAULT 'received',
          raw_payload jsonb DEFAULT '{}'::jsonb,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS whatsapp_messages_user_id_idx ON whatsapp_messages(user_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS whatsapp_messages_direction_idx ON whatsapp_messages(direction)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS whatsapp_messages_from_number_idx ON whatsapp_messages(from_number)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS whatsapp_messages_to_number_idx ON whatsapp_messages(to_number)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS whatsapp_messages_wa_message_id_idx ON whatsapp_messages(wa_message_id)`);
    })();
  }

  return ensurePromise;
}

export async function getWhatsAppCloudConfig(): Promise<WhatsAppCloudConfig> {
  const [
    enabled,
    mode,
    phoneNumber,
    phoneNumberId,
    accessToken,
    verifyToken,
    apiVersion,
    pwaUrl,
  ] =
    await Promise.all([
      getSettingValue("support_whatsapp_enabled"),
      getSettingValue("support_whatsapp_mode"),
      getSettingValue("support_whatsapp_number"),
      getSettingValue("support_whatsapp_phone_number_id"),
      getSettingValue("support_whatsapp_access_token"),
      getSettingValue("support_whatsapp_verify_token"),
      getSettingValue("support_whatsapp_api_version"),
      getSettingValue("support_whatsapp_pwa_url"),
    ]);

  const resolvedMode = firstTrimmed(mode, process.env.WHATSAPP_CLOUD_MODE);

  return {
    enabled: parseBoolean(firstTrimmed(enabled, process.env.WHATSAPP_CLOUD_ENABLED), true),
    mode: resolvedMode === "cloud_api" ? "cloud_api" : "link",
    phoneNumber: normalizePhoneDigits(firstTrimmed(phoneNumber, process.env.WHATSAPP_CLOUD_PHONE_NUMBER)),
    phoneNumberId: firstTrimmed(phoneNumberId, process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID),
    accessToken: firstTrimmed(accessToken, process.env.WHATSAPP_CLOUD_ACCESS_TOKEN),
    verifyToken: firstTrimmed(verifyToken, process.env.WHATSAPP_CLOUD_VERIFY_TOKEN),
    apiVersion: normalizeApiVersion(firstTrimmed(apiVersion, process.env.WHATSAPP_CLOUD_API_VERSION)),
    pwaUrl: normalizeBaseUrl(firstTrimmed(
      pwaUrl,
      process.env.WHATSAPP_PWA_URL,
      process.env.APP_URL,
      process.env.PUBLIC_URL,
      process.env.WEBSITE_URL,
    )),
  };
}

function hasCloudCredentials(config: WhatsAppCloudConfig) {
  return Boolean(config.phoneNumberId && config.accessToken);
}

export async function getWhatsAppCloudPublicConfig() {
  const config = await getWhatsAppCloudConfig();

  return {
    enabled: config.enabled,
    mode: config.mode,
    phoneNumber: config.phoneNumber,
    hasCloudApi: config.mode === "cloud_api" && hasCloudCredentials(config),
    webhookUrl: `${config.pwaUrl}/api/whatsapp/webhook/meta`,
    pwaUrl: config.pwaUrl,
  };
}

export async function getWhatsAppUserThread(userId: string) {
  await ensureWhatsAppCloudSchema();

  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const config = await getWhatsAppCloudConfig();
  const userPhone = normalizePhoneDigits(user.phone || "");

  const messages = userPhone
    ? await db
        .select()
        .from(whatsappMessages)
        .where(
          or(
            eq(whatsappMessages.userId, userId),
            eq(whatsappMessages.fromNumber, userPhone),
            eq(whatsappMessages.toNumber, userPhone),
          ),
        )
        .orderBy(desc(whatsappMessages.createdAt))
        .limit(100)
    : [];

  return {
    enabled: config.enabled,
    mode: config.mode,
    phoneNumber: config.phoneNumber,
    hasCloudApi: config.mode === "cloud_api" && hasCloudCredentials(config),
    userPhone,
    messages: messages.reverse(),
  };
}

export async function sendWhatsAppCloudText(to: string, text: string) {
  const config = await getWhatsAppCloudConfig();
  if (!config.enabled || config.mode !== "cloud_api") {
    throw new Error("WhatsApp Cloud API is not enabled");
  }
  if (!hasCloudCredentials(config)) {
    throw new Error("WhatsApp Cloud API credentials are missing");
  }

  const response = await axios.post(
    `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhoneDigits(to),
      type: "text",
      text: {
        preview_url: false,
        body: text,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
}

function getInboundMessageText(message: any) {
  return firstTrimmed(
    message?.text?.body,
    message?.interactive?.button_reply?.title,
    message?.interactive?.button_reply?.id,
    message?.interactive?.list_reply?.title,
    message?.interactive?.list_reply?.id,
    message?.button?.text,
    message?.image?.caption,
    message?.document?.caption,
  );
}

function getInboundActionKey(message: any) {
  return firstTrimmed(
    message?.interactive?.button_reply?.id,
    message?.interactive?.button_reply?.title,
    message?.interactive?.list_reply?.id,
    message?.interactive?.list_reply?.title,
    message?.button?.payload,
    message?.button?.text,
    message?.text?.body,
  ).toLowerCase();
}

function buildAppUrl(config: WhatsAppCloudConfig, path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${config.pwaUrl}${normalizedPath}`;
}

function buildWhatsAppMenuText(config: WhatsAppCloudConfig) {
  return [
    "Welcome to G5 eSIM.",
    "",
    "Reply with a number:",
    "1 - Buy eSIM package",
    "2 - My eSIMs",
    "3 - My eRoaming numbers",
    "4 - Wallet",
    "5 - Support",
    "",
    `Open the app: ${buildAppUrl(config, "/")}`,
  ].join("\n");
}

function buildWhatsAppAutoReply(config: WhatsAppCloudConfig, actionKey: string) {
  const text = actionKey.trim().toLowerCase();

  if (!text || /^(hi|hello|hey|start|menu|help)/i.test(text)) {
    return buildWhatsAppMenuText(config);
  }

  const actions: Array<{ matches: string[]; title: string; path: string; description: string }> = [
    {
      matches: ["1", "buy", "buy esim", "esim", "package", "packages"],
      title: "Buy eSIM package",
      path: "/destinations",
      description: "Choose your destination and package in the G5 eSIM app.",
    },
    {
      matches: ["2", "my esim", "my esims", "esims"],
      title: "My eSIMs",
      path: "/account/esims",
      description: "Open your installed and ordered eSIMs.",
    },
    {
      matches: ["3", "eroaming", "e roaming", "my eroaming", "did", "number"],
      title: "My eRoaming numbers",
      path: "/account/my-dids",
      description: "Manage calls, SMS, forwarding, and voice mail.",
    },
    {
      matches: ["4", "wallet", "balance", "topup", "top up"],
      title: "Wallet",
      path: "/account/wallet",
      description: "Check balance and add funds.",
    },
    {
      matches: ["5", "support", "agent", "ticket", "help"],
      title: "Support",
      path: "/account/support",
      description: "Open support and VIP Concierge options.",
    },
  ];

  const action = actions.find((item) => item.matches.some((match) => text === match || text.includes(match)));
  if (!action) {
    return [
      "Thanks, we received your message.",
      "A support agent can review it soon.",
      "",
      buildWhatsAppMenuText(config),
    ].join("\n");
  }

  return [
    action.title,
    action.description,
    buildAppUrl(config, action.path),
    "",
    "Reply menu any time to see all options.",
  ].join("\n");
}

async function storeOutboundWhatsAppMessage(input: {
  to: string;
  text: string;
  result: Record<string, any>;
  userId?: string | null;
}) {
  const config = await getWhatsAppCloudConfig();
  const waMessageId = trim(input.result?.messages?.[0]?.id);

  const [message] = await db
    .insert(whatsappMessages)
    .values({
      userId: input.userId || (await findUserIdByPhone(input.to)),
      direction: "outbound",
      fromNumber: config.phoneNumber,
      toNumber: normalizePhoneDigits(input.to),
      text: input.text,
      waMessageId: waMessageId || null,
      status: "sent",
      rawPayload: input.result,
    })
    .returning();

  return message;
}

async function findUserIdByPhone(phone: string) {
  const normalized = normalizePhoneDigits(phone);
  if (!normalized) return null;

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`regexp_replace(coalesce(${users.phone}, ''), '[^0-9]', '', 'g') = ${normalized}`)
    .limit(1);

  return user?.id || null;
}

export async function storeInboundWhatsAppWebhook(payload: Record<string, any>) {
  await ensureWhatsAppCloudSchema();
  const stored: Array<{
    userId: string | null;
    fromNumber: string;
    toNumber: string;
    text: string;
    profileName: string | null;
    waMessageId: string | null;
    actionKey: string;
  }> = [];

  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  if (!value) return stored;

  const contacts = Array.isArray(value.contacts) ? value.contacts : [];
  const messages = Array.isArray(value.messages) ? value.messages : [];
  const statuses = Array.isArray(value.statuses) ? value.statuses : [];
  const profileName = trim(contacts[0]?.profile?.name);
  const config = await getWhatsAppCloudConfig();

  for (const message of messages) {
    const from = normalizePhoneDigits(message?.from);
    const to = normalizePhoneDigits(value?.metadata?.display_phone_number || config.phoneNumber);
    const body = getInboundMessageText(message);
    if (!from || !body) continue;

    const waMessageId = trim(message?.id);
    if (waMessageId) {
      const [existing] = await db
        .select({ id: whatsappMessages.id })
        .from(whatsappMessages)
        .where(eq(whatsappMessages.waMessageId, waMessageId))
        .limit(1);
      if (existing) continue;
    }

    const userId = await findUserIdByPhone(from);

    await db.insert(whatsappMessages).values({
      userId,
      direction: "inbound",
      fromNumber: from,
      toNumber: to,
      text: body,
      profileName: profileName || null,
      waMessageId: waMessageId || null,
      status: "received",
      rawPayload: payload,
    });

    stored.push({
      userId,
      fromNumber: from,
      toNumber: to,
      text: body,
      profileName: profileName || null,
      waMessageId: waMessageId || null,
      actionKey: getInboundActionKey(message),
    });

    queueAdminAlert("system", {
      title: "WhatsApp message received",
      message: `${profileName || from}: ${body.slice(0, 160)}`,
      metadata: { channel: "whatsapp", from, to, userId },
      actionPath: "/admin/settings",
      sendEmail: false,
    });
  }

  for (const status of statuses) {
    const waMessageId = trim(status?.id);
    if (!waMessageId) continue;

    await db
      .update(whatsappMessages)
      .set({
        status: trim(status?.status) || "sent",
        rawPayload: payload,
        updatedAt: new Date(),
      })
      .where(eq(whatsappMessages.waMessageId, waMessageId));
  }

  return stored;
}

export async function handleInboundWhatsAppWebhook(payload: Record<string, any>) {
  const inboundMessages = await storeInboundWhatsAppWebhook(payload);
  const config = await getWhatsAppCloudConfig();

  if (!config.enabled || config.mode !== "cloud_api" || !hasCloudCredentials(config)) {
    return { inbound: inboundMessages.length, replied: 0 };
  }

  let replied = 0;
  for (const inbound of inboundMessages) {
    const replyText = buildWhatsAppAutoReply(config, inbound.actionKey || inbound.text);
    if (!replyText) continue;

    try {
      const result = await sendWhatsAppCloudText(inbound.fromNumber, replyText);
      await storeOutboundWhatsAppMessage({
        to: inbound.fromNumber,
        text: replyText,
        result,
        userId: inbound.userId,
      });
      replied += 1;
    } catch (error) {
      console.warn("WhatsApp auto-reply failed:", error instanceof Error ? error.message : error);
    }
  }

  return { inbound: inboundMessages.length, replied };
}

export async function sendWhatsAppMenu(to: string) {
  await ensureWhatsAppCloudSchema();
  const normalizedTo = normalizePhoneDigits(to);
  if (!normalizedTo) {
    throw new Error("Recipient phone number is required");
  }

  const config = await getWhatsAppCloudConfig();
  const text = buildWhatsAppMenuText(config);
  const result = await sendWhatsAppCloudText(normalizedTo, text);
  return storeOutboundWhatsAppMessage({ to: normalizedTo, text, result });
}

export async function sendAdminWhatsAppReply(to: string, text: string) {
  await ensureWhatsAppCloudSchema();

  const normalizedTo = normalizePhoneDigits(to);
  if (!normalizedTo) {
    throw new Error("Recipient phone number is required");
  }

  const result = await sendWhatsAppCloudText(normalizedTo, text);
  return storeOutboundWhatsAppMessage({ to: normalizedTo, text, result });
}

export async function sendUserWhatsAppMessage(userId: string, text: string) {
  await ensureWhatsAppCloudSchema();

  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const userPhone = normalizePhoneDigits(user.phone || "");
  if (!userPhone) {
    throw new Error("Add your phone number in profile before using in-app WhatsApp chat");
  }

  const config = await getWhatsAppCloudConfig();
  if (!config.enabled || config.mode !== "cloud_api") {
    throw new Error("In-app WhatsApp chat is not enabled");
  }

  if (!config.phoneNumber) {
    throw new Error("Support WhatsApp number is missing");
  }

  const [message] = await db
    .insert(whatsappMessages)
    .values({
      userId,
      direction: "outbound",
      fromNumber: userPhone,
      toNumber: config.phoneNumber,
      text,
      waMessageId: null,
      status: "queued",
      rawPayload: {
        source: "in_app_whatsapp_chat",
        note: "Stored for admin review. Customers must initiate WhatsApp delivery from WhatsApp.",
      },
    })
    .returning();

  queueAdminAlert("system", {
    title: "In-app WhatsApp message",
    message: `${user.email || user.username || userPhone}: ${text.slice(0, 160)}`,
    metadata: { channel: "whatsapp", userId, from: userPhone, to: config.phoneNumber },
    actionPath: "/admin/settings",
    sendEmail: false,
  });

  return message;
}
