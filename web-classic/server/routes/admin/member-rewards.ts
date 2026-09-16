import { Router, type Request, type Response } from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "server/db";
import { requireAdmin } from "server/lib/middleware";
import { storage } from "server/storage";
import * as ApiResponse from "server/utils/response";
import { users } from "@shared/schema";
import {
  getMemberRewardsProgramConfig,
  saveMemberRewardsProgramConfig,
  ensureMemberRewardsSchema,
} from "server/services/member-rewards-service";

const router = Router();

const tierKeySchema = z.enum(["standard", "gold", "platinum"]);

const tierConfigSchema = z.object({
  label: z.string().trim().min(1).max(80),
  rewardRatePercent: z.coerce.number().min(0).max(100),
  conversionThreshold: z.coerce.number().min(0).max(100000),
  color: z.string().trim().min(1).max(40).optional(),
});

const programSchema = z.object({
  enabled: z.coerce.boolean(),
  currency: z.string().trim().min(3).max(8).default("USD"),
  tiers: z.object({
    standard: tierConfigSchema,
    gold: tierConfigSchema,
    platinum: tierConfigSchema,
  }),
});

const memberTierSchema = z.object({
  tier: tierKeySchema,
});

router.get("/", requireAdmin, async (_req: Request, res: Response) => {
  try {
    await ensureMemberRewardsSchema();
    const config = await getMemberRewardsProgramConfig();

    const [stats] = await db
      .select({
        totalMembers: sql<number>`COUNT(*) FILTER (WHERE ${users.isDeleted} = false)`.mapWith(Number),
        standardMembers: sql<number>`COUNT(*) FILTER (WHERE ${users.isDeleted} = false AND COALESCE(${users.memberTier}, 'standard') = 'standard')`.mapWith(Number),
        goldMembers: sql<number>`COUNT(*) FILTER (WHERE ${users.isDeleted} = false AND ${users.memberTier} = 'gold')`.mapWith(Number),
        platinumMembers: sql<number>`COUNT(*) FILTER (WHERE ${users.isDeleted} = false AND ${users.memberTier} = 'platinum')`.mapWith(Number),
        totalRewardBalance: sql<string>`COALESCE(SUM(${users.memberRewardBalance}::numeric) FILTER (WHERE ${users.isDeleted} = false), 0)`,
        lifetimeRewards: sql<string>`COALESCE(SUM(${users.memberRewardLifetime}::numeric) FILTER (WHERE ${users.isDeleted} = false), 0)`,
      })
      .from(users);

    return ApiResponse.success(res, "Member rewards program fetched", {
      config,
      stats,
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to fetch member rewards program");
  }
});

router.put("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = programSchema.parse(req.body);
    const config = await saveMemberRewardsProgramConfig(data);

    return ApiResponse.success(res, "Member rewards program updated", config);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(res, "Invalid member rewards settings", error.errors);
    }
    return ApiResponse.serverError(res, error.message || "Failed to update member rewards program");
  }
});

router.get("/members", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureMemberRewardsSchema();

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(5, Number(req.query.limit || 10)));
    const offset = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const tier = String(req.query.tier || "all").trim();

    const conditions = [eq(users.isDeleted, false)];

    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.phone, `%${search}%`),
        ) as any,
      );
    }

    if (tier !== "all") {
      const parsedTier = tierKeySchema.safeParse(tier);
      if (parsedTier.success) {
        conditions.push(eq(users.memberTier, parsedTier.data));
      }
    }

    const whereCondition = and(...conditions);

    const [data, totalResult] = await Promise.all([
      db
        .select({
          id: users.id,
          displayUserId: users.displayUserId,
          email: users.email,
          name: users.name,
          phone: users.phone,
          role: users.role,
          memberTier: users.memberTier,
          memberRewardBalance: users.memberRewardBalance,
          memberRewardLifetime: users.memberRewardLifetime,
          walletBalance: users.walletBalance,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(whereCondition)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
        .from(users)
        .where(whereCondition),
    ]);

    const total = totalResult[0]?.count || 0;

    return ApiResponse.success(res, "Member rewards members fetched", {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to fetch member reward members");
  }
});

router.patch("/members/:id/tier", requireAdmin, async (req: Request, res: Response) => {
  try {
    await ensureMemberRewardsSchema();
    const { tier } = memberTierSchema.parse(req.body);
    const user = await storage.updateUser(req.params.id, { memberTier: tier } as any);

    if (!user) {
      return ApiResponse.notFound(res, "Member not found");
    }

    return ApiResponse.success(res, "Member tier updated", user);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(res, "Invalid member tier", error.errors);
    }
    return ApiResponse.serverError(res, error.message || "Failed to update member tier");
  }
});

export default router;
