import Link from "next/link";
import { notFound } from "next/navigation";

import { ShellLayout } from "@/components/shell/shell-layout";
import { RichTextPreview } from "@/components/writing/rich-text-preview";
import { getKnowledgeNoteBySlug } from "@/server/knowledge/service";

function toKnowledgeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default async function KnowledgeDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ created?: string; saved?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const note = await getKnowledgeNoteBySlug(resolvedParams.slug);

  if (!note) {
    notFound();
  }

  return (
    <ShellLayout
      title={note.title}
      description="知识笔记被设计成可复用的结构化条目，后续可以继续承接反链、领域导航、归档集成以及写作流转。"
    >
      {resolvedSearchParams?.created === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          笔记创建成功，现已进入知识库。
        </section>
      ) : null}

      {resolvedSearchParams?.saved === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          笔记保存成功，最新修改已反映到知识库。
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-primary">
          {note.domainName ? <Link href={`/knowledge?domain=${toKnowledgeSlug(note.domainName)}`}>{note.domainName}</Link> : null}
          <span>{note.contentBlockCount} 个内容块</span>
          <span>更新于 {new Date(note.updatedAt).toLocaleString("zh-CN")}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/writing/new?sourceNote=${note.slug}`} className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary shadow-ambient">
            从笔记开始写作
          </Link>
          <Link href={`/planner/new?note=${note.slug}`} className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary shadow-ambient">
            从笔记创建任务
          </Link>
          <Link href="/archive" className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary shadow-ambient">
            查看归档
          </Link>
          <Link href={`/knowledge/${note.slug}/edit`} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white">
            编辑笔记
          </Link>
        </div>
      </div>

      {note.tags.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {note.tags.map((tag) => (
            <Link key={tag} href={`/knowledge?tag=${toKnowledgeSlug(tag)}`} className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-primary shadow-ambient">
              {tag}
            </Link>
          ))}
        </div>
      ) : null}

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <RichTextPreview title={note.title} summary={note.summary} content={note.content} emptyMessage="这条笔记还是空的。" />
      </section>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">写作关联</p>
            <h2 className="mt-3 font-headline text-2xl text-foreground">关联草稿与文章</h2>
          </div>
          <Link href={`/writing/new?sourceNote=${note.slug}`} className="text-sm font-semibold text-primary">
            基于笔记创建
          </Link>
        </div>
        {note.relatedWriting.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {note.relatedWriting.map((item) => (
              <Link key={`${item.kind}-${item.id}`} href={item.href} className="rounded-[1.5rem] bg-white/80 p-4 shadow-ambient">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{item.kind === "draft" ? "草稿" : "已发布"}</p>
                <h3 className="mt-3 font-headline text-xl text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-foreground/60">
                  {item.kind === "draft"
                    ? `更新于 ${item.updatedAt ? new Date(item.updatedAt).toLocaleString("zh-CN") : "最近"}`
                    : `已发布 ${item.publishedAt ? new Date(item.publishedAt).toLocaleString("zh-CN") : "最近"}`}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm leading-6 text-foreground/70">
            当前还没有写作内容关联到这条笔记。可以从这条笔记出发创建草稿，把想法扩展成更完整的内容。
          </p>
        )}
      </section>

      <div className="flex items-center gap-4">
        <Link href="/knowledge" className="text-sm font-semibold text-primary">返回知识库</Link>
        <Link href="/knowledge/new" className="text-sm font-semibold text-primary">继续新建笔记</Link>
      </div>
    </ShellLayout>
  );
}



