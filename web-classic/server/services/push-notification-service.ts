import { randomUUID } from "crypto";

import { getAdminMessaging } from "server/config/firebase-admin";
import { pool } from "server/db";
import { getRoleOptionRole, getStoredRoleOptionsConfig } from "server/utils/roleOptionsConfig";
import {
  normalizeUserModuleOverrideSettings,
  USER_MODULE_OPTIONS_SETTING_PREFIX,
  type RoleOptionRole,
} from "@shared/roleOptions";

export const PUSH_NOTIFICATION_MODULE_KEY = "module_push_notifications";
export const PUSH_NOTIFICATION_SETTINGS_KEY = "push_notification_settings";
const MOBILE_PUSH_CHANNEL_ID = "g5_push_channel";

export type PushAudience = "all" | "users" | "agents" | "resellers" | "single";
export type PushSenderType = "admin" | "agent" | "reseller";

type PushPricingRule = {
  pricingMode: "free" | "paid";
  pricePerNotification: number;
  monthlyFee: number;
};

export type PushNotificationSettings = {
  agent: PushPricingRule;
  reseller: PushPricingRule;
};

type RecipientRow = {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  fcmToken: string | null;
};

type PushSenderContext = {
  id: string;
  type: PushSenderType;
};

type SendPushCampaignInput = {
  sender: PushSenderContext;
  title: string;
  message: string;
  audience: PushAudience;
  recipientUserId?: string | null;
  sendPush?: boolean;
  sendInApp?: boolean;
  metadata?: Record<string, unknown>;
};

type PushSendError = {
  code: string;
  message: string;
  userId?: string;
  count: number;
};

const defaultPushNotificationSettings: PushNotificationSettings = {
  agent: {
    pricingMode: "free",
    pricePerNotification: 0,
    monthlyFee: 0,
  },
  reseller: {
    pricingMode: "free",
    pricePerNotification: 0,
    monthlyFee: 0,
  },
};

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeMoney(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric * 100) / 100;
}

function normalizePricingRule(value: any): PushPricingRule {
  const pricingMode = value?.pricingMode === "paid" ? "paid" : "free";
  return {
    pricingMode,
    pricePerNotification: normalizeMoney(value?.pricePerNotification),
    monthlyFee: normalizeMoney(value?.monthlyFee),
  };
}

function normalizeSettings(value: unknown): PushNotificationSettings {
  const raw = value && typeof value === "object" ? (value as any) : {};
  return {
    agent: normalizePricingRule(raw.agent || defaultPushNotificationSettings.agent),
    reseller: normalizePricingRule(raw.reseller || defaultPushNotificationSettings.reseller),
  };
}

function responseRole(role?: string | null) {
  const cleanRole = cleanString(role).toLowerCase();
  if (cleanRole === "agent") return "agent";
  if (cleanRole === "reseller") return "reseller";
  return "user";
}

function monthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function fcmData(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, cleanString(value)]));
}

function pushErrorDetails(error: any) {
  const code = cleanString(error?.code || error?.errorInfo?.code || "unknown");
  const rawMessage = cleanString(error?.message || error?.errorInfo?.message || error);
  const message = rawMessage || "Unknown Firebase push error";
  return {
    code,
    message: message.length > 300 ? `${message.slice(0, 300)}...` : message,
  };
}

function addPushError(errors: PushSendError[], error: any, userId?: string) {
  const details = pushErrorDetails(error);
  const existing = errors.find(
    (item) => item.code === details.code && item.message === details.message && item.userId === userId,
  );

  if (existing) {
    existing.count += 1;
    return;
  }

  if (errors.length < 10) {
    errors.push({
      ...details,
      userId,
      count: 1,
    });
  }
}

function roleWhereClause(audience: PushAudience, alias = "u") {
  if (audience === "users") {
    return `AND COALESCE(${alias}.role, 'customer') NOT IN ('agent', 'reseller')`;
  }
  if (audience === "agents") {
    return `AND ${alias}.role = 'agent'`;
  }
  if (audience === "resellers") {
    return `AND ${alias}.role = 'reseller'`;
  }
  return "";
}

