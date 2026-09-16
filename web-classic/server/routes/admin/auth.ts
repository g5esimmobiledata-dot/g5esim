"use strict";

import { Router, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { storage } from "../../storage";
import { asyncHandler } from "../../lib/asyncHandler";
import { ValidationError, UnauthorizedError } from "../../lib/errors";
import { requireAdmin } from "../../lib/middleware";
import { logger } from "../../lib/logger";
import * as ApiResponse from "../../utils/response";

const router = Router();

router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return ApiResponse.badRequest(res, "Email and password are required");
    }

    const admin = await storage.getAdminByEmail(email);
    if (!admin) {
      return ApiResponse.unauthorized(res, "Invalid Credentials");
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      return ApiResponse.unauthorized(res, "Invalid Credentials");
    }

    req.session.adminId = admin.id;
    logger.info("Admin logged in", { adminId: admin.id });

    return ApiResponse.success(res, "Admin logged in successfully", {
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  })
);

router.get(
  "/me",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const admin = await storage.getAdminById(req.session.adminId!);
    if (!admin) {
      return ApiResponse.unauthorized(res, "Admin not found");
    }

    return ApiResponse.success(res, "Admin fetched successfully", {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });
  })
);

router.post("/logout", requireAdmin, (req: Request, res: Response) => {
  req.session.destroy(() => {
    return ApiResponse.success(res, "Logged out successfully");
  });
});



router.put(
  "/account",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.session.adminId!;
    const { currentPassword, email, newPassword } = req.body;

    if (!currentPassword) {
      throw new ValidationError("Current password is required");
    }

    const admin = await storage.getAdminById(adminId);
    if (!admin) {
      throw new UnauthorizedError("Admin not found");
    }

    const isValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isValid) {
      throw new UnauthorizedError("Current password is incorrect");
    }

    let updateData: any = {};

    if (email) updateData.email = email;

    if (newPassword) {
      if (newPassword.length < 6) {
        throw new ValidationError("Password must be at least 6 characters");
      }
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    if (!email && !newPassword) {
      throw new ValidationError("Nothing to update");
    }

    await storage.updateAdmin(adminId, updateData);

    return ApiResponse.success(res, "Account updated successfully");
  })
);

export default router;
