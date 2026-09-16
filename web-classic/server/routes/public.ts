import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { storage } from "../storage";
import * as ApiResponse from "../utils/response";

const router = Router();

const BUILT_IN_LANGUAGES = [
  {
    id: "builtin-en",
    code: "en",
    name: "English",
    nativeName: "English",
    flagCode: "US",
    isRTL: false,
    isEnabled: true,
    isDefault: true,
    sortOrder: 1,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "builtin-ar",
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    flagCode: "SA",
    isRTL: true,
    isEnabled: true,
    isDefault: false,
    sortOrder: 2,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "builtin-fr",
    code: "fr",
    name: "French",
    nativeName: "Français",
    flagCode: "FR",
    isRTL: false,
    isEnabled: true,
    isDefault: false,
    sortOrder: 3,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "builtin-es",
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    flagCode: "ES",
    isRTL: false,
    isEnabled: true,
    isDefault: false,
    sortOrder: 4,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "builtin-ru",
    code: "ru",
    name: "Russian",
    nativeName: "Русский",
    flagCode: "RU",
    isRTL: false,
    isEnabled: true,
    isDefault: false,
    sortOrder: 5,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "builtin-it",
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    flagCode: "IT",
    isRTL: false,
    isEnabled: true,
    isDefault: false,
    sortOrder: 6,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
] as const;

const localeCache = new Map<string, Record<string, Record<string, string>> | null>();

function settingsToObject(rows: Array<{ key: string; value: string | null }>) {
  return rows.reduce<Record<string, string | null>>((result, setting) => {
    result[setting.key] = setting.value;
    return result;
  }, {});
}

function normalizeLanguageCode(code: string) {
  return code.trim().split("-")[0].toLowerCase();
}

function getBuiltInLanguage(code: string) {
  return BUILT_IN_LANGUAGES.find((language) => language.code === code) || null;
}

function mergeBuiltInLanguages(rows: any[]) {
  const byCode = new Map(rows.map((language) => [language.code, language]));

  for (const language of BUILT_IN_LANGUAGES) {
    if (!byCode.has(language.code)) {
      byCode.set(language.code, language);
    }
  }

  return Array.from(byCode.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

function loadBuiltInLocale(code: string) {
  const normalizedCode = normalizeLanguageCode(code);
  if (localeCache.has(normalizedCode)) return localeCache.get(normalizedCode) || null;

  const fileName = `${normalizedCode}_translations.json`;
  const candidates = [
    path.resolve(process.cwd(), "client", "src", "locales", fileName),
    path.resolve(process.cwd(), "client", "public", "locales", fileName),
    path.resolve(process.cwd(), "dist", "public", "locales", fileName),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;

    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      localeCache.set(normalizedCode, parsed);
      return parsed;
    } catch (error) {
      console.warn(`Failed to load locale file ${filePath}:`, error);
      break;
    }
  }

  localeCache.set(normalizedCode, null);
  return null;
}

function mergeTranslations(
  base: Record<string, Record<string, string>> | null,
  rows: Array<{ namespace: string; key: string; value: string }>,
  namespace?: string,
) {
  if (namespace) {
    const result = { ...(base?.[namespace] || {}) };
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  const result: Record<string, Record<string, string>> = {};

  if (base) {
    for (const [baseNamespace, keys] of Object.entries(base)) {
      result[baseNamespace] = { ...keys };
    }
  }

  for (const row of rows) {
    result[row.namespace] ??= {};
    result[row.namespace][row.key] = row.value;
  }

  return result;
}

router.get("/public/settings", async (_req: Request, res: Response) => {
  try {
    const settings = await storage.getPublicSettings();
    return ApiResponse.success(
      res,
      "Public settings retrieved successfully",
      settingsToObject(settings),
    );
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load public settings");
  }
});

router.get("/currencies", async (_req: Request, res: Response) => {
  try {
    const currencies = await storage.getCurrencies();
    return ApiResponse.success(res, "Currencies retrieved successfully", currencies);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load currencies");
  }
});

router.get("/languages", async (_req: Request, res: Response) => {
  try {
    const languages = mergeBuiltInLanguages(await storage.getEnabledLanguages());
    return ApiResponse.success(res, "Languages retrieved", languages);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load languages");
  }
});

router.get("/translations/:languageCode", async (req: Request, res: Response) => {
  try {
    const languageCode = normalizeLanguageCode(req.params.languageCode || "en");
    const namespace = typeof req.query.namespace === "string"
      ? req.query.namespace.trim()
      : "";

    const storedLanguage = await storage.getLanguageByCode(languageCode);
    const builtInLanguage = getBuiltInLanguage(languageCode);
    const defaultLanguage = !storedLanguage && !builtInLanguage
      ? await storage.getDefaultLanguage()
      : undefined;
    const language = storedLanguage || builtInLanguage || defaultLanguage;

    if (!language) {
      return ApiResponse.success(res, "Translations retrieved", {
        language: null,
        translations: {},
      });
    }

    const storedTranslationLanguage = storedLanguage || defaultLanguage;
    const builtInLocale = loadBuiltInLocale(language.code);
    const rows = storedTranslationLanguage
      ? namespace
        ? (await storage.getTranslationsForNamespace(namespace, storedTranslationLanguage.id)).map((row) => ({
            namespace,
            key: row.key,
            value: row.value,
          }))
        : await storage.getTranslationsForLanguage(storedTranslationLanguage.id)
      : [];
    const translations = mergeTranslations(builtInLocale, rows, namespace);

    return ApiResponse.success(res, "Translations retrieved", {
      language,
      translations,
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load translations");
  }
});

export default router;
