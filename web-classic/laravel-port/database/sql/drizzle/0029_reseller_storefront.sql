ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reseller_subdomain" varchar(63);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reseller_store_name" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reseller_store_active" boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "users_reseller_subdomain_unique"
  ON "users" ("reseller_subdomain")
  WHERE "reseller_subdomain" IS NOT NULL;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "reseller_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "storefront_host" text;
CREATE INDEX IF NOT EXISTS "orders_reseller_id_idx" ON "orders" ("reseller_id");
