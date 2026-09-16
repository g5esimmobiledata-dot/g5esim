ALTER TABLE "reseller_package_prices"
ADD COLUMN IF NOT EXISTS "is_enabled" boolean DEFAULT true NOT NULL;
