import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { notifications, settings, users, walletTransactions } from "@shared/schema";

const REGISTRATION_BONUS_ENABLED_KEY = "registration_bonus_enabled";
const REGISTRATION_BONUS_AMOUNT_KEY = "registration_bonus_amount";
const REGISTRATION_BONUS_TRANSACTION_TYPE = "registration_bonus";

function money(value: number) {
  return value.toFixed(2);
}

function toMoneyNumber(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

export async function getRegistrationBonusSettings() {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, [REGISTRATION_BONUS_ENABLED_KEY, REGISTRATION_BONUS_AMOUNT_KEY]));

  const values = new Map(rows.map((row) => [row.key, row.value]));
  const amount = toMoneyNumber(values.get(REGISTRATION_BONUS_AMOUNT_KEY) || "0");

  return {
    enabled: values.get(REGISTRATION_BONUS_ENABLED_KEY) === "true",
    amount: amount > 0 ? amount : 0,
    currency: "USD",
  };
}

export async function awardRegistrationBonus(
  userId: string,
  metadata: Record<string, unknown> = {},
) {
  const config = await getRegistrationBonusSettings();
  if (!config.enabled || config.amount <= 0) {
    return { awarded: false as const, reason: "disabled" as const };
  }

  const result = await db.transaction(async (tx) => {
    const [customer] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!customer) {
      return { awarded: false as const, reason: "user_not_found" as const };
    }

    const [existingBonus] = await tx
      .select({ id: walletTransactions.id })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.userId, userId),
          eq(walletTransactions.type, REGISTRATION_BONUS_TRANSACTION_TYPE),
          eq(walletTransactions.status, "completed"),
        ),
      )
      .limit(1);

    if (existingBonus) {
      return { awarded: false as const, reason: "already_awarded" as const };
    }

    const balanceBefore = toMoneyNumber(customer.walletBalance || "0.00");
    const balanceAfter = balanceBefore + config.amount;
    const now = new Date();

    const [updatedUser] = await tx
      .update(users)
      .set({
        walletBalance: money(balanceAfter),
        updatedAt: now,
      })
      .where(eq(users.id, userId))
      .returning();

    const [transaction] = await tx
      .insert(walletTransactions)
      .values({
        userId,
        type: REGISTRATION_BONUS_TRANSACTION_TYPE,
        status: "completed",
        amount: money(config.amount),
        currency: config.currency,
        balanceBefore: money(balanceBefore),
        balanceAfter: money(balanceAfter),
        provider: "system",
        referenceId: `registration_bonus:${userId}`,
        description: "Registration bonus",
        metadata: {
          ...metadata,
          bonusType: "registration",
        },
        completedAt: now,
      })
      .returning();

    await tx.insert(notifications).values({
      userId,
      type: "wallet",
      title: "Registration bonus added",
      message: `$${money(config.amount)} has been added to your wallet as a welcome bonus.`,
      read: false,
      metadata: {
        transactionId: transaction.id,
        amount: money(config.amount),
      },
    });

    return {
      awarded: true as const,
      amount: money(config.amount),
      user: updatedUser,
      transaction,
    };
  });

  return result;
}
