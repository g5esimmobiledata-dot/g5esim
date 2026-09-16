import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { users, voucherCodes } from "@shared/schema";

const VOUCHER_LIMIT_KEY_PREFIX = "voucher_limit_user_";

export function getVoucherLimitSettingKey(userId: string) {
  return `${VOUCHER_LIMIT_KEY_PREFIX}${userId}`;
}

function toMoneyNumber(value: unknown) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

export async function getVoucherLimitUsage(userId: string) {
  const [usage] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${voucherCodes.value}::numeric * GREATEST(COALESCE(${voucherCodes.maxUses}, 1) - ${voucherCodes.currentUses}, 0)), 0)`,
    })
    .from(voucherCodes)
    .where(
      and(
        eq(voucherCodes.createdByUser, userId),
        eq(voucherCodes.type, "wallet_credit"),
        eq(voucherCodes.status, "active"),
        sql`${voucherCodes.validUntil} > NOW()`,
      ),
    );

  return toMoneyNumber(usage?.total);
}

export async function getVoucherLimitForUser(userId: string) {
  const [user, setting] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, userId),
    }),
    storage.getSettingByKey(getVoucherLimitSettingKey(userId)),
  ]);

  const limit = Math.max(0, toMoneyNumber(setting?.value));
  const used = await getVoucherLimitUsage(userId);
  const unlimited = limit <= 0;

  return {
    user,
    limit,
    used,
    remaining: unlimited ? null : Math.max(limit - used, 0),
    unlimited,
  };
}

export async function saveVoucherLimitForUser(userId: string, limit: number) {
  const safeLimit = Math.max(0, toMoneyNumber(limit));
  await storage.setSetting({
    key: getVoucherLimitSettingKey(userId),
    value: safeLimit.toFixed(2),
    category: "vouchers",
  });
  return getVoucherLimitForUser(userId);
}

