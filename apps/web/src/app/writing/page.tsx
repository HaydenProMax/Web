import Image from "next/image";
import Link from "next/link";

import { ShellLayout } from "@/components/shell/shell-layout";
import { getPreferredActivityReentry } from "@/server/activity/preferences";
import { listPublishedWritingPosts, listWritingDrafts } from "@/server/writing/service";

function PostCover({ coverImage, coverAlt, title, priority = false }: { coverImage?: string; coverAlt: string; title: string; priority?: boolean }) {
  if (!coverImage) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-gradient-to-br from-primary-container/60 via-surface-container-low to-secondary-container/40 px-8 text-center">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">No Cover Yet</p>
          <p className="font-headline text-3xl text-foreground">{title}</p>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={coverImage}
      alt={coverAlt || title}
      fill
      className="object-cover"
      sizes="(min-width: 1024px) 60vw, 100vw"
      priority={priority}
    />
  );
}

type WritingTouch = {
  id: string;
  title: string;
  href: string;
  summary: string;
  timestamp: string;
  badge: string;
};

function buildWritingTouches(input: {
  drafts: Array<{ id: string; title: string; summary: string; updatedAt: string; visibility: string }>;
  posts: Array<{ id: string; slug: string; title: string; summary: string; publishedAt: string; category: string }>;
}) {
  return [
    ...input.drafts.map((draft) => ({
      id: `draft-${draft.id}`,
      title: draft.title,
      href: `/writing/drafts/${draft.id}`,
      summary: draft.summary || "Draft updated and ready for another pass.",
      timestamp: draft.updatedAt,
      badge: `Draft | ${draft.visibility}`
    })),
    ...input.posts.map((post) => ({
      id: `post-${post.id}`,
      title: post.title,
      href: `/writing/${post.slug}`,
      summary: post.summary || "Published entry ready for rereading.",
      timestamp: post.publishedAt,
      badge: `Published | ${post.category}`
    }))
  ].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()).slice(0, 8);
}

function formatTouchTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
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
  searchParams?: Promise<{ created?: string; published?: string }>;
}) {
  const [posts, drafts, activityReentry, resolvedSearchParams] = await Promise.all([
    listPublishedWritingPosts(),
    listWritingDrafts(),
    getPreferredActivityReentry(),
    searchParams ? searchParams : Promise.resolve(undefined)
  ]);
  const featuredPost = posts[0];
  const recentPosts = posts.slice(1);
  const writingTouches = buildWritingTouches({ drafts, posts });
  const draftsNeedingPublish = drafts.filter((draft) => !draft.publishedPostSlug).slice(0, 3);
  const publishedDrafts = drafts.filter((draft) => draft.publishedPostSlug).slice(0, 3);
  const sourceDrivenDrafts = drafts.filter((draft) => draft.sourceNoteSlug).slice(0, 3);

  return (
    <ShellLayout
      title="Writing"
      description="Writing is a rich-media content module. Drafts and published posts support images, cover art, video embeds, and source-note driven publishing flows."
    >
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

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href={activityReentry.href} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
          Resume {activityReentry.label} Lens
        </Link>
        <Link href="/writing/new" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
          New Draft
        </Link>
      </div>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Writing Control</p>
        <div className="mt-3 grid gap-5 xl:grid-cols-[1.05fr_0.95fr_0.95fr]">
          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Publish Queue</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">{draftsNeedingPublish.length} drafts still need a live pass</h2>
            <p className="mt-3 text-sm leading-6 text-foreground/70">Keep this lane focused on drafts that are structurally ready but have not been pushed into the live article feed yet.</p>
            <div className="mt-5 space-y-3">
              {draftsNeedingPublish.length > 0 ? draftsNeedingPublish.map((draft) => (
                <div key={draft.id} className="rounded-[1.25rem] bg-surface-container-low px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{draft.title}</p>
                      <p className="mt-1 text-xs text-foreground/55">Updated {formatCompactDate(draft.updatedAt)}</p>
                    </div>
                    <span className="rounded-full bg-primary-container/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      {draft.visibility}
                    </span>
                  </div>
                </div>
              )) : (
                <p className="rounded-[1.25rem] bg-surface-container-low px-4 py-3 text-sm leading-6 text-foreground/60">
                  No waiting drafts right now. The publish queue is clear.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Maintenance Lane</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">{publishedDrafts.length} drafts already back a live article</h2>
            <p className="mt-3 text-sm leading-6 text-foreground/70">Use this lane when you need to revise, republish, or keep published work aligned with the latest draft changes.</p>
            <div className="mt-5 space-y-3">
              {publishedDrafts.length > 0 ? publishedDrafts.map((draft) => (
                <div key={draft.id} className="rounded-[1.25rem] bg-surface-container-low px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{draft.title}</p>
                  <p className="mt-1 text-xs text-foreground/55">Live at /writing/{draft.publishedPostSlug}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-primary">
                    <Link href={`/writing/drafts/${draft.id}`}>Continue draft</Link>
                    {draft.publishedPostSlug ? <Link href={`/writing/${draft.publishedPostSlug}`}>Open article</Link> : null}
                  </div>
                </div>
              )) : (
                <p className="rounded-[1.25rem] bg-surface-container-low px-4 py-3 text-sm leading-6 text-foreground/60">
                  Nothing is in the live maintenance lane yet. Publish a draft to create a managed article in this lane.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Source Notes</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">{sourceDrivenDrafts.length} drafts were sparked by Knowledge</h2>
            <p className="mt-3 text-sm leading-6 text-foreground/70">This lane keeps note-originated writing visible so reflection, research, and publishing stay connected.</p>
            <div className="mt-5 space-y-3">
              {sourceDrivenDrafts.length > 0 ? sourceDrivenDrafts.map((draft) => (
                <div key={draft.id} className="rounded-[1.25rem] bg-surface-container-low px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{draft.title}</p>
                  <p className="mt-1 text-xs text-foreground/55">From {draft.sourceNoteTitle ?? draft.sourceNoteSlug}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-primary">
                    <Link href={`/writing/drafts/${draft.id}`}>Open draft</Link>
                    {draft.sourceNoteSlug ? <Link href={`/knowledge/${draft.sourceNoteSlug}`}>Open note</Link> : null}
                  </div>
                </div>
              )) : (
                <p className="rounded-[1.25rem] bg-surface-container-low px-4 py-3 text-sm leading-6 text-foreground/60">
                  No note-seeded drafts yet. Start a draft from Knowledge to create a connected writing thread.
                </p>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Replay Context</p>
        <h2 className="mt-3 font-headline text-3xl text-foreground">Writing can drop back into {activityReentry.label}</h2>
        <p className="mt-3 text-sm leading-6 text-foreground/70">When you need wider context than the editor or reading feed, jump back into the current replay lens and pick up the surrounding motion from there.</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={activityReentry.nextStep.href} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
            {activityReentry.nextStep.label}
          </Link>
          <p className="text-sm leading-6 text-foreground/60">{activityReentry.nextStep.description}</p>
        </div>
      </section>

      {featuredPost ? (
        <section className="overflow-hidden rounded-[2rem] bg-surface-container-low shadow-ambient">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_1fr]">
            <div className="relative min-h-[320px]">
              <PostCover coverImage={featuredPost.coverImage} coverAlt={featuredPost.coverAlt} title={featuredPost.title} priority />
            </div>
            <div className="flex flex-col justify-center gap-5 p-8 md:p-10">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Featured Entry</p>
              <div>
                <p className="text-sm font-semibold text-foreground/60">{featuredPost.category} | {featuredPost.readMinutes} min read</p>
                <h2 className="mt-3 font-headline text-4xl leading-tight text-foreground">
                  {featuredPost.title}
                </h2>
              </div>
              <p className="text-base leading-7 text-foreground/70">{featuredPost.summary}</p>
              <div className="flex flex-wrap gap-3 text-sm font-semibold text-primary">
                <Link href={`/writing/${featuredPost.slug}`} className="inline-flex w-fit rounded-full bg-primary px-6 py-3 text-white transition-opacity hover:opacity-90">
                  Read entry
                </Link>
                {featuredPost.sourceDraftId ? <Link href={`/writing/drafts/${featuredPost.sourceDraftId}`} className="inline-flex w-fit rounded-full bg-white px-5 py-3 shadow-ambient">Manage draft</Link> : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Drafts</p>
          <h3 className="mt-3 font-headline text-2xl">Database-backed drafts</h3>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            Draft creation and retrieval now use the dedicated project PostgreSQL database as the real source of truth.
          </p>
        </div>
        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Media</p>
          <h3 className="mt-3 font-headline text-2xl">Images and video</h3>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            Image upload metadata and video embeds are already supported, so drafts can carry real media from the start.
          </p>
        </div>
        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Publishing</p>
          <h3 className="mt-3 font-headline text-2xl">Live publishing</h3>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            Drafts can now be published into real database-backed posts that stay connected to their live management flow.
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Recent Touches</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">A live revision stream for drafts and published pieces</h2>
          </div>
          <span className="text-sm text-foreground/50">{writingTouches.length} recent writing events</span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {writingTouches.length > 0 ? writingTouches.map((item) => (
            <article key={item.id} className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{item.badge}</p>
                <p className="text-xs text-foreground/50">{formatTouchTime(item.timestamp)}</p>
              </div>
              <h3 className="mt-3 font-headline text-2xl text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-foreground/70">{item.summary}</p>
              <Link href={item.href} className="mt-4 inline-flex text-sm font-semibold text-primary">
                Re-open writing
              </Link>
            </article>
          )) : (
            <div className="rounded-[1.5rem] bg-white/80 p-4 text-sm text-foreground/60">
              No recent writing activity yet. Drafts and published pieces will appear here as soon as they start moving.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-3xl">Recent Drafts</h2>
          <span className="text-sm text-foreground/50">{drafts.length} draft records</span>
        </div>
        {drafts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {drafts.map((draft) => (
              <article key={draft.id} className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  <span>{draft.visibility}</span>
                  <span>{draft.contentBlockCount} blocks</span>
                  {draft.publishedPostSlug ? <span>Live article</span> : <span>Draft only</span>}
                </div>
                <h3 className="mt-3 font-headline text-2xl text-foreground">{draft.title}</h3>
                <p className="mt-3 text-sm leading-6 text-foreground/70">{draft.summary || "No summary yet."}</p>
                <div className="mt-4 space-y-2 text-xs text-foreground/55">
                  <p>Updated {new Date(draft.updatedAt).toLocaleString("zh-CN")}</p>
                  {draft.sourceNoteSlug ? <p>Source note: {draft.sourceNoteTitle ?? draft.sourceNoteSlug}</p> : null}
                  {draft.publishedPostSlug ? <p>Live at /writing/{draft.publishedPostSlug}</p> : null}
                </div>
                <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold text-primary">
                  <Link href={`/writing/drafts/${draft.id}`}>Open draft editor</Link>
                  {draft.publishedPostSlug ? <Link href={`/writing/${draft.publishedPostSlug}`}>Open article</Link> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
            No drafts yet. Create a draft to begin the writing workflow.
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-3xl">Recent Entries</h2>
          <span className="text-sm text-foreground/50">{posts.length} available posts</span>
        </div>
        {recentPosts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {recentPosts.map((post) => (
              <article key={post.id} className="overflow-hidden rounded-[2rem] bg-surface-container-low shadow-ambient">
                <div className="relative h-64">
                  <PostCover coverImage={post.coverImage} coverAlt={post.coverAlt} title={post.title} />
                </div>
                <div className="space-y-4 p-6">
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-primary">
                    <span>{post.category}</span>
                    <span>{post.readMinutes} min read</span>
                    {post.versionCount ? <span>{post.versionCount} versions</span> : null}
                  </div>
                  <h3 className="font-headline text-2xl text-foreground">{post.title}</h3>
                  <p className="text-sm leading-6 text-foreground/70">{post.summary}</p>
                  <div className="space-y-1 text-xs text-foreground/55">
                    <p>Published {formatCompactDate(post.publishedAt)}</p>
                    {post.sourceDraftTitle ? <p>Managed from draft: {post.sourceDraftTitle}</p> : null}
                    {post.sourceNoteSlug ? <p>Originated from note: {post.sourceNoteTitle ?? post.sourceNoteSlug}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm font-semibold text-primary">
                    <Link href={`/writing/${post.slug}`}>Open article</Link>
                    {post.sourceDraftId ? <Link href={`/writing/drafts/${post.sourceDraftId}`}>Manage draft</Link> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
            {featuredPost
              ? "Only the featured entry is live right now. Publish another draft to expand the recent entry stream."
              : "No published entries yet. Publish a draft to start the live reading feed."}
          </div>
        )}
      </section>
    </ShellLayout>
  );
}
