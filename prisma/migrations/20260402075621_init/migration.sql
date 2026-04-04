-- CreateEnum
CREATE TYPE "ModuleKey" AS ENUM ('dashboard', 'planner', 'knowledge', 'writing', 'archive', 'modules', 'settings');

-- CreateEnum
CREATE TYPE "ModuleStatus" AS ENUM ('ACTIVE', 'DISABLED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'EMBED');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- CreateEnum
CREATE TYPE "ArchiveSourceType" AS ENUM ('NOTE', 'POST', 'MEDIA', 'RESOURCE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "curatorTitle" TEXT,
    "bio" TEXT,
    "avatarMediaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT DEFAULT 'light',
    "accentColor" TEXT,
    "typographyMode" TEXT,
    "locale" TEXT,
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleRegistry" (
    "id" TEXT NOT NULL,
    "key" "ModuleKey" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "routePath" TEXT NOT NULL,
    "enabledByDefault" BOOLEAN NOT NULL DEFAULT true,
    "status" "ModuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserModuleSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserModuleSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
    "storageProvider" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" INTEGER,
    "thumbnailKey" TEXT,
    "altText" TEXT,
    "embedUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaUsage" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "moduleKey" "ModuleKey" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannerCalendar" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannerEvent" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "calendarId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannerTask" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "scheduledFor" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannerReminder" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "taskId" TEXT,
    "eventId" TEXT,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "channel" "ReminderChannel" NOT NULL DEFAULT 'IN_APP',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannerTaskLabel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerTaskLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannerTaskLabelOnTask" (
    "taskId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    CONSTRAINT "PlannerTaskLabelOnTask_pkey" PRIMARY KEY ("taskId","labelId")
);

-- CreateTable
CREATE TABLE "KnowledgeDomain" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeNote" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "domainId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "contentJson" JSONB NOT NULL,
    "contentHtml" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeTag" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeNoteTag" (
    "noteId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "KnowledgeNoteTag_pkey" PRIMARY KEY ("noteId","tagId")
);

-- CreateTable
CREATE TABLE "KnowledgeLink" (
    "id" TEXT NOT NULL,
    "sourceNoteId" TEXT NOT NULL,
    "targetNoteId" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingDraft" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "coverMediaId" TEXT,
    "contentJson" JSONB NOT NULL,
    "contentHtml" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingPost" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "coverMediaId" TEXT,
    "contentJson" JSONB NOT NULL,
    "contentHtml" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingPostVersion" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "contentJson" JSONB NOT NULL,
    "contentHtml" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingPostVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchiveCollection" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchiveCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchiveItem" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "collectionId" TEXT,
    "sourceType" "ArchiveSourceType" NOT NULL,
    "noteId" TEXT,
    "postId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchiveItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleRegistry_key_key" ON "ModuleRegistry"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UserModuleSetting_userId_moduleId_key" ON "UserModuleSetting"("userId", "moduleId");

-- CreateIndex
CREATE INDEX "MediaUsage_moduleKey_entityType_entityId_idx" ON "MediaUsage"("moduleKey", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeDomain_ownerId_slug_key" ON "KnowledgeDomain"("ownerId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeNote_ownerId_slug_key" ON "KnowledgeNote"("ownerId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeTag_ownerId_slug_key" ON "KnowledgeTag"("ownerId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeLink_sourceNoteId_targetNoteId_key" ON "KnowledgeLink"("sourceNoteId", "targetNoteId");

-- CreateIndex
CREATE UNIQUE INDEX "WritingPost_ownerId_slug_key" ON "WritingPost"("ownerId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "WritingPostVersion_postId_version_key" ON "WritingPostVersion"("postId", "version");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_avatarMediaId_fkey" FOREIGN KEY ("avatarMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleSetting" ADD CONSTRAINT "UserModuleSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleSetting" ADD CONSTRAINT "UserModuleSetting_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ModuleRegistry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerCalendar" ADD CONSTRAINT "PlannerCalendar_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerEvent" ADD CONSTRAINT "PlannerEvent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerEvent" ADD CONSTRAINT "PlannerEvent_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "PlannerCalendar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerTask" ADD CONSTRAINT "PlannerTask_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerReminder" ADD CONSTRAINT "PlannerReminder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerReminder" ADD CONSTRAINT "PlannerReminder_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PlannerTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerReminder" ADD CONSTRAINT "PlannerReminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PlannerEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerTaskLabelOnTask" ADD CONSTRAINT "PlannerTaskLabelOnTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PlannerTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerTaskLabelOnTask" ADD CONSTRAINT "PlannerTaskLabelOnTask_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "PlannerTaskLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeDomain" ADD CONSTRAINT "KnowledgeDomain_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeNote" ADD CONSTRAINT "KnowledgeNote_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeNote" ADD CONSTRAINT "KnowledgeNote_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "KnowledgeDomain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeTag" ADD CONSTRAINT "KnowledgeTag_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeNoteTag" ADD CONSTRAINT "KnowledgeNoteTag_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "KnowledgeNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeNoteTag" ADD CONSTRAINT "KnowledgeNoteTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "KnowledgeTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeLink" ADD CONSTRAINT "KnowledgeLink_sourceNoteId_fkey" FOREIGN KEY ("sourceNoteId") REFERENCES "KnowledgeNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeLink" ADD CONSTRAINT "KnowledgeLink_targetNoteId_fkey" FOREIGN KEY ("targetNoteId") REFERENCES "KnowledgeNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingDraft" ADD CONSTRAINT "WritingDraft_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingDraft" ADD CONSTRAINT "WritingDraft_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingPost" ADD CONSTRAINT "WritingPost_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingPost" ADD CONSTRAINT "WritingPost_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingPostVersion" ADD CONSTRAINT "WritingPostVersion_postId_fkey" FOREIGN KEY ("postId") REFERENCES "WritingPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchiveCollection" ADD CONSTRAINT "ArchiveCollection_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchiveItem" ADD CONSTRAINT "ArchiveItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchiveItem" ADD CONSTRAINT "ArchiveItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "ArchiveCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchiveItem" ADD CONSTRAINT "ArchiveItem_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "KnowledgeNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchiveItem" ADD CONSTRAINT "ArchiveItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "WritingPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
