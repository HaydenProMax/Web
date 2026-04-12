"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { MediaAssetSummary, RichTextNode, WritingVisibility } from "@workspace/types/index";

import { BlockEditor } from "@/components/writing/block-editor";
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

type WritingDraftFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  initialData: {
    title: string;
    summary: string;
    coverImageUrl: string;
    sourceNoteSlug: string;
    visibility: WritingVisibility;
    content: string;
  };
  mode: "create" | "edit";
};

function normalizeVideoInput(raw: string) {
  const value = raw.trim();
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);

    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "");
      return {
        provider: "youtube" as const,
        embedUrl: `https://www.youtube.com/embed/${id}`
      };
    }

    if (url.hostname.includes("youtube.com")) {
      if (url.pathname == "/watch") {
        const id = url.searchParams.get("v");
        if (id) {
          return {
            provider: "youtube" as const,
            embedUrl: `https://www.youtube.com/embed/${id}`
          };
        }
      }

      if (url.pathname.startsWith("/embed/")) {
        return {
          provider: "youtube" as const,
          embedUrl: url.toString()
        };
      }
    }

    if (url.hostname.includes("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).at(-1);
      if (id) {
        return {
          provider: "vimeo" as const,
          embedUrl: `https://player.vimeo.com/video/${id}`
        };
      }
    }

    if (url.hostname.includes("bilibili.com")) {
      if (url.hostname.startsWith("player.")) {
        return {
          provider: "bilibili" as const,
          embedUrl: url.toString()
        };
      }

      const match = url.pathname.match(/\/video\/(BV[\w]+)/i);
      if (match?.[1]) {
        return {
          provider: "bilibili" as const,
          embedUrl: `https://player.bilibili.com/player.html?bvid=${match[1]}&page=1`
        };
      }
    }

    return {
      provider: "custom" as const,
      embedUrl: url.toString()
    };
  } catch {
    return undefined;
  }
}

function parseInitialBlocks(content: string) {
  try {
    const parsed = JSON.parse(content);
    if (!areRichTextNodes(parsed)) {
      return {
        blocks: [createEditorBlock("paragraph", { content })],
        error: "Content JSON is invalid."
      };
    }

    return {
      blocks: richTextNodesToEditorBlocks(parsed),
      error: ""
    };
  } catch (error) {
    return {
      blocks: [createEditorBlock("paragraph", { content })],
      error: error instanceof Error ? error.message : "Content JSON is invalid."
    };
  }
}

function serializeDraftState(input: {
  title: string;
  summary: string;
  coverImageUrl: string;
  visibility: WritingVisibility;
  content: RichTextNode[];
}) {
  return JSON.stringify(input);
}

