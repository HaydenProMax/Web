-- Restore one archive record per owner/source/post tuple.
CREATE UNIQUE INDEX IF NOT EXISTS "ArchiveItem_ownerId_sourceType_postId_key"
ON "ArchiveItem"("ownerId", "sourceType", "postId");
