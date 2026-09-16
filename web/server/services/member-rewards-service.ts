import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "server/db";
import { storage } from "server/storage";
import { memberRewardTransactions, users, walletTransactions } from "@shared/schema";

export type MemberTierKey = "standard" | "gold" | "platinum";

export type MemberTierConfig = {
  key: MemberTierKey;
  label: string;
  rewardRatePercent: number;
  conversionThreshold: number;
  color: string;
};

export type MemberRewardsProgramConfig = {
  enabled: boolean;
  currency: string;
  tiers: Record<MemberTierKey, MemberTierConfig>;
};

const MEMBER_REWARDS_SETTING_KEY = "member_rewards_program";

export const DEFAULT_MEMBER_TIERS: Record<MemberTierKey, MemberTierConfig> = {
  standard: {
    key: "standard",
    label: "Standard Member",
    rewardRatePercent: 1,
    conversionThreshold: 10,
    color: "slate",
  },
  gold: {
    key: "gold",
    label: "Gold Member",
    rewardRatePercent: 2,
    conversionThreshold: 25,
    color: "amber",
  },
  platinum: {
    key: "platinum",
    label: "Platium Member",
    rewardRatePercent: 3,
    conversionThreshold: 50,
    color: "cyan",
  },
};

export const DEFAULT_MEMBER_REWARDS_PROGRAM: MemberRewardsProgramConfig = {
  enabled: true,
  currency: "USD",
  tiers: DEFAULT_MEMBER_TIERS,
};

let ensurePromise: Promise<void> | null = null;

function toNumber(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function money(value: unknown): string {
  const amount = Math.round(toNumber(value) * 100) / 100;
  return amount.toFixed(2);
}

function normalizeTier(value: unknown): MemberTierKey {
  const tier = String(value || "").toLowerCase();
  if (tier === "gold" || tier === "platinum") return tier;
  return "standard";
}

function getNextTier(tier: MemberTierKey) {
  if (tier === "standard") return "gold" as const;
  if (tier === "gold") return "platinum" as const;
  return null;
}

function normalizeTierConfig(tier: MemberTierKey, value: any): MemberTierConfig {
  const fallback = DEFAULT_MEMBER_TIERS[tier];
  const rewardRatePercent = Number(value?.rewardRatePercent);
  const conversionThreshold = Number(value?.conversionThreshold);

  return {
    key: tier,
    label: String(value?.label || fallback.label).trim() || fallback.label,
    rewardRatePercent: Number.isFinite(rewardRatePercent)
      ? Math.max(0, Math.round(rewardRatePercent * 100) / 100)
      : fallback.rewardRatePercent,
    conversionThreshold: Number.isFinite(conversionThreshold)
      ? Math.max(0, Math.round(conversionThreshold * 100) / 100)
      : fallback.conversionThreshold,
    color: String(value?.color || fallback.color).trim() || fallback.color,
  };
}

export async function getMemberRewardsProgramConfig(): Promise<MemberRewardsProgramConfig> {
  await ensureMemberRewardsSchema();

  const setting = await storage.getSettingByKey(MEMBER_REWARDS_SETTING_KEY);
  let parsed: any = {};

  if (setting?.value) {
    try {
      parsed = JSON.parse(setting.value);
    } catch {
      parsed = {};
    }
  }

  return {
    enabled: parsed.enabled !== false,
    currency: String(parsed.currency || "USD").toUpperCase(),
    tiers: {
      standard: normalizeTierConfig("standard", parsed.tiers?.standard),
      gold: normalizeTierConfig("gold", parsed.tiers?.gold),
      platinum: normalizeTierConfig("platinum", parsed.tiers?.platinum),
    },
  };
}

export async function saveMemberRewardsProgramConfig(input: Partial<MemberRewardsProgramConfig>) {
  await ensureMemberRewardsSchema();

  const config: MemberRewardsProgramConfig = {
    enabled: input.enabled !== false,
    currency: String(input.currency || "USD").toUpperCase(),
    tiers: {
      standard: normalizeTierConfig("standard", input.tiers?.standard),
      gold: normalizeTierConfig("gold", input.tiers?.gold),
      platinum: normalizeTierConfig("platinum", input.tiers?.platinum),
    },
  };

  await storage.setSetting({
    key: MEMBER_REWARDS_SETTING_KEY,
    value: JSON.stringify(config),
    category: "member_rewards",
  });

  return config;
}

export async function ensureMemberRewardsSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await db.execute(sql`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS member_tier text NOT NULL DEFAULT 'standard',
          ADD COLUMN IF NOT EXISTS member_reward_balance decimal(10, 2) NOT NULL DEFAULT '0.00',
          ADD COLUMN IF NOT EXISTS member_reward_lifetime decimal(10, 2) NOT NULL DEFAULT '0.00'
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS member_reward_transactions (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type text NOT NULL,
          tier text NOT NULL DEFAULT 'standard',
          amount decimal(10, 2) NOT NULL,
          source_amount decimal(10, 2),
          source_type text,
          source_id text,
          balance_before decimal(10, 2) NOT NULL DEFAULT '0.00',
          balance_after decimal(10, 2) NOT NULL DEFAULT '0.00',
          description text,
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamp NOT NULL DEFAULT now()
        )
      `);

      await db.execute(sql`CREATE INDEX IF NOT EXISTS member_reward_transactions_user_id_idx ON member_reward_transactions(user_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS member_reward_transactions_type_idx ON member_reward_transactions(type)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS member_reward_transactions_source_id_idx ON member_reward_transactions(source_id)`);
    })();
  }

  return ensurePromise;
}

