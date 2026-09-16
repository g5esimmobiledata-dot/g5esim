"use strict";

import { Router, type Request, type Response } from "express";
import { storage } from "../../storage";
import { db } from "../../db";
import { asyncHandler } from "../../lib/asyncHandler";
import { NotFoundError } from "../../lib/errors";
import { requireAdmin } from "../../lib/middleware";
import { logger } from "../../lib/logger";
import { orders, airaloPackages, providers } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import * as ApiResponse from "../../utils/response";
import { refundService } from "../../services/refund-service";
import { orderingEngine } from "../../services/ordering/ordering-engine";
import {
  generateInstallationEmail,
  generateInstallationQrAttachment,
  generateOrderConfirmationEmail,
  sendEmail,
} from "../../email";

const router = Router();

function hasInstallationDetails(order: any) {
  return Boolean(order?.iccid) && (
    Boolean(order?.qrCode) ||
    Boolean(order?.qrCodeUrl) ||
    Boolean(order?.lpaCode) ||
    Boolean(order?.activationCode) ||
    Boolean(order?.smdpAddress)
  );
}

function buildLpaCode(value: any) {
  const lpaCode = typeof value?.lpaCode === "string" ? value.lpaCode.trim() : "";
  if (lpaCode.startsWith("LPA:")) return lpaCode;

  const qrCode = typeof value?.qrCode === "string" ? value.qrCode.trim() : "";
  if (qrCode.startsWith("LPA:")) return qrCode;

  const activationCode =
    typeof value?.activationCode === "string"
      ? value.activationCode.replace(/^LPA:1\$[^$]+\$/i, "").trim()
      : "";
  const smdpAddress = typeof value?.smdpAddress === "string" ? value.smdpAddress.trim() : "";

  return smdpAddress && activationCode
    ? `LPA:1$${smdpAddress}$${activationCode}`
    : "";
}

// router.get(
//   "/",
//   requireAdmin,
//   asyncHandler(async (req: Request, res: Response) => {

//     try {
//       const orders = await storage.getAllOrders();
//       const providers = await storage.getAllProviders();
//       const providerMap = new Map(providers.map(p => [p.id, p.name]));

//       const ordersWithDetails = await Promise.all(
//         orders.map(async (order) => {
//           const user = await storage.getUser(order.userId);
//           const pkg = await storage.getPackageById(order.packageId);
//           let destination;
//           if (pkg?.destinationId) {
//             destination = await storage.getDestinationById(pkg.destinationId);
//           }
//           // console.log("order", order);
//           // Add provider names for failover display
//           const originalProviderName = order.originalProviderId ? providerMap.get(order.originalProviderId) : undefined;
//           const finalProviderName = order.finalProviderId ? providerMap.get(order.finalProviderId) : undefined;

//           return {
//             ...order,
//             user,
//             package: { ...pkg, destination },
//             originalProviderName,
//             finalProviderName,
//           };
//         })
//       );

//       ApiResponse.success(res, "Orders retrieved successfully", ordersWithDetails);
//     } catch (error: any) {
//       res.status(500).json({ success: false, message: error.message });
//     }
//   })
// );




router.get(
  "/",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const orders = await storage.getAllOrders();
      const providers = await storage.getAllProviders();
      const providerMap = new Map(providers.map(p => [p.id, p.name]));

      const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
          const user = await storage.getUser(order.userId);

          // ✅ FIXED
          const pkg = await storage.getUnifiedPackageById(order.packageId);

          let destination;
          if (pkg?.destinationId) {
            destination = await storage.getDestinationById(pkg.destinationId);
          }

          const originalProviderName = order.originalProviderId
            ? providerMap.get(order.originalProviderId)
            : undefined;

          const finalProviderName = order.finalProviderId
            ? providerMap.get(order.finalProviderId)
            : undefined;

          return {
            ...order,
            user,
            package: { ...pkg, destination },
            originalProviderName,
            finalProviderName,
          };
        })
      );

      ApiResponse.success(res, "Orders retrieved successfully", ordersWithDetails);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  })
);


router.get(
  "/:id",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const order = await storage.getOrderById(req.params.id);
    if (!order) {
      return ApiResponse.notFound(res, "Order not found");
    }

    const pkg = await storage.getPackageById(order.packageId);

    // Fetch provider name from database for dynamic display
    let providerName = "Unknown";
    if (order.providerId) {
      const provider = await db.query.providers.findFirst({
        where: eq(providers.id, order.providerId),
      });
      providerName = provider?.name || order.providerId;
    }

    // Use wholesalePrice if available, fallback to airaloPrice for legacy orders
    const providerCost = order.wholesalePrice || order.airaloPrice;

    return ApiResponse.success(res, "Order fetched successfully", {
      ...order,
      package: pkg,
      providerName,
      providerCost
    });
  })
);

