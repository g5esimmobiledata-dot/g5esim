"use strict";

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import * as ApiResponse from "../utils/response";
import {
  getInvoiceExportDocument,
  getInvoicePaymentView,
  payInvoiceWithVoucher,
  recordInvoicePaymentRequest,
  type InvoiceExportFormat,
} from "../services/invoice-service";

const router = Router();

const voucherPaymentSchema = z.object({
  code: z.string().min(1),
});

const paymentRequestSchema = z.object({
  reference: z.string().optional(),
  notes: z.string().optional(),
  payerName: z.string().optional(),
});
const invoiceExportFormatSchema = z.enum(["pdf", "word", "excel"]);

function getRequestBaseUrl(req: Request) {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  return `${protocol}://${req.get("host")}`;
}

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const paymentView = await getInvoicePaymentView(req.params.id, getRequestBaseUrl(req));
    if (!paymentView) {
      return ApiResponse.notFound(res, "Invoice not found");
    }

    return ApiResponse.success(res, "Invoice fetched successfully", paymentView);
  }),
);

router.get(
  "/:id/download/:format",
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = invoiceExportFormatSchema.safeParse(req.params.format);
    if (!parsed.success) {
      return ApiResponse.badRequest(res, "Unsupported invoice export format");
    }

    const document = await getInvoiceExportDocument(
      req.params.id,
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

router.post(
  "/:id/pay/voucher",
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = voucherPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return ApiResponse.badRequest(res, "Voucher code is required", parsed.error.errors);
    }

    try {
      const invoice = await payInvoiceWithVoucher(req.params.id, parsed.data.code);
      if (!invoice) {
        return ApiResponse.notFound(res, "Invoice not found");
      }

      return ApiResponse.success(res, "Invoice paid successfully by voucher", invoice);
    } catch (error: any) {
      return ApiResponse.badRequest(res, error.message || "Unable to pay invoice with voucher");
    }
  }),
);

router.post(
  "/:id/pay/:method",
  asyncHandler(async (req: Request, res: Response) => {
    const method = req.params.method;
    if (!["credit_card", "paypal", "crypto", "wire_transfer"].includes(method)) {
      return ApiResponse.badRequest(res, "Unsupported invoice payment method");
    }

    const parsed = paymentRequestSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return ApiResponse.badRequest(res, "Invalid payment request", parsed.error.errors);
    }

    try {
      const invoice = await recordInvoicePaymentRequest(req.params.id, method as any, parsed.data);
      if (!invoice) {
        return ApiResponse.notFound(res, "Invoice not found");
      }

      return ApiResponse.success(res, "Invoice payment request recorded", invoice);
    } catch (error: any) {
      return ApiResponse.badRequest(res, error.message || "Unable to record payment request");
    }
  }),
);

export default router;
