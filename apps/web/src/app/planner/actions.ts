"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { archivePlannerTask, createPlannerTask, deleteArchivedPlannerTask, deletePlannerTask, restorePlannerTask, updatePlannerTask, updatePlannerTaskStatus } from "@/server/planner/service";

export type PlannerQuickAddState = {
  success: boolean;
  message: string;
  timestamp: number;
};

const plannerQuickAddInitialState: PlannerQuickAddState = {
  success: false,
  message: "",
  timestamp: 0
};


function normalizeDateTimeLocal(value: string) {
  if (!value.trim()) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function plannerPayload(formData: FormData) {
  return {
    title: formData.get("title")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    priority: formData.get("priority")?.toString() ?? "",
    status: formData.get("status")?.toString() ?? "",
    scheduledFor: normalizeDateTimeLocal(formData.get("scheduledFor")?.toString() ?? ""),
    dueAt: normalizeDateTimeLocal(formData.get("dueAt")?.toString() ?? ""),
    relatedNoteSlug: formData.get("relatedNoteSlug")?.toString() ?? "",
    relatedDraftId: formData.get("relatedDraftId")?.toString() ?? ""
  };
}

async function completePlannerArchive(taskId: string) {
  await archivePlannerTask(taskId);
  revalidatePath("/");
  revalidatePath("/planner");
  revalidatePath("/activity");
}

async function completePlannerRestore(taskId: string) {
  await restorePlannerTask(taskId);
  revalidatePath("/");
  revalidatePath("/planner");
  revalidatePath("/activity");
}

async function completePlannerPermanentDelete(taskId: string) {
  await deleteArchivedPlannerTask(taskId);
  revalidatePath("/");
  revalidatePath("/planner");
  revalidatePath("/activity");
}


async function completePlannerDelete(taskId: string) {
  await deletePlannerTask(taskId);
  revalidatePath("/");
  revalidatePath("/planner");
  revalidatePath("/activity");
}

export async function createPlannerTaskAction(formData: FormData) {
  try {
    await createPlannerTask(plannerPayload(formData));
  } catch {
    redirect("/planner/new?error=create-failed");
  }

  revalidatePath("/");
  revalidatePath("/planner");
  redirect("/planner?created=1");
}

export async function quickCreatePlannerTaskAction(
  _previousState: PlannerQuickAddState = plannerQuickAddInitialState,
  formData: FormData
): Promise<PlannerQuickAddState> {
  try {
    await createPlannerTask(plannerPayload(formData));
  } catch {
    return {
      success: false,
      message: "Could not add task.",
      timestamp: Date.now()
    };
  }

  revalidatePath("/");
  revalidatePath("/planner");

  return {
    success: true,
    message: "Task added.",
    timestamp: Date.now()
  };
}

export async function updatePlannerTaskAction(formData: FormData) {
  const taskId = formData.get("taskId")?.toString() ?? "";

  if (!taskId) {
    redirect("/planner?error=missing-task");
  }

  try {
    await updatePlannerTask(taskId, plannerPayload(formData));
  } catch {
    redirect(`/planner/${taskId}/edit?error=update-failed`);
  }

  revalidatePath("/");
  revalidatePath("/planner");
  revalidatePath(`/planner/${taskId}/edit`);
  redirect("/planner?edited=1");
}

export async function updatePlannerTaskStatusAction(formData: FormData) {
  const taskId = formData.get("taskId")?.toString() ?? "";
  const status = formData.get("status")?.toString() ?? "";

  if (!taskId) {
    redirect("/planner?error=missing-task");
  }

  if (!status) {
    redirect("/planner?error=update-failed");
  }

  try {
    await updatePlannerTaskStatus(taskId, status);
  } catch {
    redirect("/planner?error=update-failed");
  }

  revalidatePath("/");
  revalidatePath("/planner");
  revalidatePath(`/planner/${taskId}/edit`);
  redirect("/planner?updated=1");
}

export async function archivePlannerTaskAction(formData: FormData) {
  const taskId = formData.get("taskId")?.toString() ?? "";

  if (!taskId) {
    redirect("/planner?error=missing-task");
  }

  try {
    await completePlannerArchive(taskId);
  } catch {
    redirect(`/planner/${taskId}/edit?error=delete-failed`);
  }

  redirect("/planner?deleted=1");
}

export async function archivePlannerTaskFromListAction(formData: FormData) {
  const taskId = formData.get("taskId")?.toString() ?? "";

  if (!taskId) {
    redirect("/planner?error=delete-failed");
  }

  try {
    await completePlannerArchive(taskId);
  } catch {
    redirect("/planner?error=delete-failed");
  }

  redirect("/planner?deleted=1");
}

export async function restorePlannerTaskFromListAction(formData: FormData) {
  const taskId = formData.get("taskId")?.toString() ?? "";

  if (!taskId) {
    redirect("/planner?view=archived&error=restore-failed");
  }

  try {
    await completePlannerRestore(taskId);
  } catch {
    redirect("/planner?view=archived&error=restore-failed");
  }

  redirect("/planner?view=archived&restored=1");
}

export async function deleteArchivedPlannerTaskFromListAction(formData: FormData) {
  const taskId = formData.get("taskId")?.toString() ?? "";
  const confirmed = formData.get("confirmed")?.toString() ?? "";

  if (!taskId || confirmed !== "true") {
    redirect("/planner?view=archived&error=confirm-delete-required");
  }

  try {
    await completePlannerPermanentDelete(taskId);
  } catch {
    redirect("/planner?view=archived&error=permanent-delete-failed");
  }

  redirect("/planner?view=archived&destroyed=1");
}

export async function deletePlannerTaskAction(formData: FormData) {
  const taskId = formData.get("taskId")?.toString() ?? "";
  const confirmed = formData.get("confirmed")?.toString() ?? "";

  if (!taskId || confirmed != "true") {
    redirect("/planner?error=confirm-delete-required");
  }

  try {
    await completePlannerDelete(taskId);
  } catch {
    redirect(`/planner/${taskId}/edit?error=delete-failed`);
  }

  redirect("/planner?destroyed=1");
}
