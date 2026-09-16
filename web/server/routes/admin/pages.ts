import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { insertPageSchema, pages, updatePageSchema } from "@shared/schema";
import { db } from "server/db";
import { requireAdmin } from "server/lib/middleware";

const router = Router();

// GET /api/pages - Get all pages
router.get("/", async (req, res) => {
    try {
        const allPages = await db.select().from(pages).orderBy(pages.createdAt);

        res.json({
            success: true,
            data: allPages,
        });
    } catch (error) {
        console.error("Error fetching pages:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch pages",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// GET /api/pages/slug/:slug - Get page by slug (for frontend display)
router.get("/slug/:slug", async (req, res) => {
    try {
        const { slug } = req.params;

        const [page] = await db
            .select()
            .from(pages)
            .where(eq(pages.slug, slug));

        if (!page) {
            return res.status(404).json({
                success: false,
                message: "Page not found",
            });
        }

        // Only return published pages for public access
        if (!page.isPublished) {
            return res.status(404).json({
                success: false,
                message: "Page not found",
            });
        }

        res.json({
            success: true,
            data: page,
        });
    } catch (error) {
        console.error("Error fetching page:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch page",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// GET /api/pages/:id - Get single page by ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [page] = await db.select().from(pages).where(eq(pages.id, id));

        if (!page) {
            return res.status(404).json({
                success: false,
                message: "Page not found",
            });
        }

        res.json({
            success: true,
            data: page,
        });
    } catch (error) {
        console.error("Error fetching page:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch page",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// POST /api/pages - Create new page
router.post("/", requireAdmin, async (req, res) => {
    try {
        const validatedData = insertPageSchema.parse(req.body);

        // Check if slug already exists
        const [existingPage] = await db
            .select()
            .from(pages)
            .where(eq(pages.slug, validatedData.slug));

        if (existingPage) {
            return res.status(400).json({
                success: false,
                message: "A page with this slug already exists",
            });
        }

        const [newPage] = await db
            .insert(pages)
            .values(validatedData)
            .returning();

        res.status(201).json({
            success: true,
            data: newPage,
            message: "Page created successfully",
        });
    } catch (error) {
        console.error("Error creating page:", error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors,
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to create page",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// PUT /api/pages/:id - Update page
router.put("/:id", requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const validatedData = updatePageSchema.parse(req.body);

        // Check if page exists
        const [existingPage] = await db.select().from(pages).where(eq(pages.id, id));

        if (!existingPage) {
            return res.status(404).json({
                success: false,
                message: "Page not found",
            });
        }

        // If slug is being updated, check if new slug already exists
        if (validatedData.slug && validatedData.slug !== existingPage.slug) {
            const [slugExists] = await db
                .select()
                .from(pages)
                .where(eq(pages.slug, validatedData.slug));

            if (slugExists) {
                return res.status(400).json({
                    success: false,
                    message: "A page with this slug already exists",
                });
            }
        }

        const [updatedPage] = await db
            .update(pages)
            .set({
                ...validatedData,
                updatedAt: new Date(),
            })
            .where(eq(pages.id, id))
            .returning();

        res.json({
            success: true,
            data: updatedPage,
            message: "Page updated successfully",
        });
    } catch (error) {
        console.error("Error updating page:", error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors,
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to update page",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// DELETE /api/pages/:id - Delete page
router.delete("/:id", requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const [existingPage] = await db.select().from(pages).where(eq(pages.id, id));

        if (!existingPage) {
            return res.status(404).json({
                success: false,
                message: "Page not found",
            });
        }

        await db.delete(pages).where(eq(pages.id, id));

        res.json({
            success: true,
            message: "Page deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting page:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete page",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

export default router;
