import Link from "next/link";
import { notFound } from "next/navigation";

import { ShellLayout } from "@/components/shell/shell-layout";
import { WritingDraftForm } from "@/components/writing/writing-draft-form";
import { WritingFeedbackToast } from "@/components/writing/writing-feedback-toast";
import { getWritingDraftById } from "@/server/writing/service";

import { archiveWritingDraftAction, deleteWritingDraftAction, publishWritingDraftAction, restoreWritingDraftAction, updateWritingDraftAction } from "../../new/actions";

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
  searchParams?: Promise<{ confirmDelete?: string; created?: string; saved?: string; restored?: string; error?: string }>;
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
  const deleteAction = deleteWritingDraftAction.bind(null, draft.id);
  const confirmDelete = resolvedSearchParams?.confirmDelete === "1";
  const canDeleteDraft = !draft.publishedPostSlug;
  const toastItems = [
    ...(resolvedSearchParams?.created === "1"
      ? [{ tone: "success" as const, text: "Draft created successfully. It is now linked into the Writing workflow." }]
      : []),
    ...(resolvedSearchParams?.saved === "1"
      ? [{ tone: "success" as const, text: "Draft saved successfully." }]
      : []),
    ...(resolvedSearchParams?.restored === "1"
      ? [{ tone: "success" as const, text: "Draft restored successfully. It is back in the active writing lane." }]
      : []),
    ...(resolvedSearchParams?.error === "invalid-content-json"
      ? [{ tone: "error" as const, text: "The content JSON could not be parsed. Please fix the JSON structure and save again." }]
      : []),
    ...(resolvedSearchParams?.error === "save-failed"
      ? [{ tone: "error" as const, text: "Saving the draft failed. The draft may not belong to the current user context anymore." }]
      : []),
    ...(resolvedSearchParams?.error === "publish-failed"
      ? [{ tone: "error" as const, text: "Publishing failed. Please save the draft again and retry." }]
      : []),
    ...(resolvedSearchParams?.error === "archive-failed"
      ? [{ tone: "error" as const, text: "Archiving the draft failed." }]
      : []),
    ...(resolvedSearchParams?.error === "restore-failed"
      ? [{ tone: "error" as const, text: "Restoring the draft failed." }]
      : []),
    ...(resolvedSearchParams?.error === "confirm-delete-required"
      ? [{ tone: "warning" as const, text: "Draft delete requires a confirmation step." }]
      : []),
    ...(resolvedSearchParams?.error === "delete-failed"
      ? [{ tone: "error" as const, text: "Deleting the draft failed. Published drafts cannot be deleted directly." }]
      : [])
  ];

  return (
    <ShellLayout
      title={draft.title}
      description="Edit the working draft, keep the structure stable, then publish when the article is ready."
    >
      <WritingFeedbackToast items={toastItems} />

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
                {canDeleteDraft ? (
                  <Link href={`/writing/drafts/${draft.id}?confirmDelete=1`} className="inline-flex rounded-full bg-rose-700 px-5 py-2 text-sm font-semibold text-white shadow-ambient">
                    Delete Draft
                  </Link>
                ) : null}
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
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Published Article</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">{draft.publishedPostTitle ?? "Not published yet"}</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">
              {draft.publishedPostSlug ? `Last published ${formatTimestamp(draft.publishedAt)}.` : "Publish this draft to create the article."}
            </p>
            {draft.publishedPostSlug ? (
              <Link href={`/writing/${draft.publishedPostSlug}`} className="mt-4 inline-flex text-sm font-semibold text-primary">
                Open article
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

      {confirmDelete && canDeleteDraft ? (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-700">Delete Confirmation</p>
          <h2 className="mt-3 font-headline text-3xl text-foreground">Permanently delete this draft?</h2>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            <strong>{draft.title}</strong> will be deleted. Uploaded media that is not used by another draft or article will also be removed from storage.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <form action={deleteAction}>
              <input type="hidden" name="confirmed" value="true" />
              <button type="submit" className="rounded-full bg-rose-700 px-5 py-3 text-sm font-semibold text-white shadow-ambient">
                Confirm Delete Draft
              </button>
            </form>
            <Link href={`/writing/drafts/${draft.id}`} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
              Cancel
            </Link>
          </div>
        </section>
      ) : null}

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
          draftId={draft.id}
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
