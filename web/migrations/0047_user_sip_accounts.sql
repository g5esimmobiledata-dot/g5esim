CREATE TABLE IF NOT EXISTS "user_sip_accounts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "username" text NOT NULL UNIQUE,
  "password" text NOT NULL,
  "domain" text NOT NULL,
  "uri" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "user_sip_accounts_user_id_idx" ON "user_sip_accounts" ("user_id");
CREATE INDEX IF NOT EXISTS "user_sip_accounts_username_idx" ON "user_sip_accounts" ("username");
CREATE INDEX IF NOT EXISTS "user_sip_accounts_status_idx" ON "user_sip_accounts" ("status");

INSERT INTO "settings" ("key", "value", "category")
VALUES
  ('astpp_sip_domain', 'sip.esimdata.shop', 'voice'),
  ('astpp_sip_transport', 'udp', 'voice'),
  ('astpp_sip_port', '5060', 'voice'),
  ('linphone_sip_domain', 'sip.esimdata.shop', 'voice'),
  ('linphone_sip_transport', 'udp', 'voice'),
  ('linphone_sip_port', '5060', 'voice'),
  ('user_sip_domain', 'sip.esimdata.shop', 'voice'),
  ('user_sip_transport', 'udp', 'voice'),
  ('user_sip_port', '5060', 'voice')
ON CONFLICT ("key") DO NOTHING;
