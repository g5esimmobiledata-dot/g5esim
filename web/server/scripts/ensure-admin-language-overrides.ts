/**
 * Applies exact admin UI translations to the built-in locale JSON files.
 *
 * Run with:
 *   npx tsx server/scripts/ensure-admin-language-overrides.ts
 */

import fs from "fs";
import path from "path";
import { adminLanguageOverrides, applyAdminLanguageOverrides, type AdminLocaleCode } from "./admin-language-overrides";

type LocaleData = Record<string, Record<string, string>>;

const localeDir = path.resolve(process.cwd(), "client", "src", "locales");
const languageCodes = Object.keys(adminLanguageOverrides) as AdminLocaleCode[];

function readLocale(code: AdminLocaleCode): LocaleData {
  const filePath = path.join(localeDir, `${code}_translations.json`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeLocale(code: AdminLocaleCode, data: LocaleData) {
  const filePath = path.join(localeDir, `${code}_translations.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

for (const code of languageCodes) {
  const current = readLocale(code);
  const next = applyAdminLanguageOverrides(code, current);
  writeLocale(code, next);
  console.log(`${code}: applied ${Object.keys(adminLanguageOverrides[code]).length} admin translations`);
}
