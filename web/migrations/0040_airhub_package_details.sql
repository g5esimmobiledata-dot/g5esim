ALTER TABLE "airhub_packages"
  ADD COLUMN IF NOT EXISTS "connectivity" text,
  ADD COLUMN IF NOT EXISTS "apn_value" text,
  ADD COLUMN IF NOT EXISTS "activation_policy" text,
  ADD COLUMN IF NOT EXISTS "hotspot_supported" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "topup_available" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "additional_info" text,
  ADD COLUMN IF NOT EXISTS "validity_type" text;
