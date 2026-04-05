export const dynamic = "force-dynamic";

import Link from "next/link";

import { ShellLayout } from "@/components/shell/shell-layout";
import { WorkspaceViewNav } from "@/components/shell/workspace-view-nav";
import { getPreferredActivityHref, getPreferredActivityReentry } from "@/server/activity/preferences";
import { listArchiveCollectionSummaries, listArchiveTimelineGroups, listRecentArchiveItems } from "@/server/archive/service";

import { toggleArchiveFavoriteAction } from "./actions";

type ArchivePageProps = {
  searchParams?: Promise<{ collection?: string; updated?: string; error?: string }>;
};

function resolveFilterKey(value?: string) {
  if (value === "favorites" || value === "resources") {
    return value;
  }

  return "all" as const;
}

function filterHeading(filter: "all" | "favorites" | "resources") {
  if (filter === "favorites") {
    return "收藏归档记录";
  }

  if (filter === "resources") {
    return "资源归档记录";
  }

  return "最近归档记录";
}

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activeFilter = resolveFilterKey(resolvedSearchParams?.collection);

  const [collections, items, timelineGroups, historyTimelineHref, recentActivityHref, workThreadsHref, activityReentry] = await Promise.all([
    listArchiveCollectionSummaries(),
    listRecentArchiveItems(12, activeFilter),
    listArchiveTimelineGroups(24, activeFilter),
    getPreferredActivityHref("#history-timeline"),
    getPreferredActivityHref("#recent-activity"),
    getPreferredActivityHref("#work-threads"),
    getPreferredActivityReentry()
  ]);

  const activeCollection = collections.find((collection) => collection.key === activeFilter) ?? collections.find((collection) => collection.key === "all");

  const feedbackMessage =
    resolvedSearchParams?.updated === "1"
      ? "归档收藏状态已更新。"
      : resolvedSearchParams?.error === "favorite-failed"
        ? "归档收藏更新失败。"
        : resolvedSearchParams?.error === "missing-item"
          ? "归档条目不存在。"
          : null;

  return (
    <ShellLayout
      title="归档"
      description="归档现在同时保存已发布写作和知识笔记，让记录层真正成为跨模块资料库，而不只是写作历史。"
    >
      <WorkspaceViewNav
        eyebrow="回放视图"
        title="在时间与上下文之间切换"
        items={[
          {
            label: "历史时间线",
            href: historyTimelineHref,
            description: "当你想看最宽的回放视图时，按天回看归档记录。"
          },
          {
            label: "首页活动",
            href: recentActivityHref,
            description: "当你需要看最近发生了什么，就回到首页活动流。"
          },
          {
            label: "规划线程",
            href: workThreadsHref,
            description: "从记录层回到已关联的执行线程和活动任务。"
          }
        ]}
      />

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">回放上下文</p>
        <h2 className="mt-3 font-headline text-3xl text-foreground">归档可以回到{activityReentry.label}</h2>
        <p className="mt-3 text-sm leading-6 text-foreground/70">归档是你的长期沉淀层，但当你想从历史回到动作时，它仍然能把你送回当前回放模式。</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={activityReentry.nextStep.href} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
            {activityReentry.nextStep.label}
          </Link>
          <p className="text-sm leading-6 text-foreground/60">{activityReentry.nextStep.description}</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {collections.map((collection) => {
          const isActive = collection.key === activeFilter || (collection.key === "all" && activeFilter === "all");

          return (
            <Link
              key={collection.key}
              href={collection.href}
              className={`rounded-[2rem] p-6 shadow-ambient transition ${
                isActive ? "bg-primary text-white" : "bg-surface-container-low text-foreground"
              }`}
            >
              <p className={`text-xs uppercase tracking-[0.2em] ${isActive ? "text-white/80" : "text-primary"}`}>{collection.eyebrow}</p>
              <h2 className="mt-3 font-headline text-3xl">{collection.title}</h2>
              <p className={`mt-3 text-sm leading-6 ${isActive ? "text-white/80" : "text-foreground/70"}`}>{collection.description}</p>
              <p className={`mt-5 text-sm font-semibold ${isActive ? "text-white" : "text-primary"}`}>{collection.count} 条</p>
            </Link>
          );
        })}
      </div>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-headline text-3xl">{filterHeading(activeFilter)}</h2>
            <p className="mt-2 text-sm text-foreground/60">
              {activeFilter === "favorites"
                ? "这里只显示你明确固定下来的归档条目。"
                : activeFilter === "resources"
                  ? "这条通道留给保存的参考资料和未来的资料库资产。"
                  : "这里是当前工作站的跨模块实时历史，已经同时覆盖写作和知识。"}
            </p>
          </div>
          <span className="text-sm text-foreground/50">
            显示 {items.length}
            {activeCollection ? ` of ${activeCollection.count}` : ""} 条记录
          </span>
        </div>

        {feedbackMessage ? (
          <div className="rounded-[1.5rem] bg-white/80 px-4 py-3 text-sm text-foreground/70 shadow-ambient">
            {feedbackMessage}
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">{item.badge}</p>
                  <form action={toggleArchiveFavoriteAction}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="nextValue" value={item.isFavorite ? "0" : "1"} />
                    <input type="hidden" name="collection" value={activeFilter} />
                    <button
                      type="submit"
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        item.isFavorite ? "bg-primary text-white" : "bg-white text-primary"
                      }`}
                    >
                      {item.isFavorite ? "已收藏" : "加入收藏"}
                    </button>
                  </form>
                </div>
                <h3 className="mt-3 font-headline text-2xl text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-foreground/70">{item.summary || "这条归档记录还没有摘要。"}</p>
                <p className="mt-4 text-xs text-foreground/50">更新于 {new Date(item.updatedAt).toLocaleString("zh-CN")}</p>
                {item.href ? (
                  <Link href={item.href} className="mt-4 inline-flex text-sm font-semibold text-primary">
                    打开来源条目
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
            {activeFilter === "favorites"
              ? "当前还没有收藏记录。把重要条目固定到这里，形成你自己的归档书架。"
              : activeFilter === "resources"
                ? "当前还没有资料型记录。这条通道会留给保存的参考资料和后续资料库资产。"
                : "当前还没有归档记录。发布文章或创建知识笔记后，这里会自动出现对应条目。"}
          </div>
        )}
      </section>

      <section id="history-timeline" className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-headline text-3xl">历史时间线</h2>
            <p className="mt-2 text-sm text-foreground/60">
              按日期分组回看归档层，让你可以按出现时间而不只是按模块重新进入最近工作。
            </p>
          </div>
          <span className="text-sm text-foreground/50">{timelineGroups.length} 个日期分组</span>
        </div>

        {timelineGroups.length > 0 ? (
          <div className="space-y-6">
            {timelineGroups.map((group) => (
              <section key={group.key} className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-primary">时间组</p>
                    <h3 className="mt-2 font-headline text-2xl text-foreground">{group.label}</h3>
                  </div>
                  <span className="text-sm text-foreground/50">{group.itemCount} 条记录</span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((item) => (
                    <article key={item.id} className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-primary">{item.badge}</p>
                        <p className="text-xs text-foreground/50">{new Date(item.updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <h4 className="mt-3 font-headline text-xl text-foreground">{item.title}</h4>
                      <p className="mt-3 text-sm leading-6 text-foreground/70">{item.summary || "这条归档记录还没有摘要。"}</p>
                      {item.href ? (
                        <Link href={item.href} className="mt-4 inline-flex text-sm font-semibold text-primary">
                          重新打开记录
                        </Link>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
            当前还没有历史时间线。随着笔记和文章持续进入归档，最近记录会按天汇集到这里。
          </div>
        )}
      </section>
    </ShellLayout>
  );
}



