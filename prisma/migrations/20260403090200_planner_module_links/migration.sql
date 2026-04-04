-- AlterTable
ALTER TABLE "PlannerTask" ADD COLUMN     "relatedDraftId" TEXT,
ADD COLUMN     "relatedNoteId" TEXT;

-- AddForeignKey
ALTER TABLE "PlannerTask" ADD CONSTRAINT "PlannerTask_relatedNoteId_fkey" FOREIGN KEY ("relatedNoteId") REFERENCES "KnowledgeNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerTask" ADD CONSTRAINT "PlannerTask_relatedDraftId_fkey" FOREIGN KEY ("relatedDraftId") REFERENCES "WritingDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;
