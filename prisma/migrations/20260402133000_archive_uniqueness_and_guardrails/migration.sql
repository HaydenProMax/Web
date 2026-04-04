-- Enforce one archive record per post per owner/source tuple.
CREATE UNIQUE INDEX IF NOT EXISTS "ArchiveItem_ownerId_sourceType_postId_key"
ON "ArchiveItem"("ownerId", "sourceType", "postId");
