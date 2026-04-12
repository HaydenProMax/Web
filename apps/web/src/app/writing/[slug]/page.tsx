import Link from "next/link";
import { notFound } from "next/navigation";

import { deletePublishedWritingPostAction } from "@/app/writing/new/actions";
import { ShellLayout } from "@/components/shell/shell-layout";
import { RichTextPreview } from "@/components/writing/rich-text-preview";
import { getPublishedWritingPost } from "@/server/writing/service";

function formatTimestamp(value?: string) {
  if (!value) {
    return "Not available";
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
  searchParams?: Promise<{ published?: string; confirmDelete?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const confirmDelete = resolvedSearchParams?.confirmDelete === "1";
  const post = await getPublishedWritingPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <ShellLayout title={post.title} description={post.summary}>
      {resolvedSearchParams?.published === "1" ? (
        <section className="mx-auto mb-8 w-full max-w-4xl rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Draft published successfully. You are viewing the article now.
        </section>
      ) : null}

      <section className="mx-auto mb-8 w-full max-w-4xl rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Published Article</p>
            <h2 className="font-headline text-3xl text-foreground">This is the published article</h2>
            <p className="max-w-3xl text-sm leading-6 text-foreground/70">
              Read the published article here, then return to the source draft or note when you want to revise it.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {confirmDelete ? (
              <form action={deletePublishedWritingPostAction}>
                <input type="hidden" name="postId" value={post.id} />
                <input type="hidden" name="confirmed" value="true" />
                <button type="submit" className="rounded-full bg-rose-700 px-5 py-3 text-sm font-semibold text-white shadow-ambient">
                  Confirm Delete Article
                </button>
              </form>
            ) : (
              <Link href={`/writing/${post.slug}?confirmDelete=1`} className="rounded-full bg-rose-700 px-5 py-3 text-sm font-semibold text-white shadow-ambient">
                Delete Article
              </Link>
            )}
            {post.sourceDraftId ? (
              <Link href={`/writing/drafts/${post.sourceDraftId}`} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
                Open source draft
              </Link>
            ) : null}
            {post.sourceNoteSlug ? (
              <Link href={`/knowledge/${post.sourceNoteSlug}`} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
                Open source note
              </Link>
            ) : null}
            {confirmDelete ? (
              <Link href={`/writing/${post.slug}`} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
                Cancel
              </Link>
            ) : null}
          </div>
        </div>

        {confirmDelete ? (
          <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-rose-700">Delete Confirmation</p>
            <p className="mt-3 text-sm leading-6 text-foreground/70">
              Deleting this article will remove the published version, but the draft will be kept.
            </p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Publication</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">{formatTimestamp(post.publishedAt)}</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">This article was last published at this time.</p>
          </article>
          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Revision Memory</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">{post.versionCount ?? 1} versions</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">Republishing the draft will continue this article's version history.</p>
          </article>
          <article className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Source Context</p>
            <h3 className="mt-3 font-headline text-2xl text-foreground">{post.sourceNoteTitle ?? post.sourceDraftTitle ?? "Standalone article"}</h3>
            <p className="mt-3 text-sm leading-6 text-foreground/70">
              {post.sourceNoteSlug ? "This article came from a knowledge note." : post.sourceDraftId ? "This article came from a draft and can still be updated from it." : "This article stands on its own."}
            </p>
          </article>
        </div>
      </section>

      <article className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">
            {post.category} | {post.readMinutes} min read
          </p>
          <p className="text-sm text-foreground/50">Published {new Date(post.publishedAt).toLocaleDateString("zh-CN")}</p>
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
