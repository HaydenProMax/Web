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

function parseArchiveFilterKey(value?: string) {
  if (value === "all" || value === "favorites" || value === "resources") {
    return value;
  }

  return undefined;
}

function filterHeading(filter: "all" | "favorites" | "resources") {
  if (filter === "favorites") {
    return "Favorite Archive Records";
  }

  if (filter === "resources") {
    return "Resource Archive Records";
  }

  return "Recent Archive Records";
}

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const parsedFilter = parseArchiveFilterKey(resolvedSearchParams?.collection);
  const activeFilter = parsedFilter ?? "all";

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
      ? "Archive favorite state updated."
      : resolvedSearchParams?.error === "favorite-failed"
        ? "Archive favorite update failed."
        : resolvedSearchParams?.error === "missing-item"
          ? "Archive item is missing."
          : resolvedSearchParams?.error === "invalid-collection" || (resolvedSearchParams?.collection && !parsedFilter)
            ? "Archive collection is invalid."
            : null;

  return (
    <ShellLayout
      title="Archive"
      description="Archive now preserves both published writing and knowledge notes, so the record layer is becoming a true cross-module library instead of a writing-only history."
    >
      <WorkspaceViewNav
        eyebrow="Replay Views"
        title="Move between time and context"
        items={[
          {
            label: "History Timeline",
            href: historyTimelineHref,
            description: "Review archive records by day when you want the broadest replay view."
          },
          {
            label: "Dashboard Activity",
            href: recentActivityHref,
            description: "Return to the live workstation pulse when you need what changed most recently."
          },
          {
            label: "Planner Threads",
            href: workThreadsHref,
            description: "Switch from records back into linked execution threads and active tasks."
          }
        ]}
      />

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Replay Context</p>
        <h2 className="mt-3 font-headline text-3xl text-foreground">Archive can return to {activityReentry.label}</h2>
        <p className="mt-3 text-sm leading-6 text-foreground/70">The archive is your durable layer, but it can still hand you back into the active replay mode when you want to move from history into motion.</p>
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
              <p className={`mt-5 text-sm font-semibold ${isActive ? "text-white" : "text-primary"}`}>{collection.count} items</p>
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
                ? "Only the items you have explicitly pinned."
                : activeFilter === "resources"
                  ? "Reserved for saved reference material and future library assets."
                  : "A live cross-module history of the workstation so far, now spanning both writing and knowledge."}
            </p>
          </div>
          <span className="text-sm text-foreground/50">
            Showing {items.length}
            {activeCollection ? ` of ${activeCollection.count}` : ""} records
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
                      {item.isFavorite ? "Favorited" : "Add to Favorites"}
                    </button>
                  </form>
                </div>
                <h3 className="mt-3 font-headline text-2xl text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-foreground/70">{item.summary || "No summary stored for this archive record yet."}</p>
                <p className="mt-4 text-xs text-foreground/50">Updated {new Date(item.updatedAt).toLocaleString("zh-CN")}</p>
                {item.href ? (
                  <Link href={item.href} className="mt-4 inline-flex text-sm font-semibold text-primary">
                    Open source item
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
            {activeFilter === "favorites"
              ? "No favorites yet. Pin important archive records here to build your personal shelf."
              : activeFilter === "resources"
                ? "No resource records yet. This lane is ready for saved references and future library assets."
                : "No archive records yet. Publishing a writing post or creating a knowledge note will now create one automatically."}
          </div>
        )}
      </section>

      <section id="history-timeline" className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-headline text-3xl">History Timeline</h2>
            <p className="mt-2 text-sm text-foreground/60">
              A date-grouped replay of the archive layer, so you can re-enter recent work by when it surfaced instead of only by module.
            </p>
          </div>
          <span className="text-sm text-foreground/50">{timelineGroups.length} day groups</span>
        </div>

        {timelineGroups.length > 0 ? (
          <div className="space-y-6">
            {timelineGroups.map((group) => (
              <section key={group.key} className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-primary">Timeline Group</p>
                    <h3 className="mt-2 font-headline text-2xl text-foreground">{group.label}</h3>
                  </div>
                  <span className="text-sm text-foreground/50">{group.itemCount} records</span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((item) => (
                    <article key={item.id} className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-primary">{item.badge}</p>
                        <p className="text-xs text-foreground/50">{new Date(item.updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <h4 className="mt-3 font-headline text-xl text-foreground">{item.title}</h4>
                      <p className="mt-3 text-sm leading-6 text-foreground/70">{item.summary || "No summary stored for this archive record yet."}</p>
                      {item.href ? (
                        <Link href={item.href} className="mt-4 inline-flex text-sm font-semibold text-primary">
                          Re-open record
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
            No history timeline yet. As notes and posts continue entering the archive, the recent record stream will collect here by day.
          </div>
        )}
      </section>
    </ShellLayout>
  );
}


