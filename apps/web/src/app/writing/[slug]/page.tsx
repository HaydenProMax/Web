import Link from "next/link";
import { notFound } from "next/navigation";

import { RichTextPreview } from "@/components/writing/rich-text-preview";
import { ShellLayout } from "@/components/shell/shell-layout";
import { getPublishedWritingPost } from "@/server/writing/service";

function formatTimestamp(value?: string) {
  if (!value) {
    return "暂不可用";
  }

  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function WritingPostPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ published?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const post = await getPublishedWritingPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <ShellLayout title={post.title} description={post.summary}>
      {resolvedSearchParams?.published === "1" ? (
        <section className="mx-auto mb-8 w-full max-w-4xl rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          草稿 published successfully. You are viewing the live article now.
        </section>
      ) : null}

      <section className="mx-auto mb-8 w-full max-w-4xl rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">已发布 Management</p>
            <h2 className="font-headline text-3xl text-foreground">这是正式文章阅读面</h2>
            <p className="max-w-3xl text-sm leading-6 text-foreground/70">
              在这里阅读已经上线的内容；需要修改、重发或重新连接到原始思路时，可以直接回到来源草稿或知识笔记。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {post.sourceDraftId ? (
              <Link href={`/writing/drafts/${post.sourceDraftId}`} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
                打开来源草稿
              </Link>
            ) : null}
            {post.sourceNoteSlug ? (
              <Link href={`/knowledge/${post.sourceNoteSlug}`} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
                打开来源笔记
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">发布时间</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">{formatTimestamp(post.publishedAt)}</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">这是这篇文章最近一次正式推送上线的时间。</p>
          </article>
          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">版本记忆</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">{post.versionCount ?? 1} 个版本</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">重新发布来源草稿后，这篇文章的版本轨迹会继续增长。</p>
          </article>
          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">来源上下文</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">{post.sourceNoteTitle ?? post.sourceDraftTitle ?? "独立文章"}</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">
              {post.sourceNoteSlug ? "这篇文章仍然回链到一条知识笔记。" : post.sourceDraftId ? "这篇文章仍由一个线上来源草稿持续管理。" : "这篇文章当前是独立存在的。"}
            </p>
          </article>
        </div>
      </section>

      <article className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">
            {post.category} | {post.readMinutes} 分钟阅读
          </p>
          <p className="text-sm text-foreground/50">已发布 {new Date(post.publishedAt).toLocaleDateString("zh-CN")}</p>
        </div>

        <RichTextPreview
          title={post.title}
          summary={post.summary}
          coverImage={post.coverImage}
          coverAlt={post.coverAlt}
          content={post.content}
        />
      </article>
    </ShellLayout>
  );
}



