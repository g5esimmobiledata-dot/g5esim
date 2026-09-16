CREATE TABLE IF NOT EXISTS "telna_packages" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" varchar NOT NULL REFERENCES "providers"("id"),
  "telna_id" text NOT NULL UNIQUE,
  "company_id" text,
  "product_offering_id" text,
  "destination_id" varchar REFERENCES "destinations"("id"),
  "region_id" varchar REFERENCES "regions"("id"),
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "data_amount" text NOT NULL,
  "data_mb" integer,
  "validity" integer NOT NULL,
  "wholesale_price" numeric(10, 2) NOT NULL,
  "currency" text NOT NULL DEFAULT 'USD',
  "type" text NOT NULL,
  "operator" text,
  "operator_image" text,
  "coverage" text[],
  "voice_credits" integer DEFAULT 0,
  "sms_credits" integer DEFAULT 0,
  "is_unlimited" boolean NOT NULL DEFAULT false,
  "apn_value" text,
  "activation_policy" text,
  "topup_available" boolean NOT NULL DEFAULT false,
  "active" boolean NOT NULL DEFAULT true,
  "data_hash" text,
  "raw_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

INSERT INTO "providers" (
  "name",
  "slug",
  "api_base_url",
  "enabled",
  "is_preferred",
  "pricing_margin",
  "sync_interval_minutes",
  "api_rate_limit_per_hour",
  "webhook_secret"
)
SELECT
  'Telna Data Provider',
  'telna',
  'https://developer-api.telna.com/v2.1',
  false,
  false,
  '20.00',
  1440,
  1000,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM "providers" WHERE "slug" = 'telna'
);
