"use strict";

import type { Express } from "express";
import { Router, type Request, type Response, type NextFunction } from "express";
import { eq, or } from "drizzle-orm";

import authRouter from "./auth";
import destinationsRouter from "./destinations";
import regionsRouter from "./regions";
import packagesRouter from "./packages";
import unifiedPackagesRouter from "./unifiedPackages";
import ordersRouter from "./orders";
import ticketsRouter from "./tickets";
import notificationsRouter from "./notifications";
import customerRouter from "./customer";
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
import { orders } from "@shared/schema";
import { requireAuth } from "../lib/middleware";
import { esimService } from "../services/esim";
import { ensureMemberRewardsSchema } from "server/services/member-rewards-service";

export function registerModularRoutes(app: Express): void {
  void ensureMemberRewardsSchema().catch((error) => {
    console.error("Failed to ensure member rewards schema:", error);
  });

  app.use("/api/auth", authRouter);
  app.use("/api", publicRouter);
  app.use("/api/pages", pagesRouter);
  app.use("/api/destinations", destinationsRouter);
  app.use("/api/regions", regionsRouter);
  app.use("/api/packages", packagesRouter);
  app.use("/api/unified-packages", unifiedPackagesRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/tickets", ticketsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/customer", customerRouter);
  app.use("/api/contact", contactRouter);
  app.use("/api/payments", paymentRouter);
  app.post("/api/confirm-payment", confirmPaymentHandler);
  app.post("/api/guest/confirm-payment", confirmPaymentHandler);
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
        if (order.userId && order.userId !== userId) {
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
