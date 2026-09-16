import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { requireAdmin } from "../../lib/middleware";
import * as ApiResponse from "../../utils/response";
import { pool } from "../../db";
import { generateCustomNotificationEmail, sendEmail } from "../../email";
import {
  ensurePushNotificationSchema,
  getPushNotificationSettings,
  listPushRecipients,
  savePushNotificationSettings,
  sendPushCampaign,
  type PushAudience,
} from "../../services/push-notification-service";

const router = Router();

const pushAudienceSchema = z.enum(["all", "users", "agents", "resellers", "single"]);

const sendNotificationSchema = z.object({
  subject: z.string().trim().min(1).max(180).optional(),
  title: z.string().trim().min(1).max(180).optional(),
  message: z.string().trim().min(1).max(4000),
  audience: pushAudienceSchema.optional(),
  recipientType: pushAudienceSchema.optional(),
  recipientUserId: z.string().trim().optional().nullable(),
  sendEmail: z.coerce.boolean().default(false),
  sendInApp: z.coerce.boolean().default(true),
  sendPush: z.coerce.boolean().default(true),
});

function normalizeAudience(value?: PushAudience | null): PushAudience {
  return value || "all";
}

function normalizeBoolQuery(value: unknown) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

async function sendNotificationEmails(
  recipients: Awaited<ReturnType<typeof listPushRecipients>>,
  subject: string,
  message: string,
) {
  let emailsSent = 0;
  let emailsFailed = 0;

  for (const recipient of recipients) {
    try {
      const emailContent = await generateCustomNotificationEmail(
        subject,
        message,
        recipient.name || recipient.email,
        recipient.email,
      );
      await sendEmail({
        to: recipient.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: message,
      });
      emailsSent += 1;
    } catch (error) {
      emailsFailed += 1;
      console.warn("Custom notification email failed:", error instanceof Error ? error.message : error);
    }
  }

  return { emailsSent, emailsFailed };
}

router.get("/push-settings", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const settings = await getPushNotificationSettings();
    return ApiResponse.success(res, "Push notification settings fetched", settings);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to fetch push notification settings");
  }
});

router.put("/push-settings", requireAdmin, async (req: Request, res: Response) => {
  try {
    const settings = await savePushNotificationSettings(req.body, req.session.adminId || null);
    return ApiResponse.success(res, "Push notification settings saved", settings);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to save push notification settings");
  }
});

