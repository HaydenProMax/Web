import Link from "next/link";

import { archiveKnowledgeNoteFromListAction, deleteArchivedKnowledgeNoteFromListAction, restoreKnowledgeNoteFromListAction } from "@/app/knowledge/new/actions";
import { ModuleCard } from "@/components/shell/module-card";
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
      description="Browse notes by domain and tag, then jump back into the ones worth expanding."
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

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href={archivedView ? "/knowledge" : "/knowledge?view=archived"} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
          {archivedView ? "View Live Notes" : `View Archived Notes (${library.overview.archivedCount})`}
        </Link>
        <Link href={activityReentry.href} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
          Resume {activityReentry.label} Lens
        </Link>
        {!archivedView ? (
          <Link href="/knowledge/new" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
            New Note
          </Link>
        ) : null}
      </div>


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

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Replay Context</p>
        <h2 className="mt-3 font-headline text-3xl text-foreground">Resume your current flow</h2>
        <p className="mt-3 text-sm leading-6 text-foreground/70">Your current focus is {activityReentry.label}. Jump back when you want to leave the library and continue there.</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={activityReentry.nextStep.href} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
            {activityReentry.nextStep.label}
          </Link>
          <p className="text-sm leading-6 text-foreground/60">{activityReentry.nextStep.description}</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-4">
        <ModuleCard title={archivedView ? "Archived Notes" : "Notes"} description={archivedView ? `${library.overview.noteCount} archived notes are available for restore.` : `${library.overview.noteCount} live notes are in the current knowledge view.`} eyebrow="Core" />
        <ModuleCard title="Domains" description={`${library.overview.domainCount} active domains are organizing the current thought spaces.`} eyebrow="Taxonomy" />
        <ModuleCard title="Tags" description={`${library.overview.tagCount} reusable tags are ready for future linking and filtering.`} eyebrow="Metadata" />
        <ModuleCard title="Archive Pool" description={`${library.overview.archivedCount} total notes are currently archived.`} eyebrow="State" />
      </section>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Recent Touches</p>
            <h2 className="mt-3 font-headline text-3xl text-foreground">{archivedView ? "Recently archived notes" : "Recently updated notes"}</h2>
          </div>
          <span className="text-sm text-foreground/50">{noteTouches.length} {archivedView ? "archived notes" : "visible note updates"}</span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {noteTouches.length > 0 ? noteTouches.map((note) => (
            <article key={note.id} className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{note.domainName ?? "Knowledge"}</p>
                <p className="text-xs text-foreground/50">{formatTouchTime(note.updatedAt)}</p>
              </div>
              <h3 className="mt-3 font-headline text-2xl text-foreground">{note.title}</h3>
              <p className="mt-3 text-sm leading-6 text-foreground/70">{note.summary || (archivedView ? "Ready to restore." : "Updated and ready to revisit.")}</p>
              {!archivedView ? (
                <Link href={`/knowledge/${note.slug}`} className="mt-4 inline-flex text-sm font-semibold text-primary">
                  Re-open note
                </Link>
              ) : (
                <form action={restoreKnowledgeNoteFromListAction} className="mt-4">
                  <input type="hidden" name="slug" value={note.slug} />
                  <button type="submit" className="inline-flex text-sm font-semibold text-primary">
                    Restore note
                  </button>
                </form>
              )}
            </article>
          )) : (
            <div className="rounded-[1.5rem] bg-white/80 p-4 text-sm text-foreground/60">
              {archivedView ? "No archived notes yet." : "No recent note activity yet. As notes are created or revised, they will appear here for quick re-entry."}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-2xl text-foreground">Active Filters</h2>
              {hasActiveFilter ? (
                <Link href={archivedView ? "/knowledge?view=archived" : "/knowledge"} className="text-sm font-semibold text-primary">Clear all</Link>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {activeFilters.domain ? (
                <Link href={buildKnowledgeFilterHref({ view: archivedView ? "archived" : undefined, tag: activeFilters.tag })} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
                  Domain: {activeDomainLabel}
                </Link>
              ) : null}
              {activeFilters.tag ? (
                <Link href={buildKnowledgeFilterHref({ view: archivedView ? "archived" : undefined, domain: activeFilters.domain })} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
                  Tag: {activeTagLabel}
                </Link>
              ) : null}
              {!hasActiveFilter ? (
                <span className="rounded-full bg-white/80 px-4 py-2 text-sm text-foreground/60">All {archivedView ? "archived" : "live"} notes</span>
              ) : null}
            </div>
          </div>

          <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
            <h2 className="font-headline text-2xl text-foreground">Domains</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {library.domains.length > 0 ? library.domains.map((domain) => {
                const isActive = activeFilters.domain === domain.slug;
                return (
                  <Link
                    key={domain.slug}
                    href={buildKnowledgeFilterHref({ view: archivedView ? "archived" : undefined, domain: isActive ? undefined : domain.slug, tag: activeFilters.tag })}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${isActive ? "bg-primary text-white" : "bg-white/80 text-primary"}`}
                  >
                    {domain.label} ({domain.count})
                  </Link>
                );
              }) : (
                <p className="text-sm text-foreground/60">No domains yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
            <h2 className="font-headline text-2xl text-foreground">Tags</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {library.tags.length > 0 ? library.tags.map((tag) => {
                const isActive = activeFilters.tag === tag.slug;
                return (
                  <Link
                    key={tag.slug}
                    href={buildKnowledgeFilterHref({ view: archivedView ? "archived" : undefined, domain: activeFilters.domain, tag: isActive ? undefined : tag.slug })}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${isActive ? "bg-primary text-white" : "bg-white/80 text-primary"}`}
                  >
                    {tag.label} ({tag.count})
                  </Link>
                );
              }) : (
                <p className="text-sm text-foreground/60">No tags yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-3xl">{archivedView ? "Archived Notes" : "Recent Notes"}</h2>
            <span className="text-sm text-foreground/50">Showing {notes.length} of {archivedView ? library.overview.archivedCount : library.overview.noteCount} {archivedView ? "archived notes" : "live notes"}</span>
          </div>

          {notes.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
              {notes.map((note) => (
                <article key={note.id} className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-primary">
                    {note.domainName ? (
                      note.domainSlug ? (
                        <Link href={buildKnowledgeFilterHref({ view: archivedView ? "archived" : undefined, domain: note.domainSlug, tag: activeFilters.tag })}>
                          {note.domainName}
                        </Link>
                      ) : <span>{note.domainName}</span>
                    ) : null}
                    <span>{note.contentBlockCount} blocks</span>
                  </div>
                  <h3 className="mt-3 font-headline text-2xl text-foreground">{note.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-foreground/70">{note.summary || "No summary yet."}</p>
                  {note.tagLinks.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {note.tagLinks.map((tag) => (
                        <Link key={tag.slug} href={buildKnowledgeFilterHref({ view: archivedView ? "archived" : undefined, domain: activeFilters.domain, tag: tag.slug })} className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-primary">
                          {tag.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-4 text-xs text-foreground/50">Updated {new Date(note.updatedAt).toLocaleString("zh-CN")}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {!archivedView ? (
                      <>
                        <Link href={`/knowledge/${note.slug}`} className="inline-flex text-sm font-semibold text-primary">
                          Open
                        </Link>
                        <form action={archiveKnowledgeNoteFromListAction}>
                          <input type="hidden" name="slug" value={note.slug} />
                          <button type="submit" className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-ambient">
                            Archive
                          </button>
                        </form>
                      </>
                    ) : (
                      <>
                        <form action={restoreKnowledgeNoteFromListAction}>
                          <input type="hidden" name="slug" value={note.slug} />
                          <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-ambient">
                            Restore
                          </button>
                        </form>
                        <Link href={`/knowledge/${note.slug}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-ambient">
                          Open
                        </Link>
                        <Link href={buildKnowledgeFilterHref({ view: "archived", domain: activeFilters.domain, tag: activeFilters.tag }) + `&confirmDelete=${note.slug}`} className="rounded-full bg-rose-700 px-4 py-2 text-sm font-semibold text-white shadow-ambient">
                          Delete
                        </Link>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] bg-surface-container-low p-6 text-sm text-foreground/60 shadow-ambient">
              {hasActiveFilter ? "No notes match the current filters yet." : archivedView ? "No archived notes yet." : "No live notes yet."}
            </div>
          )}
        </div>
      </section>
    </ShellLayout>
  );
}
