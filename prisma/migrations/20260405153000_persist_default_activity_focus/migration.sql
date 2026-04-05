-- Persist the default replay lens as a real user preference instead of a browser-only cookie.
ALTER TABLE "UserPreference"
  ADD COLUMN IF NOT EXISTS "defaultActivityFocus" TEXT DEFAULT 'all';

UPDATE "UserPreference"
SET "defaultActivityFocus" = 'all'
WHERE "defaultActivityFocus" IS NULL;
