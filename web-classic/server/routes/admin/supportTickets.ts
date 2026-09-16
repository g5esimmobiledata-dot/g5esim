import { Router } from "express";
import { and, asc, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "server/db";
import { tickets, ticketMessages, ticketReplies } from "@shared/schema";
import { requireAdmin } from "server/lib/middleware";
import { storage } from "server/storage";
import * as ApiResponse from "../../utils/response";
import { getAdminMessaging } from "server/config/firebase-admin";
import { getIO } from "server/socket";

const router = Router();

router.get("/", requireAdmin, async (req, res) => {
  try {
    const { status, priority, search, channel, page = "1", limit = "25" } = req.query;
    const user = (req as any).user;
    console.log("Fetching tickets for user:", user);

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [];

    if (status) {
      conditions.push(eq(tickets.status, status as any));
    }

    if (priority) {
      conditions.push(eq(tickets.priority, priority as any));
    }

    if (search) {
      conditions.push(
        or(
          ilike(tickets.title, `%${search}%`),
          ilike(tickets.description, `%${search}%`),
          ilike(tickets.userName, `%${search}%`)
        )
      );
    }

    if (channel === "concierge") {
      conditions.push(eq(tickets.title, "AI Voice Concierge Request"));
      if (!status) {
        conditions.push(ne(tickets.status, "closed"));
      }
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [ticketList, totalCount] = await Promise.all([
      db
        .select()
        .from(tickets)
        .where(whereClause)
        .orderBy(desc(tickets.updatedAt))
        .limit(limitNum)
        .offset(offset),

      db
        .select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(whereClause),
    ]);

    return ApiResponse.successWithPagination(
      res,
      "Tickets fetched successfully",
      { tickets: ticketList },
      {
        page: pageNum,
        limit: limitNum,
        total: Number(totalCount[0]?.count || 0),
      }
    );
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return ApiResponse.serverError(res, "Failed to fetch tickets");
  }
});


router.get("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, id),
    });

    if (!ticket) {
      return ApiResponse.notFound(res, "Ticket not found");
    }

    const replies = await db.query.ticketReplies.findMany({
      where: eq(ticketReplies.ticketId, id),
      orderBy: [asc(ticketReplies.createdAt)],
    });

    // ✅ NORMALIZE FOR FRONTEND
    const messages = replies.map((r) => ({
      id: r.id,
      ticketId: r.ticketId,
      senderId: r.adminId ?? r.userId,
      senderType: r.adminId ? "admin" : r.userId ? "user" : "ai",
      senderName: r.adminId ? "Support" : r.userId ? "User" : "Concierge AI",
      message: r.message,
      isInternal: r.isInternal,
      createdAt: r.createdAt,
    }));

    return ApiResponse.success(res, "Ticket fetched successfully", {
      ticket,
      messages,
    });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return ApiResponse.serverError(res, "Failed to fetch ticket");
  }
});



router.post("/", requireAdmin, async (req, res) => {
  try {
    const { title, description, priority = "medium" } = req.body;
    const userId = (req as any).session.userId;

    console.log("Creating ticket for user:", userId, req.body);

    if (!title || !description) {
      return ApiResponse.badRequest(res, "Title and description required");
    }

    const user = await storage.getUser(userId);

    const [newTicket] = await db
      .insert(tickets)
      .values({
        title,
        description,
        priority,
        userId: user.id,
        userName: user.name || "User",
      })
      .returning();

    return ApiResponse.created(res, "Ticket created successfully", { ticket: newTicket });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return ApiResponse.serverError(res, "Failed to create ticket");
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assignedToId, assignedToName } = req.body;
    const validStatuses = ["open", "in_progress", "resolved", "closed"];
    const validPriorities = ["low", "medium", "high", "urgent", "normal"];

    const updateData: any = { updatedAt: new Date() };

    if (status !== undefined) {
      if (!validStatuses.includes(String(status))) {
        return ApiResponse.badRequest(res, "Invalid ticket status");
      }
      updateData.status = status;
      if (status === "resolved") updateData.resolvedAt = new Date();
      if (status === "closed") updateData.closedAt = new Date();
    }

    if (priority !== undefined) {
      if (!validPriorities.includes(String(priority))) {
        return ApiResponse.badRequest(res, "Invalid ticket priority");
      }
      updateData.priority = priority;
    }

    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (assignedToName !== undefined) updateData.assignedToName = assignedToName;

    const [updatedTicket] = await db
      .update(tickets)
      .set(updateData)
      .where(eq(tickets.id, id))
      .returning();

    if (!updatedTicket) {
      return ApiResponse.notFound(res, "Ticket not found");
    }

    return ApiResponse.success(res, "Ticket updated successfully", updatedTicket);
  } catch (error) {
    console.error("Error updating ticket:", error);
    return ApiResponse.serverError(res, "Failed to update ticket");
  }
});




