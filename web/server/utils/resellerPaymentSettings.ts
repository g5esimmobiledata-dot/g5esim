import { sql } from "drizzle-orm";
import { db } from "server/db";

let resellerPaymentSettingsReady = false;

export async function ensureResellerPaymentSettingsTable() {
  if (resellerPaymentSettingsReady) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS reseller_payment_settings (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      reseller_id varchar NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      paypal_email text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS reseller_payment_settings_reseller_id_idx
    ON reseller_payment_settings (reseller_id)
  `);

  resellerPaymentSettingsReady = true;
}

export function normalizePaypalEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}
