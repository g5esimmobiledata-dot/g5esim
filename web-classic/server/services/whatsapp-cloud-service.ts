import axios from "axios";
import { desc, eq, or, sql } from "drizzle-orm";
import { db } from "server/db";
import { storage } from "server/storage";
import { users, whatsappMessages } from "@shared/schema";

type WhatsAppCloudConfig = {
  enabled: boolean;
  mode: "link" | "cloud_api";
  phoneNumber: string;
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  apiVersion: string;
};

let ensurePromise: Promise<void> | null = null;

function trim(value: unknown) {
  return String(value || "").trim();
}

export function normalizePhoneDigits(value?: string | null) {
  return trim(value).replace(/[^\d]/g, "");
}

async function getSettingValue(key: string) {
  return (await storage.getSettingByKey(key))?.value || "";
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
  const [enabled, mode, phoneNumber, phoneNumberId, accessToken, verifyToken, apiVersion] =
    await Promise.all([
      getSettingValue("support_whatsapp_enabled"),
      getSettingValue("support_whatsapp_mode"),
      getSettingValue("support_whatsapp_number"),
      getSettingValue("support_whatsapp_phone_number_id"),
      getSettingValue("support_whatsapp_access_token"),
      getSettingValue("support_whatsapp_verify_token"),
      getSettingValue("support_whatsapp_api_version"),
    ]);

  return {
    enabled: enabled !== "false",
    mode: mode === "cloud_api" ? "cloud_api" : "link",
    phoneNumber: normalizePhoneDigits(phoneNumber),
    phoneNumberId: trim(phoneNumberId),
    accessToken: trim(accessToken),
    verifyToken: trim(verifyToken),
    apiVersion: trim(apiVersion) || "v23.0",
  };
}

function hasCloudCredentials(config: WhatsAppCloudConfig) {
  return Boolean(config.phoneNumberId && config.accessToken);
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

  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  if (!value) return;

  const contacts = Array.isArray(value.contacts) ? value.contacts : [];
  const messages = Array.isArray(value.messages) ? value.messages : [];
  const statuses = Array.isArray(value.statuses) ? value.statuses : [];
  const profileName = trim(contacts[0]?.profile?.name);

  for (const message of messages) {
    const from = normalizePhoneDigits(message?.from);
    const to = normalizePhoneDigits(value?.metadata?.display_phone_number || (await getWhatsAppCloudConfig()).phoneNumber);
    const body = trim(message?.text?.body);
    if (!from || !body) continue;

    const userId = await findUserIdByPhone(from);

    await db.insert(whatsappMessages).values({
      userId,
      direction: "inbound",
      fromNumber: from,
      toNumber: to,
      text: body,
      profileName: profileName || null,
      waMessageId: trim(message?.id) || null,
      status: "received",
      rawPayload: payload,
    });

    if (userId) {
      await storage.createNotification({
        userId,
        type: "support",
        title: "WhatsApp message received",
        message: body.slice(0, 120),
        read: false,
        metadata: { channel: "whatsapp", from },
      });
    }
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
}

export async function sendAdminWhatsAppReply(to: string, text: string) {
  await ensureWhatsAppCloudSchema();

  const normalizedTo = normalizePhoneDigits(to);
  if (!normalizedTo) {
    throw new Error("Recipient phone number is required");
  }

  const result = await sendWhatsAppCloudText(normalizedTo, text);
  const waMessageId = trim(result?.messages?.[0]?.id);
  const config = await getWhatsAppCloudConfig();
  const userId = await findUserIdByPhone(normalizedTo);

  const [message] = await db
    .insert(whatsappMessages)
    .values({
      userId,
      direction: "outbound",
      fromNumber: config.phoneNumber,
      toNumber: normalizedTo,
      text,
      waMessageId: waMessageId || null,
      status: "sent",
      rawPayload: result,
    })
    .returning();

  return message;
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

  const result = await sendWhatsAppCloudText(config.phoneNumber, text);
  const waMessageId = trim(result?.messages?.[0]?.id);

  const [message] = await db
    .insert(whatsappMessages)
    .values({
      userId,
      direction: "outbound",
      fromNumber: userPhone,
      toNumber: config.phoneNumber,
      text,
      waMessageId: waMessageId || null,
      status: "sent",
      rawPayload: result,
    })
    .returning();

  return message;
}