export function WritingDraftForm({ action, initialData, mode }: WritingDraftFormProps) {
  const initialBlocks = useMemo(() => parseInitialBlocks(initialData.content), [initialData.content]);
  const [title, setTitle] = useState(initialData.title);
  const [summary, setSummary] = useState(initialData.summary);
  const [coverImageUrl, setCoverImageUrl] = useState(initialData.coverImageUrl);
  const sourceNoteSlug = initialData.sourceNoteSlug;
  const [visibility, setVisibility] = useState(initialData.visibility);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoCaption, setVideoCaption] = useState("");
  const [uploadMessage, setUploadMessage] = useState<string>("");
  const [uploadedAssets, setUploadedAssets] = useState<MediaAssetSummary[]>([]);
  const latestUploadedImage = uploadedAssets.find((asset) => asset.kind === "IMAGE" && asset.url);
  const [isUploading, startUploadTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [blocks, setBlocks] = useState<WritingEditorBlock[]>(initialBlocks.blocks);
  const [editorError, setEditorError] = useState(initialBlocks.error);

  useEffect(() => {
    setTitle(initialData.title);
    setSummary(initialData.summary);
    setCoverImageUrl(initialData.coverImageUrl);
    setVisibility(initialData.visibility);
    setBlocks(initialBlocks.blocks);
    setEditorError(initialBlocks.error);
    setVideoUrl("");
    setVideoCaption("");
    setUploadMessage("");
    setUploadedAssets([]);
  }, [initialBlocks.blocks, initialBlocks.error, initialData.coverImageUrl, initialData.summary, initialData.title, initialData.visibility]);

  const previewState = useMemo(() => {
    const nodes = editorBlocksToRichTextNodes(blocks);
    return {
      nodes,
      error: editorError
    };
  }, [blocks, editorError]);

  const serializedContent = useMemo(() => JSON.stringify(previewState.nodes, null, 2), [previewState.nodes]);
  const initialSnapshot = useMemo(
    () =>
      serializeDraftState({
        title: initialData.title,
        summary: initialData.summary,
        coverImageUrl: initialData.coverImageUrl,
        visibility: initialData.visibility,
        content: initialBlocks.error ? [] : editorBlocksToRichTextNodes(initialBlocks.blocks)
      }),
    [initialBlocks.blocks, initialBlocks.error, initialData.coverImageUrl, initialData.summary, initialData.title, initialData.visibility]
  );
  const currentSnapshot = useMemo(
    () =>
      serializeDraftState({
        title,
        summary,
        coverImageUrl,
        visibility,
        content: previewState.error ? [] : previewState.nodes
      }),
    [coverImageUrl, previewState.error, previewState.nodes, summary, title, visibility]
  );
  const hasUnsavedChanges = !editorError && currentSnapshot !== initialSnapshot;

  useEffect(() => {
    setIsSubmitting(false);
  }, [initialSnapshot]);

  useEffect(() => {
    if (!hasUnsavedChanges || isSubmitting) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, isSubmitting]);

  async function handleImageUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("moduleKey", "writing");
    formData.append("entityType", "draft");
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

    setUploadMessage(`Uploaded ${result.data.originalFileName} and inserted it into the draft content.`);
  }

  async function handleVideoEmbed() {
    const normalized = normalizeVideoInput(videoUrl);
    if (!normalized) {
      throw new Error("Enter a valid video URL from YouTube, Bilibili, Vimeo, or another embeddable source.");
    }

    const formData = new FormData();
    formData.append("embedUrl", normalized.embedUrl);
    formData.append("moduleKey", "writing");
    formData.append("entityType", "draft");
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

    const asset = {
      ...result.data,
      embedUrl: result.data.embedUrl ?? normalized.embedUrl
    };

    setUploadedAssets((current) => [asset, ...current]);
    setBlocks((current) => appendVideoBlock(current, asset, normalized.provider, videoCaption.trim()));
    setUploadMessage(`Added a ${normalized.provider} video embed block to the draft content.`);
    setVideoUrl("");
    setVideoCaption("");
  }

  function confirmNavigation() {
    if (!hasUnsavedChanges || isSubmitting) {
      return true;
    }

    return window.confirm("You have unsaved changes in this draft. Leave this page anyway?");
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="space-y-6">
        <div className="rounded-[2rem] bg-surface-container-low p-8 shadow-ambient">
          <div className="mb-8 space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">{mode === "create" ? "Draft Form" : "Draft Editor"}</p>
            <h2 className="font-headline text-3xl text-foreground">
              {mode === "create" ? "Build the draft" : "Edit the draft"}
            </h2>
          </div>

          <form
            action={action}
            className="space-y-6"
            onSubmit={() => {
              setIsSubmitting(true);
            }}
          >
            <input type="hidden" name="sourceNoteSlug" value={sourceNoteSlug} />
            <input type="hidden" name="content" value={serializedContent} />

            <div className="flex flex-wrap items-center gap-3 rounded-[1.25rem] bg-white/80 px-4 py-3 text-sm">
              <span
                className={
                  editorError
                    ? "font-semibold text-rose-700"
                    : hasUnsavedChanges
                      ? "font-semibold text-amber-700"
                      : "font-semibold text-emerald-700"
                }
              >
                {editorError ? "Needs repair" : hasUnsavedChanges ? "Unsaved changes" : "Saved"}
              </span>
              <span className="text-foreground/50">
                {editorError
                  ? "This draft cannot be saved until the invalid JSON is repaired."
                  : hasUnsavedChanges
                    ? "Save before leaving this page to avoid losing edits."
                    : "You can safely move back to the writing workspace."}
              </span>
            </div>

            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-semibold text-foreground/70">
                Title
              </label>
              <input
                id="title"
                name="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="summary" className="text-sm font-semibold text-foreground/70">
                Summary
              </label>
              <textarea
                id="summary"
                name="summary"
                rows={4}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                className="w-full rounded-[1.5rem] border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              />
            </div>

            <div className="space-y-3 rounded-[1.5rem] bg-white/80 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground/70">Upload Cover / Inline Image</p>
                  <p className="text-xs text-foreground/50">Upload a JPEG, PNG, or WebP image up to 20MB.</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {latestUploadedImage?.url ? (
                    <button
                      type="button"
                      onClick={() => setCoverImageUrl(latestUploadedImage.url ?? "")}
                      className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-primary disabled:opacity-60"
                      disabled={isUploading}
                    >
                      Use Last Upload as Cover
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    disabled={isUploading}
                  >
                    {isUploading ? "Uploading..." : "Choose Image"}
                  </button>
                </div>
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
            </div>

            <div className="space-y-3 rounded-[1.5rem] bg-white/80 p-4">
              <div>
                <p className="text-sm font-semibold text-foreground/70">Add Video Embed</p>
                <p className="text-xs text-foreground/50">Paste a video URL.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_0.8fr]">
                <input
                  value={videoUrl}
                  onChange={(event) => setVideoUrl(event.target.value)}
                  placeholder="Paste a video URL"
                  className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
                />
                <input
                  value={videoCaption}
                  onChange={(event) => setVideoCaption(event.target.value)}
                  placeholder="Optional caption"
                  className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
                />
              </div>
              <div className="flex justify-end">
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
              {uploadMessage ? <p className="text-xs text-primary">{uploadMessage}</p> : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="coverImageUrl" className="text-sm font-semibold text-foreground/70">
                Cover Image URL
              </label>
              <input
                id="coverImageUrl"
                name="coverImageUrl"
                value={coverImageUrl}
                onChange={(event) => setCoverImageUrl(event.target.value)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="visibility" className="text-sm font-semibold text-foreground/70">
                Visibility
              </label>
              <select
                id="visibility"
                name="visibility"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as WritingVisibility)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="PRIVATE">Private</option>
                <option value="UNLISTED">Unlisted</option>
                <option value="PUBLIC">Public</option>
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <label className="text-sm font-semibold text-foreground/70">Content Blocks</label>
                  <p className="text-xs text-foreground/50">Build the article here.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setBlocks((current) => [...current, createEditorBlock("paragraph")])} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary">Add Paragraph</button>
                  <button type="button" onClick={() => setBlocks((current) => [...current, createEditorBlock("heading", { level: 2 })])} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary">Add Heading</button>
                  <button type="button" onClick={() => setBlocks((current) => [...current, createEditorBlock("quote")])} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary">Add Quote</button>
                  <button type="button" onClick={() => setBlocks((current) => [...current, createEditorBlock("markdown")])} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary">Add Markdown</button>
                  <button type="button" onClick={() => setBlocks((current) => [...current, createEditorBlock("image")])} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary">Add Image</button>
                  <button type="button" onClick={() => setBlocks((current) => [...current, createEditorBlock("videoEmbed")])} className="rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary">Add Video</button>
                </div>
              </div>
              <BlockEditor blocks={blocks} onChange={setBlocks} />
              {previewState.error ? (
                <p className="text-xs text-rose-600">
                  This draft contains invalid content, so saving is disabled until it is fixed.
                  Parse error: {previewState.error}
                </p>
              ) : null}
            </div>

            <details className="rounded-[1.5rem] bg-white/80 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-foreground/70">Generated JSON</summary>
              <textarea
                readOnly
                rows={12}
                value={serializedContent}
                className="mt-4 w-full rounded-[1.5rem] border border-outline-variant/30 bg-surface-container-low px-4 py-3 font-mono text-xs outline-none"
              />
            </details>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={Boolean(editorError) || isSubmitting}
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : mode === "create" ? "Create Draft" : "Save Draft"}
              </button>
              <Link
                href="/writing"
                className="text-sm font-semibold text-primary"
                onClick={(event) => {
                  if (!confirmNavigation()) {
                    event.preventDefault();
                  }
                }}
              >
                Back to writing
              </Link>
            </div>
          </form>
        </div>

        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Media</p>
          <h3 className="mt-3 font-headline text-2xl">Attached media</h3>
          {uploadedAssets.length > 0 ? (
            <div className="mt-4 space-y-4">
              {uploadedAssets.map((asset) => (
                <div key={asset.id} className="rounded-[1.5rem] bg-white/80 p-3">
                  {asset.kind === "IMAGE" && asset.url ? (
                    <img src={asset.url} alt={asset.altText || asset.originalFileName} className="h-40 w-full rounded-[1rem] object-cover" />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-[1rem] bg-primary-container/30 text-center text-sm font-semibold text-primary">
                      {asset.kind === "EMBED" ? "Video embed registered" : "Media attached"}
                    </div>
                  )}
                  <p className="mt-3 text-sm font-semibold text-foreground">{asset.originalFileName}</p>
                  <p className="text-xs text-foreground/50">
                    {asset.kind} - {asset.kind === "EMBED" ? (asset.embedUrl ?? "Embed URL") : `${Math.max(1, Math.round(asset.size / 1024))} KB`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-foreground/70">
              Uploaded media will appear here.
            </p>
          )}
        </div>
      </section>

      <aside className="space-y-6">
        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Preview</p>
          <h3 className="mt-3 font-headline text-2xl">Preview</h3>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            Preview the draft here.
          </p>
        </div>

        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <RichTextPreview
            title={title || "Untitled draft"}
            summary={summary}
            coverImage={coverImageUrl || undefined}
            content={previewState.nodes}
            compact
            emptyMessage="Add content to preview the article."
          />
        </div>
      </aside>
    </div>
  );
}


