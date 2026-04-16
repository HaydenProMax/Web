"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";

import type { MediaAssetSummary, RichTextNode } from "@workspace/types/index";

import { KnowledgeDocumentEditor } from "@/components/knowledge/knowledge-document-editor";
import {
  appendImageBlock,
  appendVideoBlock,
  areRichTextNodes,
  createEditorBlock,
  editorBlocksToRichTextNodes,
  richTextNodesToEditorBlocks,
  type WritingEditorBlock
} from "@/components/writing/block-editor-state";
import { RichTextPreview } from "@/components/writing/rich-text-preview";

type KnowledgeNoteFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  initialData: {
    title: string;
    summary: string;
    domainName: string;
    tags: string;
    content: string;
  };
  mode?: "create" | "edit";
};

function parseInitialBlocks(content: string) {
  try {
    const parsed = JSON.parse(content);
    if (!areRichTextNodes(parsed)) {
      return {
        blocks: richTextNodesToEditorBlocks([{ type: "paragraph", content }]),
        error: "Existing content could not be read as structured blocks."
      };
    }

    return {
      blocks: richTextNodesToEditorBlocks(parsed),
      error: ""
    };
  } catch (error) {
    return {
      blocks: richTextNodesToEditorBlocks([{ type: "paragraph", content }]),
      error: error instanceof Error ? error.message : "Existing content could not be parsed."
    };
  }
}

function isUploadedImageAsset(asset: MediaAssetSummary) {
  return asset.kind === "IMAGE" && Boolean(asset.url);
}

function applyImageAssetToBlock(blocks: WritingEditorBlock[], blockId: string, asset: MediaAssetSummary): WritingEditorBlock[] {
  const imageUrl = asset.url ?? "";
  if (!imageUrl) {
    return blocks;
  }

  return blocks.map((block) =>
    block.id === blockId
      ? {
          ...block,
          type: "image",
          src: imageUrl,
          alt: asset.altText || asset.originalFileName,
          caption: block.caption || asset.originalFileName
        }
      : block
  );
}

