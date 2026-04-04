-- AlterTable
ALTER TABLE "WritingDraft" ADD COLUMN "publishedPostId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WritingDraft_publishedPostId_key" ON "WritingDraft"("publishedPostId");

-- AddForeignKey
ALTER TABLE "WritingDraft" ADD CONSTRAINT "WritingDraft_publishedPostId_fkey" FOREIGN KEY ("publishedPostId") REFERENCES "WritingPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;