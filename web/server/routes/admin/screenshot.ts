"use strict";

import { Router, type Request, type Response } from "express";
import { asyncHandler } from "server/lib/asyncHandler";
import { requireAdmin } from "server/lib/middleware";
import { createImages } from "server/services/screenshot.service";

const router = Router();

router.post(
    "/",
    // requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
        try {
            const products: any[] = req.body.products;

            if (!Array.isArray(products) || products.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "products array required"
                });
            }

            const images = await createImages(products);

            res.json({
                success: true,
                images
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                message: "Screenshot generation failed"
            });
        }
    })
);


export default router;