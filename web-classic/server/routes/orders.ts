"use strict";

import { Router, type Request, type Response, NextFunction } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { asyncHandler } from "../lib/asyncHandler";
import { ValidationError, NotFoundError } from "../lib/errors";
import { requireAuth, requireAuthOrAdmin } from "../lib/middleware";
import { logger } from "../lib/logger";
import { airaloPackages, providers, orders } from "@shared/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { airaloAPI } from "../services/airalo/airalo-sdk";
import { sendEmail, generateOTPEmail, generateWelcomeEmail, generateOrderConfirmationEmail, generateInstallationEmail, generateLowDataEmail, generateCustomNotificationEmail } from "../email";
import { airaloSyncService } from "../services/airalo/airalo-sync";
import { airaloOrderService, type AiraloWebhookPayload } from "../services/airalo/airalo-order";
import { airaloNotificationService } from "../services/airalo/airalo-notifications";
import { insertPageSchema, insertEmailTemplateSchema } from "@shared/schema";
import * as ApiResponse from "../utils/response";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

const router = Router();

function publicOrder(order: any) {
  const { airaloPrice, wholesalePrice, ...safeOrder } = order;
  return safeOrder;
}

function publicPackage(pkg: any) {
  if (!pkg) return pkg;
  const { airaloPrice, wholesalePrice, ...safePackage } = pkg;
  return safePackage;
}

function hasProviderFulfillment(order: any) {
  return Boolean(order?.iccid) && (
    Boolean(order?.providerOrderId) ||
    Boolean(order?.airaloOrderId) ||
    Boolean(order?.qrCode) ||
    Boolean(order?.qrCodeUrl) ||
    Boolean(order?.activationCode) ||
    Boolean(order?.smdpAddress)
  );
}

function publicOrderStatus(order: any) {
  const status = String(order?.status || "").toLowerCase();
  if ((status === "completed" || status === "active" || status === "in_use") && !hasProviderFulfillment(order)) {
    return "processing";
  }

  return order?.status;
}

// const requireAuthOrAdmin = (req: Request, res: Response, next: NextFunction) => {
//   if (!req.session.userId && !req.session.adminId) {
//     return ApiResponse.unauthorized(res, "Authentication required");
//   }
//   next();
// };

router.get(
  "/my-orders",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.session?.userId! ?? req.userId!
    const userOrders = await storage.getOrdersByUser(userId);

    const ordersWithDetails = await Promise.all(
      userOrders.map(async (order) => {
        const pkg = await storage.getPackageById(order.packageId);
        return {
          ...publicOrder(order),
          status: publicOrderStatus(order),
          fulfillmentStatus: hasProviderFulfillment(order) ? "provisioned" : "awaiting_provider",
          package: publicPackage(pkg),
        };
      })
    );

    return ApiResponse.success(res, "Orders fetched successfully", ordersWithDetails);
  })
);

