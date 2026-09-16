"use strict";

import { Router, type Request, type Response } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { ValidationError } from "../lib/errors";
import { logger } from "../lib/logger";
import * as ApiResponse from "../utils/response";
import { storage } from "../storage";


const router = Router();


/* -------------------------------------------------- */
/* 📩 CREATE CONTACT MESSAGE */
/* -------------------------------------------------- */
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { name, email, subject, message, captchaToken } = req.body;

    /* ---------------- VALIDATION ---------------- */
    if (!name) throw new ValidationError("Name is required", "name");
    if (!email) throw new ValidationError("Email is required", "email");
    if (!subject) throw new ValidationError("Subject is required", "subject");
    if (!message) throw new ValidationError("Message is required", "message");

    /* ---------------- CAPTCHA (OPTIONAL) ---------------- */
    const recaptchaEnabled = await storage.getSettingByKey(
      "recaptcha_enabled"
    );

    if (recaptchaEnabled?.value === "true") {
      if (!captchaToken) {
        throw new ValidationError(
          "Captcha verification required",
          "captcha"
        );
      }

      const { verifyCaptcha } = await import(
        "../lib/verify-captcha"
      );

      const isValid = await verifyCaptcha(captchaToken);

      if (!isValid) {
        throw new ValidationError(
          "Captcha verification failed",
          "captcha"
        );
      }
    }

    /* ---------------- CREATE MESSAGE ---------------- */
    const contact = await storage.createContactMessage({
      name,
      email,
      subject,
      message,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      status: "new",
    });

    logger.info("Contact message submitted", {
      email,
      contactId: contact.id,
    });

    return ApiResponse.created(
      res,
      "Message sent successfully",
      contact
    );
  })
);

/* -------------------------------------------------- */
/* 📄 GET ALL CONTACT MESSAGES (ADMIN) */
/* -------------------------------------------------- */
router.get(
  "/admin/contact-messages",
  asyncHandler(async (_req: Request, res: Response) => {
    const messages = await storage.getAllContactMessages();

    return ApiResponse.success(
      res,
      "Contact messages fetched successfully",
      messages
    );
  })
);

/* -------------------------------------------------- */
/* 🔍 GET SINGLE MESSAGE */
/* -------------------------------------------------- */
router.get(
  "/admin/contact-messages/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const message = await storage.getContactMessageById(id);

    if (!message) {
      return ApiResponse.notFound(res, "Message not found");
    }

    return ApiResponse.success(
      res,
      "Contact message fetched successfully",
      message
    );
  })
);

/* -------------------------------------------------- */
/* ✏️ UPDATE STATUS / ADMIN NOTES */
/* -------------------------------------------------- */
router.patch(
  "/admin/contact-messages/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const updated = await storage.updateContactMessage(id, {
      status,
      adminNotes,
      repliedAt: status === "replied" ? new Date() : null,
    });

    return ApiResponse.success(
      res,
      "Contact message updated successfully",
      updated
    );
  })
);

/* -------------------------------------------------- */
/* 🗑 DELETE MESSAGE */
/* -------------------------------------------------- */
router.delete(
  "/admin/contact-messages/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await storage.deleteContactMessage(id);

    return ApiResponse.success(
      res,
      "Contact message deleted successfully"
    );
  })
);

export default router;