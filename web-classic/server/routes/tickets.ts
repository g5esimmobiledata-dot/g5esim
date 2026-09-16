"use strict";

import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { asyncHandler } from "../lib/asyncHandler";
import { ValidationError, NotFoundError, ForbiddenError } from "../lib/errors";
import { requireAuth, requireAdmin } from "../lib/middleware";
import { logger } from "../lib/logger";
import * as ApiResponse from "../utils/response";
import { getIO } from "../socket";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.session?.userId ?? req.userId;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await storage.getTicketsByUser(userId!, page, limit);

    return ApiResponse.success(
      res,
      "Tickets fetched successfully",
      result
    );
  })
);


router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const ticket = await storage.getTicketById(req.params.id);
    if (!ticket) {
      throw new NotFoundError("Ticket", req.params.id);
    }

    if (ticket.userId !== req.session.userId && !req.session.adminId) {
      throw new ForbiddenError("Access denied to this ticket");
    }

    return ApiResponse.success(res, "Ticket fetched successfully", ticket);
  })
);

router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, description, priority } = req.body;
    console.log("Creating ticket with data:", req.body);
    const userId = req.userId!;

    const user = await storage.getUser(userId);
    if (!user) {
      return ApiResponse.notFound(res, "User not found");
    }

    const ticket = await storage.createTicket({
      userId,
      userName: user.name || user.email,
      title,
      description,
      status: "open",
      priority: priority || "medium",
    });

    await storage.createNotification({
      userId,
      type: "ticket_reply",
      title: "Support Ticket Created",
      message: `Your ticket "${title}" has been created. We'll respond soon.`,
      read: false,
      metadata: { ticketId: ticket.id },
    });

    return ApiResponse.created(res, "Support ticket created successfully", { ticket });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});
// date : 16/03/2026 added by : deepak for updating ticket status and priority by user or admin  
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const ticketId = req.params.id;
    const { status, priority } = req.body;
    const ticket = await storage.getTicketById(ticketId);
    if (!ticket) {
      return ApiResponse.notFound(res, "Ticket not found");
    }
    if (ticket.userId !== req.session.userId && !req.session.adminId) {
      return ApiResponse.forbidden(res, "Access denied to this ticket");
    }
    let updateData: any = {};
    if (status) {
      updateData.status = status;
    } else if (priority) {
      updateData.priority = priority;
    }
    const updatedTicket = await storage.updateTicket(ticketId, updateData);
    return ApiResponse.success(res, "Ticket updated successfully", { ticket: updatedTicket });
  }
  catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
})


router.post("/:id/reply", requireAuth, async (req: Request, res: Response) => {
  try {
    const { message, isInternal = false } = req.body;
    const ticketId = req.params.id;
    const adminId = req.session.adminId!;

    if (!message) {
      return ApiResponse.badRequest(res, "Reply message is required");
    }

    const ticket = await storage.getTicketById(ticketId);
    if (!ticket) {
      return ApiResponse.notFound(res, "Ticket not found");
    }

    const reply = await storage.createTicketReply({
      ticketId,
      userId: null,
      adminId,
      message,
      isInternal,
    });

    if (ticket.status === "open") {
      await storage.updateTicket(ticketId, { status: "in_progress" });
    }


    // 🔥 REALTIME → ADMIN (Socket)
    const io = getIO();
    io.to(`ticket:${ticketId}`).emit("ticket_message", {
      ticketId,
      replyId: reply.id,
      senderType: "user",
      message: reply.message,
      createdAt: reply.createdAt,
    });

    if (!isInternal && ticket.userId) {
      const user = await storage.getUser(ticket.userId);
      if (user) {
        await storage.createNotification({
          userId: ticket.userId,
          type: "ticket_reply",
          title: "Support Ticket Update",
          message: "New reply on your support ticket",
          read: false,
          metadata: { ticketId, replyId: reply.id },
        });

        console.log(`In-app notification created for user ${user.email}`);
      }
    }

    return ApiResponse.created(res, "Reply added successfully", { reply });
  } catch (error: any) {
    console.error("Error creating ticket reply:", error);
    return ApiResponse.serverError(res, error.message);
  }
});



router.get("/:id/replies", requireAuth, async (req, res) => {
  try {
    const ticketId = req.params.id;

    const currentUserId = req.session?.userId ?? req.userId;

    if (!req.session?.adminId) {
      const ticket = await storage.getTicketById(ticketId);

      if (!ticket || ticket.userId !== currentUserId) {
        return ApiResponse.forbidden(res, "Access denied");
      }
    }

    const replies = await storage.getRepliesByTicket(ticketId);

    const visibleReplies = req.session.adminId
      ? replies
      : replies.filter(r => !r.isInternal);

    // 🔥 NORMALIZE FOR FRONTEND
    const normalized = visibleReplies.map(r => ({
      id: r.id,
      ticketId: r.ticketId,
      senderId: r.adminId ?? r.userId,
      senderType: r.adminId ? "admin" : r.userId ? "user" : "ai",
      senderName: r.adminId ? "Support" : r.userId ? "You" : "Concierge AI",
      message: r.message,
      isInternal: r.isInternal,
      createdAt: r.createdAt,
    }));

    return ApiResponse.success(res, "Replies fetched successfully", normalized);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});


export default router;