export async function ensurePushNotificationSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS push_notification_campaigns (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      title text NOT NULL,
      message text NOT NULL,
      audience text NOT NULL,
      sender_id varchar,
      sender_type text NOT NULL DEFAULT 'admin',
      recipients_count integer NOT NULL DEFAULT 0,
      tokens_attempted integer NOT NULL DEFAULT 0,
      push_sent integer NOT NULL DEFAULT 0,
      push_failed integer NOT NULL DEFAULT 0,
      in_app_sent integer NOT NULL DEFAULT 0,
      charge_amount numeric(10, 2) NOT NULL DEFAULT 0.00,
      pricing_mode text NOT NULL DEFAULT 'free',
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS push_notification_campaigns_created_at_idx
    ON push_notification_campaigns (created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS push_notification_campaigns_sender_idx
    ON push_notification_campaigns (sender_id, sender_type)
  `);
}

export async function getPushNotificationSettings(): Promise<PushNotificationSettings> {
  const { rows } = await pool.query(
    `SELECT value FROM platform_settings WHERE key = $1 LIMIT 1`,
    [PUSH_NOTIFICATION_SETTINGS_KEY],
  );

  if (!rows[0]?.value) return defaultPushNotificationSettings;

  try {
    return normalizeSettings(JSON.parse(rows[0].value));
  } catch {
    return defaultPushNotificationSettings;
  }
}

export async function savePushNotificationSettings(
  settings: unknown,
  adminId?: string | null,
): Promise<PushNotificationSettings> {
  const normalized = normalizeSettings(settings);
  await pool.query(
    `
      INSERT INTO platform_settings (key, value, description, category, updated_by, updated_at)
      VALUES ($1, $2, $3, $4, $5, now())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        updated_by = EXCLUDED.updated_by,
        updated_at = now()
    `,
    [
      PUSH_NOTIFICATION_SETTINGS_KEY,
      JSON.stringify(normalized),
      "Push notification pricing for reseller and agent sender access",
      "notifications",
      adminId || null,
    ],
  );

  return normalized;
}

async function getUserModuleOverrides(userId: string, role: RoleOptionRole) {
  const { rows } = await pool.query(
    `SELECT value FROM platform_settings WHERE key = $1 LIMIT 1`,
    [`${USER_MODULE_OPTIONS_SETTING_PREFIX}${userId}`],
  );

  if (!rows[0]?.value) return { modules: {}, mobileModules: {} };

  try {
    return normalizeUserModuleOverrideSettings(role, JSON.parse(rows[0].value));
  } catch {
    return { modules: {}, mobileModules: {} };
  }
}

export async function isPushNotificationModuleEnabled(userId: string, role?: string | null) {
  const roleKey = getRoleOptionRole(role);
  if (roleKey === "user") return false;

  const config = await getStoredRoleOptionsConfig();
  const roleModules = config.roles[roleKey]?.modules || {};
  const overrides = await getUserModuleOverrides(userId, roleKey);
  const modules = {
    ...roleModules,
    ...overrides.modules,
  };

  return modules[PUSH_NOTIFICATION_MODULE_KEY] !== false;
}

export async function listPushRecipients(
  sender: PushSenderContext,
  audience: PushAudience,
  recipientUserId?: string | null,
): Promise<RecipientRow[]> {
  const normalizedAudience = audience === "single" ? "single" : audience;
  const cleanRecipientId = cleanString(recipientUserId);

  if (normalizedAudience === "single" && !cleanRecipientId) {
    throw new Error("Recipient account is required");
  }

  if (sender.type === "admin") {
    if (normalizedAudience === "single") {
      const { rows } = await pool.query<RecipientRow>(
        `
          SELECT id, email, name, role, fcm_token AS "fcmToken"
          FROM users
          WHERE id = $1 AND is_deleted = false AND is_blocked = false
          LIMIT 1
        `,
        [cleanRecipientId],
      );
      return rows;
    }

    const { rows } = await pool.query<RecipientRow>(
      `
        SELECT id, email, name, role, fcm_token AS "fcmToken"
        FROM users u
        WHERE u.is_deleted = false
          AND u.is_blocked = false
          ${roleWhereClause(normalizedAudience, "u")}
        ORDER BY u.created_at DESC
      `,
    );
    return rows;
  }

  if (normalizedAudience === "single") {
    const { rows } = await pool.query<RecipientRow>(
      `
        SELECT u.id, u.email, u.name, u.role, u.fcm_token AS "fcmToken"
        FROM reseller_customer_links l
        INNER JOIN users u ON u.id = l.customer_id
        WHERE l.reseller_id = $1
          AND l.customer_id = $2
          AND u.is_deleted = false
          AND u.is_blocked = false
        LIMIT 1
      `,
      [sender.id, cleanRecipientId],
    );
    return rows;
  }

  const { rows } = await pool.query<RecipientRow>(
    `
      SELECT u.id, u.email, u.name, u.role, u.fcm_token AS "fcmToken"
      FROM reseller_customer_links l
      INNER JOIN users u ON u.id = l.customer_id
      WHERE l.reseller_id = $1
        AND u.is_deleted = false
        AND u.is_blocked = false
        ${roleWhereClause(normalizedAudience, "u")}
      ORDER BY l.created_at DESC
    `,
    [sender.id],
  );

  return rows;
}

async function listActiveTokens(recipients: RecipientRow[]) {
  const recipientIds = Array.from(new Set(recipients.map((recipient) => cleanString(recipient.id)).filter(Boolean)));
  const tokensByUserId = new Map<string, Set<string>>();

  for (const recipient of recipients) {
    const token = cleanString(recipient.fcmToken);
    if (!token) continue;
    if (!tokensByUserId.has(recipient.id)) tokensByUserId.set(recipient.id, new Set());
    tokensByUserId.get(recipient.id)!.add(token);
  }

  if (recipientIds.length > 0) {
    const { rows } = await pool.query<{ userId: string; token: string }>(
      `
        SELECT user_id AS "userId", token
        FROM fcm_tokens
        WHERE user_id = ANY($1::varchar[])
          AND is_active = true
          AND token IS NOT NULL
          AND length(trim(token)) > 0
      `,
      [recipientIds],
    );

    for (const row of rows) {
      const token = cleanString(row.token);
      if (!token) continue;
      if (!tokensByUserId.has(row.userId)) tokensByUserId.set(row.userId, new Set());
      tokensByUserId.get(row.userId)!.add(token);
    }
  }

  const tokenOwners = new Map<string, string>();
  for (const [userId, tokens] of tokensByUserId.entries()) {
    for (const token of tokens) {
      if (!tokenOwners.has(token)) tokenOwners.set(token, userId);
    }
  }

  return Array.from(tokenOwners.entries()).map(([token, userId]) => ({ token, userId }));
}

async function createInAppNotifications(
  userIds: string[],
  title: string,
  message: string,
  metadata: Record<string, unknown>,
) {
  const cleanUserIds = Array.from(new Set(userIds.map(cleanString).filter(Boolean)));
  if (!cleanUserIds.length) return 0;

  await pool.query(
    `
      INSERT INTO notifications (user_id, type, title, message, metadata, created_at)
      SELECT user_id, 'push', $2, $3, $4::jsonb, now()
      FROM unnest($1::varchar[]) AS user_id
    `,
    [cleanUserIds, title, message, JSON.stringify(metadata)],
  );

  return cleanUserIds.length;
}

async function sendFcm(tokens: Array<{ token: string; userId: string }>, title: string, body: string, data: Record<string, unknown>) {
  if (!tokens.length) return { attempted: 0, sent: 0, failed: 0, errors: [] as PushSendError[] };

  const messaging = await getAdminMessaging();
  const payloadData = fcmData(data);
  let sent = 0;
  let failed = 0;
  const errors: PushSendError[] = [];

  for (let index = 0; index < tokens.length; index += 500) {
    const batch = tokens.slice(index, index + 500);
    const batchTokens = batch.map((item) => item.token);

    if (typeof (messaging as any).sendEachForMulticast === "function") {
      try {
        const result = await (messaging as any).sendEachForMulticast({
          tokens: batchTokens,
          notification: { title, body },
          data: payloadData,
          android: {
            priority: "high",
            notification: {
              channelId: MOBILE_PUSH_CHANNEL_ID,
              priority: "max",
              sound: "default",
              defaultSound: true,
              defaultVibrateTimings: true,
            },
          },
          apns: {
            headers: {
              "apns-priority": "10",
              "apns-push-type": "alert",
            },
            payload: {
              aps: {
                alert: { title, body },
                sound: "default",
                badge: 1,
              },
            },
          },
        });
        sent += Number(result.successCount || 0);
        failed += Number(result.failureCount || 0);

        if (Array.isArray(result.responses)) {
          result.responses.forEach((response: any, responseIndex: number) => {
            if (!response?.success) {
              addPushError(errors, response?.error || "Unknown Firebase push error", batch[responseIndex]?.userId);
            }
          });
        } else if (Number(result.failureCount || 0) > 0) {
          addPushError(errors, "Firebase did not return per-token push failure details");
        }
      } catch (error) {
        failed += batchTokens.length;
        addPushError(errors, error);
        console.warn("Push notification batch send failed:", error instanceof Error ? error.message : error);
      }
      continue;
    }

    for (const item of batch) {
      try {
        await messaging.send({
          token: item.token,
          notification: { title, body },
          data: payloadData,
          android: {
            priority: "high",
            notification: {
              channelId: MOBILE_PUSH_CHANNEL_ID,
              priority: "max",
              sound: "default",
              defaultSound: true,
              defaultVibrateTimings: true,
            },
          },
          apns: {
            headers: {
              "apns-priority": "10",
              "apns-push-type": "alert",
            },
            payload: {
              aps: {
                alert: { title, body },
                sound: "default",
                badge: 1,
              },
            },
          },
        } as any);
        sent += 1;
      } catch (error) {
        failed += 1;
        addPushError(errors, error, item.userId);
        console.warn("Push notification send failed:", error instanceof Error ? error.message : error);
      }
    }
  }

  return { attempted: tokens.length, sent, failed, errors };
}

async function chargeSenderIfNeeded(
  sender: PushSenderContext,
  recipientCount: number,
  campaignId: string,
  settings: PushNotificationSettings,
) {
  if (sender.type === "admin") {
    return {
      amount: 0,
      pricingMode: "admin",
      monthlyFeeCharged: 0,
      perNotificationCharge: 0,
    };
  }

  const role = sender.type === "agent" ? "agent" : "reseller";
  const pricing = settings[role];
  if (pricing.pricingMode !== "paid") {
    return {
      amount: 0,
      pricingMode: "free",
      monthlyFeeCharged: 0,
      perNotificationCharge: 0,
    };
  }

  const currentMonth = monthKey();
  const monthlyMarkerKey = `push_notification_monthly_fee:${sender.id}:${currentMonth}`;
  const monthlyFee = normalizeMoney(pricing.monthlyFee);
  const perNotificationCharge = normalizeMoney(pricing.pricePerNotification * recipientCount);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: markerRows } = monthlyFee > 0
      ? await client.query(`SELECT id FROM platform_settings WHERE key = $1 LIMIT 1`, [monthlyMarkerKey])
      : { rows: [] as any[] };
    const monthlyFeeCharged = markerRows.length ? 0 : monthlyFee;
    const totalAmount = normalizeMoney(monthlyFeeCharged + perNotificationCharge);

    if (totalAmount <= 0) {
      await client.query("COMMIT");
      return {
        amount: 0,
        pricingMode: "paid",
        monthlyFeeCharged,
        perNotificationCharge,
      };
    }

    const { rows: userRows } = await client.query<{ walletBalance: string }>(
      `SELECT wallet_balance AS "walletBalance" FROM users WHERE id = $1 FOR UPDATE`,
      [sender.id],
    );
    const balanceBefore = normalizeMoney(userRows[0]?.walletBalance);
    if (balanceBefore + 0.0001 < totalAmount) {
      throw new Error("INSUFFICIENT_PUSH_NOTIFICATION_BALANCE");
    }

    const balanceAfter = normalizeMoney(balanceBefore - totalAmount);
    await client.query(
      `UPDATE users SET wallet_balance = $2, updated_at = now() WHERE id = $1`,
      [sender.id, balanceAfter.toFixed(2)],
    );
    await client.query(
      `
        INSERT INTO wallet_transactions (
          user_id, type, status, amount, currency, balance_before, balance_after,
          provider, reference_id, description, metadata, completed_at, created_at, updated_at
        )
        VALUES ($1, 'purchase_debit', 'completed', $2, 'USD', $3, $4, 'push_notification', $5, $6, $7::jsonb, now(), now(), now())
      `,
      [
        sender.id,
        totalAmount.toFixed(2),
        balanceBefore.toFixed(2),
        balanceAfter.toFixed(2),
        campaignId,
        `Push notification campaign charge (${recipientCount} recipient${recipientCount === 1 ? "" : "s"})`,
        JSON.stringify({
          campaignId,
          recipientCount,
          monthlyFeeCharged,
          perNotificationCharge,
          pricePerNotification: pricing.pricePerNotification,
        }),
      ],
    );

    if (monthlyFeeCharged > 0) {
      await client.query(
        `
          INSERT INTO platform_settings (key, value, description, category, updated_at)
          VALUES ($1, $2, $3, 'notifications', now())
          ON CONFLICT (key) DO NOTHING
        `,
        [
          monthlyMarkerKey,
          JSON.stringify({ userId: sender.id, month: currentMonth, amount: monthlyFeeCharged, campaignId }),
          "Monthly push notification access fee charged",
        ],
      );
    }

    await client.query("COMMIT");
    return {
      amount: totalAmount,
      pricingMode: "paid",
      monthlyFeeCharged,
      perNotificationCharge,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function sendPushCampaign(input: SendPushCampaignInput) {
  await ensurePushNotificationSchema();

  const title = cleanString(input.title);
  const message = cleanString(input.message);
  const audience = input.audience || "all";
  const sendPush = input.sendPush !== false;
  const sendInApp = input.sendInApp !== false;

  if (!title) throw new Error("Notification title is required");
  if (!message) throw new Error("Notification message is required");
  if (!sendPush && !sendInApp) throw new Error("Select push notification or in-app notification");

  const recipients = await listPushRecipients(input.sender, audience, input.recipientUserId);
  if (!recipients.length) throw new Error("No matching recipient accounts found");

  const campaignId = randomUUID();
  const settings = await getPushNotificationSettings();
  const charge = await chargeSenderIfNeeded(input.sender, recipients.length, campaignId, settings);
  const recipientIds = recipients.map((recipient) => recipient.id);
  const notificationMetadata = {
    source: "push_campaign",
    campaignId,
    audience,
    senderId: input.sender.id,
    senderType: input.sender.type,
    ...(input.metadata || {}),
  };

  const inAppSent = sendInApp
    ? await createInAppNotifications(recipientIds, title, message, notificationMetadata)
    : 0;

  const tokens = sendPush ? await listActiveTokens(recipients) : [];
  const pushResult = sendPush
    ? await sendFcm(tokens, title, message, {
        type: "admin_push",
        title,
        body: message,
        channelId: MOBILE_PUSH_CHANNEL_ID,
        campaignId,
        audience,
        senderId: input.sender.id,
        senderType: input.sender.type,
      })
    : { attempted: 0, sent: 0, failed: 0, errors: [] as PushSendError[] };

  await pool.query(
    `
      INSERT INTO push_notification_campaigns (
        id, title, message, audience, sender_id, sender_type, recipients_count,
        tokens_attempted, push_sent, push_failed, in_app_sent, charge_amount,
        pricing_mode, metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, now())
    `,
    [
      campaignId,
      title,
      message,
      audience,
      input.sender.id,
      input.sender.type,
      recipients.length,
      pushResult.attempted,
      pushResult.sent,
      pushResult.failed,
      inAppSent,
      charge.amount.toFixed(2),
      charge.pricingMode,
      JSON.stringify({
        ...notificationMetadata,
        monthlyFeeCharged: charge.monthlyFeeCharged,
        perNotificationCharge: charge.perNotificationCharge,
        pushErrors: pushResult.errors,
        roles: recipients.reduce<Record<string, number>>((acc, recipient) => {
          const role = responseRole(recipient.role);
          acc[role] = (acc[role] || 0) + 1;
          return acc;
        }, {}),
      }),
    ],
  );

  return {
    campaignId,
    audience,
    recipients: recipients.length,
    tokensAttempted: pushResult.attempted,
    pushSent: pushResult.sent,
    pushFailed: pushResult.failed,
    pushErrors: pushResult.errors,
    inAppSent,
    chargeAmount: charge.amount,
    pricingMode: charge.pricingMode,
    monthlyFeeCharged: charge.monthlyFeeCharged,
    perNotificationCharge: charge.perNotificationCharge,
  };
}
