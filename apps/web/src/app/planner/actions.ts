"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createPlannerTask, updatePlannerTask, updatePlannerTaskStatus } from "@/server/planner/service";

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

