"use strict";

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import * as ApiResponse from "../utils/response";
import { users } from "@shared/schema";
import {
  createManualInvoice,
  getAccountInvoiceDashboard,
  getOwnedInvoiceExportDocument,
  markOwnedInvoicePaid,
  sendOwnedInvoiceReminder,
  sendOwnedInvoice,
  type InvoiceExportFormat,
} from "../services/invoice-service";

const router = Router();

const lineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().trim().min(1, "Line item description is required"),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number(),
  amount: z.coerce.number().optional(),
});

const manualInvoiceSchema = z.object({
  customerName: z.string().trim().optional(),
  customerEmail: z.string().trim().email("Valid customer email is required"),
  dueDate: z.string().optional(),
  currency: z.string().trim().min(3).max(5).optional(),
  tax: z.coerce.number().min(0).optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  paymentMethods: z.array(z.enum(["credit_card", "voucher", "paypal", "crypto", "wire_transfer"])).optional(),
  wireTransferInstructions: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1),
  sendNow: z.boolean().optional(),
});

const invoiceClientSearchSchema = z.object({
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const invoiceExportFormatSchema = z.enum(["pdf", "word", "excel"]);

function getZodErrorMessage(error: z.ZodError) {
  const first = error.errors[0];
  if (!first) return "Invalid invoice data";
  const field = first.path.join(".");
  return field ? `${field}: ${first.message}` : first.message;
}

function getRequestBaseUrl(req: Request) {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  return `${protocol}://${req.get("host")}`;
}

async function requireInvoiceIssuer(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) {
    ApiResponse.unauthorized(res, "Authentication required");
    return null;
  }

  const user = await storage.getUser(userId);
  if (!user) {
    ApiResponse.unauthorized(res, "User not found");
    return null;
  }

  if (user.role !== "agent" && user.role !== "reseller") {
    ApiResponse.forbidden(res, "Invoice tools are available for Agent and Reseller accounts");
    return null;
  }

  return user;
}

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireInvoiceIssuer(req, res);
    if (!user) return;

    const dashboard = await getAccountInvoiceDashboard(user.id, getRequestBaseUrl(req));
    return ApiResponse.success(res, "Invoices fetched successfully", dashboard);
  }),
);

router.get(
  "/clients",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireInvoiceIssuer(req, res);
    if (!user) return;

    const { search, limit } = invoiceClientSearchSchema.parse(req.query);
    const pattern = search ? `%${search}%` : "";
    const searchCondition = search
      ? or(
          ilike(users.name, pattern),
          ilike(users.email, pattern),
          ilike(users.phone, pattern),
          ilike(users.id, pattern),
          ilike(users.resellerStoreName, pattern),
        )
      : undefined;

    const clients = await db
      .select({
        id: users.id,
        displayUserId: users.displayUserId,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        walletBalance: users.walletBalance,
        resellerStoreName: users.resellerStoreName,
        resellerLogoUrl: users.resellerLogoUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(searchCondition ? and(eq(users.isDeleted, false), searchCondition) : eq(users.isDeleted, false))
      .orderBy(desc(users.createdAt))
      .limit(limit);

    return ApiResponse.success(res, "Invoice clients fetched successfully", clients);
  }),
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireInvoiceIssuer(req, res);
    if (!user) return;

    const parsed = manualInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return ApiResponse.badRequest(res, getZodErrorMessage(parsed.error), parsed.error.errors);
    }

    try {
      const invoice = await createManualInvoice({
        ...parsed.data,
        issuerUserId: user.id,
        createdBy: user.id,
      });
      return ApiResponse.created(res, "Invoice created successfully", invoice);
    } catch (error: any) {
      return ApiResponse.badRequest(res, error.message || "Unable to create invoice");
    }
  }),
);

router.post(
  "/:id/send",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireInvoiceIssuer(req, res);
    if (!user) return;

    const invoice = await sendOwnedInvoice(req.params.id, user.id);
    if (!invoice) {
      return ApiResponse.notFound(res, "Invoice not found");
    }

    return ApiResponse.success(res, "Invoice sent successfully", invoice);
  }),
);

router.post(
  "/:id/remind",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireInvoiceIssuer(req, res);
    if (!user) return;

    const invoice = await sendOwnedInvoiceReminder(req.params.id, user.id);
    if (!invoice) {
      return ApiResponse.notFound(res, "Invoice not found");
    }

    return ApiResponse.success(res, "Invoice reminder sent successfully", invoice);
  }),
);

router.post(
  "/:id/mark-paid",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireInvoiceIssuer(req, res);
    if (!user) return;

    const invoice = await markOwnedInvoicePaid(req.params.id, user.id, {
      notes: req.body?.notes,
      reference: req.body?.reference,
    });
    if (!invoice) {
      return ApiResponse.notFound(res, "Invoice not found");
    }

    return ApiResponse.success(res, "Invoice marked paid successfully", invoice);
  }),
);

router.get(
  "/:id/download/:format",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireInvoiceIssuer(req, res);
    if (!user) return;

    const parsed = invoiceExportFormatSchema.safeParse(req.params.format);
    if (!parsed.success) {
      return ApiResponse.badRequest(res, "Unsupported invoice export format");
    }

    const document = await getOwnedInvoiceExportDocument(
      req.params.id,
      user.id,
      parsed.data as InvoiceExportFormat,
      getRequestBaseUrl(req),
    );
    if (!document) {
      return ApiResponse.notFound(res, "Invoice not found");
    }

    res.setHeader("Content-Type", document.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${document.filename}"`);
    res.setHeader("Cache-Control", "no-store");
    return res.send(document.buffer);
  }),
);

export default router;
