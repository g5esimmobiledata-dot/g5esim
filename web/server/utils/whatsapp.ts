import { sql } from "drizzle-orm";
import { db } from "../db";

let userWhatsappColumnReady = false;

export async function ensureUserWhatsappColumn() {
  if (userWhatsappColumnReady) return;

  const requiredColumns = [
    "whatsapp_number",
    "reseller_store_tagline",
    "reseller_contact_email",
    "reseller_default_currency",
    "reseller_store_config",
  ];

  const existingResult: any = await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name IN (
        'whatsapp_number',
        'reseller_store_tagline',
        'reseller_contact_email',
        'reseller_default_currency',
        'reseller_store_config'
      )
  `);
  const existingRows = Array.isArray(existingResult)
    ? existingResult
    : existingResult.rows ?? [];
  const existingColumns = new Set(
    existingRows.map((row: { column_name: string }) => row.column_name),
  );

  const missingColumns = requiredColumns.filter(
    (column) => !existingColumns.has(column),
  );
  if (missingColumns.length === 0) {
    userWhatsappColumnReady = true;
    return;
  }

  if (missingColumns.includes("whatsapp_number")) {
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS whatsapp_number text
    `);
  }
  if (missingColumns.includes("reseller_store_tagline")) {
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS reseller_store_tagline text
    `);
  }
  if (missingColumns.includes("reseller_contact_email")) {
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS reseller_contact_email text
    `);
  }
  if (missingColumns.includes("reseller_default_currency")) {
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS reseller_default_currency varchar
    `);
  }
  if (missingColumns.includes("reseller_store_config")) {
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS reseller_store_config jsonb
    `);
  }

  userWhatsappColumnReady = true;
}
