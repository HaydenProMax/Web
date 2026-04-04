"use server";

import { redirect } from "next/navigation";

import { createWritingDraft, publishWritingDraft, updateWritingDraft } from "@/server/writing/service";

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
        visibility: formData.get("visibility")?.toString() ?? "PRIVATE",
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

export async function createWritingDraftAction(formData: FormData) {
  const parsed = safeParseDraftPayload(formData);
  if (!parsed.ok) {
    redirect(`/writing/new?error=${parsed.error}`);
  }

  try {
    const draft = await createWritingDraft(parsed.payload);
    redirect(`/writing/drafts/${draft.id}?created=1`);
  } catch {
    redirect("/writing/new?error=create-failed");
  }
}

export async function updateWritingDraftAction(draftId: string, formData: FormData) {
  const parsed = safeParseDraftPayload(formData);
  if (!parsed.ok) {
    redirect(`/writing/drafts/${draftId}?error=${parsed.error}`);
  }

  try {
    await updateWritingDraft(draftId, parsed.payload);
    redirect(`/writing/drafts/${draftId}?saved=1`);
  } catch {
    redirect(`/writing/drafts/${draftId}?error=save-failed`);
  }
}

export async function publishWritingDraftAction(draftId: string) {
  try {
    const post = await publishWritingDraft(draftId);
    redirect(`/writing/${post.slug}?published=1`);
  } catch {
    redirect(`/writing/drafts/${draftId}?error=publish-failed`);
  }
}
