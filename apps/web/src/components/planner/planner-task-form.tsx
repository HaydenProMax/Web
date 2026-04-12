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

export function PlannerTaskForm({
  action,
  initialData,
  linkOptions,
  taskId,
  mode = "create",
  submitLabel = mode === "edit" ? "Save Changes" : "Create Task",
  titleText = mode === "edit" ? "Refine this task" : "Capture a new task",
  introText = mode === "edit"
    ? "Update title, timing, status, and links."
    : "Create a task and link it to a note or draft if needed.",
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
    <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-[2rem] bg-surface-container-low p-8 shadow-ambient">
        <div className="mb-8 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Planner Form</p>
          <h2 className="font-headline text-3xl text-foreground">{titleText}</h2>
          <p className="text-sm leading-6 text-foreground/70">{introText}</p>
        </div>

        <form action={action} className="space-y-6">
          {taskId ? <input type="hidden" name="taskId" value={taskId} /> : null}

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
            <label htmlFor="description" className="text-sm font-semibold text-foreground/70">Description</label>
            <textarea
              id="description"
              name="description"
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-[1.5rem] border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
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
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
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
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="TODO">Todo</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="scheduledFor" className="text-sm font-semibold text-foreground/70">Scheduled For</label>
              <input
                id="scheduledFor"
                name="scheduledFor"
                type="datetime-local"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="dueAt" className="text-sm font-semibold text-foreground/70">Due At</label>
              <input
                id="dueAt"
                name="dueAt"
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="relatedNoteSlug" className="text-sm font-semibold text-foreground/70">Linked Note</label>
              <select
                id="relatedNoteSlug"
                name="relatedNoteSlug"
                value={relatedNoteSlug}
                onChange={(event) => setRelatedNoteSlug(event.target.value)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="">No linked note</option>
                {linkOptions.notes.map((option) => (
                  <option key={option.value} value={option.value}>{option.title}</option>
                ))}
              </select>
              <p className="text-xs leading-5 text-foreground/55">
                {selectedNote ? selectedNote.meta : "Link this task to a note."}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="relatedDraftId" className="text-sm font-semibold text-foreground/70">Linked Draft</label>
              <select
                id="relatedDraftId"
                name="relatedDraftId"
                value={relatedDraftId}
                onChange={(event) => setRelatedDraftId(event.target.value)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="">No linked draft</option>
                {linkOptions.drafts.map((option) => (
                  <option key={option.value} value={option.value}>{option.title}</option>
                ))}
              </select>
              <p className="text-xs leading-5 text-foreground/55">
                {selectedDraft ? selectedDraft.meta : "Link this task to a draft."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button type="submit" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
              {submitLabel}
            </button>
            <Link href={cancelHref} className="text-sm font-semibold text-primary">
              {cancelLabel}
            </Link>
          </div>
        </form>
      </section>

      <aside className="space-y-6">
        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Preview</p>
          <h3 className="mt-3 font-headline text-2xl">Task summary</h3>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            {mode === "edit"
              ? "Review the current task details before saving."
              : "Review title, timing, priority, and links here."}
          </p>
        </div>

        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Current Values</p>
          <div className="mt-4 space-y-4 rounded-[1.5rem] bg-white/80 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Title</p>
              <p className="mt-2 font-headline text-2xl text-foreground">{title || "Untitled task"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Description</p>
              <p className="mt-2 text-sm leading-6 text-foreground/70">{description || "No description yet."}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Priority</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{priority}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Status</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{status}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Scheduled</p>
                <p className="mt-2 text-sm text-foreground/70">{scheduledFor || "Not scheduled"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Due</p>
                <p className="mt-2 text-sm text-foreground/70">{dueAt || "No deadline"}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Linked Note</p>
                <p className="mt-2 text-sm text-foreground/70">{selectedNote?.title || "No linked note"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Linked Draft</p>
                <p className="mt-2 text-sm text-foreground/70">{selectedDraft?.title || "No linked draft"}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

