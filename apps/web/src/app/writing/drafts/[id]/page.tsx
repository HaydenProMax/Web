import Link from "next/link";
import { notFound } from "next/navigation";

import { ShellLayout } from "@/components/shell/shell-layout";
import { WritingDraftForm } from "@/components/writing/writing-draft-form";
import { getWritingDraftById } from "@/server/writing/service";

import { archiveWritingDraftAction, publishWritingDraftAction, restoreWritingDraftAction, updateWritingDraftAction } from "../../new/actions";

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
  searchParams?: Promise<{ created?: string; saved?: string; restored?: string; error?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const draft = await getWritingDraftById(id);

  if (!draft) {
    notFound();
  }

  const updateAction = updateWritingDraftAction.bind(null, draft.id);
  const publishAction = publishWritingDraftAction.bind(null, draft.id);
  const archiveAction = archiveWritingDraftAction.bind(null, draft.id);
  const restoreAction = restoreWritingDraftAction.bind(null, draft.id);

  return (
    <ShellLayout
      title={draft.title}
      description="Edit the working draft, keep the structure stable, then publish when the article is ready."
    >
      {resolvedSearchParams?.created === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Draft created successfully. It is now linked into the Writing workflow.
        </section>
      ) : null}

      {resolvedSearchParams?.saved === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Draft saved successfully.
        </section>
      ) : null}

      {resolvedSearchParams?.restored === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Draft restored successfully. It is back in the active writing lane.
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

      {resolvedSearchParams?.error === "archive-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          Archiving the draft failed.
        </section>
      ) : null}

      {resolvedSearchParams?.error === "restore-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          Restoring the draft failed.
        </section>
      ) : null}

      {draft.isArchived ? (
        <section className="rounded-[2rem] bg-secondary-container/40 px-6 py-4 text-sm text-foreground shadow-ambient">
          This draft is archived. Restore it before editing or publishing again.
        </section>
      ) : null}

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Draft</p>
            <h2 className="font-headline text-3xl text-foreground">Keep editing here until it is ready to publish</h2>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <span>{draft.isArchived ? "ARCHIVED" : draft.visibility}</span>
              <span>{draft.contentBlockCount} blocks</span>
              <span>Saved {formatTimestamp(draft.updatedAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Link href="/writing?view=archived" className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary shadow-ambient">
              Archived Drafts
            </Link>
            {!draft.isArchived ? (
              <>
                <Link href={`/planner/new?draft=${draft.id}`} className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary shadow-ambient">
                  Create Task
                </Link>
                <form action={archiveAction}>
                  <button type="submit" className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary shadow-ambient">
                    Archive Draft
                  </button>
                </form>
                <form action={publishAction}>
                  <button type="submit" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
                    {draft.publishedPostSlug ? "Republish" : "Publish Draft"}
                  </button>
                </form>
              </>
            ) : (
              <form action={restoreAction}>
                <button type="submit" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
                  Restore Draft
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Source</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">{draft.sourceNoteTitle ?? "Standalone Draft"}</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">
              {draft.sourceNoteSlug ? "Linked to a knowledge note." : "No linked source note."}
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
              {draft.publishedPostSlug ? `Last published ${formatTimestamp(draft.publishedAt)}.` : "Publish this draft to create the live article."}
            </p>
            {draft.publishedPostSlug ? (
              <Link href={`/writing/${draft.publishedPostSlug}`} className="mt-4 inline-flex text-sm font-semibold text-primary">
                Open live article
              </Link>
            ) : null}
          </article>

          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Next Step</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">{draft.publishedPostSlug ? "Update and republish" : "Finish and publish"}</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">
              Save structural edits here, then publish when the title, summary, cover, and blocks are ready.
            </p>
          </article>
        </div>
      </section>

      {draft.isArchived ? (
        <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Archived Draft</p>
          <h2 className="mt-3 font-headline text-3xl text-foreground">Editing is paused while this draft is archived</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/70">
            Restore this draft to reopen the editor and publish changes again.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <form action={restoreAction}>
              <button type="submit" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
                Restore Draft
              </button>
            </form>
            <Link href="/writing?view=archived" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
              Back to Archived Drafts
            </Link>
          </div>
        </section>
      ) : (
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
      )}
    </ShellLayout>
  );
}
