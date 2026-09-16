ALTER TABLE "voucher_codes" ADD COLUMN IF NOT EXISTS "batch_name" text;
ALTER TABLE "voucher_codes" ADD COLUMN IF NOT EXISTS "assigned_role" text NOT NULL DEFAULT 'all';
ALTER TABLE "voucher_codes" ADD COLUMN IF NOT EXISTS "assigned_user_id" varchar;

UPDATE "voucher_codes"
SET "assigned_role" = COALESCE(NULLIF("assigned_role", ''), 'all')
WHERE "assigned_role" IS NULL OR "assigned_role" = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'voucher_codes_assigned_role_check'
  ) THEN
    ALTER TABLE "voucher_codes"
      ADD CONSTRAINT "voucher_codes_assigned_role_check"
      CHECK ("assigned_role" IN ('all', 'agent', 'reseller'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'voucher_codes_assigned_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "voucher_codes"
      ADD CONSTRAINT "voucher_codes_assigned_user_id_users_id_fk"
      FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "voucher_codes_assigned_role_idx" ON "voucher_codes" ("assigned_role");
CREATE INDEX IF NOT EXISTS "voucher_codes_assigned_user_idx" ON "voucher_codes" ("assigned_user_id");
