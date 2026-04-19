ALTER TYPE "ModuleKey" ADD VALUE IF NOT EXISTS 'checkin';

CREATE TYPE "CheckInScheduleType" AS ENUM ('DAILY', 'WEEKDAYS', 'CUSTOM');
CREATE TYPE "CheckInEntryStatus" AS ENUM ('DONE', 'SKIPPED');
CREATE TYPE "CheckInSkipReasonTag" AS ENUM ('SICK', 'BUSY', 'OUT', 'REST', 'FORGOT', 'OTHER');

CREATE TABLE "CheckInHabit" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduleType" "CheckInScheduleType" NOT NULL DEFAULT 'DAILY',
    "scheduleDays" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckInHabit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CheckInEntry" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "CheckInEntryStatus" NOT NULL,
    "reasonTag" "CheckInSkipReasonTag",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckInEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CheckInEntry_habitId_date_key" ON "CheckInEntry"("habitId", "date");
CREATE INDEX "CheckInEntry_ownerId_date_idx" ON "CheckInEntry"("ownerId", "date");

ALTER TABLE "CheckInHabit" ADD CONSTRAINT "CheckInHabit_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CheckInEntry" ADD CONSTRAINT "CheckInEntry_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "CheckInHabit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CheckInEntry" ADD CONSTRAINT "CheckInEntry_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
