import { Router } from "express";
import { requireAuth } from "server/middleware/auth";
import * as ApiResponse from "server/utils/response";
import { createVoiceSession } from "server/services/voice-service";
import {
  getOrCreateUserSipAccount,
  testUserSipAccountConnection,
  toPublicUserSipAccount,
} from "server/services/user-sip-service";

const router = Router();

router.get("/sip-account", requireAuth, async (req: any, res) => {
  try {
    const account = await getOrCreateUserSipAccount(req.userId);
    return ApiResponse.success(res, "SIP account loaded successfully", {
      sipAccount: toPublicUserSipAccount(account),
    });
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to load SIP account");
  }
});

router.post("/sip-account/test", requireAuth, async (req: any, res) => {
  try {
    const data = await testUserSipAccountConnection(req.userId);
    return ApiResponse.success(res, "SIP account connection test completed", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to test SIP account");
  }
});

router.post("/session", requireAuth, async (req: any, res) => {
  try {
    const data = await createVoiceSession(req.userId, {
      direction: req.body?.direction === "inbound" ? "inbound" : "outbound",
      referenceNumber: req.body?.referenceNumber || req.body?.to || req.body?.from || null,
      virtualNumberId: req.body?.virtualNumberId || null,
    });
    return ApiResponse.success(res, "Voice session created successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to create voice session");
  }
});

export default router;
