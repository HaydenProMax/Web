import type { PlannerOverview, PlannerTaskLinkOptions, PlannerTaskSummary } from "@workspace/types/index";

import { getCurrentUserId } from "@/server/auth/current-user";
import { getDb } from "@/server/db";
import { plannerTaskEditableStatusSchema, plannerTaskInputSchema, type PlannerTaskEditableStatus, type PlannerTaskInput } from "@/server/planner/schema";

const statusRank: Record<PlannerTaskSummary["status"], number> = {
  IN_PROGRESS: 0,
  TODO: 1,
  DONE: 2,
  ARCHIVED: 3
};

const priorityRank: Record<PlannerTaskSummary["priority"], number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2
};

function mapPlannerTask(task: {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "ARCHIVED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  scheduledFor: Date | null;
  dueAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  relatedNote: { slug: string; title: string } | null;
  relatedDraft: { id: string; title: string } | null;
}): PlannerTaskSummary {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    scheduledFor: task.scheduledFor?.toISOString(),
    dueAt: task.dueAt?.toISOString(),
    completedAt: task.completedAt?.toISOString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    relatedNoteSlug: task.relatedNote?.slug ?? undefined,
    relatedNoteTitle: task.relatedNote?.title ?? undefined,
    relatedDraftId: task.relatedDraft?.id ?? undefined,
    relatedDraftTitle: task.relatedDraft?.title ?? undefined
  };
}

function comparePlannerTasks(left: PlannerTaskSummary, right: PlannerTaskSummary) {
  const statusDiff = statusRank[left.status] - statusRank[right.status];
  if (statusDiff !== 0) {
    return statusDiff;
  }

  const leftDue = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  const rightDue = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  if (leftDue !== rightDue) {
    return leftDue - rightDue;
  }

  const priorityDiff = priorityRank[left.priority] - priorityRank[right.priority];
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

async function fetchPlannerTasks(ownerId: string, archived = false) {
  const db = getDb();
  return db.plannerTask.findMany({
    where: {
      ownerId,
      status: archived
        ? "ARCHIVED"
        : {
            not: "ARCHIVED"
          }
    },
    include: {
      relatedNote: {
        select: { slug: true, title: true }
      },
      relatedDraft: {
        select: { id: true, title: true }
      }
    }
  });
}

function resolveCompletedAt(status: PlannerTaskEditableStatus | PlannerTaskInput["status"], existingCompletedAt?: Date | null) {
  if (status === "DONE") {
    return existingCompletedAt ?? new Date();
  }

  return null;
}

function startOfToday() {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfToday() {
  const value = startOfToday();
  value.setDate(value.getDate() + 1);
  value.setMilliseconds(-1);
  return value;
}

function startOfTomorrow() {
  const value = startOfToday();
  value.setDate(value.getDate() + 1);
  return value;
}

function endOfPlanningWeek() {
  const value = endOfToday();
  value.setDate(value.getDate() + 6);
  value.setHours(23, 59, 59, 999);
  return value;
}

function taskRelevantDate(task: PlannerTaskSummary) {
  return task.scheduledFor ?? task.dueAt ?? task.updatedAt;
}

function isWithinRange(value: string | undefined, start: Date, end: Date) {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();
  return timestamp >= start.getTime() && timestamp <= end.getTime();
}

function sortByRelevantDate(tasks: PlannerTaskSummary[]) {
  return [...tasks].sort((left, right) => {
    const leftDate = new Date(taskRelevantDate(left)).getTime();
    const rightDate = new Date(taskRelevantDate(right)).getTime();
    if (leftDate !== rightDate) {
      return leftDate - rightDate;
    }

    return comparePlannerTasks(left, right);
  });
}

async function resolvePlannerLinks(ownerId: string, input: PlannerTaskInput) {
  const db = getDb();
  const relatedNoteSlug = input.relatedNoteSlug?.trim() ?? "";
  const relatedDraftId = input.relatedDraftId?.trim() ?? "";

  const [relatedNote, relatedDraft] = await Promise.all([
    relatedNoteSlug
      ? db.knowledgeNote.findFirst({
          where: { ownerId, slug: relatedNoteSlug, isArchived: false },
          select: { id: true }
        })
      : Promise.resolve(null),
    relatedDraftId
      ? db.writingDraft.findFirst({
          where: { ownerId, id: relatedDraftId },
          select: { id: true }
        })
      : Promise.resolve(null)
  ]);

  return {
    relatedNoteId: relatedNote?.id ?? null,
    relatedDraftId: relatedDraft?.id ?? null
  };
}

export async function listPlannerLinkOptions(limit = 8): Promise<PlannerTaskLinkOptions> {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const [notes, drafts] = await Promise.all([
    db.knowledgeNote.findMany({
      where: { ownerId, isArchived: false },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        slug: true,
        title: true,
        updatedAt: true,
        domain: { select: { name: true } }
      }
    }),
    db.writingDraft.findMany({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        sourceNote: { select: { title: true } }
      }
    })
  ]);

  return {
    notes: notes.map((note: (typeof notes)[number]) => ({
      value: note.slug,
      title: note.title,
      meta: note.domain?.name
        ? `${note.domain.name} | Updated ${note.updatedAt.toLocaleDateString("zh-CN")}`
        : `Updated ${note.updatedAt.toLocaleDateString("zh-CN")}`
    })),
    drafts: drafts.map((draft: (typeof drafts)[number]) => ({
      value: draft.id,
      title: draft.title,
      meta: draft.sourceNote?.title
        ? `From ${draft.sourceNote.title}`
        : `Updated ${draft.updatedAt.toLocaleDateString("zh-CN")}`
    }))
  };
}

