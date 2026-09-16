import { getAdminMessaging } from 'server/config/firebase-admin';
import { pool } from 'server/db';
import { sendOneSignalPushToUsers } from 'server/services/onesignal-service';

type ChatPushPayload = {
  targetUserIds: string[];
  title: string;
  body: string;
  data: Record<string, unknown>;
  androidChannelId?: string;
};

function cleanString(value: unknown) {
  return String(value ?? '').trim();
}

function fcmData(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, cleanString(value)]));
}

export async function sendPremiumChatPush({
  targetUserIds,
  title,
  body,
  data,
  androidChannelId = 'default_channel',
}: ChatPushPayload) {
  const cleanTargetIds = Array.from(new Set(targetUserIds.map(cleanString).filter(Boolean)));
  if (!cleanTargetIds.length) return { attempted: 0, sent: 0 };

  const oneSignalResult = await sendOneSignalPushToUsers(cleanTargetIds, title, body, data).catch((error) => {
    console.warn('OneSignal premium chat push unavailable:', error instanceof Error ? error.message : error);
    return null;
  });
  if (oneSignalResult?.sent) {
    return { attempted: oneSignalResult.attempted, sent: oneSignalResult.sent };
  }

  const { rows } = await pool.query(
    `
      SELECT id, fcm_token AS "fcmToken"
      FROM users
      WHERE id = ANY($1::varchar[])
        AND is_deleted = false
        AND fcm_token IS NOT NULL
        AND length(trim(fcm_token)) > 0
    `,
    [cleanTargetIds],
  );

  if (!rows.length) return { attempted: 0, sent: 0 };

  let sent = 0;
  const messaging = await getAdminMessaging().catch((error) => {
    console.warn('Premium chat push unavailable:', error instanceof Error ? error.message : error);
    return null;
  });
  if (!messaging) return { attempted: rows.length, sent: 0 };

  const payloadData = fcmData(data);

  for (const row of rows) {
    const token = cleanString(row.fcmToken);
    if (!token) continue;

    try {
      await messaging.send({
        token,
        notification: { title, body },
        data: payloadData,
        android: {
          priority: 'high',
          notification: {
            channelId: androidChannelId,
            priority: 'max',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      } as any);
      sent += 1;
    } catch (error) {
      console.warn('Premium chat push failed:', error instanceof Error ? error.message : error);
    }
  }

  return { attempted: rows.length, sent };
}
