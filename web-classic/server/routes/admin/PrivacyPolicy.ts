import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "server/db";
import {
    privacyPolicies,
    insertPrivacyPolicySchema,
} from "@shared/schema";
import { requireAdmin } from "server/lib/middleware";

const router = Router();

/* ======================================================
   CREATE / UPDATE PRIVACY POLICY (ADMIN)
   POST /api/admin/privacy-policy
====================================================== */
router.post("/", async (req, res) => {
  try {
    // 🔎 Validate request body
    const validatedData = insertPrivacyPolicySchema.parse(req.body);

    // 1️⃣ Deactivate old policies
    await db
      .update(privacyPolicies)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(privacyPolicies.isActive, true));

    // 2️⃣ Get latest version
    const [latestPolicy] = await db
      .select()
      .from(privacyPolicies)
      .orderBy(desc(privacyPolicies.version))
      .limit(1);

    const nextVersion = latestPolicy ? latestPolicy.version + 1 : 1;

    // 3️⃣ Insert new policy
    const [newPolicy] = await db
      .insert(privacyPolicies)
      .values({
        title: validatedData.title,
        content: validatedData.content,
        version: nextVersion,
        isActive: true,
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Privacy Policy updated successfully",
      data: newPolicy,
    });
  } catch (error) {
    console.error("Error creating/updating Privacy Policy:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update Privacy Policy",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/* ======================================================
   GET ALL PRIVACY POLICY VERSIONS (ADMIN)
   GET /api/admin/privacy-policy
====================================================== */
router.get("/", async (_req, res) => {
  try {
    const policies = await db
      .select()
      .from(privacyPolicies)
      .orderBy(desc(privacyPolicies.version));

    return res.json({
      success: true,
      data: policies,
    });
  } catch (error) {
    console.error("Error fetching Privacy Policies:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch Privacy Policies",
    });
  }
});

export default router;
