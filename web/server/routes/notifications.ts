"use strict";

import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { asyncHandler } from "../lib/asyncHandler";
import { NotFoundError } from "../lib/errors";
import { requireAuth } from "../lib/middleware";
import * as ApiResponse from "../utils/response";

const router = Router();

// router.get("/", requireAuth, async (req: Request, res: Response) => {
//   try {
//     const userId = req.session.userId!;
//     const notifications = await storage.getNotificationsByUser(userId);
//     const unreadCount = await storage.getUnreadNotificationCount(userId);
    
//     return ApiResponse.success(res, "Notifications fetched successfully", { 
//       notifications,
//       unreadCount 
//     });
//   } catch (error: any) {
//     return ApiResponse.serverError(res, error.message);
//   }
// });


router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;

    const [notifications, unreadCount, total] = await Promise.all([
      storage.getNotificationsByUser(userId, limit, offset),
      storage.getUnreadNotificationCount(userId),
      storage.getTotalNotificationsCount(userId),
    ]);

    return ApiResponse.success(res, "Notifications fetched successfully", {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});




router.patch("/:id/read", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await storage.markNotificationRead(id);
    return ApiResponse.success(res, "Notification marked as read");
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});


router.delete("/delete-all-notification", requireAuth, async (req, res) => {
  try{

  //   console.log("👉 DELETE ALL API HIT");
  // console.log("UserId:", req.userId);

  const userId = req.userId!;
  await storage.deleteAllNotifications(userId);

  return ApiResponse.success(res, "All notifications deleted successfully");

  }
catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
  
});


router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await storage.deleteNotification(id);

    return ApiResponse.success(res, "Notification deleted successfully");
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});






router.patch("/read-all", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    await storage.markAllNotificationsRead(userId);
    return ApiResponse.success(res, "All notifications marked as read");
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

export default router;