export async function listPlannerTasks(limit = 12, options?: { archived?: boolean }): Promise<PlannerTaskSummary[]> {
  const ownerId = await getCurrentUserId();
  const tasks = await fetchPlannerTasks(ownerId, options?.archived ?? false);

  return tasks.map(mapPlannerTask).sort(comparePlannerTasks).slice(0, limit);
}

export async function getPlannerPlanningView(limitPerLane = 5) {
  const ownerId = await getCurrentUserId();
  const tasks: PlannerTaskSummary[] = (await fetchPlannerTasks(ownerId, false)).map(mapPlannerTask).sort(comparePlannerTasks);
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const weekStart = startOfTomorrow();
  const weekEnd = endOfPlanningWeek();

  const activeTasks = tasks.filter((task) => task.status !== "DONE");
  const todayTasks = sortByRelevantDate(
    activeTasks.filter((task) => isWithinRange(task.scheduledFor ?? task.dueAt, todayStart, todayEnd))
  ).slice(0, limitPerLane);

  const weekTasks = sortByRelevantDate(
    activeTasks.filter((task) => {
      const candidate = task.scheduledFor ?? task.dueAt;
      return isWithinRange(candidate, weekStart, weekEnd);
    })
  ).slice(0, limitPerLane);

  const overdueTasks = sortByRelevantDate(
    activeTasks.filter((task) => task.dueAt && new Date(task.dueAt).getTime() < todayStart.getTime())
  ).slice(0, limitPerLane);

  return {
    todayTasks,
    weekTasks,
    overdueTasks
  };
}

export async function getPlannerTaskById(taskId: string): Promise<PlannerTaskSummary | null> {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const task = await db.plannerTask.findFirst({
    where: {
      id: taskId,
      ownerId,
      status: {
        not: "ARCHIVED"
      }
    },
    include: {
      relatedNote: {
        select: { slug: true, title: true }
      },
      relatedDraft: {
        select: { id: true, title: true }
      }
    }
  });

  return task ? mapPlannerTask(task) : null;
}

export async function createPlannerTask(input: unknown): Promise<PlannerTaskSummary> {
  const parsed = plannerTaskInputSchema.parse(input);
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const scheduledFor = parsed.scheduledFor ? new Date(parsed.scheduledFor) : null;
  const dueAt = parsed.dueAt ? new Date(parsed.dueAt) : null;
  const completedAt = resolveCompletedAt(parsed.status);
  const links = await resolvePlannerLinks(ownerId, parsed);

  const task = await db.plannerTask.create({
    data: {
      ownerId,
      title: parsed.title,
      description: parsed.description || null,
      status: parsed.status,
      priority: parsed.priority,
      scheduledFor,
      dueAt,
      completedAt,
      relatedNoteId: links.relatedNoteId,
      relatedDraftId: links.relatedDraftId
    },
    include: {
      relatedNote: {
        select: { slug: true, title: true }
      },
      relatedDraft: {
        select: { id: true, title: true }
      }
    }
  });

  return mapPlannerTask(task);
}

