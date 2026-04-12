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
  const [title, setTitle] = useState(initialData.title);
  const [summary, setSummary] = useState(initialData.summary);
  const [domainName, setDomainName] = useState(initialData.domainName);
  const [tags, setTags] = useState(initialData.tags);
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
        error: error instanceof Error ? error.message : "Content JSON is invalid."
      };
    }
  }, [content]);

  return (
    <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-[2rem] bg-surface-container-low p-8 shadow-ambient">
        <div className="mb-8 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Knowledge Form</p>
          <h2 className="font-headline text-3xl text-foreground">{mode === "edit" ? "Refine this note" : "Capture a new note"}</h2>
          <p className="text-sm leading-6 text-foreground/70">
            {mode === "edit"
              ? "Update the note here. If the title changes, the slug will update too."
              : "Create a note with domain, tags, and content."}
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

          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-semibold text-foreground/70">Content JSON</label>
            <textarea
              id="content"
              name="content"
              rows={18}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="w-full rounded-[1.5rem] border border-outline-variant/30 bg-white px-4 py-3 font-mono text-xs outline-none"
            />
            {previewState.error ? <p className="text-xs text-rose-600">Preview paused: {previewState.error}</p> : null}
          </div>

          <div className="flex items-center gap-4">
            <button type="submit" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
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
            Preview the note as it will appear when opened.
          </p>
        </div>

        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <RichTextPreview
            title={title || "Untitled note"}
            summary={summary}
            content={previewState.nodes}
            compact
            emptyMessage="Add content to preview the note."
          />
        </div>
      </aside>
    </div>
  );
}
