import { randomUUID } from "crypto";

import { pool } from "server/db";

const ONESIGNAL_API_BASE_URL = "https://api.onesignal.com";
const ONESIGNAL_WEB_WORKER_PATH = "push/onesignal/OneSignalSDKWorker.js";
const ONESIGNAL_WEB_WORKER_SCOPE = "/push/onesignal/";

type SettingKey =
  | "onesignal_enabled"
  | "onesignal_app_id"
  | "onesignal_rest_api_key"
  | "onesignal_safari_web_id"
  | "onesignal_prompt_enabled"
  | "onesignal_email_enabled"
  | "onesignal_email_from_name"
  | "onesignal_email_from_address"
  | "onesignal_email_reply_to";

type OneSignalSettings = {
  enabled: boolean;
  appId: string;
  restApiKey: string;
  safariWebId: string;
  promptEnabled: boolean;
  emailEnabled: boolean;
  emailFromName: string;
  emailFromAddress: string;
  emailReplyTo: string;
};

export type OneSignalPublicConfig = {
  enabled: boolean;
  appId: string;
  safariWebId: string;
  promptEnabled: boolean;
  serviceWorkerPath: string;
  serviceWorkerScope: string;
};

export type OneSignalRecipient = {
  id: string;
  email?: string | null;
};

export type OneSignalSendError = {
  code: string;
  message: string;
  count: number;
};

export type OneSignalSendResult = {
  provider: "onesignal";
  attempted: number;
  sent: number;
  failed: number;
  errors: OneSignalSendError[];
};

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function truthy(value: unknown, defaultValue = false) {
  const normalized = cleanString(value).toLowerCase();
  if (!normalized) return defaultValue;
  return ["1", "true", "yes", "on", "enabled"].includes(normalized);
}

function firstNonEmpty(...values: unknown[]) {
  for (const value of values) {
    const text = cleanString(value);
    if (text) return text;
  }
  return "";
}

