CREATE TABLE IF NOT EXISTS rate_tables (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  default_margin_percent decimal(6, 2) NOT NULL DEFAULT '0.00',
  status text NOT NULL DEFAULT 'active',
  created_by varchar REFERENCES admins(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_tables_status_idx
  ON rate_tables (status);

CREATE TABLE IF NOT EXISTS rate_table_prices (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_table_id varchar NOT NULL REFERENCES rate_tables(id) ON DELETE CASCADE,
  package_id varchar NOT NULL REFERENCES unified_packages(id) ON DELETE CASCADE,
  cost_price decimal(10, 2) NOT NULL,
  selling_price decimal(10, 2) NOT NULL,
  margin_percent decimal(6, 2),
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT rate_table_prices_rate_table_package_unique UNIQUE (rate_table_id, package_id)
);

CREATE INDEX IF NOT EXISTS rate_table_prices_rate_table_idx
  ON rate_table_prices (rate_table_id);

CREATE INDEX IF NOT EXISTS rate_table_prices_package_idx
  ON rate_table_prices (package_id);

CREATE TABLE IF NOT EXISTS rate_table_assignments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_table_id varchar NOT NULL REFERENCES rate_tables(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by varchar REFERENCES admins(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT rate_table_assignments_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS rate_table_assignments_rate_table_idx
  ON rate_table_assignments (rate_table_id);

CREATE INDEX IF NOT EXISTS rate_table_assignments_user_idx
  ON rate_table_assignments (user_id);
