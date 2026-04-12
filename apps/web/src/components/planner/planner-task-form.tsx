"use client";

import Link from "next/link";
import { useState } from "react";

import type { PlannerTaskLinkOption, PlannerTaskPriority } from "@workspace/types/index";

type PlannerTaskFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  initialData: {
    title: string;
    description: string;
    priority: PlannerTaskPriority;
    status: "TODO" | "IN_PROGRESS" | "DONE";
    scheduledFor: string;
    dueAt: string;
    relatedNoteSlug: string;
    relatedDraftId: string;
  };
  linkOptions: {
    notes: PlannerTaskLinkOption[];
    drafts: PlannerTaskLinkOption[];
  };
  taskId?: string;
  mode?: "create" | "edit";
  submitLabel?: string;
  titleText?: string;
  introText?: string;
  cancelHref?: string;
  cancelLabel?: string;
};

function priorityTone(priority: PlannerTaskPriority) {
  if (priority === "HIGH") {
    return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
  }

  if (priority === "LOW") {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
}

export function PlannerTaskForm({
  action,
  initialData,
  linkOptions,
  taskId,
  mode = "create",
  submitLabel = mode === "edit" ? "Save task" : "Create task",
  titleText = mode === "edit" ? "Edit task" : "New task",
  introText = mode === "edit"
    ? "Update the task, timing, and links."
    : "Add the task now, refine it later if needed.",
  cancelHref = "/planner",
  cancelLabel = "Back to planner"
}: PlannerTaskFormProps) {
  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description);
  const [priority, setPriority] = useState<PlannerTaskPriority>(initialData.priority);
  const [status, setStatus] = useState<"TODO" | "IN_PROGRESS" | "DONE">(initialData.status);
  const [scheduledFor, setScheduledFor] = useState(initialData.scheduledFor);
  const [dueAt, setDueAt] = useState(initialData.dueAt);
  const [relatedNoteSlug, setRelatedNoteSlug] = useState(initialData.relatedNoteSlug);
  const [relatedDraftId, setRelatedDraftId] = useState(initialData.relatedDraftId);

  const selectedNote = linkOptions.notes.find((option) => option.value === relatedNoteSlug);
  const selectedDraft = linkOptions.drafts.find((option) => option.value === relatedDraftId);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient lg:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-primary/75">Planner</p>
            <h2 className="mt-2 font-headline text-3xl text-foreground">{titleText}</h2>
            <p className="mt-2 text-sm leading-6 text-foreground/65">{introText}</p>
          </div>
          <Link href={cancelHref} className="text-sm font-semibold text-primary transition-colors duration-200 hover:text-primary/80">
            {cancelLabel}
          </Link>
        </div>

        <form action={action} className="mt-8 space-y-6">
          {taskId ? <input type="hidden" name="taskId" value={taskId} /> : null}

          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-semibold text-foreground/70">Title</label>
            <input
              id="title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none transition-colors duration-200 focus:border-primary/40"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-semibold text-foreground/70">Description</label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-[1.5rem] border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none transition-colors duration-200 focus:border-primary/40"
              placeholder="Optional"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="priority" className="text-sm font-semibold text-foreground/70">Priority</label>
              <select
                id="priority"
                name="priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as PlannerTaskPriority)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none transition-colors duration-200 focus:border-primary/40"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-semibold text-foreground/70">Status</label>
              <select
                id="status"
                name="status"
                value={status}
                onChange={(event) => setStatus(event.target.value as "TODO" | "IN_PROGRESS" | "DONE")}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none transition-colors duration-200 focus:border-primary/40"
              >
                <option value="TODO">Todo</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="scheduledFor" className="text-sm font-semibold text-foreground/70">Scheduled</label>
              <input
                id="scheduledFor"
                name="scheduledFor"
                type="datetime-local"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none transition-colors duration-200 focus:border-primary/40"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="dueAt" className="text-sm font-semibold text-foreground/70">Due</label>
              <input
                id="dueAt"
                name="dueAt"
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none transition-colors duration-200 focus:border-primary/40"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="relatedNoteSlug" className="text-sm font-semibold text-foreground/70">Note</label>
              <select
                id="relatedNoteSlug"
                name="relatedNoteSlug"
                value={relatedNoteSlug}
                onChange={(event) => setRelatedNoteSlug(event.target.value)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none transition-colors duration-200 focus:border-primary/40"
              >
                <option value="">No linked note</option>
                {linkOptions.notes.map((option) => (
                  <option key={option.value} value={option.value}>{option.title}</option>
                ))}
              </select>
              <p className="text-xs leading-5 text-foreground/55">{selectedNote ? selectedNote.meta : "Optional"}</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="relatedDraftId" className="text-sm font-semibold text-foreground/70">Draft</label>
              <select
                id="relatedDraftId"
                name="relatedDraftId"
                value={relatedDraftId}
                onChange={(event) => setRelatedDraftId(event.target.value)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none transition-colors duration-200 focus:border-primary/40"
              >
                <option value="">No linked draft</option>
                {linkOptions.drafts.map((option) => (
                  <option key={option.value} value={option.value}>{option.title}</option>
                ))}
              </select>
              <p className="text-xs leading-5 text-foreground/55">{selectedDraft ? selectedDraft.meta : "Optional"}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button type="submit" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-ambient transition-colors duration-200 hover:bg-primary/90">
              {submitLabel}
            </button>
            <Link href={cancelHref} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient transition-colors duration-200 hover:bg-primary/5">
              Cancel
            </Link>
          </div>
        </form>
      </section>

      <aside className="space-y-4">
        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.22em] text-primary/75">Summary</p>
          <h3 className="mt-3 font-headline text-2xl text-foreground">{title || "Untitled task"}</h3>
          <p className="mt-3 text-sm leading-6 text-foreground/65">{description || "No description yet."}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${priorityTone(priority)}`}>
              {priority}
            </span>
            <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {status}
            </span>
          </div>
        </div>

        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.22em] text-primary/75">Context</p>
          <div className="mt-4 space-y-4 text-sm text-foreground/70">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-foreground/45">Scheduled</p>
              <p className="mt-1">{scheduledFor || "Not set"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-foreground/45">Due</p>
              <p className="mt-1">{dueAt || "Not set"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-foreground/45">Note</p>
              <p className="mt-1">{selectedNote?.title || "None"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-foreground/45">Draft</p>
              <p className="mt-1">{selectedDraft?.title || "None"}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