router.get("/stats", requireAdmin, async (_req: Request, res: Response) => {
  try {
    await ensurePushNotificationSchema();

    const [notificationStats, customStats, pushStats] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE read = false)::int AS unread
        FROM notifications
      `),
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COALESCE(SUM(emails_sent), 0)::int AS "totalEmailsSent",
          COALESCE(SUM(emails_failed), 0)::int AS "totalEmailsFailed"
        FROM custom_notifications
      `),
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COALESCE(SUM(recipients_count), 0)::int AS "totalRecipients",
          COALESCE(SUM(tokens_attempted), 0)::int AS "totalTokensAttempted",
          COALESCE(SUM(push_sent), 0)::int AS "totalPushSent",
          COALESCE(SUM(push_failed), 0)::int AS "totalPushFailed",
          COALESCE(SUM(in_app_sent), 0)::int AS "totalInAppSent"
        FROM push_notification_campaigns
      `),
    ]);

    return ApiResponse.success(res, "Notification stats fetched", {
      notifications: notificationStats.rows[0] || { total: 0, unread: 0 },
      customNotifications: {
        ...(customStats.rows[0] || {}),
        ...(pushStats.rows[0] || {}),
      },
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to fetch notification stats");
  }
});

router.get("/history", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensurePushNotificationSchema();

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const source = String(req.query.source || "all");
    const type = String(req.query.type || "all");
    const iccid = String(req.query.iccid || "").trim();
    const processed = normalizeBoolQuery(req.query.processed);
    const emailSent = normalizeBoolQuery(req.query.emailSent);

    const conditions: string[] = [];
    const params: any[] = [];
    const addParam = (value: any) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (source !== "all") {
      conditions.push(`source = ${addParam(source)}`);
    }
    if (type !== "all") {
      conditions.push(`type = ${addParam(type)}`);
    }
    if (iccid) {
      conditions.push(`iccid ILIKE ${addParam(`%${iccid}%`)}`);
    }
    if (processed !== null) {
      conditions.push(`processed = ${addParam(processed)}`);
    }
    if (emailSent !== null) {
      conditions.push(`"emailSent" = ${addParam(emailSent)}`);
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const unionSql = `
      WITH items AS (
        SELECT
          id,
          'airalo'::text AS source,
          COALESCE(threshold, type)::text AS type,
          COALESCE(iccid, '')::text AS iccid,
          processed,
          email_sent AS "emailSent",
          error_message AS error,
          webhook_payload AS "webhookPayload",
          created_at AS "createdAt"
        FROM airalo_notifications

        UNION ALL

        SELECT
          id,
          'custom'::text AS source,
          'custom'::text AS type,
          ''::text AS iccid,
          status = 'completed' AS processed,
          COALESCE(emails_sent, 0) > 0 AS "emailSent",
          CASE WHEN status = 'failed' THEN 'Custom notification failed' ELSE NULL END AS error,
          jsonb_build_object(
            'subject', subject,
            'message', message,
            'recipientType', recipient_type,
            'recipientUserId', recipient_user_id,
            'emailsSent', emails_sent,
            'emailsFailed', emails_failed,
            'status', status
          ) AS "webhookPayload",
          created_at AS "createdAt"
        FROM custom_notifications

        UNION ALL

        SELECT
          id,
          'push'::text AS source,
          'push'::text AS type,
          ''::text AS iccid,
          true AS processed,
          false AS "emailSent",
          CASE WHEN push_failed > 0 THEN push_failed::text || ' push token(s) failed' ELSE NULL END AS error,
          jsonb_build_object(
            'title', title,
            'message', message,
            'audience', audience,
            'senderType', sender_type,
            'recipients', recipients_count,
            'tokensAttempted', tokens_attempted,
            'pushSent', push_sent,
            'pushFailed', push_failed,
            'inAppSent', in_app_sent,
            'chargeAmount', charge_amount,
            'metadata', metadata
          ) AS "webhookPayload",
          created_at AS "createdAt"
        FROM push_notification_campaigns
      )
    `;

    const filterParams = [...params];
    const pagedParams = [...params, limit, offset];
    const limitParam = `$${filterParams.length + 1}`;
    const offsetParam = `$${filterParams.length + 2}`;

    const [countResult, rowsResult] = await Promise.all([
      pool.query(`${unionSql} SELECT COUNT(*)::int AS total FROM items ${whereSql}`, filterParams),
      pool.query(
        `${unionSql} SELECT * FROM items ${whereSql} ORDER BY "createdAt" DESC LIMIT ${limitParam} OFFSET ${offsetParam}`,
        pagedParams,
      ),
    ]);

    return res.json({
      notifications: rowsResult.rows,
      total: Number(countResult.rows[0]?.total || 0),
      page,
      limit,
    });
  } catch (error: any) {
    return res.status(500).json({
      notifications: [],
      total: 0,
      page: 1,
      limit: 20,
      error: error.message || "Failed to fetch notification history",
    });
  }
});

router.post("/send-custom", requireAdmin, async (req: Request, res: Response) => {
  try {
    const payload = sendNotificationSchema.parse(req.body);
    const audience = normalizeAudience(payload.audience || payload.recipientType);
    const subject = payload.subject || payload.title || "New Notification";
    const adminId = req.session.adminId || "admin";

    if (!payload.sendEmail && !payload.sendInApp && !payload.sendPush) {
      return ApiResponse.badRequest(res, "Select at least one delivery method");
    }

    let pushResult = {
      campaignId: null as string | null,
      audience,
      recipients: 0,
      tokensAttempted: 0,
      pushSent: 0,
      pushFailed: 0,
      pushErrors: [] as Array<{ code: string; message: string; userId?: string; count: number }>,
      inAppSent: 0,
      chargeAmount: 0,
      pricingMode: "admin",
      monthlyFeeCharged: 0,
      perNotificationCharge: 0,
    };

    if (payload.sendPush || payload.sendInApp) {
      pushResult = await sendPushCampaign({
        sender: { id: adminId, type: "admin" },
        title: subject,
        message: payload.message,
        audience,
        recipientUserId: payload.recipientUserId,
        sendPush: payload.sendPush,
        sendInApp: payload.sendInApp,
        metadata: { channel: "admin_custom_notification" },
      });
    }

    let emailsSent = 0;
    let emailsFailed = 0;
    if (payload.sendEmail) {
      const recipients = await listPushRecipients(
        { id: adminId, type: "admin" },
        audience,
        payload.recipientUserId,
      );
      const emailResult = await sendNotificationEmails(recipients, subject, payload.message);
      emailsSent = emailResult.emailsSent;
      emailsFailed = emailResult.emailsFailed;
      if (!pushResult.recipients) pushResult.recipients = recipients.length;
    }

    await pool.query(
      `
        INSERT INTO custom_notifications (
          subject, message, recipient_type, recipient_user_id, sent_by,
          emails_sent, emails_failed, status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', now())
      `,
      [
        subject,
        payload.message,
        audience,
        payload.recipientUserId || null,
        adminId,
        emailsSent,
        emailsFailed,
      ],
    );

    return ApiResponse.success(res, "Notification sent", {
      ...pushResult,
      emailsSent,
      emailsFailed,
    });
  } catch (error: any) {
    const message =
      error?.message === "Firebase Admin is not initialized"
        ? "Firebase Admin is not configured. Add Firebase settings before sending mobile push notifications."
        : error?.message || "Failed to send notification";
    return ApiResponse.badRequest(res, message);
  }
});

router.post("/send-push", requireAdmin, async (req: Request, res: Response) => {
  try {
    const payload = sendNotificationSchema.parse(req.body);
    const audience = normalizeAudience(payload.audience || payload.recipientType);
    const result = await sendPushCampaign({
      sender: { id: req.session.adminId || "admin", type: "admin" },
      title: payload.subject || payload.title || "New Notification",
      message: payload.message,
      audience,
      recipientUserId: payload.recipientUserId,
      sendPush: payload.sendPush,
      sendInApp: payload.sendInApp,
      metadata: { channel: "admin_push_notification" },
    });

    return ApiResponse.success(res, "Push notification sent", result);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to send push notification");
  }
});

export default router;
