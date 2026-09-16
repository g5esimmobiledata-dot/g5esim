UPDATE "providers"
SET
  "name" = 'Telna Data Provider',
  "api_base_url" = 'https://developer-api.telna.com/v2.1',
  "updated_at" = now()
WHERE "slug" = 'telna'
  AND (
    "api_base_url" IS NULL
    OR "api_base_url" = ''
    OR "api_base_url" = 'https://api.telna.com'
  );
