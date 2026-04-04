-- Prepare the legacy archive uniqueness index so the historical drop/create migrations apply cleanly.
CREATE UNIQUE INDEX IF NOT EXISTS "ArchiveItem_ownerId_sourceType_postId_key"
ON "ArchiveItem"("ownerId", "sourceType", "postId");
