import { inArray } from "drizzle-orm";

import { db } from "server/db";
import { sendEmail } from "server/email";
import { admins, notifications, settings } from "@shared/schema";

export type AdminAlertEvent =
  | "sender_id_approval"
  | "esim_order"
  | "eroaming_order"
  | "services_modules"
  | "charges_fees"
  | "system";

type AdminAlertInput = {
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  actionPath?: string;
  actionUrl?: string;
  sendInApp?: boolean;
  sendEmail?: boolean;
};

const EVENT_EMAIL_SETTING_KEYS: Record<AdminAlertEvent, string> = {
  sender_id_approval: "admin_alert_sender_id_emails",
  esim_order: "admin_alert_esim_order_emails",
  eroaming_order: "admin_alert_eroaming_order_emails",
  services_modules: "admin_alert_services_modules_emails",
  charges_fees: "admin_alert_charges_fees_emails",
  system: "admin_alert_emails",
};

const GLOBAL_ALERT_EMAIL_KEY = "admin_alert_emails";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function escapeHtml(value: unknown) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseEmails(value: unknown) {
  return Array.from(
    new Set(
      clean(value)
        .split(/[\s,;]+/)
        .map((item) => item.trim().toLowerCase())
        .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)),
    ),
  );
}

async function loadSettingMap(keys: string[]) {
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, keys));

  return rows.reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

async function loadDefaultAdminEmails() {
  const rows = await db.select({ email: admins.email }).from(admins);
  return Array.from(new Set(rows.flatMap((row) => parseEmails(row.email))));
}

async function getPlatformUrl(settingMap: Record<string, string>) {
  const fromSetting = clean(settingMap.website_url || settingMap.site_url || settingMap.app_url);
  const fromEnv = clean(process.env.APP_URL || process.env.PUBLIC_URL || process.env.WEBSITE_URL);
  return (fromSetting || fromEnv).replace(/\/+$/, "");
}

async function resolveAlertRecipients(event: AdminAlertEvent, settingMap: Record<string, string>) {
  const eventEmails = parseEmails(settingMap[EVENT_EMAIL_SETTING_KEYS[event]]);
  if (eventEmails.length) return eventEmails;

  const globalEmails = parseEmails(settingMap[GLOBAL_ALERT_EMAIL_KEY]);
  if (globalEmails.length) return globalEmails;

  return loadDefaultAdminEmails();
}

function buildEmailHtml(input: AdminAlertInput, event: AdminAlertEvent, actionUrl: string) {
  const metadata = input.metadata && Object.keys(input.metadata).length
    ? `<pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:12px;color:#334155;">${escapeHtml(JSON.stringify(input.metadata, null, 2))}</pre>`
    : "";
  const action = actionUrl
    ? `<p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:8px;">Open in Admin</a></p>`
    : "";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
      <h2 style="margin:0 0 12px;">${escapeHtml(input.title)}</h2>
      <p>${escapeHtml(input.message)}</p>
      <p style="color:#64748b;font-size:13px;">Alert type: ${escapeHtml(event.replace(/_/g, " "))}</p>
      ${action}
      ${metadata}
    </div>
  `;
}

export async function sendAdminAlert(event: AdminAlertEvent, input: AdminAlertInput) {
  const settingKeys = Array.from(new Set([
    EVENT_EMAIL_SETTING_KEYS[event],
    GLOBAL_ALERT_EMAIL_KEY,
    "website_url",
    "site_url",
    "app_url",
  ]));
  const settingMap = await loadSettingMap(settingKeys);
  const platformUrl = await getPlatformUrl(settingMap);
  const actionUrl = clean(input.actionUrl) || (
    platformUrl && clean(input.actionPath)
      ? `${platformUrl}${input.actionPath!.startsWith("/") ? "" : "/"}${input.actionPath}`
      : ""
  );

  let emailsSent = 0;
  let emailsFailed = 0;
  const emailErrors: string[] = [];

  if (input.sendEmail !== false) {
    const recipients = await resolveAlertRecipients(event, settingMap);
    const html = buildEmailHtml(input, event, actionUrl);

    for (const recipient of recipients) {
      try {
        await sendEmail({
          to: recipient,
          subject: input.title,
          html,
          text: `${input.message}${actionUrl ? `\n\nOpen in admin: ${actionUrl}` : ""}`,
        });
        emailsSent += 1;
      } catch (error) {
        emailsFailed += 1;
        emailErrors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  if (input.sendInApp !== false) {
    await db.insert(notifications).values({
      type: "admin_alert",
      title: input.title,
      message: input.message,
      read: false,
      metadata: {
        ...(input.metadata || {}),
        source: "admin_alert",
        event,
        actionUrl,
        emailsSent,
        emailsFailed,
        emailError: emailErrors[0] || null,
      },
    });
  }

  return { emailsSent, emailsFailed };
}

export function queueAdminAlert(event: AdminAlertEvent, input: AdminAlertInput) {
  setImmediate(() => {
    sendAdminAlert(event, input).catch((error) => {
      console.warn("Admin alert failed:", error instanceof Error ? error.message : error);
    });
  });
}
