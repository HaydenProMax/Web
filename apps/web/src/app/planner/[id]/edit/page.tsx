import { notFound } from "next/navigation";

import { PlannerTaskForm } from "@/components/planner/planner-task-form";
import { ShellLayout } from "@/components/shell/shell-layout";
import { getPlannerTaskById, listPlannerLinkOptions } from "@/server/planner/service";

import { updatePlannerTaskAction } from "../../actions";

function toDateTimeLocal(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const pad = (input: number) => input.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function EditPlannerTaskPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const [{ id }, resolvedSearchParams, task, linkOptions] = await Promise.all([
    params,
    searchParams ? searchParams : Promise.resolve(undefined),
    params.then(({ id: taskId }) => getPlannerTaskById(taskId)),
    listPlannerLinkOptions(10)
  ]);

  if (!task) {
    notFound();
  }

  return (
    <ShellLayout
      title="编辑 Task"
      description="规划任务现在支持原地编辑，包括执行工作周围的笔记和草稿上下文。"
    >
      {resolvedSearchParams?.error === "update-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          任务更新失败，请检查字段后重试。
        </section>
      ) : null}

      <PlannerTaskForm
        action={updatePlannerTaskAction}
        taskId={task.id}
        mode="edit"
        linkOptions={linkOptions}
        submitLabel="保存任务"
        titleText="编辑 planner task"
        introText="你可以调整表述、重新安排时间，或者把任务重新关联到不同的笔记或草稿，同时保留历史记录。"
        initialData={{
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status === "ARCHIVED" ? "TODO" : task.status,
          scheduledFor: toDateTimeLocal(task.scheduledFor),
          dueAt: toDateTimeLocal(task.dueAt),
          relatedNoteSlug: task.relatedNoteSlug ?? "",
          relatedDraftId: task.relatedDraftId ?? ""
        }}
      />
    </ShellLayout>
  );
}



