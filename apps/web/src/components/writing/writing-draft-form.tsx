"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";

import type { MediaAssetSummary, RichTextNode, WritingVisibility } from "@workspace/types/index";

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

function appendImageNodeToContent(content: string, asset: MediaAssetSummary) {
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return content;
    }

    parsed.push({
      type: "image",
      src: asset.url,
      alt: asset.altText || asset.originalFileName,
      caption: asset.originalFileName
    } satisfies RichTextNode);

    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
}

function appendVideoNodeToContent(content: string, asset: MediaAssetSummary, provider: RichTextNode["provider"], caption: string) {
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed) || !asset.embedUrl) {
      return content;
    }

    parsed.push({
      type: "videoEmbed",
      embedUrl: asset.embedUrl,
      provider,
      caption
    } satisfies RichTextNode);

    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
}

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
      if (url.pathname === "/watch") {
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

export function WritingDraftForm({ action, initialData, mode }: WritingDraftFormProps) {
  const [title, set标题] = useState(initialData.title);
  const [summary, set摘要] = useState(initialData.summary);
  const [coverImageUrl, setCoverImageUrl] = useState(initialData.coverImageUrl);
  const [sourceNoteSlug] = useState(initialData.sourceNoteSlug);
  const [content, setContent] = useState(initialData.content);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoCaption, setVideoCaption] = useState("");
  const [uploadMessage, setUploadMessage] = useState<string>("");
  const [uploadedAssets, setUploadedAssets] = useState<MediaAssetSummary[]>([]);
  const [isUploading, startUploadTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const previewState = useMemo(() => {
    try {
      const parsed = JSON.parse(content);
      return {
        nodes: Array.isArray(parsed) ? (parsed as RichTextNode[]) : [],
        error: ""
      };
    } catch (error) {
      return {
        nodes: [] as RichTextNode[],
        error: error instanceof Error ? error.message : "内容 JSON 无效。"
      };
    }
  }, [content]);

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
      setCoverImageUrl(result.data.url);
      setContent((current) => appendImageNodeToContent(current, result.data!));
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
    setContent((current) => appendVideoNodeToContent(current, asset, normalized.provider, videoCaption.trim()));
    setUploadMessage(`Added a ${normalized.provider} video embed block to the draft content.`);
    setVideoUrl("");
    setVideoCaption("");
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="space-y-6">
        <div className="rounded-[2rem] bg-surface-container-low p-8 shadow-ambient">
          <div className="mb-8 space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">{mode === "create" ? "Draft Form" : "Draft Editor"}</p>
            <h2 className="font-headline text-3xl text-foreground">
              {mode === "create" ? "Seed a new article" : "Refine this draft"}
            </h2>
          </div>

          <form action={action} className="space-y-6">
            <input type="hidden" name="sourceNoteSlug" value={sourceNoteSlug} />

            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-semibold text-foreground/70">
                标题
              </label>
              <input
                id="title"
                name="title"
                value={title}
                onChange={(event) => set标题(event.target.value)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="summary" className="text-sm font-semibold text-foreground/70">
                摘要
              </label>
              <textarea
                id="summary"
                name="summary"
                rows={4}
                value={summary}
                onChange={(event) => set摘要(event.target.value)}
                className="w-full rounded-[1.5rem] border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              />
            </div>

            <div className="space-y-3 rounded-[1.5rem] bg-white/80 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground/70">上传封面 / 内嵌图片</p>
                  <p className="text-xs text-foreground/50">图片会保存在本地工作站，并登记为可复用媒体资源。</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={isUploading}
                >
                  {isUploading ? "上传中..." : "选择图片"}
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
            </div>

            <div className="space-y-3 rounded-[1.5rem] bg-white/80 p-4">
              <div>
                <p className="text-sm font-semibold text-foreground/70">添加视频嵌入</p>
                <p className="text-xs text-foreground/50">支持 YouTube、Vimeo、Bilibili 以及自定义可嵌入链接。</p>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_0.8fr]">
                <input
                  value={videoUrl}
                  onChange={(event) => setVideoUrl(event.target.value)}
                  placeholder="粘贴视频链接"
                  className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
                />
                <input
                  value={videoCaption}
                  onChange={(event) => setVideoCaption(event.target.value)}
                  placeholder="可选说明"
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
                  {isUploading ? "保存中..." : "插入视频"}
                </button>
              </div>
              {uploadMessage ? <p className="text-xs text-primary">{uploadMessage}</p> : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="coverImageUrl" className="text-sm font-semibold text-foreground/70">
                封面图 URL
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
                可见性
              </label>
              <select
                id="visibility"
                name="visibility"
                defaultValue={initialData.visibility}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="PRIVATE">私有</option>
                <option value="UNLISTED">不公开</option>
                <option value="PUBLIC">公开</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-semibold text-foreground/70">
                内容 JSON
              </label>
              <textarea
                id="content"
                name="content"
                rows={16}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="w-full rounded-[1.5rem] border border-outline-variant/30 bg-white px-4 py-3 font-mono text-xs outline-none"
              />
              {previewState.error ? <p className="text-xs text-rose-600">预览已暂停：{previewState.error}</p> : null}
            </div>

            <div className="flex items-center gap-4">
              <button type="submit" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
                {mode === "create" ? "创建草稿" : "保存草稿"}
              </button>
              <Link href="/writing" className="text-sm font-semibold text-primary">
                返回写作
              </Link>
            </div>
          </form>
        </div>

        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">已附加资源</p>
          <h3 className="mt-3 font-headline text-2xl">本地媒体队列</h3>
          {uploadedAssets.length > 0 ? (
            <div className="mt-4 space-y-4">
              {uploadedAssets.map((asset) => (
                <div key={asset.id} className="rounded-[1.5rem] bg-white/80 p-3">
                  {asset.kind === "IMAGE" && asset.url ? (
                    <img src={asset.url} alt={asset.altText || asset.originalFileName} className="h-40 w-full rounded-[1rem] object-cover" />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-[1rem] bg-primary-container/30 text-center text-sm font-semibold text-primary">
                      {asset.kind === "EMBED" ? "已登记视频嵌入" : "已附加媒体"}
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
              上传图片或插入视频链接后，会为这条草稿流程创建首批媒体记录。
            </p>
          )}
        </div>
      </section>

      <aside className="space-y-6">
        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">实时预览</p>
          <h3 className="mt-3 font-headline text-2xl">文章预览</h3>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            预览使用与文章详情页相同的富内容渲染器，所以这里看到的效果会接近最终阅读面。
          </p>
        </div>

        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <RichTextPreview
            title={title || "未命名草稿"}
            summary={summary}
            coverImage={coverImageUrl || undefined}
            content={previewState.nodes}
            compact
            emptyMessage="添加段落、标题、图片、引用或视频嵌入块来预览阅读流。"
          />
        </div>
      </aside>
    </div>
  );
}


