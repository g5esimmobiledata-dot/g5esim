import { Router } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "server/db";
import {
    termsConditions,
    createTermsSchema,
} from "@shared/schema";

const router = Router();

/* ================= ADMIN: GET ALL VERSIONS ================= */
router.get("/", async (_req, res) => {
  const data = await db
    .select()
    .from(termsConditions)
    .orderBy(desc(termsConditions.version));

  res.json({ success: true, data });
});

/* ================= ADMIN: CREATE NEW VERSION ================= */
router.post("/", async (req, res) => {
  const parsed = createTermsSchema.parse(req.body);

  // get latest version
  const [latest] = await db
    .select({ version: termsConditions.version })
    .from(termsConditions)
    .orderBy(desc(termsConditions.version))
    .limit(1);

  const nextVersion = latest ? latest.version + 1 : 1;

  // deactivate old versions
  await db
    .update(termsConditions)
    .set({ isActive: false })
    .where(eq(termsConditions.isActive, true));

  const [created] = await db
    .insert(termsConditions)
    .values({
      title: parsed.title,
      content: parsed.content,
      version: nextVersion,
      isActive: true,
    })
    .returning();

  res.status(201).json({
    success: true,
    data: created,
    message: "Terms & Conditions updated (new version created)",
  });
});

export default router;
