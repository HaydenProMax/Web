import Image from "next/image";
import { Fragment, type ReactNode } from "react";

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

type MarkdownTaskItem = {
  checked: boolean;
  text: string;
};

type MarkdownTable = {
  headers: string[];
  rows: string[][];
};

type MarkdownBlock =
  | { type: "paragraph"; lines: string[] }
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "blockquote"; lines: string[] }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "task-list"; items: MarkdownTaskItem[] }
  | { type: "table"; table: MarkdownTable }
  | { type: "rule" }
  | { type: "code"; code: string };

function canUseNextImage(value?: string) {
  if (!value) {
    return false;
  }

  if (value.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}

function renderImage(src: string, alt: string, className: string) {
  if (canUseNextImage(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        sizes="100vw"
        unoptimized={src.startsWith("/")}
      />
    );
  }

  return <img src={src} alt={alt} className={`h-full w-full ${className}`} />;
}

function isSafeMarkdownLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /(\[[^\]]+\]\((?:https?:\/\/)[^)\s]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const tokenKey = `${keyPrefix}-${match.index}`;

    if (token.startsWith("[")) {
      const parts = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (parts && isSafeMarkdownLink(parts[2])) {
        nodes.push(
          <a
            key={tokenKey}
            href={parts[2]}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary underline decoration-primary/40 underline-offset-4"
          >
            {renderInlineMarkdown(parts[1], `${tokenKey}-label`)}
          </a>
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={tokenKey} className="rounded bg-surface-container-low px-1.5 py-0.5 font-mono text-[0.95em] text-foreground">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={tokenKey} className="font-semibold text-foreground">
          {renderInlineMarkdown(token.slice(2, -2), `${tokenKey}-strong`)}
        </strong>
      );
    } else if (token.startsWith("*")) {
      nodes.push(
        <em key={tokenKey} className="italic">
          {renderInlineMarkdown(token.slice(1, -1), `${tokenKey}-em`)}
        </em>
      );
    } else {
      nodes.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function isMarkdownRule(line: string) {
  return /^(-{3,}|\*{3,}|_{3,})$/.test(line.trim());
}

function parseTableCells(line: string) {
  const normalized = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return normalized.split("|").map((cell) => cell.trim());
}

function isMarkdownTableSeparator(line: string) {
  const cells = parseTableCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      blocks.push({ type: "code", code: codeLines.join("\n") });
      continue;
    }

    if (isMarkdownRule(trimmed)) {
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2].trim()
      });
      index += 1;
      continue;
    }

    if (trimmed.includes("|") && index + 1 < lines.length && isMarkdownTableSeparator(lines[index + 1])) {
      const headers = parseTableCells(trimmed);
      const rows: string[][] = [];
      index += 2;

      while (index < lines.length) {
        const rowLine = lines[index].trim();
        if (!rowLine || !rowLine.includes("|")) {
          break;
        }
        rows.push(parseTableCells(rowLine));
        index += 1;
      }

      blocks.push({ type: "table", table: { headers, rows } });
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (index < lines.length) {
        const quoteLine = lines[index].trim();
        if (!/^>\s?/.test(quoteLine)) {
          break;
        }
        quoteLines.push(quoteLine.replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", lines: quoteLines });
      continue;
    }

    if (/^[-*+]\s+\[[xX ]\]\s+/.test(trimmed)) {
      const items: MarkdownTaskItem[] = [];
      while (index < lines.length) {
        const listLine = lines[index].trim();
        const listMatch = listLine.match(/^[-*+]\s+\[([xX ])\]\s+(.+)$/);
        if (!listMatch) {
          break;
        }
        items.push({ checked: listMatch[1].toLowerCase() === "x", text: listMatch[2] });
        index += 1;
      }
      blocks.push({ type: "task-list", items });
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length) {
        const listLine = lines[index].trim();
        const listMatch = listLine.match(/^[-*+]\s+(.+)$/);
        if (!listMatch || /^[-*+]\s+\[[xX ]\]\s+/.test(listLine)) {
          break;
        }
        items.push(listMatch[1]);
        index += 1;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length) {
        const listLine = lines[index].trim();
        const listMatch = listLine.match(/^\d+\.\s+(.+)$/);
        if (!listMatch) {
          break;
        }
        items.push(listMatch[1]);
        index += 1;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const paragraphLine = lines[index];
      const paragraphTrimmed = paragraphLine.trim();
      if (
        !paragraphTrimmed ||
        paragraphTrimmed.startsWith("```") ||
        isMarkdownRule(paragraphTrimmed) ||
        /^(#{1,3})\s+/.test(paragraphTrimmed) ||
        (paragraphTrimmed.includes("|") && index + 1 < lines.length && isMarkdownTableSeparator(lines[index + 1])) ||
        /^>\s?/.test(paragraphTrimmed) ||
        /^[-*+]\s+/.test(paragraphTrimmed) ||
        /^\d+\.\s+/.test(paragraphTrimmed)
      ) {
        break;
      }
      paragraphLines.push(paragraphLine);
      index += 1;
    }
    blocks.push({ type: "paragraph", lines: paragraphLines });
  }

  return blocks;
}

function renderMarkdownBlock(content: string, key: number) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div key={key} className="space-y-5 rounded-[1.5rem] bg-surface-container-low/60 px-5 py-5">
      {blocks.map((block, blockIndex) => {
        const blockKey = `markdown-${key}-${blockIndex}`;

        if (block.type === "heading") {
          const HeadingTag = block.level === 3 ? "h4" : block.level === 2 ? "h3" : "h2";
          const className = block.level === 1
            ? "font-headline text-3xl text-foreground"
            : block.level === 2
              ? "font-headline text-2xl text-foreground"
              : "font-headline text-xl text-foreground";

          return (
            <HeadingTag key={blockKey} className={className}>
              {renderInlineMarkdown(block.text, `${blockKey}-heading`)}
            </HeadingTag>
          );
        }

        if (block.type === "blockquote") {
          return (
            <blockquote key={blockKey} className="border-l-4 border-primary/30 pl-4 text-lg leading-8 text-foreground/75 italic">
              {block.lines.map((line, lineIndex) => (
                <Fragment key={`${blockKey}-quote-${lineIndex}`}>
                  {lineIndex > 0 ? <br /> : null}
                  {renderInlineMarkdown(line, `${blockKey}-quote-${lineIndex}`)}
                </Fragment>
              ))}
            </blockquote>
          );
        }

        if (block.type === "unordered-list") {
          return (
            <ul key={blockKey} className="list-disc space-y-2 pl-6 text-lg leading-8 text-foreground/80 marker:text-primary">
              {block.items.map((item, itemIndex) => (
                <li key={`${blockKey}-item-${itemIndex}`}>{renderInlineMarkdown(item, `${blockKey}-item-${itemIndex}`)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol key={blockKey} className="list-decimal space-y-2 pl-6 text-lg leading-8 text-foreground/80 marker:text-primary">
              {block.items.map((item, itemIndex) => (
                <li key={`${blockKey}-item-${itemIndex}`}>{renderInlineMarkdown(item, `${blockKey}-item-${itemIndex}`)}</li>
              ))}
            </ol>
          );
        }

        if (block.type === "task-list") {
          return (
            <ul key={blockKey} className="space-y-3 text-lg leading-8 text-foreground/80">
              {block.items.map((item, itemIndex) => (
                <li key={`${blockKey}-task-${itemIndex}`} className="flex items-start gap-3">
                  <span
                    className={`mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-semibold ${
                      item.checked
                        ? "border-primary bg-primary text-white"
                        : "border-outline-variant/50 bg-white text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className={item.checked ? "text-foreground/50 line-through" : "text-foreground/80"}>
                    {renderInlineMarkdown(item.text, `${blockKey}-task-${itemIndex}`)}
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "table") {
          return (
            <div key={blockKey} className="overflow-x-auto rounded-[1.25rem] border border-outline-variant/30 bg-white shadow-ambient">
              <table className="min-w-full border-collapse text-left text-sm text-foreground/80">
                <thead className="bg-surface-container-low text-foreground">
                  <tr>
                    {block.table.headers.map((header, headerIndex) => (
                      <th key={`${blockKey}-header-${headerIndex}`} className="border-b border-outline-variant/30 px-4 py-3 font-semibold">
                        {renderInlineMarkdown(header, `${blockKey}-header-${headerIndex}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.table.rows.map((row, rowIndex) => (
                    <tr key={`${blockKey}-row-${rowIndex}`} className="odd:bg-white even:bg-surface-container-low/30">
                      {block.table.headers.map((_, cellIndex) => (
                        <td key={`${blockKey}-cell-${rowIndex}-${cellIndex}`} className="border-t border-outline-variant/20 px-4 py-3 align-top">
                          {renderInlineMarkdown(row[cellIndex] ?? "", `${blockKey}-cell-${rowIndex}-${cellIndex}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === "rule") {
          return <hr key={blockKey} className="border-0 border-t border-outline-variant/40" />;
        }

        if (block.type === "code") {
          return (
            <pre key={blockKey} className="overflow-x-auto rounded-[1.25rem] bg-foreground px-4 py-4 text-sm leading-7 text-white shadow-ambient">
              <code>{block.code}</code>
            </pre>
          );
        }

        return (
          <p key={blockKey} className="text-lg leading-8 text-foreground/80">
            {block.lines.map((line, lineIndex) => (
              <Fragment key={`${blockKey}-line-${lineIndex}`}>
                {lineIndex > 0 ? <br /> : null}
                {renderInlineMarkdown(line, `${blockKey}-line-${lineIndex}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
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
          {renderImage(node.src, node.alt ?? "Preview image", "object-cover")}
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

  if (node.type === "markdown") {
    return renderMarkdownBlock(node.content ?? "", index);
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
    if (!skippedCoverDuplicate && coverImage && node.type === "image" && node.src === coverImage) {
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
          {renderImage(coverImage, coverAlt ?? title ?? "Cover image", "object-cover")}
        </div>
      ) : null}

      <div className="space-y-8">
        {displayContent.length > 0 ? (
          displayContent.map((node, index) => renderNode(node, index))
        ) : (
          <div className="rounded-[1.5rem] bg-surface-container-low px-5 py-4 text-sm text-foreground/60 shadow-ambient">
            {emptyMessage}
          </div>
        )}
      </div>
    </article>
  );
}
