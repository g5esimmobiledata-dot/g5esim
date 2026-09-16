CREATE TABLE IF NOT EXISTS "telna_data_countries" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" varchar NOT NULL REFERENCES "providers"("id"),
  "telna_id" text NOT NULL,
  "destination_id" varchar REFERENCES "destinations"("id"),
  "name" text NOT NULL,
  "iso2" text NOT NULL,
  "iso3" text,
  "active" boolean NOT NULL DEFAULT true,
  "data_hash" text,
  "raw_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "telna_data_countries_provider_id_idx"
  ON "telna_data_countries" ("provider_id");

CREATE INDEX IF NOT EXISTS "telna_data_countries_iso2_idx"
  ON "telna_data_countries" ("iso2");

CREATE UNIQUE INDEX IF NOT EXISTS "telna_data_countries_provider_iso2_unique"
  ON "telna_data_countries" ("provider_id", "iso2");
