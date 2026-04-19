"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { archiveCheckInHabit, createCheckInHabit, markCheckInDone, markCheckInSkipped, updateCheckInHabitFields } from "@/server/check-in/service";

function parseScheduleDays(formData: FormData) {
  return formData
    .getAll("scheduleDays")
    .map((value) => Number(value.toString()))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
}

function buildCheckInHabitPayload(formData: FormData) {
  return {
    title: formData.get("title")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    scheduleType: formData.get("scheduleType")?.toString() ?? "",
    scheduleDays: parseScheduleDays(formData)
  };
}

function revalidateCheckInPaths() {
  revalidatePath("/");
  revalidatePath("/activity");
  revalidatePath("/check-in");
}

export async function createCheckInHabitAction(formData: FormData) {
  try {
    await createCheckInHabit(buildCheckInHabitPayload(formData));
  } catch {
    redirect("/check-in?error=create-failed");
  }

  revalidateCheckInPaths();
  redirect("/check-in?created=1");
}

export async function updateCheckInHabitFieldsAction(formData: FormData) {
  const habitId = formData.get("habitId")?.toString() ?? "";

  if (!habitId) {
    redirect("/check-in?error=missing-habit");
  }

  try {
    await updateCheckInHabitFields(habitId, {
      title: formData.get("title")?.toString() ?? "",
      description: formData.get("description")?.toString() ?? ""
    });
  } catch {
    redirect("/check-in?error=edit-failed");
  }

  revalidateCheckInPaths();
  redirect("/check-in?updated=1");
}

export async function markCheckInDoneAction(formData: FormData) {
  const habitId = formData.get("habitId")?.toString() ?? "";

  if (!habitId) {
    redirect("/check-in?error=missing-habit");
  }

  try {
    await markCheckInDone(habitId);
  } catch {
    redirect("/check-in?error=done-failed");
  }

  revalidateCheckInPaths();
  redirect("/check-in?updated=1");
}

export async function markCheckInSkippedAction(formData: FormData) {
  const habitId = formData.get("habitId")?.toString() ?? "";

  if (!habitId) {
    redirect("/check-in?error=missing-habit");
  }

  try {
    await markCheckInSkipped(habitId, {
      reasonTag: formData.get("reasonTag")?.toString() ?? "",
      note: formData.get("note")?.toString() ?? ""
    });
  } catch {
    redirect("/check-in?error=skip-failed");
  }

  revalidateCheckInPaths();
  redirect("/check-in?updated=1");
}

export async function archiveCheckInHabitAction(formData: FormData) {
  const habitId = formData.get("habitId")?.toString() ?? "";

  if (!habitId) {
    redirect("/check-in?error=missing-habit");
  }

  try {
    await archiveCheckInHabit(habitId);
  } catch {
    redirect("/check-in?error=archive-failed");
  }

  revalidateCheckInPaths();
  redirect("/check-in?archived=1");
}
