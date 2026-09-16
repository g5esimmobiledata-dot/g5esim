import { Router } from "express";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "server/db";
import { tickets, ticketMessages } from "@shared/schema";
import { requireAuth } from "server/lib/middleware";
import { storage } from "server/storage";
import * as ApiResponse from "../utils/response";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, priority, search, page = "1", limit = "25" } = req.query;
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

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [ticketList, totalCount] = await Promise.all([
      db
        .select()
        .from(tickets)
        .where(whereClause)
        .orderBy(desc(tickets.createdAt))
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

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, id),
    });

    if (!ticket) {
      return ApiResponse.notFound(res, "Ticket not found");
    }

    if (user.role !== "admin" && user.role !== "super_admin") {
      if (ticket.userId !== user.id) {
        return ApiResponse.forbidden(res, "Access denied");
      }
    }

    const messages = await db.query.ticketMessages.findMany({
      where: eq(ticketMessages.ticketId, id),
      orderBy: [asc(ticketMessages.createdAt)],
    });

    const filteredMessages =
      user.role === "admin" || user.role === "super_admin"
        ? messages
        : messages.filter((msg) => !msg.isInternal);

    return ApiResponse.success(res, "Ticket fetched successfully", {
      ticket,
      messages: filteredMessages,
    });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return ApiResponse.serverError(res, "Failed to fetch ticket");
  }
});

router.post("/", requireAuth, async (req, res) => {
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

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assignedToId, assignedToName } = req.body;
    const user = (req as any).user;

    if (user.role !== "admin" && user.role !== "super_admin") {
      return ApiResponse.forbidden(res, "Only admin can update tickets");
    }

    const updateData: any = { updatedAt: new Date() };

    if (status !== undefined) {
      updateData.status = status;
      if (status === "resolved") updateData.resolvedAt = new Date();
      if (status === "closed") updateData.closedAt = new Date();
    }

    if (priority !== undefined) updateData.priority = priority;
    
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

router.post("/:id/messages", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, isInternal = false } = req.body;
    const user = (req as any).user;

    if (!message || !message.trim()) {
      return ApiResponse.badRequest(res, "Message is required");
    }

    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, id),
    });

    if (!ticket) {
      return ApiResponse.notFound(res, "Ticket not found");
    }

    if (user.role !== "admin" && user.role !== "super_admin") {
      if (ticket.userId !== user.id) {
        return ApiResponse.forbidden(res, "Access denied");
      }
    }

    const internalAllowed = user.role === "admin" || user.role === "super_admin";

    const [newMessage] = await db
      .insert(ticketMessages)
      .values({
        ticketId: id,
        senderId: user.id,
        senderType: user.role,
        senderName: user.name || user.username,
        message: message.trim(),
        isInternal: internalAllowed ? isInternal : false,
      })
      .returning();

    await db
      .update(tickets)
      .set({ updatedAt: new Date() })
      .where(eq(tickets.id, id));

    return ApiResponse.created(res, "Message added successfully", { message: newMessage });
  } catch (error) {
    console.error("Error adding message:", error);
    return ApiResponse.serverError(res, "Failed to add message");
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    if (user.role !== "admin" && user.role !== "super_admin") {
      return ApiResponse.forbidden(res, "Only admin can delete tickets");
    }

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
