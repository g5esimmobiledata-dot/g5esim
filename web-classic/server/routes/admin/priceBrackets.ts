"use strict";

import { Router, type Request, type Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { requireAdmin } from "../../lib/middleware";
import * as ApiResponse from "../../utils/response";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { priceBrackets, unifiedPackages } from "@shared/schema";
import { uuid } from "drizzle-orm/pg-core";
import { createImages } from "server/services/screenshot.service";
import { CreateInAppProductJob } from "server/jobs/createInAppProduct.job";
import { AppleStoreIapJob } from "server/jobs/appleStoreIap.job";

const router = Router();

// router.post(
//     "/generate",
//     requireAdmin,
//     asyncHandler(async (req: Request, res: Response) => {
//         const { currency, priceDiff } = req.body;

//         if (!currency || !priceDiff) {
//             throw new ValidationError("currency and priceDiff are required");
//         }

//         // 1️⃣ Get min & max retail price
//         const res123 = await db.execute<{ min: string; max: string }>(sql`
//       SELECT 
//         MIN(retail_price) AS min,
//         MAX(retail_price) AS max
//       FROM unified_packages
//       WHERE currency = ${currency}
//         AND is_enabled = true
//     `);

//         const [{ min, max }] = res123.rows;
//         if (!min || !max) {
//             throw new NotFoundError("No packages found for currency");
//         }

//         const minPrice = Math.floor(Number(min) / priceDiff) * priceDiff;
//         const maxPrice = Math.ceil(Number(max) / priceDiff) * priceDiff;

//         const bracketsToUpsert = [];

//         // 2️⃣ Generate price brackets
//         for (let start = minPrice; start <= maxPrice; start += priceDiff) {
//             const end = start + priceDiff - 1;

//             const [image] = await createImages([
//                 {
//                     showIap: true,
//                     appName: "Esimtel",
//                     product: {
//                         name: `test_pkg_${currency}_${start}_${end}`,
//                         price: end,
//                         currency,
//                         description: "eSIM in 30 seconds",
//                         slug: `pkg_${currency}_${start}_${end}`,
//                     },
//                 },
//             ]);

//             bracketsToUpsert.push({
//                 currency,
//                 minPrice: start,
//                 maxPrice: end,
//                 setPrice: end,
//                 packageImage: image,
//                 productId: `test1_pkg_${currency}_${start}_${end}`,
//                 androidStatus: "pending",
//                 appleStatus: "pending",
//                 isActive: true,
//             });
//         }

//         // 3️⃣ UPSERT (insert or update)
//         const upserted = await db
//             .insert(priceBrackets)
//             .values(bracketsToUpsert)
//             .onConflictDoUpdate({
//                 target: [
//                     priceBrackets.currency,
//                     priceBrackets.minPrice,
//                     priceBrackets.maxPrice,
//                     priceBrackets.productId, // Added productId
//                 ],
//                 set: {
//                     setPrice: sql`excluded.set_price`,
//                     packageImage: sql`excluded.package_image`,
//                     productId: sql`excluded.product_id`,
//                     androidStatus: "pending",
//                     appleStatus: "pending",
//                     isActive: true,
//                     updatedAt: sql`now()`,
//                 },
//             })
//             .returning();

//         // 4️⃣ Sync Android IAP (safe & sequential)
//         const results: any[] = [];

//         for (const bracket of upserted) {
//             try {
//                 const job = new CreateInAppProductJob({
//                     sku: bracket.productId,
//                     title: bracket.productId,
//                     description: "eSIM in 30 seconds",
//                     price: Number(bracket.setPrice),
//                     currency: bracket.currency,
//                 });

//                 await job.handle();

//                 await db
//                     .update(priceBrackets)
//                     .set({ androidStatus: "active" })
//                     .where(eq(priceBrackets.id, bracket.id));

//                 results.push({
//                     productId: bracket.productId,
//                     status: "active",
//                 });
//             } catch (err: any) {
//                 results.push({
//                     productId: bracket.productId,
//                     status: "error",
//                     error: err.message,
//                 });
//             }
//         }

//         // 5️⃣ Response
//         ApiResponse.success(res, "Price brackets generated & synced", {
//             total: upserted.length,
//             android: {
//                 success: results.filter(r => r.status === "active").length,
//                 failed: results.filter(r => r.status === "error").length,
//             },
//             results,
//         });
//     })
// );


router.post(
    "/generate",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
        const { currency, priceDiff, packagePrefix } = req.body;

        if (!currency || !priceDiff || !packagePrefix) {
            throw new ValidationError("currency, priceDiff, and packagePrefix are required");
        }

        if (!/^[a-zA-Z0-9_]+$/.test(packagePrefix)) {
            throw new ValidationError("packagePrefix can only contain letters, numbers, and underscores");
        }

        // 1️⃣ Get min & max retail price
        const priceRes = await db.execute<{ min: string; max: string }>(sql`
      SELECT 
        MIN(retail_price) AS min,
        MAX(retail_price) AS max
      FROM unified_packages
      WHERE currency = ${currency}
        AND is_enabled = true
    `);

        const [{ min, max }] = priceRes.rows;
        if (!min || !max) {
            throw new NotFoundError("No Packages found for currency");
        }

        const minPrice = Math.floor(Number(min) / priceDiff) * priceDiff;
        const maxPrice = Math.ceil(Number(max) / priceDiff) * priceDiff;

        const bracketsToUpsert = [];

        // 2️⃣ Generate brackets
        for (let start = minPrice; start <= maxPrice; start = Number((start + priceDiff).toFixed(2))) {
            let end;
            if (priceDiff <= 1) {
                end = Number((start + priceDiff - 0.01).toFixed(2));
            } else {
                end = start + priceDiff - 1;
            }

            let image = null;
            try {
                const [generatedImage] = await createImages([
                    {
                        showIap: true,
                        appName: "Esimtel",
                        product: {
                            name: `${packagePrefix}_${currency}_${start}_${end}`,
                            price: end,
                            currency,
                            description: "eSIM in 30 seconds",
                            slug: `${packagePrefix}_${currency}_${start}_${end}`,
                        },
                    },
                ]);
                image = generatedImage;
            } catch (err: any) {
                console.error("🔥 Screenshot generation failed for", `${packagePrefix}_${currency}_${start}_${end}`, ":", err.message);
            }

            bracketsToUpsert.push({
                currency,
                minPrice: start,
                maxPrice: end,
                setPrice: end,
                packageImage: image,
                productId: `${packagePrefix}_${currency}_${start}_${end}`,
                androidStatus: "pending",
                appleStatus: "pending",
                isActive: true,
            });

            if (bracketsToUpsert.length >= 800) break;
        }

        // 3️⃣ UPSERT (DO NOT reset appleStatus on update)
        const upserted = await db
            .insert(priceBrackets)
            .values(bracketsToUpsert)
            .onConflictDoUpdate({
                target: [
                    priceBrackets.currency,
                    priceBrackets.minPrice,
                    priceBrackets.maxPrice,
                    priceBrackets.productId,
                ],
                set: {
                    setPrice: sql`excluded.set_price`,
                    packageImage: sql`excluded.package_image`,
                    androidStatus: "pending",
                    isActive: true,
                    updatedAt: sql`now()`,
                },
            })
            .returning();

        const results: any[] = [];

        // 4️⃣ Sync Android + Apple (sequential & safe)
        for (const bracket of upserted) {
            const result: any = { productId: bracket.productId };

            // ANDROID
            try {
                if (bracket.androidStatus !== "active") {
                    const androidJob = new CreateInAppProductJob({
                        sku: bracket.productId,
                        title: bracket.productId,
                        description: "eSIM in 30 seconds",
                        price: Number(bracket.setPrice),
                        currency: bracket.currency,
                    });

                    await androidJob.handle();

                    await db
                        .update(priceBrackets)
                        .set({ androidStatus: "active" })
                        .where(eq(priceBrackets.id, bracket.id));

                    result.android = "active";
                } else {
                    result.android = "skipped";
                }
            } catch (err: any) {
                console.error("🔥 ANDROID ERROR for", bracket.productId, err?.message || err);
                result.android = "error";
                result.androidError = err?.message || "Unknown error";
            }

            // APPLE
            try {
                if (bracket.appleStatus !== "active") {

                    console.log("Apple sync started for", bracket.productId);


                    let appleTerritory = "USA"; // default
                    if (bracket.currency === "INR") appleTerritory = "IND";
                    else if (bracket.currency === "GBP") appleTerritory = "GBR";
                    else if (bracket.currency === "EUR") appleTerritory = "FRA";
                    else if (bracket.currency === "AUD") appleTerritory = "AUS";
                    else if (bracket.currency === "CAD") appleTerritory = "CAN";

                    const appleJob = new AppleStoreIapJob({
                        sku: bracket.productId,
                        title: bracket.productId,
                        description: "eSIM in 30 seconds",
                        price: Number(bracket.setPrice),
                        currency: bracket.currency,
                        country: appleTerritory,
                    });

                    await appleJob.handle();

                    console.log("Apple sync completed for", bracket.productId);

                    await db
                        .update(priceBrackets)
                        .set({ appleStatus: "active" })
                        .where(eq(priceBrackets.id, bracket.id));

                    result.apple = "active";
                } else {
                    result.apple = "skipped";
                }
            } catch (err: any) {
                console.error("🔥 APPLE ERROR for", bracket.productId, err?.message || err);
                result.apple = "error";
                result.appleError = err?.message || "Unknown error";
            }

            // Mark general error if both failed
            if (result.android === "error" || result.apple === "error") {
                result.error = "Sync had errors";
            }

            results.push(result);
        }

        ApiResponse.success(res, "Price brackets generated & synced", {
            total: upserted.length,
            android: {
                success: results.filter(r => r.android === "active").length,
                failed: results.filter(r => r.error).length,
            },
            apple: {
                success: results.filter(r => r.apple === "active").length,
                failed: results.filter(r => r.error).length,
            },
            results,
        });
    })
);


