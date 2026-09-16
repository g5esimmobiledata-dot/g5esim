import { Router } from "express";
import { requireAuth } from "server/lib/middleware";
import {
  convertMemberRewardsToWallet,
  getMemberRewardsDashboard,
} from "server/services/member-rewards-service";

const router = Router();

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const data = await getMemberRewardsDashboard(req.userId);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Member rewards dashboard error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to load member rewards",
    });
  }
});

router.post("/convert", requireAuth, async (req: any, res) => {
  try {
    const conversion = await convertMemberRewardsToWallet(req.userId);
    const data = await getMemberRewardsDashboard(req.userId);

    res.json({
      success: true,
      message: "Rewards converted to wallet balance",
      data: {
        conversion,
        rewards: data,
      },
    });
  } catch (error: any) {
    console.error("Member rewards conversion error:", error);
    const message = error?.message || "Failed to convert rewards";
    res.status(message.includes("need") || message.includes("threshold") ? 400 : 500).json({
      success: false,
      message,
    });
  }
});

export default router;
