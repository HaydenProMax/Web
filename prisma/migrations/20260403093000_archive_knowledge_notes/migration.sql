-- Ensure one archive record per owner/source/note tuple.
CREATE UNIQUE INDEX IF NOT EXISTS "ArchiveItem_ownerId_sourceType_noteId_key"
ON "ArchiveItem"("ownerId", "sourceType", "noteId");