router.get(
    "/list",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
        const { page = 1, limit = 20, currency } = req.query;

        const offset = (Number(page) - 1) * Number(limit);

        const where = currency
            ? eq(priceBrackets.currency, String(currency))
            : undefined;

        const [data, countRes] = await Promise.all([
            db
                .select()
                .from(priceBrackets)
                .where(where)
                .limit(Number(limit))
                .offset(offset)
                .orderBy(priceBrackets.minPrice),

            db.execute<{ count: string }>(sql`
        SELECT COUNT(*) as count FROM price_brackets
        ${currency ? sql`WHERE currency = ${currency}` : sql``}
      `),
        ]);

        const total = Number(countRes.rows[0]?.count ?? 0);

        ApiResponse.success(res, "Price brackets list", {
            page: Number(page),
            limit: Number(limit),
            total,
            data,
        });
    })
);


router.post(
    "/preview",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
        const { currency, priceDiff, packagePrefix } = req.body;

        if (!currency || !priceDiff || !packagePrefix) {
            throw new ValidationError("currency, priceDiff, and packagePrefix are required");
        }

        if (!/^[a-zA-Z0-9_]+$/.test(packagePrefix)) {
            throw new ValidationError("packagePrefix can only contain letters, numbers, and underscores");
        }

        console.log("currency", currency, "priceDiff", priceDiff);

        const res123 = await db.execute<{
            min: string;
            max: string;
        }>(sql`
      SELECT 
        MIN(retail_price) as min,
        MAX(retail_price) as max
      FROM unified_packages
      WHERE currency = ${currency}
        AND is_enabled = true
    `);

        console.log("res123", res123.rows);

        const [{ min, max }] = res123.rows;

        if (!min || !max) {
            throw new NotFoundError("No Packages found for currency");
        }

        console.log("min", min, "max", max);

        const minPrice = Math.floor(Number(min) / priceDiff) * priceDiff;
        const maxPrice = Math.ceil(Number(max) / priceDiff) * priceDiff;

        console.log("minPrice", minPrice, "maxPrice", maxPrice);

        const brackets = [];
        for (let start = minPrice; start <= maxPrice; start = Number((start + priceDiff).toFixed(2))) {
            let end;
            if (priceDiff <= 1) {
                end = Number((start + priceDiff - 0.01).toFixed(2));
            } else {
                end = start + priceDiff - 1;
            }

            brackets.push({
                minPrice: start,
                maxPrice: end,
                productId: `${packagePrefix}_${currency}_${start}_${end}`,
            });

            if (brackets.length >= 800) break;
        }

        ApiResponse.success(res, "Preview generated", {
            currency,
            priceDiff,
            minPrice,
            maxPrice,
            totalBrackets: brackets.length,
            data: brackets,
        });
    })
);



export default router;