export async function updatePlannerTask(taskId: string, input: unknown): Promise<PlannerTaskSummary> {
  const parsed = plannerTaskInputSchema.parse(input);
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const existing = await db.plannerTask.findFirst({
    where: {
      id: taskId,
      ownerId,
      status: {
        not: "ARCHIVED"
      }
    },
    select: {
      id: true,
      completedAt: true
    }
  });

  if (!existing) {
    throw new Error("Planner task not found");
  }

  const scheduledFor = parsed.scheduledFor ? new Date(parsed.scheduledFor) : null;
  const dueAt = parsed.dueAt ? new Date(parsed.dueAt) : null;
  const links = await resolvePlannerLinks(ownerId, parsed);

  const task = await db.plannerTask.update({
    where: { id: existing.id },
    data: {
      title: parsed.title,
      description: parsed.description || null,
      status: parsed.status,
      priority: parsed.priority,
      scheduledFor,
      dueAt,
      completedAt: resolveCompletedAt(parsed.status, existing.completedAt),
      relatedNoteId: links.relatedNoteId,
      relatedDraftId: links.relatedDraftId
    },
    include: {
      relatedNote: {
        select: { slug: true, title: true }
      },
      relatedDraft: {
        select: { id: true, title: true }
      }
    }
  });

  return mapPlannerTask(task);
}

export async function updatePlannerTaskStatus(taskId: string, statusInput: unknown): Promise<PlannerTaskSummary> {
  const status = plannerTaskEditableStatusSchema.parse(statusInput);
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const existing = await db.plannerTask.findFirst({
    where: {
      id: taskId,
      ownerId,
      status: {
        not: "ARCHIVED"
      }
    },
    select: {
      id: true,
      completedAt: true
    }
  });

  if (!existing) {
    throw new Error("Planner task not found");
  }

  const task = await db.plannerTask.update({
    where: { id: existing.id },
    data: {
      status,
      completedAt: resolveCompletedAt(status, existing.completedAt)
    },
    include: {
      relatedNote: {
        select: { slug: true, title: true }
      },
      relatedDraft: {
        select: { id: true, title: true }
      }
    }
  });

  return mapPlannerTask(task);
}

export async function archivePlannerTask(taskId: string) {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const existing = await db.plannerTask.findFirst({
    where: {
      id: taskId,
      ownerId,
      status: {
        not: "ARCHIVED"
      }
    },
    select: {
      id: true,
      completedAt: true
    }
  });

  if (!existing) {
    throw new Error("Planner task not found");
  }

  await db.plannerTask.update({
    where: { id: existing.id },
    data: {
      status: "ARCHIVED",
      completedAt: existing.completedAt
    }
  });
}

export async function restorePlannerTask(taskId: string) {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const existing = await db.plannerTask.findFirst({
    where: {
      id: taskId,
      ownerId,
      status: "ARCHIVED"
    },
    select: {
      id: true,
      completedAt: true
    }
  });

  if (!existing) {
    throw new Error("Archived planner task not found");
  }

  await db.plannerTask.update({
    where: { id: existing.id },
    data: {
      status: existing.completedAt ? "DONE" : "TODO",
      completedAt: existing.completedAt
    }
  });
}

export async function deleteArchivedPlannerTask(taskId: string) {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const existing = await db.plannerTask.findFirst({
    where: {
      id: taskId,
      ownerId,
      status: "ARCHIVED"
    },
    select: {
      id: true
    }
  });

  if (!existing) {
    throw new Error("Archived planner task not found");
  }

  await db.plannerTask.delete({
    where: { id: existing.id }
  });
}
export async function getPlannerOverview(): Promise<PlannerOverview> {
  const db = getDb();
  const ownerId = await getCurrentUserId();
  const [totalCount, todoCount, inProgressCount, doneCount, archivedCount] = await Promise.all([
    db.plannerTask.count({ where: { ownerId, status: { not: "ARCHIVED" } } }),
    db.plannerTask.count({ where: { ownerId, status: "TODO" } }),
    db.plannerTask.count({ where: { ownerId, status: "IN_PROGRESS" } }),
    db.plannerTask.count({ where: { ownerId, status: "DONE" } }),
    db.plannerTask.count({ where: { ownerId, status: "ARCHIVED" } })
  ]);

  return {
    totalCount,
    todoCount,
    inProgressCount,
    doneCount,
    archivedCount
  };
}








