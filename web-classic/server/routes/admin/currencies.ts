"use strict";

import { Router, type Request, type Response } from "express";
import { ne, eq } from "drizzle-orm";
import { currencyRates, type CurrencyRate } from "@shared/schema";
import { db } from "../../db";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAdmin } from "../../lib/middleware";
import { storage } from "../../storage";
import * as ApiResponse from "../../utils/response";

const router = Router();

function normalizeCurrencyCode(code: unknown) {
  return String(code || "").trim().toUpperCase();
}

function normalizePositiveRate(value: unknown) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? String(rate) : null;
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

function buildCurrencyUpdate(body: Record<string, unknown>) {
  const updateData: Partial<CurrencyRate> = {};

  if (body.code !== undefined) {
    const code = normalizeCurrencyCode(body.code);
    if (!code) return { error: "Currency code is required" };
    updateData.code = code;
  }

  if (body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (!name) return { error: "Currency name is required" };
    updateData.name = name;
  }

  if (body.symbol !== undefined) {
    const symbol = String(body.symbol || "").trim();
    if (!symbol) return { error: "Currency symbol is required" };
    updateData.symbol = symbol;
  }

  if (body.conversionRate !== undefined) {
    const conversionRate = normalizePositiveRate(body.conversionRate);
    if (!conversionRate) return { error: "Conversion rate must be a positive number" };
    updateData.conversionRate = conversionRate;
  }

  if (body.isEnabled !== undefined) {
    updateData.isEnabled = normalizeBoolean(body.isEnabled);
  }

  if (body.isDefault !== undefined) {
    updateData.isDefault = normalizeBoolean(body.isDefault);
  }

  return { updateData };
}

router.get(
  "/",
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const currencies = await storage.getCurrencies();
    return ApiResponse.success(res, "Currencies fetched successfully", currencies);
  }),
);

router.post(
  "/",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const code = normalizeCurrencyCode(req.body.code);
    const name = String(req.body.name || "").trim();
    const symbol = String(req.body.symbol || code).trim();
    const conversionRate = normalizePositiveRate(req.body.conversionRate);

    if (!code || !name || !symbol) {
      return ApiResponse.badRequest(res, "Code, name, and symbol are required");
    }

    if (!conversionRate) {
      return ApiResponse.badRequest(res, "Conversion rate must be a positive number");
    }

    const currency = await storage.createCurrency({
      code,
      name,
      symbol,
      conversionRate,
      isEnabled: req.body.isEnabled !== undefined ? normalizeBoolean(req.body.isEnabled) : true,
      isDefault: normalizeBoolean(req.body.isDefault),
    });

    if (currency.isDefault) {
      await db
        .update(currencyRates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(ne(currencyRates.id, currency.id));
    }

    return ApiResponse.created(res, "Currency created successfully", currency);
  }),
);

router.put(
  "/:id",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { updateData, error } = buildCurrencyUpdate(req.body);

    if (error) {
      return ApiResponse.badRequest(res, error);
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return ApiResponse.badRequest(res, "No valid fields provided for update");
    }

    let currency: CurrencyRate | undefined;

    if (updateData.isDefault === true) {
      await db.transaction(async (tx) => {
        await tx
          .update(currencyRates)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(ne(currencyRates.id, req.params.id));

        const [updated] = await tx
          .update(currencyRates)
          .set({ ...updateData, isDefault: true, updatedAt: new Date() })
          .where(eq(currencyRates.id, req.params.id))
          .returning();

        currency = updated;
      });
    } else {
      currency = await storage.updateCurrency(req.params.id, updateData);
    }

    if (!currency) {
      return ApiResponse.notFound(res, "Currency not found");
    }

    return ApiResponse.success(res, "Currency updated successfully", currency);
  }),
);

router.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const currency = await storage.getCurrencyById(req.params.id);

    if (!currency) {
      return ApiResponse.notFound(res, "Currency not found");
    }

    if (currency.isDefault) {
      return ApiResponse.badRequest(res, "Default currency cannot be deleted");
    }

    await storage.deleteCurrency(req.params.id);
    return ApiResponse.success(res, "Currency deleted successfully");
  }),
);

export default router;
