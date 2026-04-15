"use client";

import Image from "next/image";
import { useState } from "react";

import type { WritingEditorBlock } from "@/components/writing/block-editor-state";

type KnowledgeDocumentEditorProps = {
  blocks: WritingEditorBlock[];
  onChange: (nextBlocks: WritingEditorBlock[]) => void;
};

const BLOCK_TYPE_OPTIONS = [
  { value: "paragraph", label: "Paragraph" },
  { value: "heading", label: "Heading" },
  { value: "markdown", label: "Markdown" },
  { value: "quote", label: "Quote" },
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

export function KnowledgeDocumentEditor({ blocks, onChange }: KnowledgeDocumentEditorProps) {
  const [expandedImageUrls, setExpandedImageUrls] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-6">
      {blocks.map((block, index) => {
        const textLike = isTextLikeBlock(block.type);
        const showImageUrlInput = block.type === "image" && (!block.src || expandedImageUrls[block.id]);

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
                    className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary"
                  >
                    Move Up
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(moveBlock(blocks, index, 1))}
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

              {block.type === "heading" ? (
                <input
                  value={block.content}
                  onChange={(event) => onChange(replaceAt(blocks, index, { ...block, content: event.target.value }))}
                  placeholder="Write a heading"
                  className="mt-5 w-full bg-transparent font-headline text-4xl leading-tight tracking-[-0.03em] text-foreground outline-none placeholder:text-foreground/35"
                />
              ) : (
                <div className={block.type === "markdown" ? "mt-5 rounded-[1.75rem] bg-surface px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]" : ""}>
                  {block.type === "markdown" ? (
                    <div className="mb-4 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-foreground/45">
                      <span>Markdown Sheet</span>
                      <span>Supports headings, lists, links, quotes, tables, and code</span>
                    </div>
                  ) : null}
                  <textarea
                    value={block.content}
                    onChange={(event) => onChange(replaceAt(blocks, index, { ...block, content: event.target.value }))}
                    rows={block.type === "markdown" ? 22 : 14}
                    placeholder={block.type === "markdown" ? "# Start with a heading\n\nWrite Markdown here." : "Start writing here"}
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
                  className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary"
                >
                  Move Up
                </button>
                <button
                  type="button"
                  onClick={() => onChange(moveBlock(blocks, index, 1))}
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
              {block.type === "quote" ? (
                <textarea
                  value={block.content}
                  onChange={(event) => onChange(replaceAt(blocks, index, { ...block, content: event.target.value }))}
                  rows={5}
                  placeholder="Quote text"
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
                        <p className="text-xs text-foreground/55">Edit the URL only if you want to replace the image source.</p>
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
                      placeholder="Image URL"
                      className="w-full rounded-[1.25rem] bg-surface px-4 py-3 text-sm outline-none"
                    />
                  ) : null}

                  <input
                    value={block.alt}
                    onChange={(event) => onChange(replaceAt(blocks, index, { ...block, alt: event.target.value }))}
                    placeholder="Alt text"
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
                    placeholder="Embed URL"
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
