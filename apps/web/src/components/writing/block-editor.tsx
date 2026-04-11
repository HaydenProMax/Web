"use client";

import Image from "next/image";
import { useState } from "react";

import type { WritingEditorBlock } from "@/components/writing/block-editor-state";

type BlockEditorProps = {
  blocks: WritingEditorBlock[];
  onChange: (nextBlocks: WritingEditorBlock[]) => void;
};

const BLOCK_TYPE_OPTIONS = [
  { value: "paragraph", label: "Paragraph" },
  { value: "heading", label: "Heading" },
  { value: "quote", label: "Quote" },
  { value: "markdown", label: "Markdown" },
  { value: "image", label: "Image" },
  { value: "videoEmbed", label: "Video" }
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

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const [expandedImageUrls, setExpandedImageUrls] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        const showImageUrlInput = block.type === "image" && (!block.src || expandedImageUrls[block.id]);

        return (
          <article key={block.id} className="rounded-[1.5rem] border border-outline-variant/30 bg-white p-4 shadow-ambient">
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
                  className="rounded-full border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm font-semibold outline-none"
                >
                  {BLOCK_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="text-xs uppercase tracking-[0.18em] text-foreground/45">Block {index + 1}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (index === 0) return;
                    const next = [...blocks];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    onChange(next);
                  }}
                  className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary"
                >
                  Move Up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (index === blocks.length - 1) return;
                    const next = [...blocks];
                    [next[index], next[index + 1]] = [next[index + 1], next[index]];
                    onChange(next);
                  }}
                  className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary"
                >
                  Move Down
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
              {block.type === "heading" ? (
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/50">Level</label>
                  <select
                    value={block.level}
                    onChange={(event) =>
                      onChange(replaceAt(blocks, index, {
                        ...block,
                        level: Number(event.target.value) as 1 | 2 | 3
                      }))
                    }
                    className="rounded-full border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm outline-none"
                  >
                    <option value={1}>H1</option>
                    <option value={2}>H2</option>
                    <option value={3}>H3</option>
                  </select>
                </div>
              ) : null}

              {block.type === "image" ? (
                <>
                  {block.src ? (
                    <div className="space-y-3 rounded-[1.25rem] bg-surface-container-low p-3">
                      <div className="relative h-48 overflow-hidden rounded-[1rem] bg-white">
                        {renderImagePreview(block.src, block.alt || "Draft image")}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-foreground/55">This image block already has a source. You only need the URL field if you want to replace it manually.</p>
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

                  {showImageUrlInput ? (
                    <input
                      value={block.src}
                      onChange={(event) => onChange(replaceAt(blocks, index, { ...block, src: event.target.value }))}
                      placeholder="Image URL (required)"
                      className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm outline-none"
                    />
                  ) : null}

                  <input
                    value={block.alt}
                    onChange={(event) => onChange(replaceAt(blocks, index, { ...block, alt: event.target.value }))}
                    placeholder="Alt text (optional)"
                    className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm outline-none"
                  />
                  <input
                    value={block.caption}
                    onChange={(event) => onChange(replaceAt(blocks, index, { ...block, caption: event.target.value }))}
                    placeholder="Caption (optional)"
                    className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm outline-none"
                  />
                </>
              ) : block.type === "videoEmbed" ? (
                <>
                  <input
                    value={block.embedUrl}
                    onChange={(event) => onChange(replaceAt(blocks, index, { ...block, embedUrl: event.target.value }))}
                    placeholder="Embed URL (required)"
                    className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm outline-none"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/50">Provider</label>
                    <select
                      value={block.provider}
                      onChange={(event) =>
                        onChange(replaceAt(blocks, index, {
                          ...block,
                          provider: event.target.value as WritingEditorBlock["provider"]
                        }))
                      }
                      className="rounded-full border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm outline-none"
                    >
                      <option value="youtube">YouTube</option>
                      <option value="vimeo">Vimeo</option>
                      <option value="bilibili">Bilibili</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <input
                    value={block.caption}
                    onChange={(event) => onChange(replaceAt(blocks, index, { ...block, caption: event.target.value }))}
                    placeholder="Caption (optional)"
                    className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm outline-none"
                  />
                </>
              ) : (
                <>
                  {block.type === "markdown" ? (
                    <div className="rounded-[1rem] bg-surface-container-low px-4 py-3 text-xs leading-6 text-foreground/60">
                      Supports headings, lists, links, bold, italic, inline code, blockquotes, and fenced code blocks in preview.
                    </div>
                  ) : null}
                  <textarea
                    value={block.content}
                    onChange={(event) => onChange(replaceAt(blocks, index, { ...block, content: event.target.value }))}
                    rows={block.type === "markdown" ? 10 : block.type === "quote" ? 4 : 5}
                    placeholder={
                      block.type === "quote"
                        ? "Quote text"
                        : block.type === "heading"
                          ? "Heading text"
                          : block.type === "markdown"
                            ? "# Markdown block\n\nWrite **Markdown** here."
                            : "Write here"
                    }
                    className={`w-full rounded-[1.25rem] border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm outline-none ${block.type === "markdown" ? "font-mono leading-6" : ""}`}
                  />
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