router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { packageId, quantity = 1 } = req.body;
    const userId = req.session?.userId! ?? req.userId!

    if (!packageId || quantity < 1) {
      return ApiResponse.badRequest(res, "Invalid package or quantity");
    }

    const pkg = await storage.getPackageById(packageId);
    if (!pkg) {
      return ApiResponse.notFound(res, "Package not found");
    }

    const totalPrice = parseFloat(pkg.price.toString()) * quantity;
    const orderType = quantity === 1 ? "single" : "batch";

    if (orderType === "single") {
      const order = await storage.createOrder({
        userId,
        packageId: pkg.id,
        orderType: "single",
        quantity: 1,
        status: "processing",
        price: pkg.price,
        airaloPrice: pkg.airaloPrice,
        currency: pkg.currency,
        dataAmount: pkg.dataAmount,
        validity: pkg.validity,
        installationSent: false,
      });

      try {
        const orderDetails = await airaloOrderService.submitSingleOrder(pkg.airaloId, 1, `Order ${order.id}`);
        const simDetails = orderDetails.sims[0];

        await storage.updateOrder(order.id, {
          airaloOrderId: orderDetails.airaloOrderId,
          iccid: simDetails.iccid,
          qrCode: simDetails.qrCode,
          qrCodeUrl: simDetails.qrCodeUrl,
          lpaCode: simDetails.lpaCode,
          smdpAddress: simDetails.smdpAddress,
          activationCode: simDetails.activationCode,
          directAppleUrl: simDetails.directAppleUrl,
          apnType: simDetails.apnType,
          apnValue: simDetails.apnValue,
          isRoaming: simDetails.isRoaming,
          status: "completed",
        });

        const user = await storage.getUser(userId);
        const destination = pkg.destinationId ? await storage.getDestinationById(pkg.destinationId) : null;

        if (user) {
          const confirmEmail = await generateOrderConfirmationEmail({
            id: order.id,
            destination: destination?.name || "Unknown",
            dataAmount: pkg.dataAmount,
            validity: pkg.validity,
            price: pkg.price,
          });

          await sendEmail({
            to: user.email,
            subject: confirmEmail.subject,
            html: confirmEmail.html,
          });

          const installEmail = await generateInstallationEmail({
            name: user.name || "Traveler",
            packageName: `${pkg.dataAmount} - ${pkg.validity} Days`,
            qrCodeUrl: simDetails.qrCodeUrl,
            iccid: simDetails.iccid,
            activationCode: simDetails.activationCode,
            smdpAddress: simDetails.smdpAddress,
          });

          await sendEmail({
            to: user.email,
            subject: installEmail.subject,
            html: installEmail.html,
          });

          await storage.updateOrder(order.id, { installationSent: true });

          await storage.createNotification({
            userId,
            type: "installation",
            title: "eSIM Ready",
            message: `Your eSIM activation code has been sent to ${user.email}. Install it now to stay connected!`,
            read: false,
            metadata: { orderId: order.id, iccid: simDetails.iccid },
          });

          console.log(`In-app notification created for user ${user.email}`);
        }

        await storage.createNotification({
          userId,
          type: "purchase",
          title: "Order Confirmed",
          message: `Your ${pkg.dataAmount} eSIM for ${destination?.name || "your destination"} is ready. Check your email for installation instructions.`,
          read: false,
          metadata: { orderId: order.id },
        });

        const finalOrder = await storage.getOrderById(order.id);
        return ApiResponse.created(res, "Order created successfully", { order: finalOrder });
      } catch (airaloError: any) {
        console.error("Single order failed:", airaloError);
        await storage.updateOrder(order.id, { status: "failed" });
        return ApiResponse.serverError(res, "Failed to provision eSIM. Please contact support.");
      }
    } else {
      try {
        const { requestId } = await airaloOrderService.submitBatchOrder(pkg.airaloId, quantity);

        const orderRecords = [];
        const pricePerEsim = parseFloat(pkg.price.toString());
        const airaloPerEsim = pkg.airaloPrice ? parseFloat(pkg.airaloPrice.toString()) : pricePerEsim;

        for (let i = 0; i < quantity; i++) {
          const orderRecord = await storage.createOrder({
            userId,
            packageId: pkg.id,
            orderType: "batch",
            quantity: 1,
            status: "processing",
            price: pricePerEsim.toString(),
            airaloPrice: airaloPerEsim.toString(),
            currency: pkg.currency,
            dataAmount: pkg.dataAmount,
            validity: pkg.validity,
            requestId,
            installationSent: false,
          });
          orderRecords.push(orderRecord);
        }

        const user = await storage.getUser(userId);
        const destination = pkg.destinationId ? await storage.getDestinationById(pkg.destinationId) : null;

        if (user) {
          const confirmEmail = await generateOrderConfirmationEmail({
            id: orderRecords[0].id,
            destination: destination?.name || "Unknown",
            dataAmount: `${pkg.dataAmount} x${quantity}`,
            validity: pkg.validity,
            price: totalPrice.toString(),
          });

          await sendEmail({
            to: user.email,
            subject: confirmEmail.subject,
            html: confirmEmail.html,
          });
        }

        await storage.createNotification({
          userId,
          type: "purchase",
          title: "eSIM Order Processing",
          message: `Your order for ${quantity} eSIM(s) is being processed. You'll receive installation instructions via email shortly.`,
          read: false,
          metadata: { orderId: orderRecords[0].id, requestId },
        });

        return ApiResponse.created(res, "Batch order created successfully", { orders: orderRecords, requestId, quantity });
      } catch (airaloError: any) {
        console.error("Batch order failed:", airaloError);
        return ApiResponse.serverError(res, "Failed to place batch order. Please contact support.");
      }
    }
  } catch (error: any) {
    console.error("Order error:", error);
    return ApiResponse.serverError(res, error.message);
  }
});

