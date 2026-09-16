ALTER TABLE users
ADD COLUMN IF NOT EXISTS kyc_verification_required boolean NOT NULL DEFAULT true;

INSERT INTO settings (key, value, category)
VALUES
  ('kyc_enabled', 'true', 'kyc'),
  ('kyc_required_customer', 'true', 'kyc'),
  ('kyc_required_agent', 'true', 'kyc'),
  ('kyc_required_reseller', 'true', 'kyc')
ON CONFLICT (key) DO NOTHING;
