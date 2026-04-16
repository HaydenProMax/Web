"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import type { MediaAssetSummary } from "@workspace/types/index";

import { createEditorBlock, type WritingEditorBlock } from "@/components/writing/block-editor-state";

type KnowledgeDocumentEditorProps = {
  blocks: WritingEditorBlock[];
  onChange: (nextBlocks: WritingEditorBlock[]) => void;
  recentImages?: MediaAssetSummary[];
  onUseRecentImage?: (blockId: string, asset: MediaAssetSummary) => void;
};

const BLOCK_TYPE_OPTIONS = [
  { value: "paragraph", label: "Paragraph" },
  { value: "heading", label: "Heading" },
  { value: "markdown", label: "Markdown" },
  { value: "quote", label: "Quote" },
  { value: "image", label: "Image" },
  { value: "videoEmbed", label: "Video" }
] as const;

const MARKDOWN_TOOLBAR = [
  { label: "H2", action: "heading" },
  { label: "Bold", action: "bold" },
  { label: "List", action: "list" },
  { label: "Quote", action: "quote" },
  { label: "Link", action: "link" },
  { label: "Code", action: "code" },
  { label: "Mermaid", action: "mermaid" },
  { label: "Divider", action: "divider" }
] as const;

function replaceAt<T>(items: T[], index: number, value: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? value : item));
}

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

function renderImagePreview(src: string, alt: string) {
  if (canUseNextImage(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="100vw"
        unoptimized={src.startsWith("/")}
      />
    );
  }

  return <img src={src} alt={alt} className="h-full w-full object-cover" />;
}

function moveBlock(blocks: WritingEditorBlock[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= blocks.length) {
    return blocks;
  }

  const next = [...blocks];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

function isTextLikeBlock(type: WritingEditorBlock["type"]) {
  return type === "paragraph" || type === "heading" || type === "markdown";
}

function updateBlockAt(blocks: WritingEditorBlock[], index: number, updater: (block: WritingEditorBlock) => WritingEditorBlock) {
  return replaceAt(blocks, index, updater(blocks[index]));
}

function insertBlockAfter(blocks: WritingEditorBlock[], index: number, type: WritingEditorBlock["type"]) {
  const next = [...blocks];
  next.splice(index + 1, 0, createEditorBlock(type));
  return next;
}

function prefixSelectedLines(value: string, selectionStart: number, selectionEnd: number, prefix: string) {
  const lineStart = value.lastIndexOf("\n", Math.max(selectionStart - 1, 0)) + 1;
  const lineEndCandidate = value.indexOf("\n", selectionEnd);
  const lineEnd = lineEndCandidate === -1 ? value.length : lineEndCandidate;
  const selectedLines = value.slice(lineStart, lineEnd);
  const nextLines = selectedLines
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");

  return {
    value: `${value.slice(0, lineStart)}${nextLines}${value.slice(lineEnd)}`,
    selectionStart: lineStart,
    selectionEnd: lineStart + nextLines.length
  };
}

function wrapSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
  suffix: string,
  fallback = ""
) {
  const selectedText = value.slice(selectionStart, selectionEnd) || fallback;
  const nextValue = `${value.slice(0, selectionStart)}${prefix}${selectedText}${suffix}${value.slice(selectionEnd)}`;
  const innerStart = selectionStart + prefix.length;
  return {
    value: nextValue,
    selectionStart: innerStart,
    selectionEnd: innerStart + selectedText.length
  };
}

function insertMarkdownSnippet(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  action: (typeof MARKDOWN_TOOLBAR)[number]["action"]
) {
  switch (action) {
    case "heading":
      return prefixSelectedLines(value, selectionStart, selectionEnd, "## ");
    case "bold":
      return wrapSelection(value, selectionStart, selectionEnd, "**", "**", "bold text");
    case "list":
      return prefixSelectedLines(value, selectionStart, selectionEnd, "- ");
    case "quote":
      return prefixSelectedLines(value, selectionStart, selectionEnd, "> ");
    case "link":
      return wrapSelection(value, selectionStart, selectionEnd, "[", "](https://example.com)", "link text");
    case "code":
      return wrapSelection(value, selectionStart, selectionEnd, "```ts\n", "\n```", "const value = true;");
    case "mermaid":
      return wrapSelection(value, selectionStart, selectionEnd, "```mermaid\n", "\n```", "graph TD\n  A[Start] --> B[Next]");
    case "divider": {
      const snippet = "\n---\n";
      const nextValue = `${value.slice(0, selectionEnd)}${snippet}${value.slice(selectionEnd)}`;
      const cursor = selectionEnd + snippet.length;
      return { value: nextValue, selectionStart: cursor, selectionEnd: cursor };
    }
  }
}

