import { ShellLayout } from "@/components/shell/shell-layout";
import { KnowledgeNoteForm } from "@/components/knowledge/knowledge-note-form";

import { createKnowledgeNoteAction } from "./actions";

function buildEmptyKnowledgeSeed() {
  return {
    title: "",
    summary: "",
    domainName: "",
    tags: "",
    content: JSON.stringify(
      [
        {
          type: "paragraph",
          content: "Start capturing the note here."
        }
      ],
      null,
      2
    )
  };
}

export default async function NewKnowledgeNotePage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <ShellLayout
      title="New Note"
      description="Capture a structured note with enough shape for domains, tags, linked writing, and later re-entry."
    >
      {resolvedSearchParams?.error === "invalid-content-json" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          The content JSON could not be parsed. Please fix the JSON structure and try again.
        </section>
      ) : null}

      {resolvedSearchParams?.error === "create-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          The note could not be created. Check the required fields and try again.
        </section>
      ) : null}

      <KnowledgeNoteForm
        action={createKnowledgeNoteAction}
        initialData={buildEmptyKnowledgeSeed()}
      />
    </ShellLayout>
  );
}