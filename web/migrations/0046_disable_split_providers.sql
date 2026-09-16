UPDATE "providers"
SET
  "enabled" = false,
  "updated_at" = NOW()
WHERE "slug" IN ('telna', 'data-plans');

UPDATE "unified_packages"
SET
  "is_enabled" = false,
  "manual_override" = true,
  "updated_at" = NOW()
WHERE "provider_id" IN (
  SELECT "id"
  FROM "providers"
  WHERE "slug" IN ('telna', 'data-plans')
);
