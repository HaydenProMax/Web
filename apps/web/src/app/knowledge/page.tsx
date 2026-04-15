import Link from "next/link";

import { archiveKnowledgeNoteFromListAction, deleteArchivedKnowledgeNoteFromListAction, restoreKnowledgeNoteFromListAction } from "@/app/knowledge/new/actions";
import { ShellLayout } from "@/components/shell/shell-layout";
import { getPreferredActivityReentry } from "@/server/activity/preferences";
import { getKnowledgeLibrarySummary, listKnowledgeNotes } from "@/server/knowledge/service";

export const dynamic = "force-dynamic";

function buildKnowledgeFilterHref(next: { view?: string; domain?: string; tag?: string }) {
  const params = new URLSearchParams();
  if (next.view === "archived") {
    params.set("view", "archived");
  }
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
  searchParams?: Promise<{ created?: string; deleted?: string; restored?: string; destroyed?: string; error?: string; view?: string; domain?: string; tag?: string; confirmDelete?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const archivedView = resolvedSearchParams?.view === "archived";

  const [baseLibrary, activityReentry] = await Promise.all([
    getKnowledgeLibrarySummary(undefined, archivedView),
    getPreferredActivityReentry()
  ]);

  const activeFilters = {
    domain: baseLibrary.domains.some((domain) => domain.slug === resolvedSearchParams?.domain) ? resolvedSearchParams?.domain : undefined,
    tag: baseLibrary.tags.some((tag) => tag.slug === resolvedSearchParams?.tag) ? resolvedSearchParams?.tag : undefined
  };

  const [library, notes] = await Promise.all([
    getKnowledgeLibrarySummary(activeFilters, archivedView),
    listKnowledgeNotes(9, activeFilters, archivedView)
  ]);

  const activeDomainLabel = library.domains.find((domain) => domain.slug === activeFilters.domain)?.label ?? activeFilters.domain;
  const activeTagLabel = library.tags.find((tag) => tag.slug === activeFilters.tag)?.label ?? activeFilters.tag;
  const hasActiveFilter = Boolean(activeFilters.domain || activeFilters.tag);
  const noteTouches = notes.slice(0, 8);
  const hasDeleteTargetQuery = archivedView && Boolean(resolvedSearchParams?.confirmDelete);
  const confirmDeleteSlug = archivedView && notes.some((note) => note.slug === resolvedSearchParams?.confirmDelete) ? resolvedSearchParams?.confirmDelete : undefined;
  const notePendingDelete = confirmDeleteSlug ? notes.find((note) => note.slug === confirmDeleteSlug) : undefined;
  const invalidDeleteTarget = hasDeleteTargetQuery && !notePendingDelete;

  return (
    <ShellLayout
      title="Knowledge"
      description=""
    >
      {resolvedSearchParams?.created === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Note created successfully. The library has been updated with the new entry.
        </section>
      ) : resolvedSearchParams?.deleted === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Note archived successfully.
        </section>
      ) : resolvedSearchParams?.restored === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Note restored successfully.
        </section>
      ) : resolvedSearchParams?.destroyed === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Archived note deleted permanently.
        </section>
      ) : resolvedSearchParams?.error === "delete-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          Note archive failed. Please try again.
        </section>
      ) : resolvedSearchParams?.error === "restore-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          Note restore failed. Please try again.
        </section>
      ) : resolvedSearchParams?.error === "permanent-delete-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          Permanent delete failed. Please try again.
        </section>
      ) : resolvedSearchParams?.error === "confirm-delete-required" ? (
        <section className="rounded-[2rem] bg-amber-100 px-6 py-4 text-sm text-amber-800 shadow-ambient">
          Permanent delete requires a confirmation step.
        </section>
      ) : invalidDeleteTarget ? (
        <section className="rounded-[2rem] bg-amber-100 px-6 py-4 text-sm text-amber-800 shadow-ambient">
          The archived note selected for permanent delete is no longer available.
        </section>
      ) : null}

      {notePendingDelete ? (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-700">Delete Confirmation</p>
          <h2 className="mt-3 font-headline text-3xl text-foreground">Permanently delete this archived note?</h2>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            <strong>{notePendingDelete.title}</strong> will be permanently deleted. This action cannot be undone.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <form action={deleteArchivedKnowledgeNoteFromListAction}>
              <input type="hidden" name="slug" value={notePendingDelete.slug} />
              <input type="hidden" name="confirmed" value="true" />
              <button type="submit" className="rounded-full bg-rose-700 px-5 py-3 text-sm font-semibold text-white shadow-ambient">
                Confirm Permanent Delete
              </button>
            </form>
            <Link href={buildKnowledgeFilterHref({ view: "archived", domain: activeFilters.domain, tag: activeFilters.tag })} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
              Cancel
            </Link>
          </div>
        </section>
      ) : null}

      <section className="rounded-[3rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(245,243,239,0.76))] px-8 py-10 shadow-ambient md:px-12">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <h2 className="font-headline text-6xl leading-none tracking-[-0.05em] text-foreground md:text-7xl">
              {archivedView ? "Archived Notes" : "The Index"}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <Link href={archivedView ? "/knowledge" : "/knowledge?view=archived"} className="rounded-full bg-white/85 px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
              {archivedView ? "View Live Notes" : `Archived (${library.overview.archivedCount})`}
            </Link>
            <Link href={activityReentry.href} className="rounded-full bg-white/85 px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
              Resume {activityReentry.label}
            </Link>
            {!archivedView ? (
              <Link href="/knowledge/new" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
                New Note
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-6 rounded-[2.5rem] bg-surface-container-low px-6 py-8 shadow-ambient xl:sticky xl:top-28 xl:self-start">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-secondary">Library</p>
            <p className="mt-1 text-[11px] text-foreground/45">Browse by status and taxonomy.</p>
          </div>

          <nav className="space-y-2">
            <Link
              href="/knowledge"
              className={archivedView
                ? "flex items-center justify-between rounded-full px-4 py-3 text-sm text-foreground/55 transition-colors hover:bg-white/70 hover:text-primary"
                : "flex items-center justify-between rounded-full bg-white px-4 py-3 text-sm font-semibold text-primary shadow-ambient"}
            >
              <span>Live Notes</span>
              <span>{baseLibrary.overview.noteCount - (archivedView ? library.overview.noteCount : 0)}</span>
            </Link>
            <Link
              href="/knowledge?view=archived"
              className={archivedView
                ? "flex items-center justify-between rounded-full bg-white px-4 py-3 text-sm font-semibold text-primary shadow-ambient"
                : "flex items-center justify-between rounded-full px-4 py-3 text-sm text-foreground/55 transition-colors hover:bg-white/70 hover:text-primary"}
            >
              <span>Archived</span>
              <span>{baseLibrary.overview.archivedCount}</span>
            </Link>
          </nav>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-secondary">Filters</p>
              {hasActiveFilter ? (
                <Link href={archivedView ? "/knowledge?view=archived" : "/knowledge"} className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Clear
                </Link>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {activeFilters.domain ? (
                <Link href={buildKnowledgeFilterHref({ view: archivedView ? "archived" : undefined, tag: activeFilters.tag })} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white">
                  {activeDomainLabel}
                </Link>
              ) : null}
              {activeFilters.tag ? (
                <Link href={buildKnowledgeFilterHref({ view: archivedView ? "archived" : undefined, domain: activeFilters.domain })} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white">
                  {activeTagLabel}
                </Link>
              ) : null}
              {!hasActiveFilter ? (
                <span className="rounded-full bg-white/80 px-4 py-2 text-xs text-foreground/55">All notes</span>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-secondary">Domains</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {library.domains.length > 0 ? library.domains.map((domain) => {
                const isActive = activeFilters.domain === domain.slug;
                return (
                  <Link
                    key={domain.slug}
                    href={buildKnowledgeFilterHref({ view: archivedView ? "archived" : undefined, domain: isActive ? undefined : domain.slug, tag: activeFilters.tag })}
                    className={isActive
                      ? "rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                      : "rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-primary"}
                  >
                    {domain.label} ({domain.count})
                  </Link>
                );
              }) : (
                <p className="text-sm text-foreground/50">No domains yet.</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-secondary">Tags</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {library.tags.length > 0 ? library.tags.map((tag) => {
                const isActive = activeFilters.tag === tag.slug;
                return (
                  <Link
                    key={tag.slug}
                    href={buildKnowledgeFilterHref({ view: archivedView ? "archived" : undefined, domain: activeFilters.domain, tag: isActive ? undefined : tag.slug })}
                    className={isActive
                      ? "rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                      : "rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-primary"}
                  >
                    {tag.label} ({tag.count})
                  </Link>
                );
              }) : (
                <p className="text-sm text-foreground/50">No tags yet.</p>
              )}
            </div>
          </div>

          {!archivedView ? (
            <Link href="/knowledge/new" className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white">
              New Note
            </Link>
          ) : null}
        </aside>

        <div className="space-y-10">
          <section className="rounded-[2.5rem] bg-surface-container-low p-8 shadow-ambient">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Recent Touches</p>
                <h2 className="mt-3 font-headline text-4xl tracking-[-0.03em] text-foreground">
                  {archivedView ? "Recently archived" : "Recently updated"}
                </h2>
              </div>
              <p className="text-sm text-foreground/50">{noteTouches.length} visible notes</p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {noteTouches.length > 0 ? noteTouches.map((note) => (
                <article key={note.id} className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-ambient transition-colors hover:bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-surface-container-low px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary">
                      {note.domainName ?? "Knowledge"}
                    </span>
                    <time className="text-[11px] text-foreground/45">{formatTouchTime(note.updatedAt)}</time>
                  </div>
                  <h3 className="mt-5 font-headline text-[2rem] leading-tight tracking-[-0.03em] text-foreground">{note.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-foreground/65">
                    {note.summary || (archivedView ? "Ready to restore." : "Updated and ready to revisit.")}
                  </p>
                  {!archivedView ? (
                    <Link href={`/knowledge/${note.slug}`} className="mt-6 inline-flex text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      Open Note
                    </Link>
                  ) : (
                    <form action={restoreKnowledgeNoteFromListAction} className="mt-6">
                      <input type="hidden" name="slug" value={note.slug} />
                      <button type="submit" className="inline-flex text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                        Restore
                      </button>
                    </form>
                  )}
                </article>
              )) : (
                <div className="rounded-[2rem] bg-surface-container-lowest p-6 text-sm text-foreground/60 shadow-ambient">
                  {archivedView ? "No archived notes yet." : "No recent note activity yet."}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Library View</p>
                <h2 className="mt-3 font-headline text-5xl tracking-[-0.04em] text-foreground">
                  {archivedView ? "Archived Collection" : "Curated Notes"}
                </h2>
              </div>
              <p className="text-sm text-foreground/50">
                Showing {notes.length} of {archivedView ? library.overview.archivedCount : library.overview.noteCount}
              </p>
            </div>

            {notes.length > 0 ? (
              <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                {notes.map((note, index) => (
                  <article
                    key={note.id}
                    className={index % 5 === 3
                      ? "md:col-span-2 rounded-[2.2rem] bg-surface-container-lowest p-8 shadow-ambient transition-colors hover:bg-white"
                      : "rounded-[2.2rem] bg-surface-container-lowest p-8 shadow-ambient transition-colors hover:bg-white"}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-full bg-surface-container-low px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary">
                        {note.domainName ?? "Knowledge"}
                      </span>
                      <time className="text-[11px] text-foreground/45">
                        {new Date(note.updatedAt).toLocaleDateString("zh-CN")}
                      </time>
                    </div>

                    <h3 className="mt-6 font-headline text-[2.35rem] leading-[1.02] tracking-[-0.04em] text-foreground">
                      {note.title}
                    </h3>
                    <p className="mt-5 line-clamp-4 text-sm leading-7 text-foreground/68">
                      {note.summary || "No summary yet."}
                    </p>

                    {note.tagLinks.length > 0 ? (
                      <div className="mt-6 flex flex-wrap gap-2">
                        {note.tagLinks.slice(0, 4).map((tag) => (
                          <Link
                            key={tag.slug}
                            href={buildKnowledgeFilterHref({ view: archivedView ? "archived" : undefined, domain: activeFilters.domain, tag: tag.slug })}
                            className="rounded-full bg-tertiary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-tertiary"
                          >
                            {tag.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-8 flex flex-wrap items-center gap-3">
                      {!archivedView ? (
                        <>
                          <Link href={`/knowledge/${note.slug}`} className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                            Open Note
                          </Link>
                          <form action={archiveKnowledgeNoteFromListAction}>
                            <input type="hidden" name="slug" value={note.slug} />
                            <button type="submit" className="rounded-full bg-secondary-container px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
                              Archive
                            </button>
                          </form>
                        </>
                      ) : (
                        <>
                          <form action={restoreKnowledgeNoteFromListAction}>
                            <input type="hidden" name="slug" value={note.slug} />
                            <button type="submit" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                              Restore
                            </button>
                          </form>
                          <Link href={`/knowledge/${note.slug}`} className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                            Open
                          </Link>
                          <Link href={buildKnowledgeFilterHref({ view: "archived", domain: activeFilters.domain, tag: activeFilters.tag }) + `&confirmDelete=${note.slug}`} className="rounded-full bg-rose-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                            Delete
                          </Link>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[2.2rem] bg-surface-container-low p-8 text-sm text-foreground/60 shadow-ambient">
                {hasActiveFilter ? "No notes match the current filters yet." : archivedView ? "No archived notes yet." : "No live notes yet."}
              </div>
            )}
          </section>
        </div>
      </section>
    </ShellLayout>
  );
}
