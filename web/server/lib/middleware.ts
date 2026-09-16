"use strict";

import type { Request, Response, NextFunction } from "express";
import * as ApiResponse from "../utils/response";
import jwt from "jsonwebtoken";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    adminId?: string;
    enterpriseAccountId?: string;
    impersonatedByAdminId?: string;
    impersonatedUserRole?: "customer" | "agent" | "reseller";
    impersonatedAt?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuthOLD(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    ApiResponse.unauthorized(res, "Authentication required");
    return;
  }
  next();
}



// new auth

const JWT_SECRET = process.env.JWT_SECRET!;


export function requireAuth(req: any, res: Response, next: NextFunction): void {
  // console.log("👉 requireAuth called");

  // 1) Check session
  if (req.session?.userId || req.session?.adminId) {
    console.log("🔹 Authenticated by session:", req.session.userId);

    req.userId = req.session.userId || req.session.adminId;
    return next();
  }

  // 2) If no session, check Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    console.log("❌ No Bearer token and no session userId");
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  // 3) Token present — try verify
  const token = authHeader.split(" ")[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);

    // console.log("🔹 Authenticated by token:", decoded);

    req.userId = decoded.userId ?? decoded.id; // support both formats
    return next();
  } catch (err) {
    console.log("❌ Token invalid/expired:", err);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}


export function optionalAuth(req: any, res: Response, next: NextFunction) {
  // Try session
  if (req.session?.userId || req.session?.adminId) {
    req.userId = req.session.userId || req.session.adminId;
    return next();
  }

  // Try bearer token (but don't block)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId ?? decoded.id;
    } catch {
      // ignore invalid token
    }
  }

  return next();
}







// new auth




export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.adminId) {
    ApiResponse.unauthorized(res, "Admin Access required");
    return;
  }
  next();
}

export function requireEnterpriseAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.enterpriseAccountId) {
    ApiResponse.unauthorized(res, "Enterprise login required");
    return;
  }
  next();
}

export function requireAuthOrAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId && !req.session.adminId) {
    ApiResponse.unauthorized(res, "Authentication required");
    return;
  }
  next();
}
