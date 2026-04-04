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
    <ShellLayout
      title="New Draft"
      description="Start a rich-media draft that can grow from a source note, hold images and video embeds, and move cleanly into the live writing feed when it is ready."
    >
      {resolvedSearchParams?.error === "invalid-content-json" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          The content JSON could not be parsed. Please fix the JSON structure and try again.
        </section>
      ) : null}

      {resolvedSearchParams?.error === "create-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          The draft could not be created. Check the title, summary, media links, and content blocks, then try again.
        </section>
      ) : null}
      {sourceNote ? (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] bg-primary-container/30 px-6 py-4 text-sm text-primary shadow-ambient">
          <p>
            This draft will be linked back to <span className="font-semibold">{sourceNote.title}</span> in Knowledge.
          </p>
          <Link href={`/knowledge/${sourceNote.slug}`} className="font-semibold underline">
            Open source note
          </Link>
        </section>
      ) : null}

      <WritingDraftForm
        action={createWritingDraftAction}
        mode="create"
        initialData={initialData}
      />
    </ShellLayout>
  );
}