import { notFound } from "next/navigation";

import { KnowledgeNoteForm } from "@/components/knowledge/knowledge-note-form";
import { ShellLayout } from "@/components/shell/shell-layout";
import { getKnowledgeNoteBySlug } from "@/server/knowledge/service";

import { archiveKnowledgeNoteAction, updateKnowledgeNoteAction } from "../../new/actions";

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
      description="Update the note and preview the final reading view as you edit."
    >
      <section className="rounded-[3rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(245,243,239,0.78))] px-8 py-10 shadow-ambient md:px-12">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs uppercase tracking-[0.22em] text-primary/80">Knowledge Drafting</p>
            <h2 className="mt-5 font-headline text-6xl leading-none tracking-[-0.05em] text-foreground md:text-7xl">
              Refine this note
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-foreground/65">
              Adjust the structure here, then read it back in the preview before returning it to the index.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <form action={archiveKnowledgeNoteAction.bind(null, note.slug)}>
              <button type="submit" className="rounded-full bg-secondary-container px-5 py-3 text-sm font-semibold text-secondary">
                Archive
              </button>
            </form>
          </div>
        </div>
      </section>

      {resolvedSearchParams?.error === "invalid-content-json" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          The note content could not be prepared. Please try again.
        </section>
      ) : null}

      {resolvedSearchParams?.error === "save-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          The note could not be saved. Check the fields and try again.
        </section>
      ) : null}

      {resolvedSearchParams?.error === "delete-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          The note could not be archived. Please try again.
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
