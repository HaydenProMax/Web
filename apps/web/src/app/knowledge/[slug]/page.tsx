import Link from "next/link";
import { notFound } from "next/navigation";

import { ShellLayout } from "@/components/shell/shell-layout";
import { RichTextPreview } from "@/components/writing/rich-text-preview";
import { getKnowledgeNoteBySlug } from "@/server/knowledge/service";

import { archiveKnowledgeNoteAction, restoreKnowledgeNoteFromListAction } from "../new/actions";

export default async function KnowledgeDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ created?: string; saved?: string; restored?: string; error?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const note = await getKnowledgeNoteBySlug(resolvedParams.slug, { includeArchived: true });

  if (!note) {
    notFound();
  }

  return (
    <ShellLayout
      title={note.title}
      description="A structured note with linked writing and reuse across the workspace."
    >
      {resolvedSearchParams?.created === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Note created successfully.
        </section>
      ) : null}

      {resolvedSearchParams?.saved === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Note saved successfully.
        </section>
      ) : resolvedSearchParams?.restored === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Note restored successfully.
        </section>
      ) : resolvedSearchParams?.error === "restore-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          Note restore failed. Please try again.
        </section>
      ) : null}

      {note.isArchived ? (
        <section className="rounded-[2rem] bg-secondary-container/40 px-6 py-4 text-sm text-foreground shadow-ambient">
          This note is archived. Restore it to use it again.
        </section>
      ) : null}

      <section className="rounded-[3rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.36),rgba(245,243,239,0.78))] px-8 py-10 shadow-ambient md:px-12">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-primary/80">
              {note.domainName ? (
                note.domainSlug ? <Link href={`/knowledge?domain=${note.domainSlug}`}>{note.domainName}</Link> : <span>{note.domainName}</span>
              ) : (
                <span>Knowledge</span>
              )}
              <span>{note.contentBlockCount} blocks</span>
              <span>{new Date(note.updatedAt).toLocaleDateString("zh-CN")}</span>
            </div>
            <h2 className="mt-6 font-headline text-6xl leading-none tracking-[-0.05em] text-foreground md:text-7xl">
              {note.title}
            </h2>
            {note.summary ? (
              <p className="mt-6 max-w-2xl text-base leading-8 text-foreground/65">{note.summary}</p>
            ) : null}
            {note.tagLinks.length > 0 ? (
              <div className="mt-8 flex flex-wrap gap-2">
                {note.tagLinks.map((tag) => (
                  <Link
                    key={tag.slug}
                    href={`/knowledge?tag=${tag.slug}`}
                    className="rounded-full bg-tertiary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-tertiary"
                  >
                    {tag.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            {!note.isArchived ? (
              <>
                <Link href={`/knowledge/${note.slug}/edit`} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white">
                  Edit Note
                </Link>
                <Link href={`/writing/new?sourceNote=${note.slug}`} className="rounded-full bg-white/85 px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
                  New Draft
                </Link>
                <Link href={`/planner/new?note=${note.slug}`} className="rounded-full bg-white/85 px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
                  New Task
                </Link>
                <form action={archiveKnowledgeNoteAction.bind(null, note.slug)}>
                  <button type="submit" className="rounded-full bg-secondary-container px-5 py-3 text-sm font-semibold text-secondary">
                    Archive
                  </button>
                </form>
              </>
            ) : (
              <>
                <form action={restoreKnowledgeNoteFromListAction}>
                  <input type="hidden" name="slug" value={note.slug} />
                  <button type="submit" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
                    Restore
                  </button>
                </form>
                <Link href="/knowledge?view=archived" className="rounded-full bg-white/85 px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
                  Back to Archive
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[2.5rem] bg-surface-container-low p-8 shadow-ambient md:p-10">
          <RichTextPreview title={undefined} summary={undefined} content={note.content} emptyMessage="This note is empty." />
        </div>

        <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <section className="rounded-[2.2rem] bg-surface-container-low p-6 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Reading Note</p>
            <h3 className="mt-4 font-headline text-3xl leading-tight text-foreground">Part of your living index</h3>
            <p className="mt-4 text-sm leading-7 text-foreground/65">
              Use this page as a quiet reading surface, then branch into writing or planning when the note is ready to move.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/knowledge" className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Back to Index
              </Link>
              <Link href="/knowledge/new" className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                New Note
              </Link>
            </div>
          </section>

          <section className="rounded-[2.2rem] bg-surface-container-low p-6 shadow-ambient">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Writing Links</p>
                <h3 className="mt-3 font-headline text-2xl text-foreground">Related writing</h3>
              </div>
              {!note.isArchived ? (
                <Link href={`/writing/new?sourceNote=${note.slug}`} className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  New Draft
                </Link>
              ) : null}
            </div>

            {note.relatedWriting.length > 0 ? (
              <div className="mt-6 space-y-4">
                {note.relatedWriting.map((item) => (
                  <Link key={`${item.kind}-${item.id}`} href={item.href} className="block rounded-[1.6rem] bg-surface-container-lowest p-5 shadow-ambient transition-colors hover:bg-white">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-secondary">{item.kind === "draft" ? "Draft" : "Published"}</p>
                    <h4 className="mt-3 font-headline text-2xl leading-tight text-foreground">{item.title}</h4>
                    <p className="mt-3 text-sm text-foreground/58">
                      {item.kind === "draft"
                        ? `Updated ${item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("zh-CN") : "recently"}`
                        : `Published ${item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("zh-CN") : "recently"}`}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm leading-7 text-foreground/65">No related writing yet.</p>
            )}
          </section>
        </aside>
      </section>
    </ShellLayout>
  );
}
