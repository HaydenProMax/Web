import Image from "next/image";
import Link from "next/link";

import { ShellLayout } from "@/components/shell/shell-layout";
import { getWritingOverview, listPublishedWritingPosts, listWritingDrafts } from "@/server/writing/service";

import { archiveWritingDraftFromListAction, deleteArchivedWritingDraftFromListAction, restoreWritingDraftFromListAction } from "./new/actions";

function isProtectedLocalMediaUrl(value?: string) {
  return Boolean(value?.startsWith("/api/media/files/"));
}

function canUseNextImage(value?: string) {
  if (!value) {
    return false;
  }

  if (value.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}

function PostCover({
  coverImage,
  coverAlt,
  title,
  priority = false,
  heightClass = "min-h-[320px]"
}: {
  coverImage?: string;
  coverAlt: string;
  title: string;
  priority?: boolean;
  heightClass?: string;
}) {
  if (!coverImage) {
    return (
      <div
        className={`flex h-full ${heightClass} items-center justify-center bg-gradient-to-br from-primary-container/60 via-surface-container-low to-secondary-container/40 px-8 text-center`}
      >
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">No Cover Yet</p>
          <p className="font-headline text-3xl text-foreground">{title}</p>
        </div>
      </div>
    );
  }

  if (canUseNextImage(coverImage)) {
    return (
      <Image
        src={coverImage}
        alt={coverAlt || title}
        fill
        className="object-cover"
        sizes="(min-width: 1024px) 60vw, 100vw"
        priority={priority}
        unoptimized={isProtectedLocalMediaUrl(coverImage)}
      />
    );
  }

  return <img src={coverImage} alt={coverAlt || title} className="h-full w-full object-cover" />;
}

function formatCompactDate(value?: string) {
  if (!value) {
    return "Not scheduled yet";
  }

  return new Date(value).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function WritingPage({
  searchParams
}: {
  searchParams?: Promise<{
    created?: string;
    published?: string;
    archived?: string;
    restored?: string;
    destroyed?: string;
    deleted?: string;
    error?: string;
    view?: string;
    confirmDelete?: string;
  }>;
}) {
  const [overview, posts, resolvedSearchParams] = await Promise.all([
    getWritingOverview(),
    listPublishedWritingPosts(),
    searchParams ? searchParams : Promise.resolve(undefined)
  ]);
  const archivedView = resolvedSearchParams?.view === "archived";
  const drafts = await listWritingDrafts(archivedView ? 12 : 6, { archived: archivedView });
  const visibleDrafts = drafts.filter((draft) => !draft.publishedPostSlug);
  const hasDeleteTargetQuery = archivedView && Boolean(resolvedSearchParams?.confirmDelete);
  const confirmDeleteDraftId =
    archivedView && drafts.some((draft) => draft.id === resolvedSearchParams?.confirmDelete)
      ? resolvedSearchParams?.confirmDelete
      : undefined;
  const draftPendingDelete = confirmDeleteDraftId ? drafts.find((draft) => draft.id === confirmDeleteDraftId) : undefined;
  const invalidDeleteTarget = hasDeleteTargetQuery && !draftPendingDelete;

  return (
    <ShellLayout title="Writing" description="Drafts and published pieces live here.">
      {resolvedSearchParams?.created === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Draft created successfully. You can continue refining it in the draft list below.
        </section>
      ) : null}

      {resolvedSearchParams?.published === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Draft published successfully. The new article is now part of the Writing feed.
        </section>
      ) : null}

      {resolvedSearchParams?.archived === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Draft archived successfully.
        </section>
      ) : null}

      {resolvedSearchParams?.restored === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Draft restored successfully.
        </section>
      ) : null}

      {resolvedSearchParams?.destroyed === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Archived draft deleted permanently.
        </section>
      ) : null}

      {resolvedSearchParams?.deleted === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Published article deleted. The draft has been kept.
        </section>
      ) : null}

      {resolvedSearchParams?.error === "archive-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          Draft archiving failed. Please try again.
        </section>
      ) : null}

      {resolvedSearchParams?.error === "restore-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          Draft restore failed. Please try again.
        </section>
      ) : null}

      {resolvedSearchParams?.error === "confirm-delete-required" ? (
        <section className="rounded-[2rem] bg-amber-100 px-6 py-4 text-sm text-amber-800 shadow-ambient">
          Permanent delete requires a confirmation step.
        </section>
      ) : resolvedSearchParams?.error === "confirm-article-delete-required" ? (
        <section className="rounded-[2rem] bg-amber-100 px-6 py-4 text-sm text-amber-800 shadow-ambient">
          Article delete requires a confirmation step.
        </section>
      ) : resolvedSearchParams?.error === "delete-published-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          Published article delete failed. Please try again.
        </section>
      ) : resolvedSearchParams?.error === "permanent-delete-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          Permanent delete failed. Archived drafts that have already been published cannot be deleted.
        </section>
      ) : invalidDeleteTarget ? (
        <section className="rounded-[2rem] bg-amber-100 px-6 py-4 text-sm text-amber-800 shadow-ambient">
          The archived draft selected for permanent delete is no longer available.
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href={archivedView ? "/writing" : "/writing?view=archived"}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient"
        >
          {archivedView ? "Live Drafts" : `Archived Drafts (${overview.archivedDraftCount})`}
        </Link>
        {!archivedView ? (
          <Link href="/writing/new" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
            New Draft
          </Link>
        ) : null}
      </div>

      {draftPendingDelete ? (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-700">Delete Confirmation</p>
          <h2 className="mt-3 font-headline text-3xl text-foreground">Permanently delete this archived draft?</h2>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            <strong>{draftPendingDelete.title}</strong> will be permanently deleted. This action cannot be undone.
          </p>
          {draftPendingDelete.publishedPostSlug ? (
            <p className="mt-3 text-sm leading-6 text-rose-700">
              This archived draft has already been published and cannot be deleted permanently.
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!draftPendingDelete.publishedPostSlug ? (
              <form action={deleteArchivedWritingDraftFromListAction}>
                <input type="hidden" name="draftId" value={draftPendingDelete.id} />
                <input type="hidden" name="confirmed" value="true" />
                <button
                  type="submit"
                  className="rounded-full bg-rose-700 px-5 py-3 text-sm font-semibold text-white shadow-ambient"
                >
                  Confirm Permanent Delete
                </button>
              </form>
            ) : null}
            <Link href="/writing?view=archived" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
              Cancel
            </Link>
          </div>
        </section>
      ) : null}

      {archivedView ? (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-3xl">Archived Drafts</h2>
            <span className="text-sm text-foreground/50">{drafts.length} of {overview.archivedDraftCount}</span>
          </div>
          {drafts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {drafts.map((draft) => (
                <article key={draft.id} className="overflow-hidden rounded-[2rem] bg-surface-container-low shadow-ambient">
                  {draft.coverImageUrl ? (
                    <div className="relative h-52">
                      <PostCover coverImage={draft.coverImageUrl} coverAlt={draft.title} title={draft.title} heightClass="min-h-[208px]" />
                    </div>
                  ) : null}
                  <div className="p-6">
                    <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      <span>Archived</span>
                      <span>{draft.visibility}</span>
                    </div>
                    <h3 className="mt-3 font-headline text-2xl text-foreground">{draft.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-foreground/70">{draft.summary || "No summary yet."}</p>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-foreground/55">
                      <span>Updated {formatCompactDate(draft.updatedAt)}</span>
                      {draft.sourceNoteSlug ? <span>{draft.sourceNoteTitle ?? draft.sourceNoteSlug}</span> : null}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <form action={restoreWritingDraftFromListAction}>
                        <input type="hidden" name="draftId" value={draft.id} />
                        <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-ambient">
                          Restore
                        </button>
                      </form>
                      <Link
                        href={`/writing/drafts/${draft.id}`}
                        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-ambient"
                      >
                        Open
                      </Link>
                      {!draft.publishedPostSlug ? (
                        <Link
                          href={`/writing?view=archived&confirmDelete=${draft.id}`}
                          className="rounded-full bg-rose-700 px-4 py-2 text-sm font-semibold text-white shadow-ambient"
                        >
                          Delete
                        </Link>
                      ) : (
                        <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-foreground/50 shadow-ambient">
                          Published
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
              No archived drafts yet.
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-3xl">Recent Drafts</h2>
              <span className="text-sm text-foreground/50">{visibleDrafts.length} of {overview.draftCount}</span>
            </div>
            {visibleDrafts.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {visibleDrafts.map((draft) => (
                  <article key={draft.id} className="overflow-hidden rounded-[2rem] bg-surface-container-low shadow-ambient">
                    {draft.coverImageUrl ? (
                      <div className="relative h-52">
                        <PostCover coverImage={draft.coverImageUrl} coverAlt={draft.title} title={draft.title} heightClass="min-h-[208px]" />
                      </div>
                    ) : null}
                    <div className="p-6">
                      <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                        <span>{draft.visibility}</span>
                        <span>{draft.contentBlockCount} blocks</span>
                      </div>
                      <h3 className="mt-3 font-headline text-2xl text-foreground">{draft.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-foreground/70">{draft.summary || "No summary yet."}</p>
                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-foreground/55">
                        <span>Updated {formatCompactDate(draft.updatedAt)}</span>
                        {draft.sourceNoteSlug ? <span>{draft.sourceNoteTitle ?? draft.sourceNoteSlug}</span> : null}
                      </div>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                          href={`/writing/drafts/${draft.id}`}
                          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-ambient"
                        >
                          Edit draft
                        </Link>
                        <form action={archiveWritingDraftFromListAction}>
                          <input type="hidden" name="draftId" value={draft.id} />
                          <button
                            type="submit"
                            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-ambient"
                          >
                            Archive
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
                No live drafts yet. Create a draft to begin the writing workflow.
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-3xl">Recent Entries</h2>
              <span className="text-sm text-foreground/50">{posts.length} of {overview.publishedCount}</span>
            </div>
            {posts.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {posts.map((post, index) => (
                  <article key={post.id} className={`overflow-hidden rounded-[2rem] bg-surface-container-low shadow-ambient ${index === 0 ? "md:col-span-2" : ""}`}>
                    <div className={`relative ${index === 0 ? "h-72 lg:h-80" : "h-64"}`}>
                      <PostCover coverImage={post.coverImage} coverAlt={post.coverAlt} title={post.title} priority={index === 0} />
                    </div>
                    <div className="space-y-4 p-6">
                      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-primary">
                        <span>{post.category}</span>
                        <span>{post.readMinutes} min read</span>
                      </div>
                      <h3 className="font-headline text-2xl text-foreground">{post.title}</h3>
                      <p className="text-sm leading-6 text-foreground/70">{post.summary}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-foreground/55">
                        <span>{formatCompactDate(post.publishedAt)}</span>
                        {post.sourceDraftTitle ? <span>{post.sourceDraftTitle}</span> : null}
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm font-semibold text-primary">
                        <Link href={`/writing/${post.slug}`}>Open article</Link>
                        {post.sourceDraftId ? <Link href={`/writing/drafts/${post.sourceDraftId}`}>Open draft</Link> : null}
                        <Link href={`/writing/${post.slug}?confirmDelete=1`}>Delete article</Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
                No published articles yet. Publish a draft to create your first article.
              </div>
            )}
          </section>
        </>
      )}
    </ShellLayout>
  );
}





