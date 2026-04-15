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
          type: "markdown",
          content: "# Untitled Note\n\nStart capturing the note here."
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
      description="Capture a note with blocks, tags, and live preview."
    >
      <section className="rounded-[3rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(245,243,239,0.78))] px-8 py-10 shadow-ambient md:px-12">
        <div className="max-w-4xl">
          <p className="text-xs uppercase tracking-[0.22em] text-primary/80">Knowledge Drafting</p>
          <h2 className="mt-5 font-headline text-6xl leading-none tracking-[-0.05em] text-foreground md:text-7xl">
            Start a new note
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-8 text-foreground/65">
            Capture the idea first, then shape it with context, structure, and links to the rest of your workspace.
          </p>
        </div>
      </section>

      {resolvedSearchParams?.error === "invalid-content-json" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          The note content could not be prepared. Please try again.
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
