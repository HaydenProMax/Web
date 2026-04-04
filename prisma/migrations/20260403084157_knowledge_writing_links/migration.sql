-- DropIndex
DROP INDEX "ArchiveItem_ownerId_sourceType_postId_key";

-- AlterTable
ALTER TABLE "WritingDraft" ADD COLUMN     "sourceNoteId" TEXT;

-- AlterTable
ALTER TABLE "WritingPost" ADD COLUMN     "sourceNoteId" TEXT;

-- AddForeignKey
ALTER TABLE "WritingDraft" ADD CONSTRAINT "WritingDraft_sourceNoteId_fkey" FOREIGN KEY ("sourceNoteId") REFERENCES "KnowledgeNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingPost" ADD CONSTRAINT "WritingPost_sourceNoteId_fkey" FOREIGN KEY ("sourceNoteId") REFERENCES "KnowledgeNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
