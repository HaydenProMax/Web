import Link from "next/link";
import { notFound } from "next/navigation";

import { ShellLayout } from "@/components/shell/shell-layout";
import { WritingDraftForm } from "@/components/writing/writing-draft-form";
import { getWritingDraftById } from "@/server/writing/service";

import { publishWritingDraftAction, updateWritingDraftAction } from "../../new/actions";

function formatTimestamp(value?: string) {
  if (!value) {
    return "Not yet available";
  }

  return new Date(value).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function WritingDraftDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ created?: string; saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const draft = await getWritingDraftById(id);

  if (!draft) {
    notFound();
  }

  const updateAction = updateWritingDraftAction.bind(null, draft.id);
  const publishAction = publishWritingDraftAction.bind(null, draft.id);

  return (
    <ShellLayout
      title={draft.title}
      description="Draft editing is now database-backed, so image uploads and video embeds can be iterated on without leaving the Writing module."
    >
      {resolvedSearchParams?.created === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Draft created successfully. It is now linked into the Writing workflow.
        </section>
      ) : null}

      {resolvedSearchParams?.saved === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Draft saved successfully. Your latest content JSON, image blocks, and video embeds are now stored in PostgreSQL.
        </section>
      ) : null}

      {resolvedSearchParams?.error === "invalid-content-json" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          The content JSON could not be parsed. Please fix the JSON structure and save again.
        </section>
      ) : null}

      {resolvedSearchParams?.error === "save-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          Saving the draft failed. The draft may not belong to the current user context anymore.
        </section>
      ) : null}

      {resolvedSearchParams?.error === "publish-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          Publishing failed. Please save the draft again and retry.
        </section>
      ) : null}

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Draft Control</p>
            <h2 className="font-headline text-3xl text-foreground">Manage the working version before it moves live</h2>
            <p className="max-w-3xl text-sm leading-6 text-foreground/70">
              This screen is the handoff point between note-driven ideation, media-rich drafting, and live publishing. Keep the draft stable here, then push changes forward when the article is ready.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Link href={`/planner/new?draft=${draft.id}`} className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary shadow-ambient">
              Create Task from Draft
            </Link>
            <form action={publishAction}>
              <button type="submit" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
                {draft.publishedPostSlug ? "Republish Draft" : "Publish Draft"}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Draft State</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">{draft.visibility}</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">{draft.contentBlockCount} rich-content blocks currently shape the article flow.</p>
          </article>

          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Last Save</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">{formatTimestamp(draft.updatedAt)}</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">Keep saving here while the structure, media, and story arc are still moving.</p>
          </article>

          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Source Context</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">{draft.sourceNoteTitle ?? "Standalone Draft"}</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">
              {draft.sourceNoteSlug ? "This draft is still anchored to a Knowledge note." : "This draft is currently running without a linked source note."}
            </p>
            {draft.sourceNoteSlug ? (
              <Link href={`/knowledge/${draft.sourceNoteSlug}`} className="mt-4 inline-flex text-sm font-semibold text-primary">
                Open source note
              </Link>
            ) : null}
          </article>

          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Live Article</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">{draft.publishedPostTitle ?? "Not published yet"}</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">
              {draft.publishedPostSlug ? `Last published ${formatTimestamp(draft.publishedAt)}.` : "Publish once to create the live article that this draft will continue to manage."}
            </p>
            {draft.publishedPostSlug ? (
              <Link href={`/writing/${draft.publishedPostSlug}`} className="mt-4 inline-flex text-sm font-semibold text-primary">
                Open live article
              </Link>
            ) : null}
          </article>
        </div>
      </section>

      <WritingDraftForm
        action={updateAction}
        mode="edit"
        initialData={{
          title: draft.title,
          summary: draft.summary,
          coverImageUrl: draft.coverImageUrl ?? "",
          sourceNoteSlug: draft.sourceNoteSlug ?? "",
          visibility: draft.visibility,
          content: JSON.stringify(draft.content, null, 2)
        }}
      />
    </ShellLayout>
  );
}
