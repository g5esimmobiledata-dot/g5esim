import { and, eq, ne } from "drizzle-orm";
import { db } from "server/db";
import { platformSettings, settings, userVirtualNumbers } from "@shared/schema";

export const SENDER_ID_DEFAULT_LIMIT_SETTING_KEY = "sender_id_default_limit";
export const SENDER_ID_USER_LIMIT_PREFIX = "sender_id_limit:";

const DEFAULT_SENDER_ID_LIMIT = 1;
const MAX_SENDER_ID_LIMIT = 100;

export type SenderIdLimitStatus = {
  defaultLimit: number;
  overrideLimit: number | null;
  effectiveLimit: number;
  used: number;
  remaining: number;
  senders: string[];
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export function parseSenderIdLimit(value: unknown, fallback = DEFAULT_SENDER_ID_LIMIT) {
  const raw = clean(value);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(MAX_SENDER_ID_LIMIT, Math.trunc(parsed)));
}

export function parseSenderIdLimitOverride(value: unknown) {
  const raw = clean(value);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error("Sender ID limit must be a number");
  }
  if (parsed < 0 || parsed > MAX_SENDER_ID_LIMIT) {
    throw new Error(`Sender ID limit must be between 0 and ${MAX_SENDER_ID_LIMIT}`);
  }
  return Math.trunc(parsed);
}

function addSender(senderMap: Map<string, string>, value: unknown) {
  const sender = clean(value);
  if (!sender) return;
  senderMap.set(sender.toLowerCase(), sender);
}

function addSendersFromMetadata(senderMap: Map<string, string>, metadata: unknown) {
  const senderId = ((metadata as Record<string, any> | null | undefined) || {}).senderId || {};
  const status = clean(senderId.status).toLowerCase();
  const approvedList = Array.isArray(senderId.approvedList) ? senderId.approvedList : [];

  approvedList.forEach((sender: unknown) => addSender(senderMap, sender));
  addSender(senderMap, senderId.approved);

  if (status === "pending") {
    addSender(senderMap, senderId.requested);
  }
}

export async function getDefaultSenderIdLimit() {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, SENDER_ID_DEFAULT_LIMIT_SETTING_KEY))
    .limit(1);

  return parseSenderIdLimit(row?.value, DEFAULT_SENDER_ID_LIMIT);
}

export async function getUserSenderIdLimitOverride(userId: string) {
  const [row] = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, `${SENDER_ID_USER_LIMIT_PREFIX}${userId}`))
    .limit(1);

  return row ? parseSenderIdLimitOverride(row.value) : null;
}

export async function getSenderIdLimitStatus(
  userId: string,
  options: {
    excludeVirtualNumberId?: string | null;
    candidateSenderId?: string | null;
  } = {},
): Promise<SenderIdLimitStatus> {
  const defaultLimit = await getDefaultSenderIdLimit();
  const overrideLimit = await getUserSenderIdLimitOverride(userId);
  const effectiveLimit = overrideLimit ?? defaultLimit;

  const baseWhere = eq(userVirtualNumbers.userId, userId);
  const whereClause = clean(options.excludeVirtualNumberId)
    ? and(baseWhere, ne(userVirtualNumbers.id, clean(options.excludeVirtualNumberId)))
    : baseWhere;

  const rows = await db
    .select({
      metadata: userVirtualNumbers.metadata,
    })
    .from(userVirtualNumbers)
    .where(whereClause);

  const senderMap = new Map<string, string>();
  rows.forEach((row) => addSendersFromMetadata(senderMap, row.metadata));
  addSender(senderMap, options.candidateSenderId);

  const senders = Array.from(senderMap.values());

  return {
    defaultLimit,
    overrideLimit,
    effectiveLimit,
    used: senders.length,
    remaining: Math.max(effectiveLimit - senders.length, 0),
    senders,
  };
}

export async function assertSenderIdLimitAvailable(
  userId: string,
  candidateSenderId: string,
  options: { excludeVirtualNumberId?: string | null } = {},
) {
  const status = await getSenderIdLimitStatus(userId, {
    ...options,
    candidateSenderId,
  });

  if (status.used > status.effectiveLimit) {
    const label = status.effectiveLimit === 1 ? "Sender ID" : "Sender IDs";
    throw new Error(
      `Sender ID limit reached. This account can add ${status.effectiveLimit} ${label}.`,
    );
  }

  return status;
}

export async function saveUserSenderIdLimit(
  userId: string,
  rawLimit: unknown,
  adminId?: string | null,
) {
  const limit = parseSenderIdLimitOverride(rawLimit);
  const key = `${SENDER_ID_USER_LIMIT_PREFIX}${userId}`;

  if (limit === null) {
    await db.delete(platformSettings).where(eq(platformSettings.key, key));
    return getSenderIdLimitStatus(userId);
  }

  await db
    .insert(platformSettings)
    .values({
      key,
      value: String(limit),
      category: "sms",
      description: "Per-user custom Sender ID limit override",
      updatedBy: adminId || null,
    })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: {
        value: String(limit),
        category: "sms",
        description: "Per-user custom Sender ID limit override",
        updatedAt: new Date(),
        updatedBy: adminId || null,
      },
    });

  return getSenderIdLimitStatus(userId);
}
