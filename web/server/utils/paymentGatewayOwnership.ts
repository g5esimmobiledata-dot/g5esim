import { sql } from "drizzle-orm";
import { db } from "server/db";

let paymentGatewayOwnershipReady = false;

export async function ensurePaymentGatewayOwnershipColumn() {
  if (paymentGatewayOwnershipReady) return;

  await db.execute(sql`
    ALTER TABLE payment_gateways
    ADD COLUMN IF NOT EXISTS reseller_id varchar REFERENCES users(id) ON DELETE CASCADE
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS payment_gateways_reseller_id_idx
    ON payment_gateways (reseller_id)
  `);

  paymentGatewayOwnershipReady = true;
}
