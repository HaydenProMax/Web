"use server";

import { redirect } from "next/navigation";

import { createKnowledgeNote, updateKnowledgeNote } from "@/server/knowledge/service";

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
