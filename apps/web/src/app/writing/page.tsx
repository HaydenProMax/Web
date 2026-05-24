import Image from "next/image";
import Link from "next/link";

import { ShellLayout } from "@/components/shell/shell-layout";
import { WritingFeedbackToast } from "@/components/writing/writing-feedback-toast";
import { getSettingsSnapshot, getShellIdentity } from "@/server/settings/service";
import { getWritingOverview, listPublishedWritingPosts, listWritingDrafts } from "@/server/writing/service";

import { archiveWritingDraftFromListAction, deleteArchivedWritingDraftFromListAction, restoreWritingDraftFromListAction } from "./new/actions";

type FeedFilter = "all" | "posts" | "drafts";
type WritingDraftSummary = Awaited<ReturnType<typeof listWritingDrafts>>[number];
type WritingPostSummary = Awaited<ReturnType<typeof listPublishedWritingPosts>>[number];

type WritingSearchParams = {
  created?: string;
  published?: string;
  archived?: string;
  restored?: string;
  destroyed?: string;
  deleted?: string;
  error?: string;
  view?: string;
  feed?: string;
  confirmDelete?: string;
};

type FeedItem =
  | {
      kind: "post";
      id: string;
      title: string;
      summary: string;
      coverImage?: string;
      coverAlt: string;
      timestamp: string;
      href: string;
      readMinutes: number;
      visibility: string;
      sourceDraftId?: string;
      sourceDraftTitle?: string;
    }
  | {
      kind: "draft";
      id: string;
      title: string;
      summary: string;
      coverImage?: string;
      coverAlt: string;
      timestamp: string;
      href: string;
      blockCount: number;
      visibility: string;
      sourceNoteSlug?: string;
      sourceNoteTitle?: string;
    };

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
  heightClass = "min-h-[260px]",
  sizes = "(min-width: 1280px) 24vw, (min-width: 768px) 45vw, 100vw"
}: {
  coverImage?: string;
  coverAlt: string;
  title: string;
  priority?: boolean;
  heightClass?: string;
  sizes?: string;
}) {
  if (!coverImage) {
    return (
      <div
        className={`flex h-full ${heightClass} items-center justify-center bg-gradient-to-br from-primary-container/60 via-surface-container-low to-secondary-container/40 px-6 text-center`}
      >
        <div className="space-y-3">
          <p className="font-headline text-2xl leading-tight text-foreground">{title}</p>
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
        sizes={sizes}
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

function resolveFeedFilter(value?: string): FeedFilter {
  if (value === "posts" || value === "drafts") {
    return value;
  }

  return "all";
}

function buildFeedItems(posts: WritingPostSummary[], drafts: WritingDraftSummary[], feed: FeedFilter): FeedItem[] {
  const items: FeedItem[] = [
    ...posts.map((post) => ({
      kind: "post" as const,
      id: post.id,
      title: post.title,
      summary: post.summary,
      coverImage: post.coverImage,
      coverAlt: post.coverAlt,
      timestamp: post.publishedAt,
      href: `/writing/${post.slug}`,
      readMinutes: post.readMinutes,
      visibility: post.visibility,
      sourceDraftId: post.sourceDraftId,
      sourceDraftTitle: post.sourceDraftTitle
    })),
    ...drafts.map((draft) => ({
      kind: "draft" as const,
      id: draft.id,
      title: draft.title,
      summary: draft.summary,
      coverImage: draft.coverImageUrl,
      coverAlt: draft.title,
      timestamp: draft.updatedAt,
      href: `/writing/drafts/${draft.id}`,
      blockCount: draft.contentBlockCount,
      visibility: draft.visibility,
      sourceNoteSlug: draft.sourceNoteSlug,
      sourceNoteTitle: draft.sourceNoteTitle
    }))
  ];

  return items
    .filter((item) => feed === "all" || (feed === "posts" ? item.kind === "post" : item.kind === "draft"))
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
}

function getNoticeItems(params: WritingSearchParams | undefined, invalidDeleteTarget: boolean) {
  const notices: Array<{ tone: "success" | "warning" | "error"; text: string }> = [];

  if (params?.created === "1") {
    notices.push({ tone: "success", text: "Draft created successfully. You can continue refining it in the feed below." });
  }
  if (params?.published === "1") {
    notices.push({ tone: "success", text: "Draft published successfully. The new article is now part of the Writing feed." });
  }
  if (params?.archived === "1") {
    notices.push({ tone: "success", text: "Draft archived successfully." });
  }
  if (params?.restored === "1") {
    notices.push({ tone: "success", text: "Draft restored successfully." });
  }
  if (params?.destroyed === "1") {
    notices.push({ tone: "success", text: "Draft deleted permanently." });
  }
  if (params?.deleted === "1") {
    notices.push({
      tone: "success",
      text:
        params?.destroyed === "1"
          ? "Published article deleted."
          : "Published article deleted. The draft has been kept."
    });
  }
  if (params?.error === "archive-failed") {
    notices.push({ tone: "error", text: "Draft archiving failed. Please try again." });
  }
  if (params?.error === "restore-failed") {
    notices.push({ tone: "error", text: "Draft restore failed. Please try again." });
  }
  if (params?.error === "confirm-delete-required") {
    notices.push({ tone: "warning", text: "Permanent delete requires a confirmation step." });
  }
  if (params?.error === "confirm-article-delete-required") {
    notices.push({ tone: "warning", text: "Article delete requires a confirmation step." });
  }
  if (params?.error === "delete-published-failed") {
    notices.push({ tone: "error", text: "Published article delete failed. Please try again." });
  }
  if (params?.error === "permanent-delete-failed") {
    notices.push({ tone: "error", text: "Permanent delete failed. Archived drafts that have already been published cannot be deleted." });
  }
  if (invalidDeleteTarget) {
    notices.push({ tone: "warning", text: "The archived draft selected for permanent delete is no longer available." });
  }

  return notices;
}

function feedTabClassName(active: boolean) {
  return active
    ? "rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-white"
    : "rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-foreground/70 ring-1 ring-outline-variant/25 transition-colors hover:text-primary";
}

function FeedCard({
  item,
  priority,
  authorName,
  authorAvatarUrl,
  authorInitials
}: {
  item: FeedItem;
  priority: boolean;
  authorName: string;
  authorAvatarUrl?: string;
  authorInitials: string;
}) {
  return (
    <article className="flex h-full flex-col">
      <Link
        href={item.href}
        aria-label={item.kind === "post" ? `Open post: ${item.title}` : `Edit draft: ${item.title}`}
        className="relative block aspect-[4/5] cursor-pointer overflow-hidden rounded-[1.15rem] bg-surface-container-low transition-opacity hover:opacity-95"
      >
        <PostCover
          coverImage={item.coverImage}
          coverAlt={item.coverAlt}
          title={item.title}
          priority={priority}
          heightClass="min-h-full"
        />
        <span className="absolute right-3 top-3 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary shadow-sm backdrop-blur">
          {item.kind === "post" ? "Post" : "Draft"}
        </span>
      </Link>

      <div className="mt-3 space-y-2 px-1">
        <Link href={item.href}>
          <h3 className="line-clamp-2 min-h-12 text-[16px] leading-6 text-foreground transition-colors hover:text-primary">{item.title}</h3>
        </Link>

        <div className="flex items-center gap-2 text-sm text-foreground/55">
          <div className="flex min-w-0 items-center gap-2">
            {authorAvatarUrl ? (
              <img src={authorAvatarUrl} alt={authorName} className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-[10px] font-semibold text-primary">
                {authorInitials}
              </span>
            )}
            <span className="truncate">{authorName}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-foreground/45">
          <span>{formatCompactDate(item.timestamp)}</span>
          {item.kind === "post" ? (
            <>
              <Link href={item.href} className="text-primary">Open</Link>
              {item.sourceDraftId ? (
                <Link href={`/writing/drafts/${item.sourceDraftId}`} className="text-primary">Draft</Link>
              ) : null}
              <Link href={`${item.href}?confirmDelete=1`} className="text-rose-700">
                Delete
              </Link>
            </>
          ) : (
            <>
            <Link href={item.href} className="text-primary">Edit</Link>
            <form action={archiveWritingDraftFromListAction}>
              <input type="hidden" name="draftId" value={item.id} />
              <button
                type="submit"
                className="font-semibold text-primary"
              >
                Archive
              </button>
            </form>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function ArchivedDraftCard({ draft }: { draft: WritingDraftSummary }) {
  return (
    <article className="flex h-full flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.15rem] bg-surface-container-low">
        <PostCover coverImage={draft.coverImageUrl} coverAlt={draft.title} title={draft.title} heightClass="min-h-full" />
        <span className="absolute right-3 top-3 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary shadow-sm backdrop-blur">
          Archived
        </span>
      </div>
      <div className="mt-3 space-y-2 px-1">
        <h3 className="line-clamp-2 min-h-12 text-[16px] leading-6 text-foreground">{draft.title}</h3>
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-foreground/45">
          <span>{formatCompactDate(draft.updatedAt)}</span>
          <span>{draft.contentBlockCount} blocks</span>
          <form action={restoreWritingDraftFromListAction}>
            <input type="hidden" name="draftId" value={draft.id} />
            <button type="submit" className="font-semibold text-primary">
              Restore
            </button>
          </form>
          <Link href={`/writing/drafts/${draft.id}`} className="text-primary">
            Open
          </Link>
          {!draft.publishedPostSlug ? (
            <Link href={`/writing?view=archived&confirmDelete=${draft.id}`} className="text-rose-700">
              Delete
            </Link>
          ) : (
            <span>Published</span>
          )}
        </div>
      </div>
    </article>
  );
}

export default async function WritingPage({
  searchParams
}: {
  searchParams?: Promise<WritingSearchParams>;
}) {
  const [overview, posts, resolvedSearchParams, identity, settingsSnapshot] = await Promise.all([
    getWritingOverview(),
    listPublishedWritingPosts(),
    searchParams ? searchParams : Promise.resolve(undefined),
    getShellIdentity(),
    getSettingsSnapshot()
  ]);

  const archivedView = resolvedSearchParams?.view === "archived";
  const activeFeed = resolveFeedFilter(resolvedSearchParams?.feed);
  const drafts = await listWritingDrafts(archivedView ? 12 : 12, { archived: archivedView });
  const visibleDrafts = drafts.filter((draft) => !draft.publishedPostSlug);
  const feedItems = buildFeedItems(posts, visibleDrafts, activeFeed);
  const hasDeleteTargetQuery = archivedView && Boolean(resolvedSearchParams?.confirmDelete);
  const confirmDeleteDraftId =
    archivedView && drafts.some((draft) => draft.id === resolvedSearchParams?.confirmDelete)
      ? resolvedSearchParams?.confirmDelete
      : undefined;
  const draftPendingDelete = confirmDeleteDraftId ? drafts.find((draft) => draft.id === confirmDeleteDraftId) : undefined;
  const invalidDeleteTarget = hasDeleteTargetQuery && !draftPendingDelete;
  const noticeItems = getNoticeItems(resolvedSearchParams, invalidDeleteTarget);

  return (
    <ShellLayout title="Writing" description="Drafts and published pieces live here.">
      <WritingFeedbackToast items={noticeItems} />

      <section className="overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-outline-variant/20">
        <div className="bg-white px-6 py-8 md:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end">
              {identity.avatarUrl ? (
                <img src={identity.avatarUrl} alt={identity.label} className="h-20 w-20 rounded-full object-cover ring-1 ring-outline-variant/25" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-low text-3xl font-semibold text-primary ring-1 ring-outline-variant/25">
                  {identity.initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Personal Writing</p>
                <h2 className="mt-2 text-3xl font-semibold leading-tight text-foreground">{identity.label}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/65">{settingsSnapshot.preferences.workspaceMotto}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[360px]">
              <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
                <p className="text-2xl font-semibold text-foreground">{overview.publishedCount}</p>
                <p className="text-xs text-foreground/55">Posts</p>
              </div>
              <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
                <p className="text-2xl font-semibold text-foreground">{overview.draftCount}</p>
                <p className="text-xs text-foreground/55">Drafts</p>
              </div>
              <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
                <p className="text-2xl font-semibold text-foreground">{overview.archivedDraftCount}</p>
                <p className="text-xs text-foreground/55">Archived</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 md:px-8">
          <div className="flex flex-wrap gap-3">
            <Link href="/writing" className={feedTabClassName(!archivedView && activeFeed === "all")}>
              All
            </Link>
            <Link href="/writing?feed=posts" className={feedTabClassName(!archivedView && activeFeed === "posts")}>
              Published
            </Link>
            <Link href="/writing?feed=drafts" className={feedTabClassName(!archivedView && activeFeed === "drafts")}>
              Drafts
            </Link>
            <Link href="/writing?view=archived" className={feedTabClassName(archivedView)}>
              Archived
            </Link>
          </div>

          <div className="flex flex-wrap gap-3">
            {archivedView ? (
              <Link href="/writing" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary ring-1 ring-outline-variant/25">
                Live Feed
              </Link>
            ) : null}
            {!archivedView ? (
              <Link href="/writing/new" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white">
                New Draft
              </Link>
            ) : null}
          </div>
        </div>
      </section>

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Archived Drafts</p>
              <h2 className="mt-2 font-headline text-3xl text-foreground">Saved away for later</h2>
            </div>
            <span className="text-sm text-foreground/50">{drafts.length} of {overview.archivedDraftCount}</span>
          </div>
          {drafts.length > 0 ? (
            <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
              {drafts.map((draft) => (
                <ArchivedDraftCard key={draft.id} draft={draft} />
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
              No archived drafts yet.
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Writing Feed</p>
              <h2 className="mt-2 font-headline text-3xl text-foreground">
                {activeFeed === "posts" ? "Published notes" : activeFeed === "drafts" ? "Drafts in progress" : "Latest writing motion"}
              </h2>
            </div>
            <span className="text-sm text-foreground/50">{feedItems.length} visible cards</span>
          </div>

          {feedItems.length > 0 ? (
            <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
              {feedItems.map((item, index) => (
                <FeedCard
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  priority={index === 0}
                  authorName={identity.label}
                  authorAvatarUrl={identity.avatarUrl}
                  authorInitials={identity.initials}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
              {activeFeed === "posts"
                ? "No published articles yet. Publish a draft to create your first article."
                : activeFeed === "drafts"
                  ? "No live drafts yet. Create a draft to begin the writing workflow."
                  : "No writing activity yet. Create a draft to begin the feed."}
            </div>
          )}
        </section>
      )}
    </ShellLayout>
  );
}