async function loadSettingMap(keys: SettingKey[]) {
  const { rows } = await pool.query<{ key: SettingKey; value: string }>(
    `
      SELECT key, value
      FROM settings
      WHERE key = ANY($1::text[])
    `,
    [keys],
  );

  return rows.reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

export async function getOneSignalSettings(): Promise<OneSignalSettings> {
  const settings = await loadSettingMap([
    "onesignal_enabled",
    "onesignal_app_id",
    "onesignal_rest_api_key",
    "onesignal_safari_web_id",
    "onesignal_prompt_enabled",
    "onesignal_email_enabled",
    "onesignal_email_from_name",
    "onesignal_email_from_address",
    "onesignal_email_reply_to",
  ]);

  const appId = firstNonEmpty(settings.onesignal_app_id, process.env.ONESIGNAL_APP_ID);
  const restApiKey = firstNonEmpty(settings.onesignal_rest_api_key, process.env.ONESIGNAL_REST_API_KEY);
  const rawEnabled = firstNonEmpty(settings.onesignal_enabled, process.env.ONESIGNAL_ENABLED);
  const rawPromptEnabled = firstNonEmpty(
    settings.onesignal_prompt_enabled,
    process.env.ONESIGNAL_PROMPT_ENABLED,
  );
  const rawEmailEnabled = firstNonEmpty(
    settings.onesignal_email_enabled,
    process.env.ONESIGNAL_EMAIL_ENABLED,
  );

  return {
    enabled: rawEnabled ? truthy(rawEnabled) : Boolean(appId),
    appId,
    restApiKey,
    safariWebId: firstNonEmpty(settings.onesignal_safari_web_id, process.env.ONESIGNAL_SAFARI_WEB_ID),
    promptEnabled: rawPromptEnabled ? truthy(rawPromptEnabled) : true,
    emailEnabled: rawEmailEnabled ? truthy(rawEmailEnabled) : false,
    emailFromName: firstNonEmpty(settings.onesignal_email_from_name, process.env.ONESIGNAL_EMAIL_FROM_NAME),
    emailFromAddress: firstNonEmpty(
      settings.onesignal_email_from_address,
      process.env.ONESIGNAL_EMAIL_FROM_ADDRESS,
    ),
    emailReplyTo: firstNonEmpty(settings.onesignal_email_reply_to, process.env.ONESIGNAL_EMAIL_REPLY_TO),
  };
}

export async function getPublicOneSignalConfig(): Promise<OneSignalPublicConfig> {
  const settings = await getOneSignalSettings();
  const enabled = settings.enabled && Boolean(settings.appId);

  return {
    enabled,
    appId: enabled ? settings.appId : "",
    safariWebId: enabled ? settings.safariWebId : "",
    promptEnabled: enabled && settings.promptEnabled,
    serviceWorkerPath: ONESIGNAL_WEB_WORKER_PATH,
    serviceWorkerScope: ONESIGNAL_WEB_WORKER_SCOPE,
  };
}

export async function isOneSignalPushConfigured() {
  const settings = await getOneSignalSettings();
  return Boolean(settings.enabled && settings.appId && settings.restApiKey);
}

export async function isOneSignalEmailConfigured() {
  const settings = await getOneSignalSettings();
  return Boolean(
    settings.enabled &&
      settings.emailEnabled &&
      settings.appId &&
      settings.restApiKey &&
      settings.emailFromAddress,
  );
}

async function oneSignalRequest(path: string, payload: Record<string, unknown>, restApiKey: string) {
  const response = await fetch(`${ONESIGNAL_API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Key ${restApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  let data: any = null;
  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = { raw: responseText };
  }

  if (!response.ok) {
    const apiError = Array.isArray(data?.errors) ? data.errors.join(", ") : data?.errors || data?.error;
    throw new Error(apiError || `OneSignal request failed with status ${response.status}`);
  }

  return data || {};
}

function addOneSignalError(errors: OneSignalSendError[], error: unknown, count = 1) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);
  const trimmed = (message || "Unknown OneSignal error").slice(0, 300);
  const existing = errors.find((item) => item.message === trimmed);

  if (existing) {
    existing.count += count;
    return;
  }

  if (errors.length < 10) {
    errors.push({
      code: "onesignal_error",
      message: trimmed,
      count,
    });
  }
}

function asExternalUserIds(userIds: string[]) {
  return Array.from(new Set(userIds.map(cleanString).filter(Boolean)));
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

export async function sendOneSignalPushToUsers(
  userIds: string[],
  title: string,
  message: string,
  data: Record<string, unknown> = {},
): Promise<OneSignalSendResult | null> {
  const settings = await getOneSignalSettings();
  const externalUserIds = asExternalUserIds(userIds);

  if (!externalUserIds.length) {
    return { provider: "onesignal", attempted: 0, sent: 0, failed: 0, errors: [] };
  }

  if (!settings.enabled || !settings.appId || !settings.restApiKey) return null;

  let sent = 0;
  let failed = 0;
  const errors: OneSignalSendError[] = [];

  for (const batch of chunks(externalUserIds, 2000)) {
    try {
      const payload: Record<string, unknown> = {
        app_id: settings.appId,
        target_channel: "push",
        include_aliases: {
          external_id: batch,
        },
        headings: { en: title },
        contents: { en: message },
        data,
        idempotency_key: randomUUID(),
      };

      const url = cleanString(data.url || data.web_url || data.path);
      if (url) {
        payload.web_url = url.startsWith("http") || url.startsWith("/") ? url : `/${url}`;
      }

      const result = await oneSignalRequest("/notifications?c=push", payload, settings.restApiKey);
      if (result?.id) {
        sent += batch.length;
      } else {
        failed += batch.length;
        addOneSignalError(errors, result?.errors || "OneSignal did not return a notification id", batch.length);
      }
    } catch (error) {
      failed += batch.length;
      addOneSignalError(errors, error, batch.length);
    }
  }

  return {
    provider: "onesignal",
    attempted: externalUserIds.length,
    sent,
    failed,
    errors,
  };
}

export async function sendOneSignalEmailToRecipients(
  recipients: OneSignalRecipient[],
  subject: string,
  html: string,
  text?: string,
): Promise<OneSignalSendResult | null> {
  const settings = await getOneSignalSettings();
  const emails = Array.from(
    new Set(recipients.map((recipient) => cleanString(recipient.email).toLowerCase()).filter(Boolean)),
  );

  if (!emails.length) {
    return { provider: "onesignal", attempted: 0, sent: 0, failed: 0, errors: [] };
  }

  if (!settings.enabled || !settings.emailEnabled || !settings.appId || !settings.restApiKey) return null;
  if (!settings.emailFromAddress) {
    throw new Error("OneSignal email sender address is required");
  }

  let sent = 0;
  let failed = 0;
  const errors: OneSignalSendError[] = [];

  for (const batch of chunks(emails, 2000)) {
    try {
      const payload: Record<string, unknown> = {
        app_id: settings.appId,
        target_channel: "email",
        email_to: batch,
        email_subject: subject,
        email_body: html,
        email_from_name: settings.emailFromName || "G5 eSIM",
        email_from_address: settings.emailFromAddress,
        idempotency_key: randomUUID(),
      };

      if (text) payload.email_body_text = text;
      if (settings.emailReplyTo) payload.email_reply_to_address = settings.emailReplyTo;

      const result = await oneSignalRequest("/notifications?c=email", payload, settings.restApiKey);
      if (result?.id) {
        sent += batch.length;
      } else {
        failed += batch.length;
        addOneSignalError(errors, result?.errors || "OneSignal did not return an email id", batch.length);
      }
    } catch (error) {
      failed += batch.length;
      addOneSignalError(errors, error, batch.length);
    }
  }

  return {
    provider: "onesignal",
    attempted: emails.length,
    sent,
    failed,
    errors,
  };
}