export function KnowledgeDocumentEditor({ blocks, onChange, recentImages = [], onUseRecentImage }: KnowledgeDocumentEditorProps) {
  const [expandedImageUrls, setExpandedImageUrls] = useState<Record<string, boolean>>({});
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  function applyMarkdownAction(index: number, action: (typeof MARKDOWN_TOOLBAR)[number]["action"]) {
    const textarea = textareaRefs.current[blocks[index].id];
    const currentBlock = blocks[index];
    if (!textarea || currentBlock.type !== "markdown") {
      return;
    }

    const selectionStart = textarea.selectionStart ?? currentBlock.content.length;
    const selectionEnd = textarea.selectionEnd ?? currentBlock.content.length;
    const nextSnippet = insertMarkdownSnippet(currentBlock.content, selectionStart, selectionEnd, action);

    onChange(updateBlockAt(blocks, index, (block) => ({ ...block, content: nextSnippet.value })));

    requestAnimationFrame(() => {
      const nextTextarea = textareaRefs.current[currentBlock.id];
      nextTextarea?.focus();
      nextTextarea?.setSelectionRange(nextSnippet.selectionStart, nextSnippet.selectionEnd);
    });
  }

  return (
    <div className="space-y-6">
      {blocks.map((block, index) => {
        const textLike = isTextLikeBlock(block.type);
        const showImageUrlInput = block.type === "image" && (!block.src || expandedImageUrls[block.id]);
        const isFirstBlock = index === 0;
        const isLastBlock = index === blocks.length - 1;

        if (textLike) {
          return (
            <section key={block.id} className="rounded-[2rem] bg-surface-container-lowest px-6 py-6 shadow-ambient">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={block.type}
                    onChange={(event) =>
                      onChange(replaceAt(blocks, index, {
                        ...block,
                        type: event.target.value as WritingEditorBlock["type"]
                      }))
                    }
                    className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-foreground outline-none"
                  >
                    {BLOCK_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {block.type === "heading" ? (
                    <select
                      value={block.level}
                      onChange={(event) =>
                        onChange(replaceAt(blocks, index, {
                          ...block,
                          level: Number(event.target.value) as 1 | 2 | 3
                        }))
                      }
                      className="rounded-full bg-surface-container-low px-4 py-2 text-sm text-foreground outline-none"
                    >
                      <option value={1}>H1</option>
                      <option value={2}>H2</option>
                      <option value={3}>H3</option>
                    </select>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onChange(moveBlock(blocks, index, -1))}
                    disabled={isFirstBlock}
                    className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Move Up
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(moveBlock(blocks, index, 1))}
                    disabled={isLastBlock}
                    className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Move Down
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(insertBlockAfter(blocks, index, block.type === "markdown" ? "markdown" : "paragraph"))}
                    className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-primary shadow-ambient"
                  >
                    Add next
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(blocks.length === 1 ? [blocks[0]] : blocks.filter((_, itemIndex) => itemIndex !== index))}
                    className="rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {block.type === "heading" ? (
                <input
                  value={block.content}
                  onChange={(event) => onChange(replaceAt(blocks, index, { ...block, content: event.target.value }))}
                  placeholder="Heading"
                  className="mt-5 w-full bg-transparent font-headline text-4xl leading-tight tracking-[-0.03em] text-foreground outline-none placeholder:text-foreground/35"
                />
              ) : (
                <div className={block.type === "markdown" ? "mt-5 rounded-[1.75rem] bg-surface px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]" : ""}>
                  {block.type === "markdown" ? (
                    <>
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-foreground/45">
                        <span>Markdown</span>
                        <span>Quick tools for structure and diagrams</span>
                      </div>
                      <div className="mb-4 flex flex-wrap gap-2">
                        {MARKDOWN_TOOLBAR.map((tool) => (
                          <button
                            key={tool.action}
                            type="button"
                            onClick={() => applyMarkdownAction(index, tool.action)}
                            className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary"
                          >
                            {tool.label}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                  <textarea
                    ref={(element) => {
                      textareaRefs.current[block.id] = element;
                    }}
                    value={block.content}
                    onChange={(event) => onChange(replaceAt(blocks, index, { ...block, content: event.target.value }))}
                    rows={block.type === "markdown" ? 22 : 14}
                    placeholder={block.type === "markdown" ? "# Start here\n\nWrite in Markdown." : "Start writing"}
                    className={block.type === "markdown"
                      ? "w-full resize-y bg-transparent font-mono text-[15px] leading-8 text-foreground outline-none placeholder:text-foreground/30"
                      : "w-full resize-y rounded-[1.5rem] bg-surface px-5 py-5 text-base leading-8 text-foreground outline-none placeholder:text-foreground/35"}
                  />
                </div>
              )}
            </section>
          );
        }

        return (
          <article key={block.id} className="rounded-[1.6rem] bg-surface-container-lowest p-5 shadow-ambient">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={block.type}
                  onChange={(event) =>
                    onChange(replaceAt(blocks, index, {
                      ...block,
                      type: event.target.value as WritingEditorBlock["type"]
                    }))
                  }
                  className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-foreground outline-none"
                >
                  {BLOCK_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] uppercase tracking-[0.18em] text-foreground/40">Block {index + 1}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onChange(moveBlock(blocks, index, -1))}
                  disabled={isFirstBlock}
                  className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Move Up
                </button>
                <button
                  type="button"
                  onClick={() => onChange(moveBlock(blocks, index, 1))}
                  disabled={isLastBlock}
                  className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Move Down
                </button>
                <button
                  type="button"
                  onClick={() => onChange(insertBlockAfter(blocks, index, block.type))}
                  className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-primary shadow-ambient"
                >
                  Add next
                </button>
                <button
                  type="button"
                  onClick={() => onChange(blocks.length === 1 ? [blocks[0]] : blocks.filter((_, itemIndex) => itemIndex !== index))}
                  className="rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {block.type === "quote" ? (
                <textarea
                  value={block.content}
                  onChange={(event) => onChange(replaceAt(blocks, index, { ...block, content: event.target.value }))}
                  rows={5}
                  placeholder="Quote"
                  className="w-full rounded-[1.25rem] bg-surface px-4 py-4 text-lg italic leading-8 text-foreground outline-none"
                />
              ) : null}

              {block.type === "image" ? (
                <>
                  {block.src ? (
                    <div className="space-y-3 rounded-[1.25rem] bg-surface p-3">
                      <div className="relative h-56 overflow-hidden rounded-[1rem]">
                        {renderImagePreview(block.src, block.alt || "Note image")}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-foreground/55">Only change the URL if you want a different image.</p>
                        <button
                          type="button"
                          onClick={() => setExpandedImageUrls((current) => ({ ...current, [block.id]: !current[block.id] }))}
                          className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-primary shadow-ambient"
                        >
                          {showImageUrlInput ? "Hide URL" : "Edit URL"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {!block.src && recentImages.length > 0 ? (
                    <div className="space-y-3 rounded-[1.25rem] bg-surface p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/45">Recent uploads</p>
                        <p className="text-xs text-foreground/55">Choose one for this block</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {recentImages.slice(0, 3).map((asset) => (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => onUseRecentImage?.(block.id, asset)}
                            className="overflow-hidden rounded-[1rem] border border-outline-variant/20 bg-white text-left shadow-ambient"
                          >
                            <div className="h-24 overflow-hidden bg-surface-container-low">
                              <img
                                src={asset.url}
                                alt={asset.altText || asset.originalFileName}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="px-3 py-2">
                              <p className="truncate text-xs font-semibold text-foreground/70">{asset.originalFileName}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {showImageUrlInput ? (
                    <input
                      value={block.src}
                      onChange={(event) => onChange(replaceAt(blocks, index, { ...block, src: event.target.value }))}
                      placeholder="Image URL"
                      className="w-full rounded-[1.25rem] bg-surface px-4 py-3 text-sm outline-none"
                    />
                  ) : null}

                  <input
                    value={block.alt}
                    onChange={(event) => onChange(replaceAt(blocks, index, { ...block, alt: event.target.value }))}
                    placeholder="Image note"
                    className="w-full rounded-[1.25rem] bg-surface px-4 py-3 text-sm outline-none"
                  />
                  <input
                    value={block.caption}
                    onChange={(event) => onChange(replaceAt(blocks, index, { ...block, caption: event.target.value }))}
                    placeholder="Caption"
                    className="w-full rounded-[1.25rem] bg-surface px-4 py-3 text-sm outline-none"
                  />
                </>
              ) : null}

              {block.type === "videoEmbed" ? (
                <>
                  <input
                    value={block.embedUrl}
                    onChange={(event) => onChange(replaceAt(blocks, index, { ...block, embedUrl: event.target.value }))}
                    placeholder="Video URL"
                    className="w-full rounded-[1.25rem] bg-surface px-4 py-3 text-sm outline-none"
                  />
                  <select
                    value={block.provider}
                    onChange={(event) =>
                      onChange(replaceAt(blocks, index, {
                        ...block,
                        provider: event.target.value as WritingEditorBlock["provider"]
                      }))
                    }
                    className="rounded-full bg-surface-container-low px-4 py-2 text-sm outline-none"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="vimeo">Vimeo</option>
                    <option value="bilibili">Bilibili</option>
                    <option value="custom">Custom</option>
                  </select>
                  <input
                    value={block.caption}
                    onChange={(event) => onChange(replaceAt(blocks, index, { ...block, caption: event.target.value }))}
                    placeholder="Caption"
                    className="w-full rounded-[1.25rem] bg-surface px-4 py-3 text-sm outline-none"
                  />
                </>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
