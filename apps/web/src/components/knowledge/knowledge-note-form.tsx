"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { RichTextNode } from "@workspace/types/index";

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

export function KnowledgeNoteForm({ action, initialData, mode = "create" }: KnowledgeNoteFormProps) {
  const [title, set标题] = useState(initialData.title);
  const [summary, set摘要] = useState(initialData.summary);
  const [domainName, set领域Name] = useState(initialData.domainName);
  const [tags, set标签] = useState(initialData.tags);
  const [content, setContent] = useState(initialData.content);

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

  return (
    <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-[2rem] bg-surface-container-low p-8 shadow-ambient">
        <div className="mb-8 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">知识表单</p>
          <h2 className="font-headline text-3xl text-foreground">{mode === "edit" ? "编辑这条笔记" : "创建一条新笔记"}</h2>
          <p className="text-sm leading-6 text-foreground/70">
            {mode === "edit"
              ? "在不丢失知识库位置的前提下更新笔记。如果标题变化，slug 会一起迁移。"
              : "创建带有领域、标签和富内容块的结构化笔记。"}
          </p>
        </div>

        <form action={action} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-semibold text-foreground/70">标题</label>
            <input
              id="title"
              name="title"
              value={title}
              onChange={(event) => set标题(event.target.value)}
              className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="summary" className="text-sm font-semibold text-foreground/70">摘要</label>
            <textarea
              id="summary"
              name="summary"
              rows={4}
              value={summary}
              onChange={(event) => set摘要(event.target.value)}
              className="w-full rounded-[1.5rem] border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="domainName" className="text-sm font-semibold text-foreground/70">领域</label>
              <input
                id="domainName"
                name="domainName"
                value={domainName}
                onChange={(event) => set领域Name(event.target.value)}
                placeholder="思考、系统、阅读..."
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="tags" className="text-sm font-semibold text-foreground/70">标签</label>
              <input
                id="tags"
                name="tags"
                value={tags}
                onChange={(event) => set标签(event.target.value)}
                placeholder="反思、架构、笔记"
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-semibold text-foreground/70">内容 JSON</label>
            <textarea
              id="content"
              name="content"
              rows={18}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="w-full rounded-[1.5rem] border border-outline-variant/30 bg-white px-4 py-3 font-mono text-xs outline-none"
            />
            {previewState.error ? <p className="text-xs text-rose-600">预览已暂停：{previewState.error}</p> : null}
          </div>

          <div className="flex items-center gap-4">
            <button type="submit" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
              {mode === "edit" ? "保存笔记" : "创建笔记"}
            </button>
            <Link href="/knowledge" className="text-sm font-semibold text-primary">
              返回知识库
            </Link>
          </div>
        </form>
      </section>

      <aside className="space-y-6">
        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">实时预览</p>
          <h3 className="mt-3 font-headline text-2xl">知识笔记预览</h3>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            笔记复用共享的富内容渲染器，在保持模块独立的同时，与写作模块的阅读面保持一致。
          </p>
        </div>

        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <RichTextPreview
            title={title || "未命名笔记"}
            summary={summary}
            content={previewState.nodes}
            compact
            emptyMessage="添加段落、标题、图片、引用或视频嵌入块来预览笔记内容流。"
          />
        </div>
      </aside>
    </div>
  );
}

