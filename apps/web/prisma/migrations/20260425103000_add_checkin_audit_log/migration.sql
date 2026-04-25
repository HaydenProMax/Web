CREATE TYPE "CheckInAuditAction" AS ENUM (
    'CREATE_HABIT',
    'UPDATE_HABIT',
    'ARCHIVE_HABIT',
    'UPDATE_TODAY',
    'UPDATE_DATE',
    'RESET_DATE'
);

CREATE TYPE "CheckInAuditSource" AS ENUM (
    'session',
    'apiKey'
);

CREATE TABLE "CheckInAuditLog" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "habitId" TEXT,
    "action" "CheckInAuditAction" NOT NULL,
    "source" "CheckInAuditSource" NOT NULL,
    "requestId" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3),
    "payloadJson" JSONB,
    "resultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckInAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CheckInAuditLog_ownerId_createdAt_idx" ON "CheckInAuditLog"("ownerId", "createdAt");
CREATE INDEX "CheckInAuditLog_ownerId_action_createdAt_idx" ON "CheckInAuditLog"("ownerId", "action", "createdAt");
CREATE INDEX "CheckInAuditLog_ownerId_habitId_createdAt_idx" ON "CheckInAuditLog"("ownerId", "habitId", "createdAt");
CREATE INDEX "CheckInAuditLog_requestId_idx" ON "CheckInAuditLog"("requestId");

ALTER TABLE "CheckInAuditLog" ADD CONSTRAINT "CheckInAuditLog_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CheckInAuditLog" ADD CONSTRAINT "CheckInAuditLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "CheckInHabit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
