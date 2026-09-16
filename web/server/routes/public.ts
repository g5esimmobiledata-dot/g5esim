import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { storage } from "../storage";
import { getPublicOneSignalConfig } from "../services/onesignal-service";
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

function publicSettingMap(settings: Array<{ key: string; value: string }>) {
  return settings.reduce<Record<string, string>>((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});
}

function settingValue(settings: Record<string, string>, key: string, fallback = "") {
  const value = String(settings[key] ?? "").trim();
  return value || fallback;
}

router.get("/desktop/privacy", async (req: Request, res: Response) => {
  try {
    const settings = publicSettingMap(await storage.getAllSettings());
    const accessToken = settingValue(settings, "desktop_app_access_token");
    const requestToken = String(req.headers["x-desktop-app-token"] || req.query.token || "").trim();
    const credentialsAllowed = Boolean(
      accessToken &&
      requestToken &&
      requestToken === accessToken &&
      settings.desktop_show_admin_credentials === "true",
    );

    return ApiResponse.success(res, "Desktop privacy config loaded", {
      enabled: settings.desktop_privacy_enabled !== "false",
      title: settingValue(settings, "desktop_privacy_title", "Your data and privacy"),
      cardTitle: settingValue(settings, "desktop_privacy_card_title", "We value your privacy"),
      body: settingValue(
        settings,
        "desktop_privacy_body",
        [
          "When you use the G5 eSIM desktop admin app, we collect the data required to securely connect you to the admin backend and provide platform management tools.",
          "",
          "Optional analytics and diagnostic data may be used to improve reliability, support, and security. You can adjust these choices before continuing.",
          "",
          "By using this app, you agree to the Terms and Privacy Policy configured by the platform administrator.",
        ].join("\n"),
      ),
      termsUrl: settingValue(settings, "desktop_terms_url", "https://g5esim.mobile/terms"),
      privacyUrl: settingValue(settings, "desktop_privacy_url", "https://g5esim.mobile/privacy"),
      adminUrl: settingValue(settings, "desktop_admin_url", "https://g5esim.mobile/admin/login?desktop=1"),
      accentColor: settingValue(settings, "desktop_accent_color", "#2563eb"),
      acceptLabel: settingValue(settings, "desktop_accept_label", "Accept all"),
      declineLabel: settingValue(settings, "desktop_decline_label", "Decline optional data"),
      manageLabel: settingValue(settings, "desktop_manage_label", "Manage choices"),
      showCredentials: credentialsAllowed,
      adminUsername: credentialsAllowed ? settingValue(settings, "desktop_admin_username") : "",
      adminPassword: credentialsAllowed ? settingValue(settings, "desktop_admin_password") : "",
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load desktop privacy config");
  }
});

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

router.get("/onesignal/config", async (_req: Request, res: Response) => {
  try {
    const config = await getPublicOneSignalConfig();
    return ApiResponse.success(res, "OneSignal public config loaded", config);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load OneSignal config");
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
