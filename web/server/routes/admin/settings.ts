"use strict";

import { Router, type Request, type Response } from "express";
import { storage } from "../../storage";
import { asyncHandler } from "../../lib/asyncHandler";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { requireAdmin } from "../../lib/middleware";
import { logger } from "../../lib/logger";
import * as ApiResponse from "../../utils/response";

const router = Router();

router.get(
  "/",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const settings = await storage.getAllSettings();
    return ApiResponse.success(res, "Settings fetched successfully", settings);
  })
);

router.put(
  "/:key",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { value, category } = req.body;
    const { key } = req.params;

    if (value === undefined) {
      return ApiResponse.badRequest(res, "Value is required");
    }

    const setting = await storage.setSetting({ 
      key, 
      value: String(value),
      category: category || "general"
    });

    logger.info("Setting updated", {
      key,
      adminId: req.session.adminId,
    });

    return ApiResponse.success(res, "Setting updated successfully", setting);
  })
);

router.get(
  "/currencies",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const currencies = await storage.getCurrencies();
    return ApiResponse.success(res, "Currencies fetched successfully", currencies);
  })
);

router.post(
  "/currencies",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { code, name, symbol, conversionRate } = req.body;

    if (!code || !name || !conversionRate) {
      return ApiResponse.badRequest(res, "Code, name, and conversion rate are required");
    }

    const currency = await storage.createCurrency({
      code,
      name,
      symbol: symbol || code,
      conversionRate: String(conversionRate),
      isEnabled: true,
    });

    return ApiResponse.created(res, "Currency created successfully", { currency });
  })
);

router.put(
  "/currencies/:id",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { code, name, symbol, conversionRate, isEnabled } = req.body;

    const currency = await storage.updateCurrency(req.params.id, {
      code,
      name,
      symbol,
      conversionRate: conversionRate ? String(conversionRate) : undefined,
      isEnabled,
    });

    if (!currency) {
      return ApiResponse.notFound(res, "Currency not found");
    }

    return ApiResponse.success(res, "Currency updated successfully", currency);
  })
);

router.delete(
  "/currencies/:id",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    await storage.deleteCurrency(req.params.id);
    return ApiResponse.success(res, "Currency deleted successfully");
  })
);

export default router;
