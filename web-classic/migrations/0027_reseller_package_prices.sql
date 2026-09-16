CREATE TABLE IF NOT EXISTS "reseller_package_prices" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reseller_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "package_id" varchar NOT NULL REFERENCES "unified_packages"("id") ON DELETE cascade,
  "selling_price" decimal(10,2) NOT NULL,
  "markup_percent" decimal(6,2),
  "is_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "reseller_package_prices_reseller_package_unique" UNIQUE("reseller_id", "package_id")
);

CREATE INDEX IF NOT EXISTS "reseller_package_prices_reseller_idx" ON "reseller_package_prices" ("reseller_id");
CREATE INDEX IF NOT EXISTS "reseller_package_prices_package_idx" ON "reseller_package_prices" ("package_id");
