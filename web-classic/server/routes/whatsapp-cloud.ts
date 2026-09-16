import { Router } from "express";
import { requireAuth, requireAdmin } from "server/middleware/auth";
import * as ApiResponse from "server/utils/response";
import {
  ensureWhatsAppCloudSchema,
  getWhatsAppCloudConfig,
  getWhatsAppUserThread,
  sendAdminWhatsAppReply,
  sendUserWhatsAppMessage,
  storeInboundWhatsAppWebhook,
} from "server/services/whatsapp-cloud-service";

const router = Router();

router.use(async (_req, _res, next) => {
  try {
    await ensureWhatsAppCloudSchema();
    next();
  } catch (error) {
    next(error);
  }
});

router.get("/thread", requireAuth, async (req: any, res) => {
  try {
    const thread = await getWhatsAppUserThread(req.userId);
    return ApiResponse.success(res, "WhatsApp thread loaded successfully", thread);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load WhatsApp thread");
  }
});

router.post("/send", requireAuth, async (req: any, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text) {
      return ApiResponse.badRequest(res, "Message text is required");
    }

    const message = await sendUserWhatsAppMessage(req.userId, text);
    return ApiResponse.success(res, "WhatsApp message sent successfully", message);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to send WhatsApp message");
  }
});

router.post("/admin/send", requireAdmin, async (req: any, res) => {
  try {
    const to = String(req.body?.to || "").trim();
    const text = String(req.body?.text || "").trim();
    if (!to || !text) {
      return ApiResponse.badRequest(res, "Recipient number and message text are required");
    }

    const message = await sendAdminWhatsAppReply(to, text);
    return ApiResponse.success(res, "WhatsApp message sent successfully", message);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to send WhatsApp message");
  }
});

router.get("/webhook/meta", async (req, res) => {
  try {
    const config = await getWhatsAppCloudConfig();
    const mode = String(req.query["hub.mode"] || "");
    const token = String(req.query["hub.verify_token"] || "");
    const challenge = String(req.query["hub.challenge"] || "");

    if (mode === "subscribe" && token && token === config.verifyToken) {
      return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
  } catch (error) {
    console.error("WhatsApp webhook verification error:", error);
    return res.sendStatus(500);
  }
});

router.post("/webhook/meta", async (req, res) => {
  try {
    await storeInboundWhatsAppWebhook(req.body as Record<string, any>);
    return res.sendStatus(200);
  } catch (error) {
    console.error("WhatsApp inbound webhook error:", error);
    return res.sendStatus(200);
  }
});

export default router;
