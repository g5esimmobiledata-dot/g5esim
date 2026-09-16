"use strict";

import { Router, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  languages,
  translationKeys,
  translationValues,
  type InsertLanguage,
  type Language,
} from "@shared/schema";
import { db } from "../../db";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAdmin } from "../../lib/middleware";
import { storage } from "../../storage";
import * as ApiResponse from "../../utils/response";

const router = Router();

const languagePayloadSchema = z.object({
  code: z.string().min(2).max(10),
  name: z.string().min(1),
  nativeName: z.string().min(1),
  flagCode: z.string().min(2).max(10).optional().nullable(),
  isRTL: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

function normalizeLanguagePayload(body: unknown): InsertLanguage {
  const parsed = languagePayloadSchema.parse(body);

  return {
    code: parsed.code.trim().toLowerCase(),
    name: parsed.name.trim(),
    nativeName: parsed.nativeName.trim(),
    flagCode: parsed.flagCode?.trim().toUpperCase() || null,
    isRTL: parsed.isRTL ?? false,
    isEnabled: parsed.isEnabled ?? true,
    isDefault: parsed.isDefault ?? false,
    sortOrder: parsed.sortOrder ?? 0,
  };
}

function flattenTranslations(input: unknown): Array<{
  namespace: string;
  key: string;
  value: string;
}> {
  const result: Array<{ namespace: string; key: string; value: string }> = [];

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return result;
  }

  for (const [namespaceOrFullKey, value] of Object.entries(input as Record<string, unknown>)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
        result.push({
          namespace: namespaceOrFullKey.trim(),
          key: key.trim(),
          value: String(nestedValue ?? ""),
        });
      }
      continue;
    }

    const separatorIndex = namespaceOrFullKey.indexOf(".");
    if (separatorIndex <= 0) continue;

    result.push({
      namespace: namespaceOrFullKey.slice(0, separatorIndex).trim(),
      key: namespaceOrFullKey.slice(separatorIndex + 1).trim(),
      value: String(value ?? ""),
    });
  }

  return result.filter((item) => item.namespace && item.key);
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

async function findTranslationKey(namespace: string, keyName: string) {
  const [existing] = await db
    .select()
    .from(translationKeys)
    .where(and(eq(translationKeys.namespace, namespace), eq(translationKeys.key, keyName)))
    .limit(1);

  return existing;
}

async function ensureTranslationKey(namespace: string, keyName: string) {
  const existing = await findTranslationKey(namespace, keyName);
  if (existing) return existing;

  const [created] = await db
    .insert(translationKeys)
    .values({ namespace, key: keyName })
    .returning();

  return created;
}

router.get(
  "/languages",
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await storage.getAllLanguages();
    return ApiResponse.success(res, "Languages retrieved", result);
  }),
);

router.post(
  "/languages",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const payload = normalizeLanguagePayload(req.body);
    const existing = await storage.getLanguageByCode(payload.code);

    if (existing) {
      return ApiResponse.conflict(res, `Language "${payload.code}" already exists`);
    }

    let created: Language;

    if (payload.isDefault) {
      await db.transaction(async (tx) => {
        await tx.update(languages).set({ isDefault: false, updatedAt: new Date() });
        const [row] = await tx.insert(languages).values(payload).returning();
        created = row;
      });
    } else {
      created = await storage.createLanguage(payload);
    }

    return ApiResponse.created(res, "Language created", created!);
  }),
);

router.put(
  "/languages/:id",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await storage.getLanguageById(req.params.id);
    if (!existing) return ApiResponse.notFound(res, "Language not found");

    const payload = normalizeLanguagePayload({
      ...existing,
      ...req.body,
    });

    const duplicate = await storage.getLanguageByCode(payload.code);
    if (duplicate && duplicate.id !== req.params.id) {
      return ApiResponse.conflict(res, `Language "${payload.code}" already exists`);
    }

    let updated: Language | undefined;

    if (payload.isDefault) {
      await db.transaction(async (tx) => {
        await tx
          .update(languages)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(languages.isDefault, true));

        const [row] = await tx
          .update(languages)
          .set({ ...payload, isDefault: true, updatedAt: new Date() })
          .where(eq(languages.id, req.params.id))
          .returning();

        updated = row;
      });
    } else {
      updated = await storage.updateLanguage(req.params.id, payload);
    }

    return ApiResponse.success(res, "Language updated", updated);
  }),
);

router.delete(
  "/languages/:id",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const language = await storage.getLanguageById(req.params.id);
    if (!language) return ApiResponse.notFound(res, "Language not found");

    if (language.isDefault) {
      return ApiResponse.badRequest(res, "Default language cannot be deleted");
    }

    await storage.deleteLanguage(req.params.id);
    return ApiResponse.success(res, "Language deleted");
  }),
);

