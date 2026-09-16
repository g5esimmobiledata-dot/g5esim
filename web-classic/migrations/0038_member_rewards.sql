ALTER TABLE users
  ADD COLUMN IF NOT EXISTS member_tier text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS member_reward_balance decimal(10, 2) NOT NULL DEFAULT '0.00',
  ADD COLUMN IF NOT EXISTS member_reward_lifetime decimal(10, 2) NOT NULL DEFAULT '0.00';

CREATE TABLE IF NOT EXISTS member_reward_transactions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  tier text NOT NULL DEFAULT 'standard',
  amount decimal(10, 2) NOT NULL,
  source_amount decimal(10, 2),
  source_type text,
  source_id text,
  balance_before decimal(10, 2) NOT NULL DEFAULT '0.00',
  balance_after decimal(10, 2) NOT NULL DEFAULT '0.00',
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_reward_transactions_user_id_idx ON member_reward_transactions(user_id);
CREATE INDEX IF NOT EXISTS member_reward_transactions_type_idx ON member_reward_transactions(type);
CREATE INDEX IF NOT EXISTS member_reward_transactions_source_id_idx ON member_reward_transactions(source_id);