router.post(
  "/:id/resend-installation-email",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const existingOrder = await storage.getOrderById(req.params.id);
    if (!existingOrder) {
      return ApiResponse.notFound(res, "Order not found");
    }

    if (!hasInstallationDetails(existingOrder)) {
      return ApiResponse.badRequest(res, "Order does not have eSIM installation details yet");
    }

    const customer = existingOrder.userId
      ? await storage.getUser(existingOrder.userId)
      : null;
    const email = String(req.body?.email || customer?.email || existingOrder.guestEmail || "").trim();

    if (!email) {
      return ApiResponse.badRequest(res, "No customer email found for this order");
    }

    const lpaCode = buildLpaCode(existingOrder);
    const orderForEmail = lpaCode && (!existingOrder.lpaCode || !String(existingOrder.qrCode || "").startsWith("LPA:"))
      ? await storage.updateOrder(existingOrder.id, {
          lpaCode,
          qrCode: lpaCode,
        })
      : existingOrder;

    const pkg = await storage.getUnifiedPackageById(orderForEmail.packageId).catch(() => null);
    const destination = pkg?.destinationId
      ? await storage.getDestinationById(pkg.destinationId).catch(() => null)
      : null;
    const confirmationEmail = await generateOrderConfirmationEmail({
      id: orderForEmail.displayOrderId || orderForEmail.id,
      displayId: orderForEmail.displayOrderId || orderForEmail.id,
      customerName: customer?.name || "Customer",
      destination: destination?.name || pkg?.countryName || pkg?.countryCode || "Destination",
      dataAmount: orderForEmail.dataAmount || pkg?.dataAmount || "N/A",
      validity: orderForEmail.validity || pkg?.validity || "N/A",
      price: orderForEmail.price,
      iccid: orderForEmail.iccid,
      qrCodeUrl: orderForEmail.qrCodeUrl,
    });

    await sendEmail({
      to: email,
      subject: confirmationEmail.subject,
      html: confirmationEmail.html,
      requireDelivery: true,
    });

    const qrCodeCid = "esim-qr-code";
    const qrAttachment = await generateInstallationQrAttachment(orderForEmail, qrCodeCid);
    const installEmail = await generateInstallationEmail({
      name: customer?.name || "Customer",
      packageName:
        pkg?.title ||
        pkg?.name ||
        `${orderForEmail.dataAmount} - ${orderForEmail.validity} Days`,
      qrCodeCid: qrAttachment ? qrCodeCid : undefined,
      qrCodeUrl: orderForEmail.qrCodeUrl,
      iccid: orderForEmail.iccid,
      activationCode: orderForEmail.activationCode,
      smdpAddress: orderForEmail.smdpAddress,
      qrCode: orderForEmail.qrCode,
      lpaCode: orderForEmail.lpaCode,
    });

    await sendEmail({
      to: email,
      subject: installEmail.subject,
      html: installEmail.html,
      attachments: qrAttachment ? [qrAttachment] : undefined,
      requireDelivery: true,
    });

    const updatedOrder = await storage.updateOrder(orderForEmail.id, {
      installationSent: true,
    });

    logger.info("Installation email resent by admin", {
      orderId: existingOrder.id,
      adminId: req.session.adminId,
      email,
    });

    return ApiResponse.success(res, "Installation email resent successfully", {
      order: updatedOrder,
      email,
    });
  })
);

