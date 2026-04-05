import Link from "next/link";

import { ModuleCard } from "@/components/shell/module-card";
import { ShellLayout } from "@/components/shell/shell-layout";
import { getPreferredActivityReentry } from "@/server/activity/preferences";
import { getKnowledgeLibrarySummary, listKnowledgeNotes } from "@/server/knowledge/service";

export const dynamic = "force-dynamic";

function toKnowledgeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildKnowledgeFilterHref(next: { domain?: string; tag?: string }) {
  const params = new URLSearchParams();
  if (next.domain) {
    params.set("domain", next.domain);
  }
  if (next.tag) {
    params.set("tag", next.tag);
  }

  const query = params.toString();
  return query ? `/knowledge?${query}` : "/knowledge";
}

function formatTouchTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function KnowledgePage({
  searchParams
}: {
  searchParams?: Promise<{ created?: string; domain?: string; tag?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activeFilters = {
    domain: resolvedSearchParams?.domain,
    tag: resolvedSearchParams?.tag
  };

  const [library, notes, activityReentry] = await Promise.all([
    getKnowledgeLibrarySummary(activeFilters),
    listKnowledgeNotes(9, activeFilters),
    getPreferredActivityReentry()
  ]);

  const activeDomainLabel = library.domains.find((domain) => domain.slug === activeFilters.domain)?.label ?? activeFilters.domain;
  const activeTagLabel = library.tags.find((tag) => tag.slug === activeFilters.tag)?.label ?? activeFilters.tag;
  const hasActiveFilter = Boolean(activeFilters.domain || activeFilters.tag);
  const noteTouches = notes.slice(0, 8);

  return (
    <ShellLayout
      title="知识库"
      description="知识库 now supports structured notes with domains, tags, and reading pages, giving the workstation a second durable content surface beyond Writing."
    >
      {resolvedSearchParams?.created === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          笔记创建成功，知识库已更新。
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href={activityReentry.href} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
          回到{activityReentry.label}视角
        </Link>
        <Link href="/knowledge/new" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
          新建笔记
        </Link>
      </div>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">回放上下文</p>
        <h2 className="mt-3 font-headline text-3xl text-foreground">知识库 can hand off to your current replay lens</h2>
        <p className="mt-3 text-sm leading-6 text-foreground/70">当前工作站将 {activityReentry.label} 作为你的活动回流模式。当你想离开笔记库、回到更大工作流时，可以从这里返回。</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={activityReentry.nextStep.href} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
            {activityReentry.nextStep.label}
          </Link>
          <p className="text-sm leading-6 text-foreground/60">{activityReentry.nextStep.description}</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <ModuleCard title="笔记" description={`${library.overview.noteCount} 条有效笔记位于当前知识视图中。`} eyebrow="Core" />
        <ModuleCard title="领域" description={`${library.overview.domainCount} 个活跃领域正在组织当前思考空间。`} eyebrow="Taxonomy" />
        <ModuleCard title="标签" description={`${library.overview.tagCount} 个可复用标签可用于后续连接和筛选。`} eyebrow="Metadata" />
      </section>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">最近触达</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">最近编辑笔记的快速回流</h2>
          </div>
          <span className="text-sm text-foreground/50">{noteTouches.length} 条可见笔记更新</span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {noteTouches.length > 0 ? noteTouches.map((note) => (
            <article key={note.id} className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{note.domainName ?? "知识库"}</p>
                <p className="text-xs text-foreground/50">{formatTouchTime(note.updatedAt)}</p>
              </div>
              <h3 className="mt-3 font-headline text-2xl text-foreground">{note.title}</h3>
              <p className="mt-3 text-sm leading-6 text-foreground/70">{note.summary || "笔记已更新，可以继续整理。"}</p>
              <Link href={`/knowledge/${note.slug}`} className="mt-4 inline-flex text-sm font-semibold text-primary">
                重新打开笔记
              </Link>
            </article>
          )) : (
            <div className="rounded-[1.5rem] bg-white/80 p-4 text-sm text-foreground/60">
              当前还没有最近笔记活动。随着笔记创建或更新，它们会出现在这里供你快速回流。
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-2xl text-foreground">当前筛选</h2>
              {hasActiveFilter ? (
                <Link href="/knowledge" className="text-sm font-semibold text-primary">清除全部</Link>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {activeFilters.domain ? (
                <Link href={buildKnowledgeFilterHref({ tag: activeFilters.tag })} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
                  领域：{activeDomainLabel}
                </Link>
              ) : null}
              {activeFilters.tag ? (
                <Link href={buildKnowledgeFilterHref({ domain: activeFilters.domain })} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
                  标签：{activeTagLabel}
                </Link>
              ) : null}
              {!hasActiveFilter ? (
                <span className="rounded-full bg-white/80 px-4 py-2 text-sm text-foreground/60">正在浏览全部笔记</span>
              ) : null}
            </div>
          </div>

          <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
            <h2 className="font-headline text-2xl text-foreground">领域</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {library.domains.length > 0 ? library.domains.map((domain) => {
                const isActive = activeFilters.domain === domain.slug;
                return (
                  <Link
                    key={domain.slug}
                    href={buildKnowledgeFilterHref({ domain: isActive ? undefined : domain.slug, tag: activeFilters.tag })}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${isActive ? "bg-primary text-white" : "bg-white/80 text-primary"}`}
                  >
                    {domain.label} ({domain.count})
                  </Link>
                );
              }) : (
                <p className="text-sm text-foreground/60">当前还没有领域。</p>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
            <h2 className="font-headline text-2xl text-foreground">标签</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {library.tags.length > 0 ? library.tags.map((tag) => {
                const isActive = activeFilters.tag === tag.slug;
                return (
                  <Link
                    key={tag.slug}
                    href={buildKnowledgeFilterHref({ domain: activeFilters.domain, tag: isActive ? undefined : tag.slug })}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${isActive ? "bg-primary text-white" : "bg-white/80 text-primary"}`}
                  >
                    {tag.label} ({tag.count})
                  </Link>
                );
              }) : (
                <p className="text-sm text-foreground/60">当前还没有标签。</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-3xl">Recent 笔记</h2>
            <span className="text-sm text-foreground/50">显示 {notes.length} of {library.overview.noteCount} 条笔记记录</span>
          </div>

          {notes.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
              {notes.map((note) => (
                <article key={note.id} className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-primary">
                    {note.domainName ? (
                      <Link href={buildKnowledgeFilterHref({ domain: toKnowledgeSlug(note.domainName), tag: activeFilters.tag })}>
                        {note.domainName}
                      </Link>
                    ) : null}
                    <span>{note.contentBlockCount} 个内容块</span>
                  </div>
                  <h3 className="mt-3 font-headline text-2xl text-foreground">{note.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-foreground/70">{note.summary || "暂无摘要。"}</p>
                  {note.tags.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {note.tags.map((tag) => (
                        <Link key={tag} href={buildKnowledgeFilterHref({ domain: activeFilters.domain, tag: toKnowledgeSlug(tag) || undefined })} className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-primary">
                          {tag}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-4 text-xs text-foreground/50">更新于 {new Date(note.updatedAt).toLocaleString("zh-CN")}</p>
                  <Link href={`/knowledge/${note.slug}`} className="mt-4 inline-flex text-sm font-semibold text-primary">
                    打开笔记
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
              {hasActiveFilter ? "当前筛选下还没有匹配笔记。" : "当前还没有知识笔记。创建第一条内容后，知识库和首页才会开始成形。"}
            </div>
          )}
        </div>
      </section>
    </ShellLayout>
  );
}

