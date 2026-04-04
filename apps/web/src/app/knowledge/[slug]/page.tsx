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
      description="Knowledge notes are designed as reusable, structured entries that can later support backlinks, domain navigation, archive integration, and now writing handoff."
    >
      {resolvedSearchParams?.created === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Note created successfully. It is now part of the live Knowledge library.
        </section>
      ) : null}

      {resolvedSearchParams?.saved === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Note saved successfully. The latest changes are now reflected in the knowledge library.
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-primary">
          {note.domainName ? <Link href={`/knowledge?domain=${toKnowledgeSlug(note.domainName)}`}>{note.domainName}</Link> : null}
          <span>{note.contentBlockCount} blocks</span>
          <span>Updated {new Date(note.updatedAt).toLocaleString("zh-CN")}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/writing/new?sourceNote=${note.slug}`} className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary shadow-ambient">
            Start Draft from Note
          </Link>
          <Link href={`/planner/new?note=${note.slug}`} className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary shadow-ambient">
            Create Task from Note
          </Link>
          <Link href="/archive" className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary shadow-ambient">
            View Archive
          </Link>
          <Link href={`/knowledge/${note.slug}/edit`} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white">
            Edit Note
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
        <RichTextPreview title={note.title} summary={note.summary} content={note.content} emptyMessage="This note is empty." />
      </section>

      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Writing Links</p>
            <h2 className="mt-3 font-headline text-2xl text-foreground">Related drafts and articles</h2>
          </div>
          <Link href={`/writing/new?sourceNote=${note.slug}`} className="text-sm font-semibold text-primary">
            Create from note
          </Link>
        </div>
        {note.relatedWriting.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {note.relatedWriting.map((item) => (
              <Link key={`${item.kind}-${item.id}`} href={item.href} className="rounded-[1.5rem] bg-white/80 p-4 shadow-ambient">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{item.kind === "draft" ? "Draft" : "Published"}</p>
                <h3 className="mt-3 font-headline text-xl text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-foreground/60">
                  {item.kind === "draft"
                    ? `Updated ${item.updatedAt ? new Date(item.updatedAt).toLocaleString("zh-CN") : "recently"}`
                    : `Published ${item.publishedAt ? new Date(item.publishedAt).toLocaleString("zh-CN") : "recently"}`}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm leading-6 text-foreground/70">
            No writing has been linked to this note yet. Start a draft from this note to turn the idea into a longer piece.
          </p>
        )}
      </section>

      <div className="flex items-center gap-4">
        <Link href="/knowledge" className="text-sm font-semibold text-primary">Back to knowledge</Link>
        <Link href="/knowledge/new" className="text-sm font-semibold text-primary">Create another note</Link>
      </div>
    </ShellLayout>
  );
}