router.post(
  "/languages/:id/set-default",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const language = await storage.getLanguageById(req.params.id);
    if (!language) return ApiResponse.notFound(res, "Language not found");

    await storage.setDefaultLanguage(req.params.id);
    return ApiResponse.success(res, "Default language updated");
  }),
);

router.post(
  "/translations/keys",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = z
      .object({
        namespace: z.string().min(1).max(50),
        key: z.string().min(1),
        description: z.string().optional().nullable(),
      })
      .parse(req.body);

    const namespace = parsed.namespace.trim();
    const keyName = parsed.key.trim();
    const existing = await findTranslationKey(namespace, keyName);

    if (existing) {
      return ApiResponse.conflict(res, "Translation key already exists");
    }

    const created = await storage.createTranslationKey({
      namespace,
      key: keyName,
      description: parsed.description?.trim() || null,
    });

    return ApiResponse.created(res, "Translation key created", created);
  }),
);

router.delete(
  "/translations/keys/:keyId",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const key = await storage.getTranslationKeyById(req.params.keyId);
    if (!key) return ApiResponse.notFound(res, "Translation key not found");

    await storage.deleteTranslationKey(req.params.keyId);
    return ApiResponse.success(res, "Translation key deleted");
  }),
);

router.get(
  "/translations/:languageId/export",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const language = await storage.getLanguageById(req.params.languageId);
    if (!language) return ApiResponse.notFound(res, "Language not found");

    const rows = await storage.getTranslationsForLanguage(language.id);
    const format = String(req.query.format || "json").toLowerCase();

    if (format === "csv") {
      const csvRows = ["key,value"].concat(
        rows.map((row) => `${escapeCsv(`${row.namespace}.${row.key}`)},${escapeCsv(row.value)}`),
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${language.code}_translations.csv"`,
      );
      return res.send(csvRows.join("\n"));
    }

    const nested = rows.reduce<Record<string, Record<string, string>>>((result, row) => {
      result[row.namespace] ??= {};
      result[row.namespace][row.key] = row.value;
      return result;
    }, {});

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${language.code}_translations.json"`,
    );
    return res.send(JSON.stringify(nested, null, 2));
  }),
);

router.get(
  "/translations/:languageId",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const language = await storage.getLanguageById(req.params.languageId);
    if (!language) return ApiResponse.notFound(res, "Language not found");

    const namespace = typeof req.query.namespace === "string" ? req.query.namespace.trim() : "";
    const keys = namespace
      ? await storage.getTranslationKeysByNamespace(namespace)
      : await storage.getAllTranslationKeys();
    const values = await storage.getTranslationsForLanguage(language.id);
    const valueMap = new Map(values.map((row) => [`${row.namespace}.${row.key}`, row.value]));

    const translations = keys.map((key) => {
      const value = valueMap.get(`${key.namespace}.${key.key}`) || null;
      return {
        id: key.id,
        namespace: key.namespace,
        key: key.key,
        description: key.description,
        value,
        isMissing: !value,
      };
    });

    const stats = {
      total: translations.length,
      translated: translations.filter((item) => !item.isMissing).length,
      missing: translations.filter((item) => item.isMissing).length,
    };

    return ApiResponse.success(res, "Translations retrieved", {
      language,
      translations,
      stats,
    });
  }),
);

router.put(
  "/translations/:languageId/:keyId",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const language = await storage.getLanguageById(req.params.languageId);
    if (!language) return ApiResponse.notFound(res, "Language not found");

    const key = await storage.getTranslationKeyById(req.params.keyId);
    if (!key) return ApiResponse.notFound(res, "Translation key not found");

    const value = String(req.body?.value ?? "").trim();
    if (!value) return ApiResponse.badRequest(res, "Translation value is required");

    const saved = await storage.upsertTranslationValue({
      keyId: key.id,
      languageId: language.id,
      value,
      isVerified: false,
    });

    return ApiResponse.success(res, "Translation saved", saved);
  }),
);

router.post(
  "/translations/:languageId/import",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const language = await storage.getLanguageById(req.params.languageId);
    if (!language) return ApiResponse.notFound(res, "Language not found");

    const items = flattenTranslations(req.body?.translations);
    if (!items.length) {
      return ApiResponse.badRequest(res, "No valid translations found");
    }

    let imported = 0;

    for (const item of items) {
      const key = await ensureTranslationKey(item.namespace, item.key);
      await storage.upsertTranslationValue({
        keyId: key.id,
        languageId: language.id,
        value: item.value,
        isVerified: false,
      });
      imported += 1;
    }

    return ApiResponse.success(res, "Translations imported", { imported });
  }),
);

export default router;
