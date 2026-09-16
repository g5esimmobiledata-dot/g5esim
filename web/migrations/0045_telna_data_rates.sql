CREATE TABLE IF NOT EXISTS "telna_data_rates" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" varchar NOT NULL REFERENCES "providers"("id"),
  "country_name" text NOT NULL,
  "iso2" text,
  "iso3" text,
  "network" text,
  "vpmn" text,
  "mccmnc" text,
  "imsi" text,
  "sms_mo_fee" numeric(12, 5) NOT NULL DEFAULT '0.00000',
  "sms_mt_fee" numeric(12, 5) NOT NULL DEFAULT '0.00000',
  "rate_per_mb" numeric(12, 6) NOT NULL DEFAULT '0.000000',
  "per_100_mb" numeric(12, 5) NOT NULL DEFAULT '0.00000',
  "per_1_gb" numeric(12, 5) NOT NULL DEFAULT '0.00000',
  "per_2_gb" numeric(12, 5) NOT NULL DEFAULT '0.00000',
  "per_3_gb" numeric(12, 5) NOT NULL DEFAULT '0.00000',
  "per_5_gb" numeric(12, 5) NOT NULL DEFAULT '0.00000',
  "per_10_gb" numeric(12, 5) NOT NULL DEFAULT '0.00000',
  "per_20_gb" numeric(12, 5) NOT NULL DEFAULT '0.00000',
  "per_100_gb" numeric(12, 5) NOT NULL DEFAULT '0.00000',
  "monthly_activation_fee" numeric(12, 5) NOT NULL DEFAULT '0.00000',
  "extra_cost" numeric(12, 5) NOT NULL DEFAULT '0.00000',
  "extra_fees" numeric(12, 5) NOT NULL DEFAULT '0.00000',
  "import_batch_id" text,
  "source_file" text,
  "active" boolean NOT NULL DEFAULT true,
  "raw_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "telna_data_rates_provider_id_idx"
  ON "telna_data_rates" ("provider_id");

CREATE INDEX IF NOT EXISTS "telna_data_rates_country_idx"
  ON "telna_data_rates" ("country_name");

CREATE INDEX IF NOT EXISTS "telna_data_rates_iso2_idx"
  ON "telna_data_rates" ("iso2");

CREATE INDEX IF NOT EXISTS "telna_data_rates_imsi_idx"
  ON "telna_data_rates" ("imsi");
