import Link from "next/link";

import { ShellLayout } from "@/components/shell/shell-layout";
import { WritingDraftForm } from "@/components/writing/writing-draft-form";
import { getKnowledgeNoteBySlug } from "@/server/knowledge/service";

import { createWritingDraftAction } from "./actions";

function buildDraftSeedFromNote(note: NonNullable<Awaited<ReturnType<typeof getKnowledgeNoteBySlug>>>) {
  return {
    title: `${note.title} Draft`,
    summary: note.summary || `A writing thread grown from the note '${note.title}'.`,
    coverImageUrl: "",
    sourceNoteSlug: note.slug,
    visibility: "PRIVATE" as const,
    content: JSON.stringify(
      [
        {
          type: "paragraph",
          content: `This draft grows out of the knowledge note '${note.title}'.`
        },
        ...note.content
      ],
      null,
      2
    )
  };
}

function buildEmptyDraftSeed() {
  return {
    title: "",
    summary: "",
    coverImageUrl: "",
    sourceNoteSlug: "",
    visibility: "PRIVATE" as const,
    content: JSON.stringify(
      [
        {
          type: "paragraph",
          content: "Start writing here."
        }
      ],
      null,
      2
    )
  };
}

export default async function NewWritingDraftPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; sourceNote?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const sourceNoteSlug = resolvedSearchParams?.sourceNote ?? "";
  const sourceNote = sourceNoteSlug ? await getKnowledgeNoteBySlug(sourceNoteSlug) : undefined;
  const initialData = sourceNote ? buildDraftSeedFromNote(sourceNote) : buildEmptyDraftSeed();

  return (
    <ShellLayout title="New Draft" description="Start a draft, shape the structure, and publish when it is ready.">
      {resolvedSearchParams?.error === "invalid-content-json" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          The content JSON could not be parsed. Please fix the JSON structure and try again.
        </section>
      ) : null}

      {resolvedSearchParams?.error === "create-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          The draft could not be created. Check the title, summary, and content blocks, then try again.
        </section>
      ) : null}

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">New Draft</p>
            <h2 className="font-headline text-3xl text-foreground">Start the working version here</h2>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <span>PRIVATE</span>
              <span>{sourceNote ? "Knowledge-linked" : "Standalone"}</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Link href="/writing" className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary shadow-ambient">
              Back to Writing
            </Link>
            {sourceNote ? (
              <Link href={`/knowledge/${sourceNote.slug}`} className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary shadow-ambient">
                Open Source Note
              </Link>
            ) : null}
          </div>
        </div>

        {sourceNote ? (
          <div className="mt-6 rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Source</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">{sourceNote.title}</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">This draft starts from the linked knowledge note.</p>
          </div>
        ) : null}
      </section>

      <WritingDraftForm action={createWritingDraftAction} mode="create" initialData={initialData} />
    </ShellLayout>
  );
}
