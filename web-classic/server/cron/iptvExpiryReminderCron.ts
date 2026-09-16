import cron from "node-cron";
import { pool } from "server/db";
import { getAdminMessaging } from "server/config/firebase-admin";
import { getIptvSettings } from "server/services/iptv-service";

async function listTokens(userId: string, fallbackToken?: string | null) {
  const result = await pool.query<{ token: string }>(
    `SELECT token
     FROM fcm_tokens
     WHERE user_id = $1 AND is_active = true AND token <> ''`,
    [userId],
  );
  const tokens = new Set(result.rows.map((row) => String(row.token || "").trim()).filter(Boolean));
  const fallback = String(fallbackToken || "").trim();
  if (fallback) tokens.add(fallback);
  return Array.from(tokens);
}

async function processIptvExpiryPushReminders() {
  const settings = await getIptvSettings();
  if (!settings.expiryPushAlertsEnabled) return;

  const beforeHours = Math.max(1, Number.parseInt(settings.expiryPushAlertBeforeHours || "12", 10) || 12);
  const result = await pool.query<{
    id: string;
    userId: string;
    packageName: string | null;
    subscriptionLabel: string | null;
    expiresAt: Date;
    email: string;
    fcmToken: string | null;
  }>(
    `SELECT o.id,
            o.user_id AS "userId",
            p.name AS "packageName",
            o.subscription_label AS "subscriptionLabel",
            o.expires_at AS "expiresAt",
            u.email,
            u.fcm_token AS "fcmToken"
     FROM iptv_orders o
     JOIN users u ON u.id = o.user_id
     LEFT JOIN iptv_packages p ON p.id = o.package_id
     WHERE o.status = 'active'
       AND o.user_id IS NOT NULL
       AND o.expires_at IS NOT NULL
       AND o.expires_at > now()
       AND o.expires_at <= now() + ($1::text || ' hours')::interval
       AND NOT EXISTS (
         SELECT 1
         FROM notifications n
         WHERE n.user_id = o.user_id
           AND n.type = 'iptv_expiring'
           AND n.metadata->>'orderId' = o.id
       )
     ORDER BY o.expires_at ASC
     LIMIT 100`,
    [beforeHours],
  );

  if (result.rows.length === 0) return;
  const messaging = await getAdminMessaging();

  for (const order of result.rows) {
    const title = "IPTV trial expires soon";
    const packageName = order.packageName || "IPTV package";
    const expiry = new Date(order.expiresAt).toLocaleString();
    const message = `${packageName} expires on ${expiry}. Renew now to keep watching.`;

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, metadata, created_at)
       VALUES ($1, 'iptv_expiring', $2, $3, $4::jsonb, now())`,
      [
        order.userId,
        title,
        message,
        JSON.stringify({
          source: "iptv",
          orderId: order.id,
          expiresAt: order.expiresAt,
          subscriptionLabel: order.subscriptionLabel,
        }),
      ],
    );

    const tokens = await listTokens(order.userId, order.fcmToken);
    for (const token of tokens) {
      try {
        await messaging.send({
          token,
          notification: { title, body: message },
          data: {
            type: "iptv_expiring",
            orderId: order.id,
          },
        });
      } catch (error) {
        console.warn("IPTV expiry push reminder failed:", error);
      }
    }
  }
}

export const startIptvExpiryReminderCron = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      await processIptvExpiryPushReminders();
    } catch (error) {
      console.error("IPTV expiry reminder cron failed:", error);
    }
  });
};
