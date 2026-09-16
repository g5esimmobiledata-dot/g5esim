/**
 * Seeds the built-in platform languages and their locale values.
 *
 * Run with:
 *   npx tsx server/scripts/ensure-supported-languages.ts
 */

import fs from "fs";
import path from "path";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { languages, translationKeys, translationValues } from "@shared/schema";

type LocaleData = Record<string, Record<string, string>>;

const localeDir = path.resolve(process.cwd(), "client", "src", "locales");

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", flagCode: "US", isRTL: false, sortOrder: 1 },
  { code: "ar", name: "Arabic", nativeName: "العربية", flagCode: "SA", isRTL: true, sortOrder: 2 },
  { code: "fr", name: "French", nativeName: "Français", flagCode: "FR", isRTL: false, sortOrder: 3 },
  { code: "es", name: "Spanish", nativeName: "Español", flagCode: "ES", isRTL: false, sortOrder: 4 },
  { code: "ru", name: "Russian", nativeName: "Русский", flagCode: "RU", isRTL: false, sortOrder: 5 },
  { code: "it", name: "Italian", nativeName: "Italiano", flagCode: "IT", isRTL: false, sortOrder: 6 },
] as const;

function readLocale(code: string): LocaleData {
  const filePath = path.join(localeDir, `${code}_translations.json`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function ensureLanguage(payload: {
  code: string;
  name: string;
  nativeName: string;
  flagCode: string;
  isRTL: boolean;
  isEnabled: boolean;
  isDefault: boolean;
  sortOrder: number;
}) {
  const [existing] = await db
    .select()
    .from(languages)
    .where(eq(languages.code, payload.code))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(languages)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(languages.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db.insert(languages).values(payload).returning();
  return created;
}

async function ensureTranslationKey(namespace: string, keyName: string) {
  const [existing] = await db
    .select()
    .from(translationKeys)
    .where(and(eq(translationKeys.namespace, namespace), eq(translationKeys.key, keyName)))
    .limit(1);

  if (existing) return { key: existing, created: false };

  const [created] = await db
    .insert(translationKeys)
    .values({ namespace, key: keyName })
    .returning();

  return { key: created, created: true };
}

async function upsertTranslationValue(keyId: string, languageId: string, value: string) {
  const [existing] = await db
    .select()
    .from(translationValues)
    .where(and(eq(translationValues.keyId, keyId), eq(translationValues.languageId, languageId)))
    .limit(1);

  if (existing) {
    await db
      .update(translationValues)
      .set({ value, isVerified: true, updatedAt: new Date() })
      .where(eq(translationValues.id, existing.id));
    return "updated";
  }

  await db.insert(translationValues).values({
    keyId,
    languageId,
    value,
    isVerified: true,
  });
  return "inserted";
}

async function seedLocale(languageId: string, locale: LocaleData) {
  let keysCreated = 0;
  let inserted = 0;
  let updated = 0;

  for (const [namespace, values] of Object.entries(locale)) {
    for (const [keyName, value] of Object.entries(values)) {
      const { key, created } = await ensureTranslationKey(namespace, keyName);
      if (created) keysCreated += 1;

      const status = await upsertTranslationValue(key.id, languageId, value);
      if (status === "inserted") inserted += 1;
      if (status === "updated") updated += 1;
    }
  }

  return { keysCreated, inserted, updated };
}

async function main() {
  const [currentDefault] = await db
    .select()
    .from(languages)
    .where(eq(languages.isDefault, true))
    .limit(1);
  const keepEnglishDefault = !currentDefault || currentDefault.code === "en";

  for (const language of SUPPORTED_LANGUAGES) {
    const row = await ensureLanguage({
      ...language,
      isEnabled: true,
      isDefault: language.code === "en" ? keepEnglishDefault : false,
    });
    const stats = await seedLocale(row.id, readLocale(language.code));
    console.log(`${language.code} ready:`, stats);
  }

  console.log("Supported languages are ready.");
}

main().catch((error) => {
  console.error("Failed to ensure supported languages:", error);
  process.exit(1);
});