export async function getMemberRewardsDashboard(userId: string) {
  await ensureMemberRewardsSchema();

  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const tierKey = normalizeTier((user as any).memberTier);
  const config = await getMemberRewardsProgramConfig();
  const tier = config.tiers[tierKey];
  const rewardBalance = toNumber((user as any).memberRewardBalance);
  const lifetimeRewards = toNumber((user as any).memberRewardLifetime);
  const nextTierKey = getNextTier(tierKey);
  const nextTier = nextTierKey ? config.tiers[nextTierKey] : null;

  const transactions = await db
    .select()
    .from(memberRewardTransactions)
    .where(eq(memberRewardTransactions.userId, userId))
    .orderBy(desc(memberRewardTransactions.createdAt))
    .limit(30);

  return {
    tier,
    enabled: config.enabled,
    tiers: Object.values(config.tiers),
    nextTier,
    rewardBalance: Number(money(rewardBalance)),
    lifetimeRewards: Number(money(lifetimeRewards)),
    conversionThreshold: tier.conversionThreshold,
    canConvert: rewardBalance >= tier.conversionThreshold,
    progressPercent: Math.min(100, Math.round((rewardBalance / tier.conversionThreshold) * 100)),
    remainingToConvert: Number(money(Math.max(0, tier.conversionThreshold - rewardBalance))),
    transactions,
  };
}