router.post("/:id/messages", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, isInternal = false } = req.body;
    const adminId = (req as any).session.adminId;

    if (!message || !message.trim()) {
      return ApiResponse.badRequest(res, "Message is required");
    }

    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, id),
    });

    if (!ticket) {
      return ApiResponse.notFound(res, "Ticket not found");
    }

    // 1️⃣ Save admin reply
    const [reply] = await db
      .insert(ticketReplies)
      .values({
        ticketId: id,
        adminId,
        userId: null,
        message: message.trim(),
        isInternal,
      })
      .returning();

    // 2️⃣ Update ticket timestamp
    await db
      .update(tickets)
      .set({ updatedAt: new Date() })
      .where(eq(tickets.id, id));

    // 3️⃣ 🔥 REALTIME → USER (Socket)
    if (!isInternal) {
      const io = getIO();
      io.to(`ticket:${id}`).emit("ticket_message", {
        ticketId: id,
        replyId: reply.id,
        senderType: "admin",
        message: reply.message,
        createdAt: reply.createdAt,
      });
    }

    // 4️⃣ 🔔 PUSH NOTIFICATION (FCM) → USER
    if (!isInternal && ticket.userId) {
      const user = await storage.getUser(ticket.userId);
      const fcmToken = user?.fcmToken;

      if (fcmToken) {
        const payload = {
          notification: {
            title: `Update on Your Ticket #${id}`,
            body: message.trim().substring(0, 100),
          },
          data: {
            ticketId: id,
            replyId: reply.id,
            type: "ticket_reply",
          },
          token: fcmToken,
        };

        try {
          const messaging = await getAdminMessaging();
          await messaging.send(payload);
          console.log("📱 Push sent to user:", user.id);
        } catch (err) {
          console.error("❌ FCM send error:", err);
        }
      }
    }

    return ApiResponse.created(res, "Message added successfully", { reply });
  } catch (error) {
    console.error("Error adding reply:", error);
    return ApiResponse.serverError(res, "Failed to add message");
  }
});



router.post("/:id/messagesOld", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, isInternal = false } = req.body;
    const adminId = (req as any).session.adminId;

    if (!message || !message.trim()) {
      return ApiResponse.badRequest(res, "Message is required");
    }

    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, id),
    });

    if (!ticket) {
      return ApiResponse.notFound(res, "Ticket not found");
    }

    // Save admin reply
    const [reply] = await db
      .insert(ticketReplies)
      .values({
        ticketId: id,
        adminId: adminId,
        userId: null,
        message: message.trim(),
        isInternal,
      })
      .returning();

    // Update ticket timestamp
    await db
      .update(tickets)
      .set({ updatedAt: new Date() })
      .where(eq(tickets.id, id));

    // Send Push Notification if not internal
    if (!isInternal && ticket.userId) {
      const user = await storage.getUser(ticket.userId);

      const fcmToken = user?.fcmToken;
      if (fcmToken) {
        const payload = {
          notification: {
            title: `New message on Ticket`,
            body: message.trim().substring(0, 100),
          },
          data: {
            ticketId: id,
            replyId: reply.id,
            type: "ticket_reply",
          },
          token: fcmToken,
        };

        try {
          const messaging = await getAdminMessaging();
          await messaging.send(payload);
          console.log("📱 Notification sent to user:", user.id);
        } catch (err) {
          console.error("❌ FCM send error:", err);
        }
      }
    }

    return ApiResponse.created(res, "Message added successfully", { reply });
  } catch (error) {
    console.error("Error adding reply:", error);
    return ApiResponse.serverError(res, "Failed to add message");
  }
});



router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await db
      .delete(tickets)
      .where(eq(tickets.id, req.params.id))
      .returning();

    if (!deleted.length) {
      return ApiResponse.notFound(res, "Ticket not found");
    }

    return ApiResponse.success(res, "Ticket deleted successfully");
  } catch (error) {
    console.error("Error deleting ticket:", error);
    return ApiResponse.serverError(res, "Failed to delete ticket");
  }
});

export default router;
