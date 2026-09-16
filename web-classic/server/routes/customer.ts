"use strict";

import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "../storage";
import { asyncHandler } from "../lib/asyncHandler";
import { ValidationError, NotFoundError } from "../lib/errors";
import { requireAuth } from "../lib/middleware";
import { profileImageUpload } from "../middleware/image-upload";
import { logger } from "../lib/logger";
import * as ApiResponse from "../utils/response";
import { ensureUserWhatsappColumn } from "../utils/whatsapp";

const router = Router();

function publicOrder(order: any) {
  const { airaloPrice, wholesalePrice, ...safeOrder } = order;
  return safeOrder;
}

function publicPackage(pkg: any) {
  if (!pkg) return pkg;
  const { airaloPrice, wholesalePrice, resellerPrice, ...safePackage } = pkg;
  return safePackage;
}

const uploadDir = path.join(process.cwd(), "uploads", "kyc");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});




router.post(
  "/kyc/upload",
  requireAuth,
  upload.single("document"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ValidationError("No file uploaded", "document");
    }

    const { documentType } = req.body;
    if (!documentType) {
      throw new ValidationError("Document type is required", "documentType");
    }

    // 👇 Use req.userId instead of req.session.userId
    const userId = req.userId!;

    console.log("Uploading KYC document for userId:", userId, req);

    const document = await storage.createKycDocument({
      userId,
      documentType,
      filePath: `uploads/kyc/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: "pending",
    });

    await storage.updateUser(userId, { kycStatus: "submitted" });

    // logger.info("KYC document uploaded", {
    //   userId,
    //   documentType,
    // });

    return ApiResponse.created(res, "KYC document uploaded successfully", { document });
  })
);



router.get(
  "/kyc/documents",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const documents = await storage.getKycDocumentsByUser(req.session.userId || req.userId!);

    // Normalize file paths to be relative URLs for the frontend
    const normalizedDocuments = documents.map((doc: any) => {
      let relativePath = doc.filePath;
      if (relativePath.includes('uploads/kyc/')) {
        relativePath = '/uploads/kyc/' + relativePath.split('uploads/kyc/')[1];
      } else if (relativePath.includes('uploads\\kyc\\')) {
        relativePath = '/uploads/kyc/' + relativePath.split('uploads\\kyc\\')[1].replace(/\\/g, '/');
      } else if (!relativePath.startsWith('/')) {
        relativePath = '/' + relativePath;
      }

      return {
        ...doc,
        filePath: relativePath
      };
    });

    return ApiResponse.success(res, "KYC documents fetched successfully", normalizedDocuments);
  })
);

router.get("/profile", requireAuth, async (req: Request, res: Response) => {
  try {
    await ensureUserWhatsappColumn();
    const userId = req.userId!;
    const user = await storage.getUser(userId);
    // console.log("USER FROM DB:", user);
    if (!user) {
      return ApiResponse.notFound(res, "User not found");
    }

    // console.log("USER BEFORE RESPONSE:", JSON.stringify(user));

    return ApiResponse.success(res, "Profile fetched successfully", user);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

const profileImageFields = profileImageUpload.fields([
  { name: "profileImage", maxCount: 1 },
  { name: "profile_image", maxCount: 1 },
  { name: "image", maxCount: 1 },
  { name: "avatar", maxCount: 1 },
  { name: "photo", maxCount: 1 },
]);

function getUploadedProfileImage(req: Request) {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  return (
    files?.profileImage?.[0] ||
    files?.profile_image?.[0] ||
    files?.image?.[0] ||
    files?.avatar?.[0] ||
    files?.photo?.[0]
  );
}

function addBodyField(data: Record<string, any>, key: string, value: unknown) {
  if (value === undefined) return;
  data[key] = typeof value === "string" ? value.trim() : value;
}

function resolveStoredUploadPath(storedPath: string) {
  if (path.isAbsolute(storedPath)) return storedPath;
  return path.join(process.cwd(), storedPath.replace(/^[/\\]+/, ""));
}

router.put(
  "/profile",
  requireAuth,
  profileImageFields,
  async (req: Request, res: Response) => {
    try {
      await ensureUserWhatsappColumn();
      const { name, phone, address, currency, destination, whatsappNumber } = req.body;
      const userId = req.userId!;
      const user = await storage.getUser(userId);

      if (!user) {
        return ApiResponse.notFound(res, "User not found");
      }

      const updateData: any = {};
      addBodyField(updateData, "name", name);
      addBodyField(updateData, "phone", phone);
      addBodyField(updateData, "address", address);
      addBodyField(updateData, "currency", currency);
      addBodyField(updateData, "destination", destination);
      const profileImageFile = getUploadedProfileImage(req);

      if (user.role === "agent" || user.role === "reseller") {
        updateData.whatsappNumber = typeof whatsappNumber === "string" ? whatsappNumber.trim() : "";
      }

      // 👇 profile image aaye to update karo
      if (profileImageFile) {
        // 🔥 old image delete
        if (user.imagePath) {
          const oldImagePath = resolveStoredUploadPath(user.imagePath);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }

        // ✅ DB field = imagePath
        updateData.imagePath = `uploads/profiles/${profileImageFile.filename}`;
      }

      const updatedUser = await storage.updateUser(userId, updateData);

      const { logActivity, ActivityActions } = await import("../middleware/activity-logger");
      await logActivity(
        req,
        ActivityActions.PROFILE_UPDATED,
        "user",
        userId,
        { profileImageUpdated: !!profileImageFile }
      );

      return ApiResponse.success(res, "Profile updated successfully", updatedUser);
    } catch (error: any) {
      return ApiResponse.serverError(res, error.message);
    }
  }
);



router.patch("/notification-preferences", requireAuth, async (req: Request, res: Response) => {
  try {
    const { notifyLowData, notifyExpiring } = req.body;

    if (typeof notifyLowData !== 'boolean' && typeof notifyExpiring !== 'boolean') {
      return ApiResponse.badRequest(res, "At least one notification preference must be provided");
    }

    const updateData: any = {};
    if (typeof notifyLowData === 'boolean') {
      updateData.notifyLowData = notifyLowData;
    }
    if (typeof notifyExpiring === 'boolean') {
      updateData.notifyExpiring = notifyExpiring;
    }

    const user = await storage.updateUser(req.session.userId!, updateData);

    const { logActivity, ActivityActions } = await import("../middleware/activity-logger");
    await logActivity(req, ActivityActions.PROFILE_UPDATED, 'user', req.session.userId!, {
      notificationPreferences: updateData
    });

    return ApiResponse.success(res, "Notification preferences updated successfully", user);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});


router.get("/orders", requireAuth, async (req: Request, res: Response) => {
  try {
    const orders = await storage.getOrdersByUser(req.session.userId!);

    const { resolvePackage } = await import("../services/packages/package-resolver");
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const pkg = await resolvePackage(order.packageId);
        let destination;
        if (pkg?.destinationId) {
          destination = await storage.getDestinationById(pkg.destinationId);
        }
        return { ...publicOrder(order), package: { ...publicPackage(pkg), destination } };
      })
    );

    return ApiResponse.success(res, "Orders fetched successfully", ordersWithDetails);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});


router.get("/my-esims-usages", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return ApiResponse.unauthorized(res, "Unauthorized");
    }

    // 1. Get all active eSIM orders for user
    const orders = (await storage.getOrdersByStatus(userId, "completed")).filter((order: any) => {
      return Boolean(order?.providerId) && Boolean(order?.iccid) && (
        Boolean(order?.providerOrderId) ||
        Boolean(order?.airaloOrderId) ||
        Boolean(order?.qrCode) ||
        Boolean(order?.qrCodeUrl) ||
        Boolean(order?.activationCode) ||
        Boolean(order?.smdpAddress)
      );
    });

    if (!orders || orders.length === 0) {
      return ApiResponse.success(res, "No active eSIMs found", []);
    }

    const { providerFactory } = await import("../providers/provider-factory");

    // 2. Fetch usage for each eSIM
    const usageResults = await Promise.all(
      orders.map(async (order) => {
        try {
          const providerId = order.providerId;
          const iccid = order.iccid;

          if (!providerId || !iccid) {
            return {
              orderId: order.id,
              iccid: null,
              status: "no_iccid",
            };
          }

          const providerService = await providerFactory.getServiceById(providerId);
          const usage = await providerService.getUsageData(iccid);

          return {
            orderId: order.id,
            iccid,
            providerId,
            packageId: order.packageId,
            usage,
          };
        } catch (err: any) {
          return {
            orderId: order.id,
            iccid: order.iccid,
            providerId: order.providerId,
            packageId: order.packageId,
            error: err.message,
          };
        }
      })
    );

    return ApiResponse.success(
      res,
      "eSIM usage fetched successfully",
      usageResults
    );
  } catch (error: any) {
    console.error("Error fetching eSIM usages:", error);
    return ApiResponse.serverError(res, error.message);
  }
});


router.get("/topups", requireAuth, async (req: Request, res: Response) => {
  try {
    const topups = await storage.getTopupsByUser(req.session.userId!);
    return ApiResponse.success(res, "Topups fetched successfully", topups);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.get("/activity", requireAuth, async (req: Request, res: Response) => {
  try {
    const logs = await storage.getActivityLogsByUser(req.session.userId!);
    return ApiResponse.success(res, "Activity logs fetched successfully", logs);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.get("/esims", requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return ApiResponse.unauthorized(res, "Unauthorized");
    }

    const orders = await storage.getOrdersByUser(req.session.userId);
    const esims = orders
      .filter(order => order.iccid && order.status === "completed")
      .map(publicOrder);

    return ApiResponse.success(res, "eSIMs fetched successfully", esims);
  } catch (error: any) {
    console.error("Error fetching customer eSIMs:", error);
    return ApiResponse.serverError(res, error.message);
  }
});

export default router;
