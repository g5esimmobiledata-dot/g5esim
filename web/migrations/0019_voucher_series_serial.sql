ALTER TABLE "voucher_codes" ADD COLUMN IF NOT EXISTS "series_code" text;
ALTER TABLE "voucher_codes" ADD COLUMN IF NOT EXISTS "serial_number" text;

WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at, id) AS sequence_number
  FROM "voucher_codes"
)
UPDATE "voucher_codes" AS voucher
SET
  "series_code" = COALESCE(voucher."series_code", 'S-' || LPAD(numbered.sequence_number::text, 10, '0')),
  "serial_number" = COALESCE(voucher."serial_number", 'SN-' || LPAD(numbered.sequence_number::text, 10, '0'))
FROM numbered
WHERE voucher.id = numbered.id
  AND (voucher."series_code" IS NULL OR voucher."serial_number" IS NULL);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'voucher_codes_serial_number_unique'
  ) THEN
    ALTER TABLE "voucher_codes"
      ADD CONSTRAINT "voucher_codes_serial_number_unique" UNIQUE ("serial_number");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "voucher_codes_series_code_idx" ON "voucher_codes" ("series_code");
