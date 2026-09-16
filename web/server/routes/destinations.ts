"use strict";

import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { asyncHandler } from "../lib/asyncHandler";
import { NotFoundError } from "../lib/errors";
import * as ApiResponse from "../utils/response";
import { convertUsdPrice, getRequestPricingRole } from "../helpers/packagePricing";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'public, max-age=600');
    const destinations = await storage.getAllDestinations();
    return ApiResponse.success(res, "Destinations fetched successfully", destinations);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.get("/with-pricing", async (req: Request, res: Response) => {
  try {
    const requestedCurrency = (req.query.currency as string) || "USD";
    const { userId, isReseller, priceType } = await getRequestPricingRole(req);
    const destinations = await storage.getDestinationsWithPricing(isReseller ? userId : null);
    
    const currencyRates = await storage.getCurrencies();
    
    const convertedDestinations = destinations.map(dest => ({
      ...dest,
      minPrice: convertUsdPrice(Number(dest.minPrice || 0), requestedCurrency, currencyRates).toFixed(2),
      currency: requestedCurrency,
      priceType,
    }));
    
    return ApiResponse.success(res, "Destinations with pricing fetched successfully", convertedDestinations);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.get("/slug/:slug", async (req: Request, res: Response) => {
  try {
    const destination = await storage.getDestinationBySlug(req.params.slug);
    if (!destination) {
      return ApiResponse.notFound(res, "Destination not found");
    }
    return ApiResponse.success(res, "Destination fetched successfully", destination);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

export default router;
