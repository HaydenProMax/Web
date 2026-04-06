"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  archiveWritingDraft,
  createWritingDraft,
  deleteArchivedWritingDraft,
  publishWritingDraft,
  restoreWritingDraft,
  updateWritingDraft
} from "@/server/writing/service";

function safeParseDraftPayload(formData: FormData) {
  const rawContent = formData.get("content")?.toString() ?? "[]";

  try {
    return {
      ok: true as const,
      payload: {
        title: formData.get("title")?.toString() ?? "",
        summary: formData.get("summary")?.toString() ?? "",
        coverImageUrl: formData.get("coverImageUrl")?.toString() ?? "",
        sourceNoteSlug: formData.get("sourceNoteSlug")?.toString() ?? "",
        visibility: formData.get("visibility")?.toString() ?? "",
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

function revalidateWritingPaths() {
  revalidatePath("/");
  revalidatePath("/activity");
  revalidatePath("/search");
  revalidatePath("/writing");
}

async function completeWritingArchive(draftId: string) {
  await archiveWritingDraft(draftId);
  revalidateWritingPaths();
  revalidatePath(`/writing/drafts/${draftId}`);
}

async function completeWritingRestore(draftId: string) {
  await restoreWritingDraft(draftId);
  revalidateWritingPaths();
  revalidatePath(`/writing/drafts/${draftId}`);
}

async function completeWritingPermanentDelete(draftId: string) {
  await deleteArchivedWritingDraft(draftId);
  revalidateWritingPaths();
  revalidatePath(`/writing/drafts/${draftId}`);
}

export async function createWritingDraftAction(formData: FormData) {
  const parsed = safeParseDraftPayload(formData);
  if (!parsed.ok) {
    redirect(`/writing/new?error=${parsed.error}`);
  }

  let draft;
  try {
    draft = await createWritingDraft(parsed.payload);
  } catch {
    redirect("/writing/new?error=create-failed");
  }

  revalidateWritingPaths();
  redirect(`/writing/drafts/${draft.id}?created=1`);
}

export async function updateWritingDraftAction(draftId: string, formData: FormData) {
  const parsed = safeParseDraftPayload(formData);
  if (!parsed.ok) {
    redirect(`/writing/drafts/${draftId}?error=${parsed.error}`);
  }

  try {
    await updateWritingDraft(draftId, parsed.payload);
  } catch {
    redirect(`/writing/drafts/${draftId}?error=save-failed`);
  }

  revalidateWritingPaths();
  revalidatePath(`/writing/drafts/${draftId}`);
  redirect(`/writing/drafts/${draftId}?saved=1`);
}

export async function publishWritingDraftAction(draftId: string) {
  let post;
  try {
    post = await publishWritingDraft(draftId);
  } catch {
    redirect(`/writing/drafts/${draftId}?error=publish-failed`);
  }

  revalidateWritingPaths();
  revalidatePath(`/writing/drafts/${draftId}`);
  redirect(`/writing/${post.slug}?published=1`);
}

export async function archiveWritingDraftAction(draftId: string) {
  try {
    await completeWritingArchive(draftId);
  } catch {
    redirect(`/writing/drafts/${draftId}?error=archive-failed`);
  }

  redirect("/writing?archived=1");
}

export async function restoreWritingDraftAction(draftId: string) {
  try {
    await completeWritingRestore(draftId);
  } catch {
    redirect(`/writing/drafts/${draftId}?error=restore-failed`);
  }

  redirect(`/writing/drafts/${draftId}?restored=1`);
}

export async function archiveWritingDraftFromListAction(formData: FormData) {
  const draftId = formData.get("draftId")?.toString() ?? "";

  if (!draftId) {
    redirect("/writing?error=archive-failed");
  }

  try {
    await completeWritingArchive(draftId);
  } catch {
    redirect("/writing?error=archive-failed");
  }

  redirect("/writing?archived=1");
}

export async function restoreWritingDraftFromListAction(formData: FormData) {
  const draftId = formData.get("draftId")?.toString() ?? "";

  if (!draftId) {
    redirect("/writing?view=archived&error=restore-failed");
  }

  try {
    await completeWritingRestore(draftId);
  } catch {
    redirect("/writing?view=archived&error=restore-failed");
  }

  redirect("/writing?view=archived&restored=1");
}

export async function deleteArchivedWritingDraftFromListAction(formData: FormData) {
  const draftId = formData.get("draftId")?.toString() ?? "";
  const confirmed = formData.get("confirmed")?.toString() ?? "";

  if (!draftId || confirmed !== "true") {
    redirect("/writing?view=archived&error=confirm-delete-required");
  }

  try {
    await completeWritingPermanentDelete(draftId);
  } catch {
    redirect("/writing?view=archived&error=permanent-delete-failed");
  }

  redirect("/writing?view=archived&destroyed=1");
}
