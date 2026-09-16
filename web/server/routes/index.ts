"use strict";

import type { Express } from "express";
import { Router, type Request, type Response, type NextFunction } from "express";
import { and, asc, eq, or } from "drizzle-orm";
import QRCode from "qrcode";

import authRouter from "./auth";
import destinationsRouter from "./destinations";
import regionsRouter from "./regions";
import packagesRouter from "./packages";
import unifiedPackagesRouter from "./unifiedPackages";
import ordersRouter from "./orders";
import ticketsRouter from "./tickets";
import notificationsRouter from "./notifications";
import customerRouter from "./customer";
import telegramRouter from "./telegram";
import adminRouter from "./admin";
import paymentRouter, { confirmPaymentHandler } from "./payments";
import contactRouter from "./contact";
import walletRouter from "./wallet";
import resellerRouter from "./reseller";
import resellerRatesRouter from "./reseller-rates";
import invoicesRouter from "./invoices";
import accountInvoicesRouter from "./account-invoices";
import accountVouchersRouter from "./account-vouchers";
import memberRewardsRouter from "./member-rewards";
import chatRouter from "./chat";
import publicRouter from "./public";
import pagesRouter from "./admin/pages";
import sipCommercialRouter from "./admin/sip-commercial";
import { db } from "../db";
import { faqCategories, faqs, orders } from "@shared/schema";
import { requireAuth } from "../lib/middleware";
import { esimService } from "../services/esim";
import { ensureMemberRewardsSchema } from "server/services/member-rewards-service";
import { providerFactory } from "../providers/provider-factory";
import { storage } from "../storage";
import {
  fetchProviderTopupPackages,
  normalizeTopupPackage,
} from "../services/topup-packages";

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function isQrImageSource(value?: string | null) {
  const text = String(value || "").trim();
  return (
    text.startsWith("data:image/") ||
    /^https?:\/\//i.test(text) ||
    text.startsWith("/uploads/") ||
    text.startsWith("uploads/")
  );
}

function buildLpaPayload(order: any) {
  const qrCode = firstString(order?.qrCode);
  const lpaCode = firstString(order?.lpaCode);
  const activationCode = firstString(order?.activationCode);

  if (lpaCode?.startsWith("LPA:")) return lpaCode;
  if (qrCode?.startsWith("LPA:")) return qrCode;
  if (activationCode?.startsWith("LPA:")) return activationCode;
  if (lpaCode?.startsWith("1$")) return `LPA:${lpaCode}`;
  if (qrCode?.startsWith("1$")) return `LPA:${qrCode}`;
  if (activationCode?.startsWith("1$")) return `LPA:${activationCode}`;

  const smdpAddress = firstString(order?.smdpAddress, order?.smdp_address);
  if (smdpAddress && activationCode) {
    return `LPA:1$${smdpAddress}$${activationCode}`;
  }

  if (qrCode && !isQrImageSource(qrCode)) return qrCode;
  return null;
}

function sendDataImage(res: Response, dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return false;

  res.setHeader("Content-Type", match[1]);
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.send(Buffer.from(match[2], "base64"));
  return true;
}

