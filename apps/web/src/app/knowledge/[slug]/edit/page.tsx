import { notFound } from "next/navigation";

import { KnowledgeNoteForm } from "@/components/knowledge/knowledge-note-form";
import { ShellLayout } from "@/components/shell/shell-layout";
import { getKnowledgeNoteBySlug } from "@/server/knowledge/service";

import { updateKnowledgeNoteAction } from "../../new/actions";

export default async function EditKnowledgeNotePage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const note = await getKnowledgeNoteBySlug(resolvedParams.slug);

  if (!note) {
    notFound();
  }

  return (
    <ShellLayout
      title={`Edit ${note.title}`}
      description="Knowledge editing uses the same structured note model as creation, so changes stay inside the module while preserving domains, tags, and reading flow."
    >
      {resolvedSearchParams?.error === "invalid-content-json" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          The content JSON could not be parsed. Please fix the JSON structure and try again.
        </section>
      ) : null}

      {resolvedSearchParams?.error === "save-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          The note could not be saved. Check the fields and try again.
        </section>
      ) : null}

      <KnowledgeNoteForm
        action={updateKnowledgeNoteAction.bind(null, note.slug)}
        mode="edit"
        initialData={{
          title: note.title,
          summary: note.summary,
          domainName: note.domainName ?? "",
          tags: note.tags.join(", "),
          content: JSON.stringify(note.content, null, 2)
        }}
      />
    </ShellLayout>
  );
}
