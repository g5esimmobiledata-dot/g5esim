"use strict";

import { Router, Request, Response } from "express";
import { db } from "../../db";
import { giftCards, giftCardTransactions, users } from "@shared/schema";
import { eq, desc, count, sum, and, isNull, or } from "drizzle-orm";
import { requireAdmin } from "../../lib/middleware";
import { z } from "zod";
import crypto from "crypto";

const router = Router();

function generateGiftCardCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "GC-";
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 3) result += "-";
  }
  return result;
}

const optionalNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().positive().optional()
);

const optionalDateString = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.string().transform((val) => new Date(val).toISOString()).optional()
);

const optionalEmail = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.string().email().optional().nullable()
);

const createGiftCardSchema = z.object({
  code: z.string().optional(),
  amount: z.coerce.number().positive(),
  balance: optionalNumber,
  currency: z.string().default("USD"),
  recipientEmail: optionalEmail,
  recipientName: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().optional().nullable()
  ),
  message: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().optional().nullable()
  ),
  theme: z.string().default("default"),
  expiresAt: optionalDateString,
});

const bulkCreateSchema = z.object({
  count: z.coerce.number().int().positive().max(100),
  amount: z.coerce.number().positive(),
});

router.get("/gift-cards", requireAdmin, async (req: Request, res: Response) => {
  try {
    const allCards = await db
      .select()
      .from(giftCards)
      .orderBy(desc(giftCards.createdAt));

    const activeCount = allCards.filter((c) => c.status === "active").length;
    const totalValue = allCards.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const redeemedValue = allCards.reduce((sum, c) => sum + (parseFloat(c.amount) - parseFloat(c.balance)), 0);
    const pendingDelivery = allCards.filter(
      (c) => c.recipientEmail && !c.deliverySent && c.status === "active"
    ).length;

    res.json({
      success: true,
      giftCards: allCards,
      statistics: {
        totalCards: allCards.length,
        activeCards: activeCount,
        totalValue,
        redeemedValue,
        pendingDelivery,
      },
    });
  } catch (error) {
    console.error("Error fetching gift cards:", error);
    res.status(500).json({ success: false, message: "Failed to fetch gift cards" });
  }
});

router.get("/gift-cards/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [card] = await db.select().from(giftCards).where(eq(giftCards.id, id));

    if (!card) {
      return res.status(404).json({ success: false, message: "Gift card not found" });
    }

    res.json({ success: true, giftCard: card });
  } catch (error) {
    console.error("Error fetching gift card:", error);
    res.status(500).json({ success: false, message: "Failed to fetch gift card" });
  }
});

router.get("/gift-cards/:id/transactions", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const transactions = await db
      .select()
      .from(giftCardTransactions)
      .where(eq(giftCardTransactions.giftCardId, id))
      .orderBy(desc(giftCardTransactions.usedAt));

    res.json({ success: true, transactions });
  } catch (error) {
    console.error("Error fetching gift card transactions:", error);
    res.status(500).json({ success: false, message: "Failed to fetch transactions" });
  }
});

router.post("/gift-cards", requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = createGiftCardSchema.parse(req.body);
    const adminId = (req as any).admin?.id;

    const balance = parsed.balance ?? parsed.amount;
    if (balance > parsed.amount) {
      return res.status(400).json({ success: false, message: "Balance cannot exceed amount" });
    }

    const code = parsed.code || generateGiftCardCode();

    const existing = await db.select().from(giftCards).where(eq(giftCards.code, code));
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "Gift card code already exists" });
    }

    const [card] = await db
      .insert(giftCards)
      .values({
        code,
        amount: parsed.amount.toString(),
        balance: balance.toString(),
        currency: parsed.currency,
        recipientEmail: parsed.recipientEmail || null,
        recipientName: parsed.recipientName || null,
        message: parsed.message || null,
        theme: parsed.theme,
        expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
        status: "active",
        createdByAdmin: adminId,
      })
      .returning();

    res.status(201).json({ success: true, message: "Gift card created", giftCard: card });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation error", errors: error.errors });
    }
    console.error("Error creating gift card:", error);
    res.status(500).json({ success: false, message: "Failed to create gift card" });
  }
});

router.post("/gift-cards/bulk", requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = bulkCreateSchema.parse(req.body);
    const adminId = (req as any).admin?.id;

    const cards = [];
    const maxAttempts = 20;

    for (let i = 0; i < parsed.count; i++) {
      let code: string = "";
      let codeFound = false;

      for (let attempts = 0; attempts < maxAttempts; attempts++) {
        code = generateGiftCardCode();
        const existing = await db.select().from(giftCards).where(eq(giftCards.code, code));
        if (existing.length === 0) {
          codeFound = true;
          break;
        }
      }

      if (!codeFound) {
        return res.status(500).json({
          success: false,
          message: `Failed to generate unique code after ${maxAttempts} attempts. Created ${cards.length} of ${parsed.count} cards.`,
          created: cards.length,
          giftCards: cards,
        });
      }

      const [card] = await db
        .insert(giftCards)
        .values({
          code,
          amount: parsed.amount.toString(),
          balance: parsed.amount.toString(),
          currency: "USD",
          theme: "default",
          status: "active",
          createdByAdmin: adminId,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        })
        .returning();

      cards.push(card);
    }

    res.status(201).json({ success: true, message: `${cards.length} gift cards created`, created: cards.length, giftCards: cards });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation error", errors: error.errors });
    }
    console.error("Error bulk creating gift cards:", error);
    res.status(500).json({ success: false, message: "Failed to create gift cards" });
  }
});

router.post("/gift-cards/:id/send", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [card] = await db.select().from(giftCards).where(eq(giftCards.id, id));
    if (!card) {
      return res.status(404).json({ success: false, message: "Gift card not found" });
    }

    if (!card.recipientEmail) {
      return res.status(400).json({ success: false, message: "No recipient email set" });
    }

    if (card.deliverySent) {
      return res.status(400).json({ success: false, message: "Gift card already delivered" });
    }

    await db
      .update(giftCards)
      .set({ deliverySent: true, updatedAt: new Date() })
      .where(eq(giftCards.id, id));

    res.json({ success: true, message: "Gift card delivery email sent" });
  } catch (error) {
    console.error("Error sending gift card:", error);
    res.status(500).json({ success: false, message: "Failed to send gift card" });
  }
});

router.patch("/gift-cards/:id/cancel", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [card] = await db.select().from(giftCards).where(eq(giftCards.id, id));
    if (!card) {
      return res.status(404).json({ success: false, message: "Gift card not found" });
    }

    if (card.status === "used") {
      return res.status(400).json({ success: false, message: "Cannot cancel a used gift card" });
    }

    const [updated] = await db
      .update(giftCards)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(giftCards.id, id))
      .returning();

    res.json({ success: true, message: "Gift card cancelled", giftCard: updated });
  } catch (error) {
    console.error("Error cancelling gift card:", error);
    res.status(500).json({ success: false, message: "Failed to cancel gift card" });
  }
});

export default router;
