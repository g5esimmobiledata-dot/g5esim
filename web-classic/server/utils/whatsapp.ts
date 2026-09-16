import { sql } from "drizzle-orm";
import { db } from "../db";

let userWhatsappColumnReady = false;

export async function ensureUserWhatsappColumn() {
  if (userWhatsappColumnReady) return;

  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS whatsapp_number text
  `);
  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS reseller_store_tagline text
  `);
  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS reseller_contact_email text
  `);
  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS reseller_default_currency varchar
  `);
  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS reseller_store_config jsonb
  `);

  userWhatsappColumnReady = true;
}
