import type {
  CheckInDateUpdateResult,
  CheckInAuditAction,
  CheckInAuditLogItem,
  CheckInAuditSource,
  CheckInEntryResetResult,
  CheckInEntryResetResultItem,
  CheckInEntryStatus,
  CheckInHabitSummary,
  CheckInHistoryItem,
  CheckInOverview,
  CheckInSkipReasonTag,
  CheckInTodayStatus,
  CheckInTodayUpdateResult,
  CheckInTodayUpdateResultItem
} from "@workspace/types/index";

import { getCurrentUserId } from "@/server/auth/current-user";
import { getDb } from "@/server/db";
import {
  checkInDateUpdateInputSchema,
  checkInHabitEditableFieldsSchema,
  checkInHabitInputSchema,
  checkInEntryResetInputSchema,
  checkInSkipInputSchema,
  checkInTodayUpdateEnvelopeSchema,
  checkInTodayUpdateItemSchema
} from "@/server/check-in/schema";

type HabitWithEntries = {
  id: string;
  title: string;
  description: string | null;
  scheduleType: "DAILY" | "WEEKDAYS" | "CUSTOM";
  scheduleDays: unknown;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  entries: Array<{
    id: string;
    date: Date;
    status: "DONE" | "SKIPPED";
    reasonTag: CheckInSkipReasonTag | null;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

type CheckInContextOptions = {
  ownerId?: string;
};

type CheckInAuditLogInput = {
  ownerId: string;
  habitId?: string;
  action: CheckInAuditAction;
  source: CheckInAuditSource;
  requestId: string;
  targetDate?: string;
  payload?: unknown;
  result?: unknown;
};

function getUserDateFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function getUserWeekdayFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short"
  });
}

function getDateKeyInTimezone(value: Date, timeZone: string) {
  return getUserDateFormatter(timeZone).format(value);
}

function getWeekdayForDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00.000Z`).getUTCDay();
}

function getWeekdayInTimezone(value: Date, timeZone: string) {
  const weekday = getUserWeekdayFormatter(timeZone).format(value);

  if (weekday === "Mon") return 1;
  if (weekday === "Tue") return 2;
  if (weekday === "Wed") return 3;
  if (weekday === "Thu") return 4;
  if (weekday === "Fri") return 5;
  if (weekday === "Sat") return 6;

  return 0;
}

function buildStoredDateFromKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function normalizeScheduleDays(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .map((item) => typeof item === "number" ? item : Number(item))
      .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6)
  )).sort((left, right) => left - right);
}

function isHabitScheduledOnWeekday(
  scheduleType: CheckInHabitSummary["scheduleType"],
  scheduleDays: number[],
  weekday: number
) {
  if (scheduleType === "DAILY") {
    return true;
  }

  if (scheduleType === "WEEKDAYS") {
    return weekday >= 1 && weekday <= 5;
  }

  return scheduleDays.includes(weekday);
}

function buildDateKeyRange(startKey: string, endKey: string) {
  const values: string[] = [];
  const cursor = buildStoredDateFromKey(startKey);
  const end = buildStoredDateFromKey(endKey);

  while (cursor.getTime() <= end.getTime()) {
    values.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return values;
}

function buildEntryStatusMap(entries: HabitWithEntries["entries"]) {
  return new Map(entries.map((entry) => [entry.date.toISOString().slice(0, 10), entry.status] as const));
}

function calculateLongestStreak(habit: HabitWithEntries, todayKey: string) {
  const createdKey = habit.createdAt.toISOString().slice(0, 10);
  const statusMap = buildEntryStatusMap(habit.entries);
  const scheduleDays = normalizeScheduleDays(habit.scheduleDays);
  let current = 0;
  let longest = 0;

  for (const dateKey of buildDateKeyRange(createdKey, todayKey)) {
    if (!isHabitScheduledOnWeekday(habit.scheduleType, scheduleDays, getWeekdayForDateKey(dateKey))) {
      continue;
    }

    if (statusMap.get(dateKey) === "DONE") {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

function calculateCurrentStreak(habit: HabitWithEntries, todayKey: string) {
  const createdKey = habit.createdAt.toISOString().slice(0, 10);
  const scheduleDays = normalizeScheduleDays(habit.scheduleDays);
  const statusMap = buildEntryStatusMap(habit.entries);
  const dateKeys = buildDateKeyRange(createdKey, todayKey);
  let streak = 0;

  for (let index = dateKeys.length - 1; index >= 0; index -= 1) {
    const dateKey = dateKeys[index];
    if (!isHabitScheduledOnWeekday(habit.scheduleType, scheduleDays, getWeekdayForDateKey(dateKey))) {
      continue;
    }

    if (statusMap.get(dateKey) === "DONE") {
      streak += 1;
      continue;
    }

    return streak;
  }

  return streak;
}

function mapHabitSummary(habit: HabitWithEntries, todayKey: string): CheckInHabitSummary {
  const scheduleDays = normalizeScheduleDays(habit.scheduleDays);
  const monthPrefix = todayKey.slice(0, 7);
  const yearPrefix = todayKey.slice(0, 4);
  const doneEntries = habit.entries.filter((entry) => entry.status === "DONE");
  const totalDoneCount = doneEntries.length;
  const monthlyDoneCount = doneEntries.filter((entry) => entry.date.toISOString().slice(0, 7) === monthPrefix).length;
  const yearlyDoneCount = doneEntries.filter((entry) => entry.date.toISOString().slice(0, 4) === yearPrefix).length;
  const todayStatus = habit.entries.find((entry) => entry.date.toISOString().slice(0, 10) === todayKey)?.status;

  return {
    id: habit.id,
    title: habit.title,
    description: habit.description ?? "",
    scheduleType: habit.scheduleType,
    scheduleDays,
    isArchived: habit.isArchived,
    monthlyDoneCount,
    yearlyDoneCount,
    totalDoneCount,
    currentStreak: calculateCurrentStreak(habit, todayKey),
    longestStreak: calculateLongestStreak(habit, todayKey),
    todayStatus,
    updatedAt: habit.updatedAt.toISOString()
  };
}

async function resolveOwnerId(options?: CheckInContextOptions) {
  if (options?.ownerId) {
    return options.ownerId;
  }

  return getCurrentUserId();
}

async function getUserTimezone(ownerId: string) {
  const db = getDb();
  const preference = await db.userPreference.findUnique({
    where: { userId: ownerId },
    select: { timezone: true }
  });

  return preference?.timezone?.trim() || "Asia/Shanghai";
}

async function getActiveHabitsWithEntries(ownerId: string) {
  const db = getDb();
  return db.checkInHabit.findMany({
    where: {
      ownerId,
      isArchived: false
    },
    orderBy: [
      { updatedAt: "desc" },
      { createdAt: "desc" }
    ],
    include: {
      entries: {
        orderBy: { date: "asc" }
      }
    }
  });
}

async function getHabitWithEntriesById(ownerId: string, habitId: string) {
  const db = getDb();
  return db.checkInHabit.findFirst({
    where: {
      id: habitId,
      ownerId
    },
    include: {
      entries: {
        orderBy: { date: "asc" }
      }
    }
  });
}

function assertValidDateKey(dateKey: string) {
  const parsed = buildStoredDateFromKey(dateKey);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dateKey) {
    throw new Error("Invalid date.");
  }

  return parsed;
}

function mapCheckInAuditLogItem(log: {
  id: string;
  ownerId: string;
  habitId: string | null;
  action: CheckInAuditAction;
  source: CheckInAuditSource;
  requestId: string;
  targetDate: Date | null;
  payloadJson: unknown;
  resultJson: unknown;
  createdAt: Date;
  habit?: { title: string } | null;
}): CheckInAuditLogItem {
  return {
    id: log.id,
    ownerId: log.ownerId,
    habitId: log.habitId ?? undefined,
    habitTitle: log.habit?.title ?? undefined,
    action: log.action,
    source: log.source,
    requestId: log.requestId,
    targetDate: log.targetDate ? log.targetDate.toISOString().slice(0, 10) : undefined,
    payload: log.payloadJson ?? undefined,
    result: log.resultJson ?? undefined,
    createdAt: log.createdAt.toISOString()
  };
}

function sortTodayHabits<T extends { title: string; todayStatus?: CheckInEntryStatus }>(habits: T[]) {
  const statusRank: Record<CheckInEntryStatus | "PENDING", number> = {
    PENDING: 0,
    DONE: 1,
    SKIPPED: 2
  };

  return [...habits].sort((left, right) => {
    const leftRank = statusRank[left.todayStatus ?? "PENDING"];
    const rightRank = statusRank[right.todayStatus ?? "PENDING"];

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.title.localeCompare(right.title, "zh-CN");
  });
}

async function getTodayCheckInContext(options?: CheckInContextOptions) {
  const ownerId = await resolveOwnerId(options);
  const timeZone = await getUserTimezone(ownerId);
  const now = new Date();
  const todayKey = getDateKeyInTimezone(now, timeZone);
  const todayWeekday = getWeekdayInTimezone(now, timeZone);
  const habits = await getActiveHabitsWithEntries(ownerId);
  const summaries: CheckInHabitSummary[] = habits.map((habit: HabitWithEntries) => mapHabitSummary(habit, todayKey));
  const scheduledToday = summaries.filter((habit: CheckInHabitSummary) => isHabitScheduledOnWeekday(habit.scheduleType, habit.scheduleDays, todayWeekday));

  return {
    ownerId,
    habits,
    summaries,
    scheduledToday,
    timeZone,
    todayKey,
    todayWeekday
  };
}

export async function listCheckInHabits(options?: CheckInContextOptions): Promise<CheckInHabitSummary[]> {
  const { summaries } = await getTodayCheckInContext(options);

  return summaries;
}

export async function listTodayCheckInHabits(options?: CheckInContextOptions): Promise<CheckInHabitSummary[]> {
  const { scheduledToday } = await getTodayCheckInContext(options);

  return sortTodayHabits(scheduledToday);
}

export async function listRecentCheckInHistory(limit = 8): Promise<CheckInHistoryItem[]> {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const entries = await db.checkInEntry.findMany({
    where: { ownerId },
    orderBy: [
      { date: "desc" },
      { updatedAt: "desc" }
    ],
    take: limit,
    include: {
      habit: {
        select: {
          title: true
        }
      }
    }
  });

  return entries.map((entry: (typeof entries)[number]) => ({
    id: entry.id,
    date: entry.date.toISOString(),
    habitId: entry.habitId,
    habitTitle: entry.habit.title,
    status: entry.status,
    reasonTag: entry.reasonTag ?? undefined,
    note: entry.note ?? undefined
  }));
}

export async function getCheckInOverview(options?: CheckInContextOptions): Promise<CheckInOverview> {
  const { habits, summaries, scheduledToday, todayKey } = await getTodayCheckInContext(options);
  const monthStartKey = `${todayKey.slice(0, 7)}-01`;
  let monthlyScheduledDays = 0;
  let monthlyDoneDays = 0;

  for (const habit of habits) {
    const statusMap = buildEntryStatusMap(habit.entries);
    const scheduleDays = normalizeScheduleDays(habit.scheduleDays);

    for (const dateKey of buildDateKeyRange(monthStartKey, todayKey)) {
      if (!isHabitScheduledOnWeekday(habit.scheduleType, scheduleDays, getWeekdayForDateKey(dateKey))) {
        continue;
      }

      monthlyScheduledDays += 1;
      if (statusMap.get(dateKey) === "DONE") {
        monthlyDoneDays += 1;
      }
    }
  }

  return {
    habitCount: summaries.length,
    todayDoneCount: scheduledToday.filter((habit: CheckInHabitSummary) => habit.todayStatus === "DONE").length,
    todayPendingCount: scheduledToday.filter((habit: CheckInHabitSummary) => !habit.todayStatus).length,
    totalDoneCount: summaries.reduce((total: number, habit: CheckInHabitSummary) => total + habit.totalDoneCount, 0),
    currentStreak: summaries.reduce((best: number, habit: CheckInHabitSummary) => Math.max(best, habit.currentStreak), 0),
    longestStreak: summaries.reduce((best: number, habit: CheckInHabitSummary) => Math.max(best, habit.longestStreak), 0),
    monthlyCompletionRate: monthlyScheduledDays === 0 ? 0 : Math.round((monthlyDoneDays / monthlyScheduledDays) * 100)
  };
}

export async function getTodayCheckInStatus(options?: CheckInContextOptions): Promise<CheckInTodayStatus> {
  const { scheduledToday, timeZone, todayKey } = await getTodayCheckInContext(options);
  const done = scheduledToday.filter((habit: CheckInHabitSummary) => habit.todayStatus === "DONE");
  const pending = scheduledToday.filter((habit: CheckInHabitSummary) => !habit.todayStatus);
  const skipped = scheduledToday.filter((habit: CheckInHabitSummary) => habit.todayStatus === "SKIPPED");
  const unfinished = sortTodayHabits([...pending, ...skipped]);
  const scheduled = sortTodayHabits(scheduledToday);
  const doneStatuses = sortTodayHabits(done);
  const pendingStatuses = sortTodayHabits(pending);
  const skippedStatuses = sortTodayHabits(skipped);
  const unfinishedStatuses = sortTodayHabits(unfinished);

  return {
    date: todayKey,
    timeZone,
    summary: `${doneStatuses.length}/${scheduled.length} check-ins done today, ${unfinishedStatuses.length} unfinished.`,
    habits: scheduled,
    scheduled,
    done: doneStatuses,
    pending: pendingStatuses,
    skipped: skippedStatuses,
    unfinished: unfinishedStatuses,
    counts: {
      scheduledCount: scheduled.length,
      doneCount: doneStatuses.length,
      pendingCount: pendingStatuses.length,
      skippedCount: skippedStatuses.length,
      unfinishedCount: unfinishedStatuses.length
    }
  };
}

export async function createCheckInHabit(input: unknown, options?: CheckInContextOptions): Promise<CheckInHabitSummary> {
  const parsed = checkInHabitInputSchema.parse(input);
  const db = getDb();
  const ownerId = await resolveOwnerId(options);
  const created = await db.checkInHabit.create({
    data: {
      ownerId,
      title: parsed.title,
      description: parsed.description || null,
      scheduleType: parsed.scheduleType,
      scheduleDays: parsed.scheduleType === "CUSTOM" ? parsed.scheduleDays : []
    },
    include: {
      entries: {
        orderBy: { date: "asc" }
      }
    }
  });

  const timeZone = await getUserTimezone(ownerId);
  const todayKey = getDateKeyInTimezone(new Date(), timeZone);

  return mapHabitSummary(created, todayKey);
}

export async function updateCheckInHabitFields(habitId: string, input: unknown, options?: CheckInContextOptions): Promise<CheckInHabitSummary> {
  const parsed = checkInHabitEditableFieldsSchema.parse(input);
  const db = getDb();
  const ownerId = await resolveOwnerId(options);
  const existing = await db.checkInHabit.findFirst({
    where: {
      id: habitId,
      ownerId,
      isArchived: false
    },
    select: {
      id: true
    }
  });

  if (!existing) {
    throw new Error("Check-in habit not found");
  }

  await db.checkInHabit.update({
    where: { id: existing.id },
    data: {
      title: parsed.title,
      description: parsed.description || null,
      ...(parsed.scheduleType ? {
        scheduleType: parsed.scheduleType,
        scheduleDays: parsed.scheduleType === "CUSTOM" ? (parsed.scheduleDays ?? []) : []
      } : {})
    }
  });

  const updated = await getHabitWithEntriesById(ownerId, existing.id);
  if (!updated) {
    throw new Error("Check-in habit not found");
  }

  const timeZone = await getUserTimezone(ownerId);
  const todayKey = getDateKeyInTimezone(new Date(), timeZone);

  return mapHabitSummary(updated, todayKey);
}

async function getHabitRecordForOwnerOnDate(ownerId: string, habitId: string, dateKey: string) {
  const db = getDb();
  const habit = await db.checkInHabit.findFirst({
    where: {
      id: habitId,
      ownerId,
      isArchived: false
    },
    select: {
      id: true
    }
  });

  if (!habit) {
    throw new Error("Check-in habit not found");
  }

  return {
    ownerId,
    date: assertValidDateKey(dateKey)
  };
}

function getTodayDateKeyForTimezone(timeZone: string) {
  return getDateKeyInTimezone(new Date(), timeZone);
}

async function markCheckInDoneForOwner(ownerId: string, habitId: string, dateKey?: string) {
  const db = getDb();
  const timeZone = await getUserTimezone(ownerId);
  const record = await getHabitRecordForOwnerOnDate(ownerId, habitId, dateKey ?? getTodayDateKeyForTimezone(timeZone));

  await db.checkInEntry.upsert({
    where: {
      habitId_date: {
        habitId,
        date: record.date
      }
    },
    update: {
      ownerId: record.ownerId,
      status: "DONE",
      reasonTag: null,
      note: null
    },
    create: {
      habitId,
      ownerId: record.ownerId,
      date: record.date,
      status: "DONE"
    }
  });
}

export async function markCheckInDone(habitId: string) {
  const ownerId = await getCurrentUserId();
  await markCheckInDoneForOwner(ownerId, habitId);
}

async function markCheckInSkippedForOwner(ownerId: string, habitId: string, input: unknown) {
  const db = getDb();
  const parsed = checkInSkipInputSchema.parse(input);
  const timeZone = await getUserTimezone(ownerId);
  const record = await getHabitRecordForOwnerOnDate(ownerId, habitId, getTodayDateKeyForTimezone(timeZone));

  await db.checkInEntry.upsert({
    where: {
      habitId_date: {
        habitId,
        date: record.date
      }
    },
    update: {
      ownerId: record.ownerId,
      status: "SKIPPED",
      reasonTag: parsed.reasonTag,
      note: parsed.note || null
    },
    create: {
      habitId,
      ownerId: record.ownerId,
      date: record.date,
      status: "SKIPPED",
      reasonTag: parsed.reasonTag,
      note: parsed.note || null
    }
  });
}

export async function markCheckInSkipped(habitId: string, input: unknown) {
  const ownerId = await getCurrentUserId();
  await markCheckInSkippedForOwner(ownerId, habitId, input);
}

export async function updateTodayCheckInStatuses(input: unknown, options?: CheckInContextOptions): Promise<CheckInTodayUpdateResult> {
  const envelope = checkInTodayUpdateEnvelopeSchema.parse(input);
  const ownerId = await resolveOwnerId(options);
  const results: CheckInTodayUpdateResultItem[] = [];

  for (const [index, rawUpdate] of envelope.updates.entries()) {
    const parsedUpdate = checkInTodayUpdateItemSchema.safeParse(rawUpdate);

    if (!parsedUpdate.success) {
      results.push({
        index,
        habitId: typeof rawUpdate === "object" && rawUpdate !== null && "habitId" in rawUpdate && typeof rawUpdate.habitId === "string"
          ? rawUpdate.habitId
          : "",
        status: typeof rawUpdate === "object" && rawUpdate !== null && "status" in rawUpdate && rawUpdate.status === "SKIPPED"
          ? "SKIPPED"
          : "DONE",
        applied: false,
        error: parsedUpdate.error.issues.map((issue) => issue.message).join("; ")
      });
      continue;
    }

    const update = parsedUpdate.data;

    try {
      if (update.status === "DONE") {
        await markCheckInDoneForOwner(ownerId, update.habitId);
        results.push({
          index,
          habitId: update.habitId,
          status: update.status,
          applied: true
        });
        continue;
      }

      await markCheckInSkippedForOwner(ownerId, update.habitId, {
        reasonTag: update.reasonTag,
        note: update.note
      });
      results.push({
        index,
        habitId: update.habitId,
        status: update.status,
        applied: true,
        reasonTag: update.reasonTag,
        note: update.note || undefined
      });
    } catch (error) {
      results.push({
        index,
        habitId: update.habitId,
        status: update.status,
        applied: false,
        reasonTag: update.reasonTag,
        note: update.note || undefined,
        error: error instanceof Error ? error.message : "Failed to update check-in."
      });
    }
  }

  const updatedCount = results.filter((item) => item.applied).length;
  const failedCount = results.length - updatedCount;

  return {
    ok: failedCount === 0,
    updatedCount,
    failedCount,
    results,
    today: await getTodayCheckInStatus({ ownerId })
  };
}

async function markCheckInSkippedForOwnerOnDate(ownerId: string, habitId: string, input: unknown, dateKey: string) {
  const db = getDb();
  const parsed = checkInSkipInputSchema.parse(input);
  const record = await getHabitRecordForOwnerOnDate(ownerId, habitId, dateKey);

  await db.checkInEntry.upsert({
    where: {
      habitId_date: {
        habitId,
        date: record.date
      }
    },
    update: {
      ownerId: record.ownerId,
      status: "SKIPPED",
      reasonTag: parsed.reasonTag,
      note: parsed.note || null
    },
    create: {
      habitId,
      ownerId: record.ownerId,
      date: record.date,
      status: "SKIPPED",
      reasonTag: parsed.reasonTag,
      note: parsed.note || null
    }
  });
}

export async function updateCheckInStatusesForDate(input: unknown, options?: CheckInContextOptions): Promise<CheckInDateUpdateResult> {
  const parsed = checkInDateUpdateInputSchema.parse(input);
  const ownerId = await resolveOwnerId(options);
  const results: CheckInTodayUpdateResultItem[] = [];

  for (const [index, rawUpdate] of parsed.updates.entries()) {
    const parsedUpdate = checkInTodayUpdateItemSchema.safeParse(rawUpdate);

    if (!parsedUpdate.success) {
      results.push({
        index,
        habitId: typeof rawUpdate === "object" && rawUpdate !== null && "habitId" in rawUpdate && typeof rawUpdate.habitId === "string"
          ? rawUpdate.habitId
          : "",
        status: typeof rawUpdate === "object" && rawUpdate !== null && "status" in rawUpdate && rawUpdate.status === "SKIPPED"
          ? "SKIPPED"
          : "DONE",
        applied: false,
        error: parsedUpdate.error.issues.map((issue) => issue.message).join("; ")
      });
      continue;
    }

    const update = parsedUpdate.data;

    try {
      if (update.status === "DONE") {
        await markCheckInDoneForOwner(ownerId, update.habitId, parsed.date);
        results.push({
          index,
          habitId: update.habitId,
          status: update.status,
          applied: true
        });
        continue;
      }

      await markCheckInSkippedForOwnerOnDate(ownerId, update.habitId, {
        reasonTag: update.reasonTag,
        note: update.note
      }, parsed.date);
      results.push({
        index,
        habitId: update.habitId,
        status: update.status,
        applied: true,
        reasonTag: update.reasonTag,
        note: update.note || undefined
      });
    } catch (error) {
      results.push({
        index,
        habitId: update.habitId,
        status: update.status,
        applied: false,
        reasonTag: update.reasonTag,
        note: update.note || undefined,
        error: error instanceof Error ? error.message : "Failed to update check-in."
      });
    }
  }

  const updatedCount = results.filter((item) => item.applied).length;
  const failedCount = results.length - updatedCount;

  return {
    ok: failedCount === 0,
    date: parsed.date,
    updatedCount,
    failedCount,
    results
  };
}

export async function resetCheckInStatusesForDate(input: unknown, options?: CheckInContextOptions): Promise<CheckInEntryResetResult> {
  const parsed = checkInEntryResetInputSchema.parse(input);
  const ownerId = await resolveOwnerId(options);
  const db = getDb();
  const results: CheckInEntryResetResultItem[] = [];
  const targetDate = assertValidDateKey(parsed.date);

  for (const [index, reset] of parsed.resets.entries()) {
    try {
      await getHabitRecordForOwnerOnDate(ownerId, reset.habitId, parsed.date);

      await db.checkInEntry.deleteMany({
        where: {
          ownerId,
          habitId: reset.habitId,
          date: targetDate
        }
      });

      results.push({
        index,
        habitId: reset.habitId,
        cleared: true
      });
    } catch (error) {
      results.push({
        index,
        habitId: reset.habitId,
        cleared: false,
        error: error instanceof Error ? error.message : "Failed to reset check-in."
      });
    }
  }

  const clearedCount = results.filter((item) => item.cleared).length;
  const failedCount = results.length - clearedCount;

  return {
    ok: failedCount === 0,
    date: parsed.date,
    clearedCount,
    failedCount,
    results
  };
}

export async function createCheckInAuditLog(input: CheckInAuditLogInput) {
  const db = getDb();

  await db.checkInAuditLog.create({
    data: {
      ownerId: input.ownerId,
      habitId: input.habitId || null,
      action: input.action,
      source: input.source,
      requestId: input.requestId,
      targetDate: input.targetDate ? assertValidDateKey(input.targetDate) : null,
      payloadJson: input.payload ?? null,
      resultJson: input.result ?? null
    }
  });
}

export async function listCheckInAuditLogs(
  options?: CheckInContextOptions & {
    limit?: number;
    habitId?: string;
  }
): Promise<CheckInAuditLogItem[]> {
  const db = getDb();
  const ownerId = await resolveOwnerId(options);
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);

  const logs = await db.checkInAuditLog.findMany({
    where: {
      ownerId,
      ...(options?.habitId ? { habitId: options.habitId } : {})
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      habit: {
        select: {
          title: true
        }
      }
    }
  });

  return logs.map((log: (typeof logs)[number]) => mapCheckInAuditLogItem(log));
}

export async function archiveCheckInHabit(habitId: string, options?: CheckInContextOptions) {
  const db = getDb();
  const ownerId = await resolveOwnerId(options);
  const existing = await db.checkInHabit.findFirst({
    where: {
      id: habitId,
      ownerId,
      isArchived: false
    },
    select: {
      id: true
    }
  });

  if (!existing) {
    throw new Error("Check-in habit not found");
  }

  await db.checkInHabit.update({
    where: { id: existing.id },
    data: {
      isArchived: true
    }
  });

  return {
    id: existing.id,
    isArchived: true
  };
}