export function KnowledgeNoteForm({ action, initialData, mode = "create" }: KnowledgeNoteFormProps) {
  const initialBlocks = useMemo(() => parseInitialBlocks(initialData.content), [initialData.content]);
  const [title, setTitle] = useState(initialData.title);
  const [summary, setSummary] = useState(initialData.summary);
  const [domainName, setDomainName] = useState(initialData.domainName);
  const [tags, setTags] = useState(initialData.tags);
  const [blocks, setBlocks] = useState(initialBlocks.blocks);
  const editorError = initialBlocks.error;
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadedAssets, setUploadedAssets] = useState<MediaAssetSummary[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoCaption, setVideoCaption] = useState("");
  const [isUploading, startUploadTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const previewNodes = useMemo(() => editorBlocksToRichTextNodes(blocks), [blocks]);
  const previewExcerptNodes = useMemo(() => previewNodes.slice(0, 5), [previewNodes]);
  const serializedContent = useMemo(() => JSON.stringify(previewNodes, null, 2), [previewNodes]);
  const imageAssets = uploadedAssets.filter(isUploadedImageAsset);

  async function handleImageUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("moduleKey", "knowledge");
    formData.append("entityType", "note");
    formData.append("entityId", "pending");
    formData.append("fieldName", "content");
    formData.append("altText", file.name.replace(/\.[^.]+$/, ""));

    const response = await fetch("/api/media/uploads", {
      method: "POST",
      body: formData
    });

    const result = (await response.json()) as {
      ok: boolean;
      data?: MediaAssetSummary;
      error?: string;
    };

    if (!response.ok || !result.ok || !result.data) {
      throw new Error(result.error || "Image upload failed.");
    }

    setUploadedAssets((current) => [result.data!, ...current]);
    if (result.data.url) {
      setBlocks((current) => appendImageBlock(current, result.data!));
    }

    setUploadMessage(`${result.data.originalFileName} uploaded and added to the note.`);
  }

  async function handleVideoEmbed() {
    const normalizedUrl = videoUrl.trim();
    if (!normalizedUrl) {
      throw new Error("Paste a video URL first.");
    }

    const provider = normalizedUrl.includes("youtube") || normalizedUrl.includes("youtu.be")
      ? "youtube"
      : normalizedUrl.includes("bilibili")
        ? "bilibili"
        : normalizedUrl.includes("vimeo")
          ? "vimeo"
          : "custom";

    const formData = new FormData();
    formData.append("embedUrl", normalizedUrl);
    formData.append("moduleKey", "knowledge");
    formData.append("entityType", "note");
    formData.append("entityId", "pending");
    formData.append("fieldName", "content");
    formData.append("altText", videoCaption);

    const response = await fetch("/api/media/uploads", {
      method: "POST",
      body: formData
    });

    const result = (await response.json()) as {
      ok: boolean;
      data?: MediaAssetSummary;
      error?: string;
    };

    if (!response.ok || !result.ok || !result.data) {
      throw new Error(result.error || "Video embed creation failed.");
    }

    setUploadedAssets((current) => [result.data!, ...current]);
    setBlocks((current) => appendVideoBlock(current, result.data!, provider, videoCaption.trim()));
    setVideoUrl("");
    setVideoCaption("");
    setUploadMessage(`${provider} video added to the note.`);
  }

  function addBlock(type: RichTextNode["type"]) {
    setBlocks((current) => [...current, createEditorBlock(type)]);
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
      <section className="rounded-[2rem] bg-surface-container-low p-8 shadow-ambient">
        <div className="mb-8 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Editor</p>
          <h2 className="font-headline text-3xl text-foreground">{mode === "edit" ? "Edit note" : "New note"}</h2>
          <p className="text-sm leading-6 text-foreground/70">
            {mode === "edit"
              ? "Write on the left and glance at the reading view on the right."
              : "Start with Markdown, then add structure only when it helps."}
          </p>
        </div>

        <form action={action} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-semibold text-foreground/70">Title</label>
            <input
              id="title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="summary" className="text-sm font-semibold text-foreground/70">Summary</label>
            <textarea
              id="summary"
              name="summary"
              rows={4}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              className="w-full rounded-[1.5rem] border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
            />
          </div>

          <div className="rounded-[1.5rem] bg-white/80 p-4 shadow-ambient">
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground/70">Context</p>
              <p className="mt-1 text-xs text-foreground/50">Add just enough context to find this note later.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="domainName" className="text-sm font-semibold text-foreground/70">Domain</label>
                <input
                  id="domainName"
                  name="domainName"
                  value={domainName}
                  onChange={(event) => setDomainName(event.target.value)}
                  placeholder="Thinking, Systems, Reading..."
                  className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="tags" className="text-sm font-semibold text-foreground/70">Tags</label>
                <input
                  id="tags"
                  name="tags"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="reflection, architecture, notes"
                  className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-[1.5rem] bg-white/80 p-4 shadow-ambient">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground/70">Content</p>
                <p className="text-xs text-foreground/50">Markdown first. Add other blocks only when needed.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => addBlock("markdown")} className="rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white">Markdown</button>
                <button type="button" onClick={() => addBlock("paragraph")} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary">Paragraph</button>
                <button type="button" onClick={() => addBlock("heading")} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary">Heading</button>
              </div>
            </div>

            {editorError ? (
              <div className="rounded-[1.25rem] bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Existing content was loaded in recovery mode: {editorError}
              </div>
            ) : null}

            <KnowledgeDocumentEditor
              blocks={blocks}
              onChange={setBlocks}
              recentImages={imageAssets}
              onUseRecentImage={(blockId, asset) => {
                setBlocks((current) => applyImageAssetToBlock(current, blockId, asset));
                setUploadMessage(`${asset.originalFileName} applied to the image block.`);
              }}
            />
          </div>

          <details className="rounded-[1.5rem] bg-white/80 p-4 shadow-ambient">
            <summary className="cursor-pointer text-sm font-semibold text-foreground/70">More blocks</summary>
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => addBlock("quote")} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary">Quote</button>
                <button type="button" onClick={() => addBlock("image")} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary">Image</button>
                <button type="button" onClick={() => addBlock("videoEmbed")} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary">Video</button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-[1.25rem] bg-surface-container-low p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground/70">Image</p>
                      <p className="text-xs text-foreground/50">Upload an image only when it adds meaning.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {isUploading ? "Uploading..." : "Upload image"}
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        return;
                      }

                      startUploadTransition(async () => {
                        try {
                          await handleImageUpload(file);
                        } catch (error) {
                          setUploadMessage(error instanceof Error ? error.message : "Image upload failed.");
                        } finally {
                          event.target.value = "";
                        }
                      });
                    }}
                  />
                  {imageAssets.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {imageAssets.slice(0, 4).map((asset) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => {
                            if (asset.url) {
                              setBlocks((current) => appendImageBlock(current, asset));
                              setUploadMessage(`${asset.originalFileName} added again.`);
                            }
                          }}
                          className="overflow-hidden rounded-[1.1rem] border border-outline-variant/20 bg-white text-left"
                        >
                          <img src={asset.url} alt={asset.altText || asset.originalFileName} className="h-24 w-full object-cover" />
                          <div className="px-3 py-2">
                            <p className="truncate text-xs font-semibold text-foreground/70">{asset.originalFileName}</p>
                            <p className="mt-1 text-[11px] text-foreground/45">Insert again</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-[1.25rem] bg-surface-container-low p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground/70">Video</p>
                    <p className="text-xs text-foreground/50">Paste a link only when the note needs a video.</p>
                  </div>
                  <input
                    value={videoUrl}
                    onChange={(event) => setVideoUrl(event.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
                  />
                  <input
                    value={videoCaption}
                    onChange={(event) => setVideoCaption(event.target.value)}
                    placeholder="Caption (optional)"
                    className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => {
                      startUploadTransition(async () => {
                        try {
                          await handleVideoEmbed();
                        } catch (error) {
                          setUploadMessage(error instanceof Error ? error.message : "Video embed creation failed.");
                        }
                      });
                    }}
                    className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isUploading ? "Saving..." : "Insert Video"}
                  </button>
                </div>
              </div>
            </div>
          </details>

          {uploadMessage ? <p className="text-sm text-primary">{uploadMessage}</p> : null}

          {editorError ? (
            <p className="text-sm text-rose-600">
              This note was loaded in recovery mode. Save is disabled to avoid overwriting malformed content.
            </p>
          ) : null}

          <input type="hidden" name="content" value={serializedContent} />

          <details className="rounded-[1.5rem] bg-white/80 p-4 shadow-ambient">
            <summary className="cursor-pointer text-sm font-semibold text-foreground/70">JSON preview</summary>
            <textarea
              value={serializedContent}
              readOnly
              rows={12}
              className="mt-4 w-full rounded-[1.25rem] border border-outline-variant/20 bg-surface-container-low px-4 py-3 font-mono text-xs outline-none"
            />
          </details>

          <div className="flex items-center gap-4">
            <button type="submit" disabled={Boolean(editorError)} className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {mode === "edit" ? "Save Note" : "Create Note"}
            </button>
            <Link href="/knowledge" className="text-sm font-semibold text-primary">
              Back to notes
            </Link>
          </div>
        </form>
      </section>

      <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Preview</p>
          <h3 className="mt-3 font-headline text-2xl">Reading view</h3>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            A short preview of how this note reads.
          </p>
        </div>

        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <div className="mb-4 flex items-center justify-between gap-3 text-xs text-foreground/50">
            <span>Showing {Math.min(previewExcerptNodes.length, 5)} blocks</span>
            {previewNodes.length > previewExcerptNodes.length ? (
              <span>{previewNodes.length - previewExcerptNodes.length} more hidden</span>
            ) : null}
          </div>
          <div className="max-h-[56vh] overflow-y-auto pr-2">
          <RichTextPreview
            title={title || "Untitled note"}
            summary={summary}
            content={previewExcerptNodes}
            compact
            emptyMessage="Add content to preview this note."
          />
          </div>
        </div>
      </aside>
    </div>
  );
}
