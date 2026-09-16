import { Router } from "express";
import { eq, desc, asc, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "server/db";
import {
    faqs,
    faqCategories,
    insertFaqSchema,
    updateFaqSchema,
    insertFaqCategorySchema,
    updateFaqCategorySchema
} from "@shared/schema";

const router = Router();

// ==================== FAQ CATEGORIES ====================

// GET /api/faqs/categories - Get all categories
router.get("/categories", async (req, res) => {
    try {
        const categories = await db
            .select()
            .from(faqCategories)
            .orderBy(asc(faqCategories.position), asc(faqCategories.name));

        res.json({
            success: true,
            data: categories,
        });
    } catch (error) {
        console.error("Error fetching FAQ categories:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch FAQ categories",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// GET /api/faqs/categories/:id - Get single category
router.get("/categories/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [category] = await db
            .select()
            .from(faqCategories)
            .where(eq(faqCategories.id, id));

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        res.json({
            success: true,
            data: category,
        });
    } catch (error) {
        console.error("Error fetching FAQ category:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch FAQ category",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// POST /api/faqs/categories - Create category
router.post("/categories", async (req, res) => {
    try {
        const validatedData = insertFaqCategorySchema.parse(req.body);

        // Check if slug exists
        const [existingCategory] = await db
            .select()
            .from(faqCategories)
            .where(eq(faqCategories.slug, validatedData.slug));

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: "A category with this slug already exists",
            });
        }

        const [newCategory] = await db
            .insert(faqCategories)
            .values(validatedData)
            .returning();

        res.status(201).json({
            success: true,
            data: newCategory,
            message: "Category created successfully",
        });
    } catch (error) {
        console.error("Error creating FAQ category:", error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors,
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to create category",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// PUT /api/faqs/categories/:id - Update category
router.put("/categories/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const validatedData = updateFaqCategorySchema.parse(req.body);

        const [existingCategory] = await db
            .select()
            .from(faqCategories)
            .where(eq(faqCategories.id, id));

        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        // Check slug uniqueness if being updated
        if (validatedData.slug && validatedData.slug !== existingCategory.slug) {
            const [slugExists] = await db
                .select()
                .from(faqCategories)
                .where(eq(faqCategories.slug, validatedData.slug));

            if (slugExists) {
                return res.status(400).json({
                    success: false,
                    message: "A category with this slug already exists",
                });
            }
        }

        const [updatedCategory] = await db
            .update(faqCategories)
            .set({
                ...validatedData,
                updatedAt: new Date(),
            })
            .where(eq(faqCategories.id, id))
            .returning();

        res.json({
            success: true,
            data: updatedCategory,
            message: "Category updated successfully",
        });
    } catch (error) {
        console.error("Error updating FAQ category:", error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors,
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to update category",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// DELETE /api/faqs/categories/:id - Delete category
router.delete("/categories/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [existingCategory] = await db
            .select()
            .from(faqCategories)
            .where(eq(faqCategories.id, id));

        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        // Check if category has FAQs
        const categoryFaqs = await db
            .select()
            .from(faqs)
            .where(eq(faqs.categoryId, id));

        if (categoryFaqs.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category with ${categoryFaqs.length} FAQ(s). Please delete or reassign them first.`,
            });
        }

        await db.delete(faqCategories).where(eq(faqCategories.id, id));

        res.json({
            success: true,
            message: "Category deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting FAQ category:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete category",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// ==================== FAQS ====================

// GET /api/faqs - Get all FAQs with optional category filter
router.get("/", async (req, res) => {
    try {
        const { categoryId } = req.query;

        let query = db
            .select({
                faq: faqs,
                category: faqCategories,
            })
            .from(faqs)
            .leftJoin(faqCategories, eq(faqs.categoryId, faqCategories.id))
            .orderBy(asc(faqs.position), desc(faqs.createdAt));

        if (categoryId && typeof categoryId === "string") {
            query = query.where(eq(faqs.categoryId, categoryId)) as any;
        }

        const results = await query;

        const faqsData = results.map((row) => ({
            ...row.faq,
            category: row.category,
        }));

        res.json({
            success: true,
            data: faqsData,
        });
    } catch (error) {
        console.error("Error fetching FAQs:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch FAQs",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// GET /api/faqs/public - Get active FAQs grouped by category (for public display)
router.get("/public", async (req, res) => {
    try {
        const results = await db
            .select({
                faq: faqs,
                category: faqCategories,
            })
            .from(faqs)
            .leftJoin(faqCategories, eq(faqs.categoryId, faqCategories.id))
            .where(eq(faqs.isActive, true))
            .orderBy(asc(faqCategories.position), asc(faqs.position));

        // Group FAQs by category
        const groupedFaqs = results.reduce((acc: any, row) => {
            const categoryId = row.category?.id || "uncategorized";
            const categoryName = row.category?.name || "General";

            if (!acc[categoryId]) {
                acc[categoryId] = {
                    id: categoryId,
                    name: categoryName,
                    slug: row.category?.slug || "general",
                    faqs: [],
                };
            }

            acc[categoryId].faqs.push(row.faq);
            return acc;
        }, {});

        res.json({
            success: true,
            data: Object.values(groupedFaqs),
        });
    } catch (error) {
        console.error("Error fetching public FAQs:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch FAQs",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// GET /api/faqs/:id - Get single FAQ
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db
            .select({
                faq: faqs,
                category: faqCategories,
            })
            .from(faqs)
            .leftJoin(faqCategories, eq(faqs.categoryId, faqCategories.id))
            .where(eq(faqs.id, id));

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found",
            });
        }

        // Increment view count
        await db
            .update(faqs)
            .set({ views: sql`${faqs.views} + 1` })
            .where(eq(faqs.id, id));

        res.json({
            success: true,
            data: {
                ...result.faq,
                category: result.category,
            },
        });
    } catch (error) {
        console.error("Error fetching FAQ:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch FAQ",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// POST /api/faqs - Create FAQ
router.post("/", async (req, res) => {
    try {
        const validatedData = insertFaqSchema.parse(req.body);

        // Validate category exists if provided
        if (validatedData.categoryId) {
            const [category] = await db
                .select()
                .from(faqCategories)
                .where(eq(faqCategories.id, validatedData.categoryId));

            if (!category) {
                return res.status(400).json({
                    success: false,
                    message: "Category not found",
                });
            }
        }

        const [newFaq] = await db.insert(faqs).values(validatedData).returning();

        res.status(201).json({
            success: true,
            data: newFaq,
            message: "FAQ created successfully",
        });
    } catch (error) {
        console.error("Error creating FAQ:", error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors,
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to create FAQ",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// PUT /api/faqs/:id - Update FAQ
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const validatedData = updateFaqSchema.parse(req.body);

        const [existingFaq] = await db.select().from(faqs).where(eq(faqs.id, id));

        if (!existingFaq) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found",
            });
        }

        // Validate category if being updated
        if (validatedData.categoryId) {
            const [category] = await db
                .select()
                .from(faqCategories)
                .where(eq(faqCategories.id, validatedData.categoryId));

            if (!category) {
                return res.status(400).json({
                    success: false,
                    message: "Category not found",
                });
            }
        }

        const [updatedFaq] = await db
            .update(faqs)
            .set({
                ...validatedData,
                updatedAt: new Date(),
            })
            .where(eq(faqs.id, id))
            .returning();

        res.json({
            success: true,
            data: updatedFaq,
            message: "FAQ updated successfully",
        });
    } catch (error) {
        console.error("Error updating FAQ:", error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors,
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to update FAQ",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// DELETE /api/faqs/:id - Delete FAQ
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [existingFaq] = await db.select().from(faqs).where(eq(faqs.id, id));

        if (!existingFaq) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found",
            });
        }

        await db.delete(faqs).where(eq(faqs.id, id));

        res.json({
            success: true,
            message: "FAQ deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting FAQ:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete FAQ",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

export default router;