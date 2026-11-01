-- Existing admin sessions were created with a seven-day expiry. Cap them to
-- one hour from migration time; active admins can then extend them by heartbeat.
UPDATE "Session" s
SET "expiresAt" = LEAST(s."expiresAt", NOW() + INTERVAL '1 hour')
FROM "User" u
WHERE s."userId" = u.id
  AND s."revokedAt" IS NULL
  AND u.role IN ('ADMIN', 'SUPERADMIN')
  AND u."adminActive" = true;
