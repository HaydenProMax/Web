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
      title="Edit Task"
      description="Planner tasks can now be revised in place, including the note and draft context that surrounds the execution work."
    >
      {resolvedSearchParams?.error === "update-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          The task could not be updated. Check the fields and try again.
        </section>
      ) : null}

      <PlannerTaskForm
        action={updatePlannerTaskAction}
        taskId={task.id}
        mode="edit"
        linkOptions={linkOptions}
        submitLabel="Save Task"
        titleText="Edit planner task"
        introText="Tighten the wording, reschedule the work, or reconnect the task to a different note or draft without losing its history."
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

