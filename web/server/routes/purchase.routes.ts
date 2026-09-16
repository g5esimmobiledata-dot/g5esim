import { Router } from "express";
import { androidPurchaseVerify } from "./purchase.controller";
import { applePurchaseVerify } from "./applePurchase.controller";
import { authMiddleware } from "../auth/auth.middleware";
import { verifyApplePurchase } from "server/services/purchase/applePurchase.service";

const router = Router();

router.post("/android/verify", authMiddleware, async (req, res) => {
    const unifiedPackageId = await verifyAndroidPurchase({
        userId: req.user.id,
        ...req.body,
    });

    res.json({ success: true, unifiedPackageId });
});
router.post("/apple/verify", authMiddleware, async (req, res) => {
    const unifiedPackageId = await verifyApplePurchase({
        userId: req.user.id,
        receipt: req.body.receipt,
    });

    res.json({
        success: true,
        unifiedPackageId,
    });
});

export default router;
