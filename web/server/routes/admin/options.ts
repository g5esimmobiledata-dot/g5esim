import { Router, type Request, type Response } from "express";
import { platformSettings } from "@shared/schema";
import {
  normalizeRoleOptionsConfig,
  ROLE_OPTIONS_SETTING_KEY,
  ROLE_OPTIONS_VERSION,
} from "@shared/roleOptions";
import { db } from "../../db";
import { requireAdmin } from "../../lib/middleware";
import * as ApiResponse from "../../utils/response";
import { getStoredRoleOptionsConfig } from "../../utils/roleOptionsConfig";

const router = Router();

router.get("/", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const config = await getStoredRoleOptionsConfig();
    return ApiResponse.success(res, "Options fetched successfully", config);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to fetch options");
  }
});

router.put("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).admin?.id || (req as any).session?.adminId || null;
    const config = normalizeRoleOptionsConfig(req.body);
    const value = JSON.stringify({ ...config, version: ROLE_OPTIONS_VERSION });

    await db
      .insert(platformSettings)
      .values({
        key: ROLE_OPTIONS_SETTING_KEY,
        value,
        description: "Enabled and disabled modules by customer account type",
        category: "options",
        updatedBy: adminId,
      })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: {
          value,
          description: "Enabled and disabled modules by customer account type",
          category: "options",
          updatedAt: new Date(),
          updatedBy: adminId,
        },
      });

    return ApiResponse.success(res, "Options updated successfully", config);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to update options");
  }
});

export default router;
