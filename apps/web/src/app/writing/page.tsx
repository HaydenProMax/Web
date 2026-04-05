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
          <p className="text-xs uppercase tracking-[0.2em] text-primary">暂无封面</p>
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
      summary: draft.summary || "草稿已更新，可以继续打磨。",
      timestamp: draft.updatedAt,
      badge: `鑽夌 | ${draft.visibility}`
    })),
    ...input.posts.map((post) => ({
      id: `post-${post.id}`,
      title: post.title,
      href: `/writing/${post.slug}`,
      summary: post.summary || "已发布内容可继续回看。",
      timestamp: post.publishedAt,
      badge: `已发布 | ${post.category}`
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
    return "尚未安排";
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
      title="写作"
      description="写作是富媒体内容模块。草稿与已发布文章支持图片、封面、视频嵌入，以及由来源笔记驱动的发布链路。"
    >
      {resolvedSearchParams?.created === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          草稿创建成功，你可以在下方草稿列表中继续完善。
        </section>
      ) : null}

      {resolvedSearchParams?.published === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          草稿发布成功，新文章已经进入写作内容流。
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href={activityReentry.href} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
          回到{activityReentry.label}视角
        </Link>
        <Link href="/writing/new" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
          新建草稿
        </Link>
      </div>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">写作控制</p>
        <div className="mt-3 grid gap-5 xl:grid-cols-[1.05fr_0.95fr_0.95fr]">
          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">发布队列</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">{draftsNeedingPublish.length} 篇草稿仍待正式发布</h2>
            <p className="mt-3 text-sm leading-6 text-foreground/70">这里聚焦那些结构已经准备好、但还没推进入正式文章流的草稿。</p>
            <div className="mt-5 space-y-3">
              {draftsNeedingPublish.length > 0 ? draftsNeedingPublish.map((draft) => (
                <div key={draft.id} className="rounded-[1.25rem] bg-surface-container-low px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{draft.title}</p>
                      <p className="mt-1 text-xs text-foreground/55">更新于 {formatCompactDate(draft.updatedAt)}</p>
                    </div>
                    <span className="rounded-full bg-primary-container/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      {draft.visibility}
                    </span>
                  </div>
                </div>
              )) : (
                <p className="rounded-[1.25rem] bg-surface-container-low px-4 py-3 text-sm leading-6 text-foreground/60">
                  当前没有待发布草稿，发布队列是空的。
                </p>
              )}
            </div>
          </article>

          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">维护通道</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">{publishedDrafts.length} 篇草稿已经连接线上文章</h2>
            <p className="mt-3 text-sm leading-6 text-foreground/70">当你需要修订、重发，或让已发布内容继续和最新草稿保持一致时，就看这条通道。</p>
            <div className="mt-5 space-y-3">
              {publishedDrafts.length > 0 ? publishedDrafts.map((draft) => (
                <div key={draft.id} className="rounded-[1.25rem] bg-surface-container-low px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{draft.title}</p>
                  <p className="mt-1 text-xs text-foreground/55">线上地址 /writing/{draft.publishedPostSlug}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-primary">
                    <Link href={`/writing/drafts/${draft.id}`}>继续编辑草稿</Link>
                    {draft.publishedPostSlug ? <Link href={`/writing/${draft.publishedPostSlug}`}>打开文章</Link> : null}
                  </div>
                </div>
              )) : (
                <p className="rounded-[1.25rem] bg-surface-container-low px-4 py-3 text-sm leading-6 text-foreground/60">
                  当前维护通道还是空的。发布一篇草稿后，这里就会出现可持续管理的线上文章。
                </p>
              )}
            </div>
          </article>

          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">来源笔记</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">{sourceDrivenDrafts.length} 篇草稿来自知识库</h2>
            <p className="mt-3 text-sm leading-6 text-foreground/70">这条通道会保留由笔记衍生出的写作，让思考、研究和发布维持连接。</p>
            <div className="mt-5 space-y-3">
              {sourceDrivenDrafts.length > 0 ? sourceDrivenDrafts.map((draft) => (
                <div key={draft.id} className="rounded-[1.25rem] bg-surface-container-low px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{draft.title}</p>
                  <p className="mt-1 text-xs text-foreground/55">来源：{draft.sourceNoteTitle ?? draft.sourceNoteSlug}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-primary">
                    <Link href={`/writing/drafts/${draft.id}`}>打开草稿</Link>
                    {draft.sourceNoteSlug ? <Link href={`/knowledge/${draft.sourceNoteSlug}`}>打开笔记</Link> : null}
                  </div>
                </div>
              )) : (
                <p className="rounded-[1.25rem] bg-surface-container-low px-4 py-3 text-sm leading-6 text-foreground/60">
                  当前还没有由笔记触发的草稿。从知识库发起草稿后，这里才会形成关联写作线程。
                </p>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">回放上下文</p>
        <h2 className="mt-3 font-headline text-3xl text-foreground">写作可以回到{activityReentry.label}</h2>
        <p className="mt-3 text-sm leading-6 text-foreground/70">当你需要比编辑器或阅读流更宽的上下文时，就回到当前回放视角，从那里继续接上整体动态。</p>
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
              <p className="text-xs uppercase tracking-[0.2em] text-primary">重点条目</p>
              <div>
                <p className="text-sm font-semibold text-foreground/60">{featuredPost.category} | {featuredPost.readMinutes} 分钟阅读</p>
                <h2 className="mt-3 font-headline text-4xl leading-tight text-foreground">
                  {featuredPost.title}
                </h2>
              </div>
              <p className="text-base leading-7 text-foreground/70">{featuredPost.summary}</p>
              <div className="flex flex-wrap gap-3 text-sm font-semibold text-primary">
                <Link href={`/writing/${featuredPost.slug}`} className="inline-flex w-fit rounded-full bg-primary px-6 py-3 text-white transition-opacity hover:opacity-90">
                  阅读文章
                </Link>
                {featuredPost.sourceDraftId ? <Link href={`/writing/drafts/${featuredPost.sourceDraftId}`} className="inline-flex w-fit rounded-full bg-white px-5 py-3 shadow-ambient">管理草稿</Link> : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">草稿</p>
          <h3 className="mt-3 font-headline text-2xl">数据库草稿</h3>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            草稿的创建与读取已经以项目 PostgreSQL 数据库为真实来源。
          </p>
        </div>
        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">媒体</p>
          <h3 className="mt-3 font-headline text-2xl">图片与视频</h3>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            已经支持图片上传元数据和视频嵌入，所以草稿从一开始就能承载真实媒体。
          </p>
        </div>
        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">发布</p>
          <h3 className="mt-3 font-headline text-2xl">正式发布</h3>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            草稿现在可以发布成真实的数据库文章，并持续连接到后续管理流程。
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">最近触达</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">草稿与已发布内容的实时修订流</h2>
          </div>
          <span className="text-sm text-foreground/50">{writingTouches.length} 条最近写作事件</span>
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
                重新进入写作
              </Link>
            </article>
          )) : (
            <div className="rounded-[1.5rem] bg-white/80 p-4 text-sm text-foreground/60">
              当前还没有近期写作动态。草稿和已发布内容一开始推进，就会出现在这里。
            </div>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-3xl">最近草稿</h2>
          <span className="text-sm text-foreground/50">{drafts.length} 条草稿记录</span>
        </div>
        {drafts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {drafts.map((draft) => (
              <article key={draft.id} className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  <span>{draft.visibility}</span>
                  <span>{draft.contentBlockCount} 个内容块</span>
                  {draft.publishedPostSlug ? <span>线上文章</span> : <span>仅草稿</span>}
                </div>
                <h3 className="mt-3 font-headline text-2xl text-foreground">{draft.title}</h3>
                <p className="mt-3 text-sm leading-6 text-foreground/70">{draft.summary || "暂无摘要。"}</p>
                <div className="mt-4 space-y-2 text-xs text-foreground/55">
                  <p>更新于 {new Date(draft.updatedAt).toLocaleString("zh-CN")}</p>
                  {draft.sourceNoteSlug ? <p>来源笔记：{draft.sourceNoteTitle ?? draft.sourceNoteSlug}</p> : null}
                  {draft.publishedPostSlug ? <p>线上地址 /writing/{draft.publishedPostSlug}</p> : null}
                </div>
                <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold text-primary">
                  <Link href={`/writing/drafts/${draft.id}`}>打开草稿编辑页</Link>
                  {draft.publishedPostSlug ? <Link href={`/writing/${draft.publishedPostSlug}`}>打开文章</Link> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
            当前还没有草稿。创建一篇草稿后，写作流程才会开始。
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-3xl">最近文章</h2>
          <span className="text-sm text-foreground/50">{posts.length} 篇可用文章</span>
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
                    <span>{post.readMinutes} 分钟阅读</span>
                    {post.versionCount ? <span>{post.versionCount} 个版本</span> : null}
                  </div>
                  <h3 className="font-headline text-2xl text-foreground">{post.title}</h3>
                  <p className="text-sm leading-6 text-foreground/70">{post.summary}</p>
                  <div className="space-y-1 text-xs text-foreground/55">
                    <p>发布于 {formatCompactDate(post.publishedAt)}</p>
                    {post.sourceDraftTitle ? <p>由草稿管理：{post.sourceDraftTitle}</p> : null}
                    {post.sourceNoteSlug ? <p>来源笔记：{post.sourceNoteTitle ?? post.sourceNoteSlug}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm font-semibold text-primary">
                    <Link href={`/writing/${post.slug}`}>打开文章</Link>
                    {post.sourceDraftId ? <Link href={`/writing/drafts/${post.sourceDraftId}`}>管理草稿</Link> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
            {featuredPost
              ? "目前还没有更多已发布文章。后续发布的新内容会继续在这里汇总。"
              : "当前还没有已发布文章。完成首次发布后，这里会显示文章流。"}
          </div>
        )}
      </section>
    </ShellLayout>
  );
}