export async function awardMemberReward({
  userId,
  sourceAmount,
  sourceType,
  sourceId,
  description,
  metadata = {},
}: {
  userId: string;
  sourceAmount: number;
  sourceType: string;
  sourceId?: string | null;
  description?: string;
  metadata?: Record<string, unknown>;
}) {
  await ensureMemberRewardsSchema();

  const sourceAmountNumber = toNumber(sourceAmount);
  if (sourceAmountNumber <= 0) {
    return null;
  }

  if (sourceId) {
    const [existing] = await db
      .select()
      .from(memberRewardTransactions)
      .where(
        and(
          eq(memberRewardTransactions.userId, userId),
          eq(memberRewardTransactions.type, "earned"),
          eq(memberRewardTransactions.sourceType, sourceType),
          eq(memberRewardTransactions.sourceId, sourceId),
        ),
      )
      .limit(1);

    if (existing) return existing;
  }

  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const tierKey = normalizeTier((user as any).memberTier);
  const config = await getMemberRewardsProgramConfig();
  if (!config.enabled) {
    return null;
  }
  const tier = config.tiers[tierKey];
  const rewardAmount = Number(money(sourceAmountNumber * (tier.rewardRatePercent / 100)));

  if (rewardAmount <= 0) {
    return null;
  }

  return db.transaction(async (tx) => {
    const [updatedUser] = await tx
      .update(users)
      .set({
        memberRewardBalance: sql`${users.memberRewardBalance}::numeric + ${rewardAmount}`,
        memberRewardLifetime: sql`${users.memberRewardLifetime}::numeric + ${rewardAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error("User not found");
    }

    const balanceAfter = toNumber((updatedUser as any).memberRewardBalance);
    const balanceBefore = balanceAfter - rewardAmount;

    const [transaction] = await tx
      .insert(memberRewardTransactions)
      .values({
        userId,
        type: "earned",
        tier: tierKey,
        amount: money(rewardAmount),
        sourceAmount: money(sourceAmountNumber),
        sourceType,
        sourceId: sourceId || null,
        balanceBefore: money(balanceBefore),
        balanceAfter: money(balanceAfter),
        description: description || `Reward earned from ${sourceType.replace(/_/g, " ")}`,
        metadata,
      })
      .returning();

    return transaction;
  });
}

export async function convertMemberRewardsToWallet(userId: string) {
  await ensureMemberRewardsSchema();

  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const tierKey = normalizeTier((user as any).memberTier);
  const config = await getMemberRewardsProgramConfig();
  if (!config.enabled) {
    throw new Error("Member rewards program is currently disabled.");
  }
  const tier = config.tiers[tierKey];
  const rewardBalance = Number(money((user as any).memberRewardBalance));
  const walletBalanceBefore = Number(money((user as any).walletBalance));

  if (rewardBalance < tier.conversionThreshold) {
    const needed = money(tier.conversionThreshold - rewardBalance);
    throw new Error(`You need $${needed} more rewards before converting to wallet balance.`);
  }

  const result = await db.transaction(async (tx) => {
    const [updatedUser] = await tx
      .update(users)
      .set({
        memberRewardBalance: "0.00",
        walletBalance: sql`${users.walletBalance}::numeric + ${rewardBalance}`,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, userId), sql`${users.memberRewardBalance}::numeric >= ${tier.conversionThreshold}`))
      .returning();

    if (!updatedUser) {
      throw new Error("Reward balance is below the conversion threshold.");
    }

    const walletBalanceAfter = Number(money((updatedUser as any).walletBalance));

    const [rewardTransaction] = await tx
      .insert(memberRewardTransactions)
      .values({
        userId,
        type: "converted",
        tier: tierKey,
        amount: money(rewardBalance),
        sourceAmount: money(rewardBalance),
        sourceType: "wallet_conversion",
        sourceId: null,
        balanceBefore: money(rewardBalance),
        balanceAfter: "0.00",
        description: "Member rewards converted to wallet balance",
        metadata: {
          conversionThreshold: tier.conversionThreshold,
          walletBalanceBefore,
          walletBalanceAfter,
        },
      })
      .returning();

    const [walletTransaction] = await tx
      .insert(walletTransactions)
      .values({
        userId,
        type: "member_reward_topup",
        status: "completed",
        amount: money(rewardBalance),
        currency: "USD",
        balanceBefore: money(walletBalanceBefore),
        balanceAfter: money(walletBalanceAfter),
        provider: "member_rewards",
        referenceId: rewardTransaction.id,
        description: "Member rewards converted to wallet balance",
        metadata: {
          rewardTransactionId: rewardTransaction.id,
          memberTier: tierKey,
        },
        completedAt: new Date(),
      })
      .returning();

    return {
      amount: Number(money(rewardBalance)),
      walletBalance: Number(money(walletBalanceAfter)),
      rewardTransaction,
      walletTransaction,
    };
  });

  try {
    await storage.createNotification({
      userId,
      type: "wallet",
      title: "Rewards converted",
      message: `$${money(result.amount)} was added to your wallet from member rewards.`,
      read: false,
      metadata: {
        walletTransactionId: result.walletTransaction.id,
        rewardTransactionId: result.rewardTransaction.id,
      },
    });
  } catch (error) {
    console.warn("Member reward conversion notification failed:", error);
  }

  return result;
}
