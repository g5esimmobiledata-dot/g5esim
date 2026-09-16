CREATE TABLE IF NOT EXISTS "airhub_packages" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" varchar NOT NULL REFERENCES "providers"("id"),
  "airhub_id" text NOT NULL UNIQUE,
  "destination_id" varchar REFERENCES "destinations"("id"),
  "region_id" varchar REFERENCES "regions"("id"),
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "data_amount" text NOT NULL,
  "data_mb" integer,
  "validity" integer NOT NULL,
  "wholesale_price" numeric(10,2) NOT NULL,
  "currency" text DEFAULT 'USD' NOT NULL,
  "type" text NOT NULL,
  "operator" text,
  "operator_image" text,
  "coverage" text[],
  "voice_credits" integer DEFAULT 0,
  "sms_credits" integer DEFAULT 0,
  "is_unlimited" boolean DEFAULT false NOT NULL,
  "travel_date_required" boolean DEFAULT false NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "data_hash" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
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
  'Airhub',
  'airhub',
  'https://api.airhubapp.com',
  false,
  false,
  '20.00',
  1440,
  1000,
  null
WHERE NOT EXISTS (
  SELECT 1 FROM "providers" WHERE "slug" = 'airhub'
);