export function registerModularRoutes(app: Express): void {
  void ensureMemberRewardsSchema().catch((error) => {
    console.error("Failed to ensure member rewards schema:", error);
  });

  app.use("/api/auth", authRouter);
  app.use("/api", publicRouter);
  app.use("/api/pages", pagesRouter);
  app.get("/api/faqs", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categoryId =
        typeof req.query.categoryId === "string"
          ? req.query.categoryId.trim()
          : "";
      const activeFilter = eq(faqs.isActive, true);
      const whereFilter = categoryId
        ? and(activeFilter, eq(faqs.categoryId, categoryId))
        : activeFilter;

      const results = await db
        .select({
          faq: faqs,
          category: faqCategories,
        })
        .from(faqs)
        .leftJoin(faqCategories, eq(faqs.categoryId, faqCategories.id))
        .where(whereFilter)
        .orderBy(
          asc(faqCategories.position),
          asc(faqs.position),
          asc(faqs.createdAt),
        );

      return res.json({
        success: true,
        data: results.map((row) => ({
          ...row.faq,
          category: row.category,
        })),
      });
    } catch (error) {
      next(error);
    }
  });
  app.use("/api/destinations", destinationsRouter);
  app.use("/api/regions", regionsRouter);
  app.use("/api/packages", packagesRouter);
  app.use("/api/unified-packages", unifiedPackagesRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/tickets", ticketsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/telegram", telegramRouter);
  app.use("/api/customer", customerRouter);
  app.use("/api/contact", contactRouter);
  app.use("/api/payments", paymentRouter);
  app.post("/api/confirm-payment", confirmPaymentHandler);
  app.post("/api/guest/confirm-payment", confirmPaymentHandler);
  app.get(
    "/api/esims/:identifier/qr.png",
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const identifier = String(req.params.identifier || "").trim();
        if (!identifier) {
          return res.status(400).json({ success: false, message: "Missing eSIM identifier" });
        }

        const [order] = await db
          .select()
          .from(orders)
          .where(or(eq(orders.id, identifier), eq(orders.iccid, identifier)))
          .limit(1);

        if (!order) {
          return res.status(404).json({ success: false, message: "eSIM order not found" });
        }

        const userId = req.userId || req.session?.userId;
        const isAdmin = Boolean(req.session?.adminId);
        if (order.userId && order.userId !== userId && !isAdmin) {
          return res.status(403).json({ success: false, message: "Access denied" });
        }

        const lpaPayload = buildLpaPayload(order);
        if (lpaPayload) {
          const png = await QRCode.toBuffer(lpaPayload, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 512,
            color: {
              dark: "#020617",
              light: "#ffffff",
            },
          });

          res.setHeader("Content-Type", "image/png");
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
          res.setHeader("X-QR-Source", "generated");
          return res.send(png);
        }

        const imageSource = firstString(
          order.qrCode && isQrImageSource(order.qrCode) ? order.qrCode : null,
          order.qrCodeUrl,
        );

        if (imageSource?.startsWith("data:image/") && sendDataImage(res, imageSource)) {
          return;
        }

        if (imageSource) {
          const target = imageSource.startsWith("uploads/") ? `/${imageSource}` : imageSource;
          return res.redirect(target);
        }

        return res.status(404).json({ success: false, message: "QR code not available" });
      } catch (error) {
        next(error);
      }
    },
  );
  app.get(
    "/api/esims/:identifier/topup-packages",
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const identifier = String(req.params.identifier || "").trim();
        if (!identifier) {
          return res.status(400).json({ success: false, message: "Missing eSIM identifier" });
        }

        const [order] = await db
          .select()
          .from(orders)
          .where(or(eq(orders.id, identifier), eq(orders.iccid, identifier)))
          .limit(1);

        if (!order) {
          return res.status(404).json({ success: false, message: "eSIM order not found" });
        }

        const userId = req.userId || req.session?.userId;
        const isAdmin = Boolean(req.session?.adminId);
        if (order.userId && order.userId !== userId && !isAdmin) {
          return res.status(403).json({ success: false, message: "Access denied" });
        }

        const topupMarginSetting = await storage.getSettingByKey("topup_margin");
        const topupMargin = Number.parseFloat(topupMarginSetting?.value || "40") || 40;

        if (!order.providerId || !order.iccid) {
          return res.json({ success: true, packages: [], topupMargin });
        }

        const providerService = await providerFactory.getServiceById(order.providerId);
        const { packages } = await fetchProviderTopupPackages(order, providerService);
        const normalizedPackages = packages
          .map((pkg) => normalizeTopupPackage(pkg, topupMargin))
          .filter(Boolean);

        return res.json({
          success: true,
          packages: normalizedPackages,
          topupMargin,
        });
      } catch (error) {
        next(error);
      }
    },
  );
  app.get(
    "/api/esims/:identifier/instructions",
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const identifier = String(req.params.identifier || "").trim();
        if (!identifier) {
          return res.status(400).json({
            success: false,
            message: "Missing eSIM identifier",
          });
        }

        const [order] = await db
          .select()
          .from(orders)
          .where(or(eq(orders.id, identifier), eq(orders.iccid, identifier)))
          .limit(1);

        if (!order) {
          return res.status(404).json({
            success: false,
            message: "eSIM order not found",
          });
        }

        const userId = req.userId || req.session?.userId;
        if (order.userId && order.userId !== userId && !req.session?.adminId) {
          return res.status(403).json({
            success: false,
            message: "Access denied",
          });
        }

        const instructions = await esimService.getInstallationInstructions(
          identifier,
          String(req.query.language || "en"),
          typeof req.query.device === "string" ? req.query.device : undefined,
          typeof req.query.model === "string" ? req.query.model : undefined,
        );

        return res.json({
          success: true,
          message: "eSIM instructions fetched successfully",
          instructions,
        });
      } catch (error) {
        next(error);
      }
    },
  );
  app.use("/api/wallet", walletRouter);
  app.use("/api/member-rewards", memberRewardsRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/reseller/rates", resellerRatesRouter);
  app.use("/api/reseller", resellerRouter);
  app.use("/api/invoices", invoicesRouter);
  app.use("/api/account/invoices", accountInvoicesRouter);
  app.use("/api/account/vouchers", accountVouchersRouter);
  app.use("/api/admin", sipCommercialRouter);
  app.use("/api/admin", adminRouter);

}

export { authRouter, destinationsRouter, regionsRouter, packagesRouter, contactRouter };
