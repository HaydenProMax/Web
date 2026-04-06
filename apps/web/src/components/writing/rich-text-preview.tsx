import Image from "next/image";

import type { RichTextNode } from "@workspace/types/index";

type RichTextPreviewProps = {
  title?: string;
  summary?: string;
  coverImage?: string;
  coverAlt?: string;
  content: RichTextNode[];
  emptyMessage?: string;
  compact?: boolean;
};

function isProtectedLocalMediaUrl(value?: string) {
  return Boolean(value?.startsWith("/api/media/files/"));
}

function renderNode(node: RichTextNode, index: number) {
  if (node.type === "heading") {
    const HeadingTag = node.level === 3 ? "h3" : node.level === 2 ? "h2" : "h1";
    const className = node.level === 1
      ? "font-headline text-3xl text-foreground"
      : node.level === 2
        ? "font-headline text-2xl text-foreground"
        : "font-headline text-xl text-foreground";

    return (
      <HeadingTag key={index} className={className}>
        {node.content}
      </HeadingTag>
    );
  }

  if (node.type === "image" && node.src) {
    return (
      <figure key={index} className="space-y-3">
        <div className="relative h-[280px] overflow-hidden rounded-[1.5rem] bg-surface-container">
          <Image
            src={node.src}
            alt={node.alt ?? "Preview image"}
            fill
            className="object-cover"
            sizes="100vw"
            unoptimized={isProtectedLocalMediaUrl(node.src)}
          />
        </div>
        {node.caption ? <figcaption className="text-sm text-foreground/60">{node.caption}</figcaption> : null}
      </figure>
    );
  }

  if (node.type === "videoEmbed" && node.embedUrl) {
    return (
      <figure key={index} className="space-y-3">
        <div className="aspect-video overflow-hidden rounded-[1.5rem] bg-surface-container-low shadow-ambient">
          <iframe
            src={node.embedUrl}
            title={node.caption ?? "Embedded video"}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {node.caption ? <figcaption className="text-sm text-foreground/60">{node.caption}</figcaption> : null}
      </figure>
    );
  }

  if (node.type === "quote") {
    return (
      <blockquote key={index} className="rounded-[1.5rem] bg-primary-container/40 px-6 py-5 font-headline text-2xl italic text-primary">
        {node.content}
      </blockquote>
    );
  }

  return (
    <p key={index} className="text-lg leading-8 text-foreground/80">
      {node.content}
    </p>
  );
}

export function RichTextPreview({
  title,
  summary,
  coverImage,
  coverAlt,
  content,
  emptyMessage = "Start drafting to see a live preview.",
  compact = false
}: RichTextPreviewProps) {
  let skippedCoverDuplicate = false;
  const displayContent = content.filter((node) => {
    if (
      !skippedCoverDuplicate &&
      coverImage &&
      node.type === "image" &&
      node.src === coverImage
    ) {
      skippedCoverDuplicate = true;
      return false;
    }

    return true;
  });

  return (
    <article className={`mx-auto flex w-full flex-col ${compact ? "gap-6" : "gap-10"}`}>
      {title || summary ? (
        <div className="space-y-4">
          {title ? <h2 className="font-headline text-4xl leading-tight text-foreground">{title}</h2> : null}
          {summary ? <p className="text-base leading-7 text-foreground/70">{summary}</p> : null}
        </div>
      ) : null}

      {coverImage ? (
        <div className={`relative overflow-hidden rounded-[2rem] bg-surface-container-low shadow-ambient ${compact ? "h-[260px]" : "h-[420px]"}`}>
          <Image
            src={coverImage}
            alt={coverAlt ?? title ?? "Cover image"}
            fill
            className="object-cover"
            sizes="100vw"
            unoptimized={isProtectedLocalMediaUrl(coverImage)}
          />
        </div>
      ) : null}

      <div className="space-y-8">
        {displayContent.length > 0 ? displayContent.map((node, index) => renderNode(node, index)) : (
          <div className="rounded-[1.5rem] bg-surface-container-low px-5 py-4 text-sm text-foreground/60 shadow-ambient">
            {emptyMessage}
          </div>
        )}
      </div>
    </article>
  );
}
