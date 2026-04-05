import Link from "next/link";
import { notFound } from "next/navigation";

import { ShellLayout } from "@/components/shell/shell-layout";
import { WritingDraftForm } from "@/components/writing/writing-draft-form";
import { getWritingDraftById } from "@/server/writing/service";

import { publishWritingDraftAction, updateWritingDraftAction } from "../../new/actions";

function formatTimestamp(value?: string) {
  if (!value) {
    return "暂不可用";
  }

  return new Date(value).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function Writing草稿DetailPage({
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
      description="草稿 editing is now database-backed, so image uploads and video embeds can be iterated on without leaving the Writing module."
    >
      {resolvedSearchParams?.created === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          草稿 created successfully. It is now linked into the Writing workflow.
        </section>
      ) : null}

      {resolvedSearchParams?.saved === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          草稿 saved successfully. Your latest content JSON, image 个内容块, and video embeds are now stored in PostgreSQL.
        </section>
      ) : null}

      {resolvedSearchParams?.error === "invalid-content-json" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          内容 JSON 无法解析，请修正 JSON 结构后再保存。
        </section>
      ) : null}

      {resolvedSearchParams?.error === "save-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          草稿保存失败，当前用户上下文可能已经无法访问这篇草稿。
        </section>
      ) : null}

      {resolvedSearchParams?.error === "publish-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          发布失败，请先重新保存草稿再重试。
        </section>
      ) : null}

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">草稿管理</p>
            <h2 className="font-headline text-3xl text-foreground">在上线前管理这份工作中的版本</h2>
            <p className="max-w-3xl text-sm leading-6 text-foreground/70">
              这个页面是来源笔记、富媒体草稿和正式发布之间的交接点。先在这里把草稿稳定下来，准备好后再向前推进。
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Link href={`/planner/new?draft=${draft.id}`} className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary shadow-ambient">
              从草稿创建任务
            </Link>
            <form action={publishAction}>
              <button type="submit" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
                {draft.publishedPostSlug ? "重新发布草稿" : "发布草稿"}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">草稿状态</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">{draft.visibility}</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">{draft.contentBlockCount} 个富媒体内容块正在塑造这篇文章的结构。</p>
          </article>

          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">最近保存</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">{formatTimestamp(draft.updatedAt)}</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">当结构、媒体和叙述还在变化时，继续在这里保存和打磨。</p>
          </article>

          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">来源上下文</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">{draft.sourceNoteTitle ?? "独立草稿"}</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">
              {draft.sourceNoteSlug ? "这篇草稿仍然锚定在一条知识笔记上。" : "这篇草稿当前没有关联来源笔记。"}
            </p>
            {draft.sourceNoteSlug ? (
              <Link href={`/knowledge/${draft.sourceNoteSlug}`} className="mt-4 inline-flex text-sm font-semibold text-primary">
                打开来源笔记
              </Link>
            ) : null}
          </article>

          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">线上文章</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">{draft.publishedPostTitle ?? "尚未发布"}</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">
              {draft.publishedPostSlug ? `最近发布于 ${formatTimestamp(draft.publishedAt)}.` : "首次发布后，这篇草稿就会开始管理对应的线上文章。"}
            </p>
            {draft.publishedPostSlug ? (
              <Link href={`/writing/${draft.publishedPostSlug}`} className="mt-4 inline-flex text-sm font-semibold text-primary">
                打开线上文章
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


