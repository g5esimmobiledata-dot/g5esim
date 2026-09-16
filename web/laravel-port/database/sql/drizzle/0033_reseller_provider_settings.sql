CREATE TABLE IF NOT EXISTS "reseller_provider_settings" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reseller_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "provider_id" varchar NOT NULL REFERENCES "providers"("id") ON DELETE cascade,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "reseller_provider_settings_reseller_provider_unique" UNIQUE("reseller_id", "provider_id")
);

CREATE INDEX IF NOT EXISTS "reseller_provider_settings_reseller_idx" ON "reseller_provider_settings" ("reseller_id");
CREATE INDEX IF NOT EXISTS "reseller_provider_settings_provider_idx" ON "reseller_provider_settings" ("provider_id");
