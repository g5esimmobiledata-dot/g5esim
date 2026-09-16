import { sql } from "drizzle-orm";
import { db } from "../db";

let kycControlsReady = false;

const DEFAULT_KYC_SETTINGS = [
  {
    key: "kyc_enabled",
    value: "true",
    category: "kyc",
  },
  {
    key: "kyc_required_customer",
    value: "true",
    category: "kyc",
  },
  {
    key: "kyc_required_agent",
    value: "true",
    category: "kyc",
  },
  {
    key: "kyc_required_reseller",
    value: "true",
    category: "kyc",
  },
];

export async function ensureKycControls() {
  if (kycControlsReady) return;

  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS kyc_verification_required boolean NOT NULL DEFAULT true
  `);

  for (const setting of DEFAULT_KYC_SETTINGS) {
    await db.execute(sql`
      INSERT INTO settings (key, value, category)
      VALUES (${setting.key}, ${setting.value}, ${setting.category})
      ON CONFLICT (key) DO NOTHING
    `);
  }

  kycControlsReady = true;
}
