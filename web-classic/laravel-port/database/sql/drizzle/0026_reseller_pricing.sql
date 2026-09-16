ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'customer' NOT NULL;
ALTER TABLE "unified_packages" ADD COLUMN IF NOT EXISTS "reseller_price" decimal(10,2);
UPDATE "unified_packages" SET "reseller_price" = "retail_price" WHERE "reseller_price" IS NULL;
