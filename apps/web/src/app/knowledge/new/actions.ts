"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { archiveKnowledgeNote, createKnowledgeNote, deleteArchivedKnowledgeNote, restoreKnowledgeNote, updateKnowledgeNote } from "@/server/knowledge/service";

function safeParseKnowledgePayload(formData: FormData) {
  const rawContent = formData.get("content")?.toString() ?? "[]";
  const rawTags = formData.get("tags")?.toString() ?? "";

  try {
    return {
      ok: true as const,
      payload: {
        title: formData.get("title")?.toString() ?? "",
        summary: formData.get("summary")?.toString() ?? "",
        domainName: formData.get("domainName")?.toString() ?? "",
        tags: rawTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        content: JSON.parse(rawContent)
      }
    };
  } catch {
    return {
      ok: false as const,
      error: "invalid-content-json"
    };
  }
}

async function completeKnowledgeArchive(slug: string) {
  await archiveKnowledgeNote(slug);
  revalidatePath("/");
  revalidatePath("/knowledge");
  revalidatePath("/archive");
  revalidatePath("/activity");
  revalidatePath("/writing");
  revalidatePath("/planner");
}

async function completeKnowledgeRestore(slug: string) {
  await restoreKnowledgeNote(slug);
  revalidatePath("/");
  revalidatePath("/knowledge");
  revalidatePath("/archive");
  revalidatePath("/activity");
  revalidatePath("/writing");
  revalidatePath("/planner");
}

async function completeKnowledgePermanentDelete(slug: string) {
  await deleteArchivedKnowledgeNote(slug);
  revalidatePath("/");
  revalidatePath("/knowledge");
  revalidatePath("/archive");
  revalidatePath("/activity");
  revalidatePath("/writing");
  revalidatePath("/planner");
}

export async function createKnowledgeNoteAction(formData: FormData) {
  const parsed = safeParseKnowledgePayload(formData);
  if (!parsed.ok) {
    redirect(`/knowledge/new?error=${parsed.error}`);
  }

  let note;
  try {
    note = await createKnowledgeNote(parsed.payload);
  } catch {
    redirect("/knowledge/new?error=create-failed");
  }

  redirect(`/knowledge/${note.slug}?created=1`);
}

export async function updateKnowledgeNoteAction(slug: string, formData: FormData) {
  const parsed = safeParseKnowledgePayload(formData);
  if (!parsed.ok) {
    redirect(`/knowledge/${slug}/edit?error=${parsed.error}`);
  }

  let note;
  try {
    note = await updateKnowledgeNote(slug, parsed.payload);
  } catch {
    redirect(`/knowledge/${slug}/edit?error=save-failed`);
  }

  redirect(`/knowledge/${note.slug}?saved=1`);
}

export async function archiveKnowledgeNoteAction(slug: string) {
  try {
    await completeKnowledgeArchive(slug);
  } catch {
    redirect(`/knowledge/${slug}/edit?error=delete-failed`);
  }

  redirect("/knowledge?deleted=1");
}

export async function archiveKnowledgeNoteFromListAction(formData: FormData) {
  const slug = formData.get("slug")?.toString() ?? "";

  if (!slug) {
    redirect("/knowledge?error=delete-failed");
  }

  try {
    await completeKnowledgeArchive(slug);
  } catch {
    redirect("/knowledge?error=delete-failed");
  }

  redirect("/knowledge?deleted=1");
}

export async function restoreKnowledgeNoteFromListAction(formData: FormData) {
  const slug = formData.get("slug")?.toString() ?? "";

  if (!slug) {
    redirect("/knowledge?view=archived&error=restore-failed");
  }

  try {
    await completeKnowledgeRestore(slug);
  } catch {
    redirect("/knowledge?view=archived&error=restore-failed");
  }

  redirect("/knowledge?view=archived&restored=1");
}

export async function deleteArchivedKnowledgeNoteFromListAction(formData: FormData) {
  const slug = formData.get("slug")?.toString() ?? "";
  const confirmed = formData.get("confirmed")?.toString() ?? "";

  if (!slug || confirmed !== "true") {
    redirect("/knowledge?view=archived&error=confirm-delete-required");
  }

  try {
    await completeKnowledgePermanentDelete(slug);
  } catch {
    redirect("/knowledge?view=archived&error=permanent-delete-failed");
  }

  redirect("/knowledge?view=archived&destroyed=1");
}