router.get("/:orderId/esim", requireAuth, async (req: Request, res: Response) => {
  try {
    const order = await storage.getOrderById(req.params.orderId);

    if (!order) {
      return ApiResponse.notFound(res, "Order not found");
    }
    const userId = req.session?.userId! ?? req.userId!;

    if (!req.session.adminId && order.userId !== userId) {
      return ApiResponse.forbidden(res, "Access denied");
    }

    // if (order.userId !== userId) {
    //   return ApiResponse.forbidden(res, "Access denied");
    // }

    if (!order.iccid) {
      return ApiResponse.notFound(res, "No eSIM assigned to this order yet");
    }

    // Try to fetch live data from provider
    let providerResponse = null;
    if (order.providerId && order.providerOrderId) {
      try {
        const { providerFactory } = await import("../providers/provider-factory");
        const providerService = await providerFactory.getServiceById(order.providerId);
        providerResponse = await providerService.getOrderStatus(order.providerOrderId);

        if (providerResponse.status !== "failed") {
          // Wrap in 'esim' field to match expected frontend structure
          return ApiResponse.success(res, "eSIM details fetched successfully", { esim: providerResponse });
        }
      } catch (providerError: any) {
        console.log("[eSIM Details] Provider API failed, using stored order data:", providerError.message);
      }
    }

    // Fallback: Build response from stored order data
    // Derive LPA string from stored data (lpaCode or activationCode or qrCode if it's an LPA)
    const lpaString = order.lpaCode || order.activationCode ||
      (order.qrCode?.startsWith("LPA:") ? order.qrCode : null);

    // Extract matching_id from LPA string if present (format: LPA:1$smdp$matching_id)
    const matchingId = lpaString?.split("$")[2] || null;

    const fallbackResponse = {
      providerOrderId: order.providerOrderId,
      status: order.status === "completed" ? "completed" : order.status,
      iccid: order.iccid,
      qrCode: order.qrCode,
      qrCodeUrl: order.qrCodeUrl,
      smdpAddress: order.smdpAddress,
      activationCode: order.activationCode,
      lpa: order.smdpAddress, // SM-DP+ address for display
      lpaCode: lpaString, // Full LPA activation string
      matching_id: matchingId,
      qrcode: order.qrCode,
      apn_type: order.apnType,
      apn_value: order.apnValue,
      is_roaming: order.isRoaming,
      created_at: order.createdAt,
      activation_date: order.activatedAt,
      expired_at: order.expiresAt,
      // Package info from order
      package: {
        data: order.dataAmount,
        validity: order.validity,
        price: order.price,
      },
      // Indicate this is from stored data
      _source: "stored_order_data",
    };

    // Wrap in 'esim' field to match expected frontend structure
    return ApiResponse.success(res, "eSIM details fetched from order", { esim: fallbackResponse });
  } catch (error: any) {
    console.error("Error fetching eSIM details:", error);
    return ApiResponse.serverError(res, error.message);
  }
});

export default router;
