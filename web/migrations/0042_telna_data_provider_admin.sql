UPDATE "providers"
SET
  "name" = 'Telna Data Provider',
  "updated_at" = now()
WHERE "slug" = 'telna'
  AND "name" <> 'Telna Data Provider';