router.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { status, iccid, qrCode, activationCode, smdpAddress } = req.body;

    const existingOrder = await storage.getOrderById(req.params.id);
    if (!existingOrder) {
      return ApiResponse.notFound(res, "Order not found");
    }

    const needsProviderFulfillment =
      status === "completed" &&
      !existingOrder.providerOrderId &&
      !existingOrder.iccid &&
      !iccid &&
      !qrCode;

    if (needsProviderFulfillment) {
      await storage.updateOrder(existingOrder.id, { status: "processing" });

      const customer = existingOrder.userId
        ? await storage.getUser(existingOrder.userId)
        : null;

      const providerResult = await orderingEngine.createOrder({
        packageId: existingOrder.packageId,
        unifiedPackageId: existingOrder.packageId,
        quantity: existingOrder.quantity || 1,
        customerEmail:
          customer?.email ||
          existingOrder.guestEmail ||
          `admin-order-${existingOrder.id}@local`,
        customerPhone: customer?.phone || existingOrder.guestPhone || undefined,
        transactionId: `ADMIN-COMPLETE-${existingOrder.id}-${Date.now()}`,
        source: "admin",
        userId: existingOrder.userId,
        orderId: existingOrder.id,
        partnerReference: `Admin Order ${existingOrder.id}`,
      });

      if (!providerResult.success) {
        const failedOrder = await storage.updateOrder(existingOrder.id, {
          status: "failed",
          failureReason: providerResult.error || "Provider order failed",
        });

        logger.warn("Admin order provider fulfillment failed", {
          orderId: existingOrder.id,
          adminId: req.session.adminId,
          error: providerResult.error,
        });

        return ApiResponse.error(
          res,
          providerResult.error || "Provider order failed",
          400,
          failedOrder,
        );
      }

      const esimDetails = providerResult.esimDetails?.[0];
      const fulfilledOrder = await storage.updateOrder(existingOrder.id, {
        status: "completed",
        providerOrderId: providerResult.providerOrderId || providerResult.orderId,
        airaloOrderId: providerResult.providerOrderId || providerResult.orderId,
        originalProviderId: providerResult.originalProviderId,
        finalProviderId: providerResult.finalProviderId,
        failoverAttempts: providerResult.attempts,
        iccid: esimDetails?.iccid,
        qrCode: esimDetails?.qrCode,
        qrCodeUrl: esimDetails?.qrCodeUrl,
        lpaCode: esimDetails?.lpaCode || esimDetails?.qrCode,
        activationCode: esimDetails?.activationCode,
        smdpAddress: esimDetails?.smdpAddress,
        directAppleUrl: esimDetails?.directAppleUrl,
        apnType: esimDetails?.apnType,
        apnValue: esimDetails?.apnValue,
      });

      logger.info("Order fulfilled by admin", {
        orderId: existingOrder.id,
        adminId: req.session.adminId,
        providerOrderId: providerResult.providerOrderId || providerResult.orderId,
      });

      return ApiResponse.success(res, "Order fulfilled successfully", fulfilledOrder);
    }

    const order = await storage.updateOrder(req.params.id, {
      status,
      iccid,
      qrCode,
      activationCode,
      smdpAddress,
    });

    logger.info("Order updated by admin", {
      orderId: req.params.id,
      adminId: req.session.adminId,
      status,
    });

    return ApiResponse.success(res, "Order updated successfully", order);
  })
);

router.get(
  "/:id/refund-eligibility",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const eligibility = await refundService.checkEligibility(req.params.id);
    return ApiResponse.success(res, "Eligibility check completed", eligibility);
  })
);

router.post(
  "/:id/refund",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { reason = "CUSTOMER_REQUEST", notes, refundPayment = true } = req.body;

    const result = await refundService.processRefund({
      orderId: req.params.id,
      reason,
      notes,
      adminId: req.session.adminId,
      refundPayment,
    });

    // console.log("CHECK Result for refund@@@@@@@@", result)

    if (!result.success) {
      logger.warn("Refund failed", {
        orderId: req.params.id,
        adminId: req.session.adminId,
        error: result.errorMessage,
      });
      return ApiResponse.error(res, result.errorMessage || "Refund failed", 400);
    }

    logger.info("Order refunded by admin", {
      orderId: req.params.id,
      adminId: req.session.adminId,
      providerStatus: result.providerResult.status,
      paymentRefunded: result.paymentResult?.success,
      orderStatus: result.orderStatus,
    });

    return ApiResponse.success(res, "Order refunded successfully", {
      providerResult: result.providerResult,
      paymentResult: result.paymentResult,
      orderStatus: result.orderStatus,
    });
  })
);

router.post(
  "/:id/cancel",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { refundPayment = true } = req.body;

    const result = await refundService.processCancellation({
      orderId: req.params.id,
      adminId: req.session.adminId,
      refundPayment,
    });

    if (!result.success) {
      logger.warn("Cancellation failed", {
        orderId: req.params.id,
        adminId: req.session.adminId,
        error: result.errorMessage,
      });
      return ApiResponse.error(res, result.errorMessage || "Cancellation failed", 400);
    }

    logger.info("Order cancelled by admin", {
      orderId: req.params.id,
      adminId: req.session.adminId,
      providerStatus: result.providerResult.status,
      paymentRefunded: result.paymentResult?.success,
    });

    return ApiResponse.success(res, "Order cancelled successfully", {
      providerResult: result.providerResult,
      paymentResult: result.paymentResult,
      orderStatus: result.orderStatus,
    });
  })
);

export default router;
