"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";

import type { MediaAssetSummary, RichTextNode } from "@workspace/types/index";

import { BlockEditor } from "@/components/writing/block-editor";
import {
  appendImageBlock,
  appendVideoBlock,
  areRichTextNodes,
  createEditorBlock,
  editorBlocksToRichTextNodes,
  richTextNodesToEditorBlocks
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

    setUploadMessage(`Uploaded ${result.data.originalFileName} and inserted it into the note.`);
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
    setUploadMessage(`Added a ${provider} video block to the note.`);
  }

  function addBlock(type: RichTextNode["type"]) {
    setBlocks((current) => [...current, createEditorBlock(type)]);
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
      <section className="rounded-[2rem] bg-surface-container-low p-8 shadow-ambient">
        <div className="mb-8 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Knowledge Form</p>
          <h2 className="font-headline text-3xl text-foreground">{mode === "edit" ? "Refine this note" : "Capture a new note"}</h2>
          <p className="text-sm leading-6 text-foreground/70">
            {mode === "edit"
              ? "Edit blocks on the left and review the result on the right."
              : "Start with blocks, then shape the note as you go."}
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
              <p className="text-sm font-semibold text-foreground/70">Knowledge Context</p>
              <p className="mt-1 text-xs text-foreground/50">Use domain and tags to make the note easier to find later.</p>
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
                <p className="text-sm font-semibold text-foreground/70">Content Blocks</p>
                <p className="text-xs text-foreground/50">Start simple, then add more structure only when you need it.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => addBlock("paragraph")} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary">Add Paragraph</button>
                <button type="button" onClick={() => addBlock("heading")} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary">Add Heading</button>
                <button type="button" onClick={() => addBlock("markdown")} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary">Add Markdown</button>
              </div>
            </div>

            {editorError ? (
              <div className="rounded-[1.25rem] bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Existing content was loaded in recovery mode: {editorError}
              </div>
            ) : null}

            <BlockEditor blocks={blocks} onChange={setBlocks} />
          </div>

          <details className="rounded-[1.5rem] bg-white/80 p-4 shadow-ambient">
            <summary className="cursor-pointer text-sm font-semibold text-foreground/70">Add Quote, Image, or Video</summary>
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => addBlock("quote")} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary">Add Quote Block</button>
                <button type="button" onClick={() => addBlock("image")} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary">Add Empty Image Block</button>
                <button type="button" onClick={() => addBlock("videoEmbed")} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary">Add Empty Video Block</button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-[1.25rem] bg-surface-container-low p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground/70">Image</p>
                      <p className="text-xs text-foreground/50">Upload and insert an image when the note needs it.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {isUploading ? "Uploading..." : "Choose Image"}
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
                              setUploadMessage(`Inserted ${asset.originalFileName} into the note again.`);
                            }
                          }}
                          className="overflow-hidden rounded-[1.1rem] border border-outline-variant/20 bg-white text-left"
                        >
                          <img src={asset.url} alt={asset.altText || asset.originalFileName} className="h-24 w-full object-cover" />
                          <div className="px-3 py-2">
                            <p className="truncate text-xs font-semibold text-foreground/70">{asset.originalFileName}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-[1.25rem] bg-surface-container-low p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground/70">Video</p>
                    <p className="text-xs text-foreground/50">Paste a link only when a video really helps the note.</p>
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
            <summary className="cursor-pointer text-sm font-semibold text-foreground/70">Generated JSON</summary>
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
              Back to knowledge
            </Link>
          </div>
        </form>
      </section>

      <aside className="space-y-6">
        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Live Preview</p>
          <h3 className="mt-3 font-headline text-2xl">Preview</h3>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            This is how the note will read when opened.
          </p>
        </div>

        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <RichTextPreview
            title={title || "Untitled note"}
            summary={summary}
            content={previewNodes}
            compact
            emptyMessage="Add content to preview the note."
          />
        </div>
      </aside>
    </div>
  );
}
