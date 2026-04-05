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
  submitLabel = mode === "edit" ? "保存修改" : "创建任务",
  titleText = mode === "edit" ? "编辑这项任务" : "创建一项新任务",
  introText = mode === "edit"
    ? "在不离开规划流的情况下，更新任务范围、时间、执行状态和上游上下文。"
    : "规划模块支持把任务回链到知识与写作模块，让执行记录始终连接到它们的来源想法。",
  cancelHref = "/planner",
  cancelLabel = "返回规划"
}: PlannerTaskFormProps) {
  const [title, set标题] = useState(initialData.title);
  const [description, set说明] = useState(initialData.description);
  const [priority, set优先级] = useState<PlannerTaskPriority>(initialData.priority);
  const [status, set状态] = useState<"TODO" | "IN_PROGRESS" | "DONE">(initialData.status);
  const [scheduledFor, set已计划For] = useState(initialData.scheduledFor);
  const [dueAt, set截止At] = useState(initialData.dueAt);
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
            <label htmlFor="description" className="text-sm font-semibold text-foreground/70">说明</label>
            <textarea
              id="description"
              name="description"
              rows={5}
              value={description}
              onChange={(event) => set说明(event.target.value)}
              className="w-full rounded-[1.5rem] border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="priority" className="text-sm font-semibold text-foreground/70">优先级</label>
              <select
                id="priority"
                name="priority"
                value={priority}
                onChange={(event) => set优先级(event.target.value as PlannerTaskPriority)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="LOW">低</option>
                <option value="MEDIUM">中</option>
                <option value="HIGH">高</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-semibold text-foreground/70">状态</label>
              <select
                id="status"
                name="status"
                value={status}
                onChange={(event) => set状态(event.target.value as "TODO" | "IN_PROGRESS" | "DONE")}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="TODO">待开始</option>
                <option value="IN_PROGRESS">进行中</option>
                <option value="DONE">已完成</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="scheduledFor" className="text-sm font-semibold text-foreground/70">计划时间</label>
              <input
                id="scheduledFor"
                name="scheduledFor"
                type="datetime-local"
                value={scheduledFor}
                onChange={(event) => set已计划For(event.target.value)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="dueAt" className="text-sm font-semibold text-foreground/70">截止时间</label>
              <input
                id="dueAt"
                name="dueAt"
                type="datetime-local"
                value={dueAt}
                onChange={(event) => set截止At(event.target.value)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="relatedNoteSlug" className="text-sm font-semibold text-foreground/70">关联笔记</label>
              <select
                id="relatedNoteSlug"
                name="relatedNoteSlug"
                value={relatedNoteSlug}
                onChange={(event) => setRelatedNoteSlug(event.target.value)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="">无关联笔记</option>
                {linkOptions.notes.map((option) => (
                  <option key={option.value} value={option.value}>{option.title}</option>
                ))}
              </select>
              <p className="text-xs leading-5 text-foreground/55">
                {selectedNote ? selectedNote.meta : "把任务锚定到知识笔记，让规划始终连接到来源思路。"}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="relatedDraftId" className="text-sm font-semibold text-foreground/70">关联草稿</label>
              <select
                id="relatedDraftId"
                name="relatedDraftId"
                value={relatedDraftId}
                onChange={(event) => setRelatedDraftId(event.target.value)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="">无关联草稿</option>
                {linkOptions.drafts.map((option) => (
                  <option key={option.value} value={option.value}>{option.title}</option>
                ))}
              </select>
              <p className="text-xs leading-5 text-foreground/55">
                {selectedDraft ? selectedDraft.meta : "当执行和写作需要一起推进时，把任务关联到进行中的草稿。"}
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
          <p className="text-xs uppercase tracking-[0.2em] text-primary">任务预览</p>
          <h3 className="mt-3 font-headline text-2xl">执行快照</h3>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            {mode === "edit"
              ? "调整状态、时间和范围时，规划任务仍会保留上游笔记和草稿上下文。"
              : "使用这张表单为任务设置时间、优先级，并回链到它来源的笔记或草稿。"}
          </p>
        </div>

        <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">当前值</p>
          <div className="mt-4 space-y-4 rounded-[1.5rem] bg-white/80 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary">标题</p>
              <p className="mt-2 font-headline text-2xl text-foreground">{title || "未命名任务"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary">说明</p>
              <p className="mt-2 text-sm leading-6 text-foreground/70">{description || "暂无说明。"}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">优先级</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{priority}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">状态</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{status}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">已计划</p>
                <p className="mt-2 text-sm text-foreground/70">{scheduledFor || "尚未计划"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">截止</p>
                <p className="mt-2 text-sm text-foreground/70">{dueAt || "暂无截止时间"}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">关联笔记</p>
                <p className="mt-2 text-sm text-foreground/70">{selectedNote?.title || "无关联笔记"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">关联草稿</p>
                <p className="mt-2 text-sm text-foreground/70">{selectedDraft?.title || "无关联草稿"}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}



