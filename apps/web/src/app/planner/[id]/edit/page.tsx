import Link from "next/link";
import { notFound } from "next/navigation";

import { PlannerTaskForm } from "@/components/planner/planner-task-form";
import { ShellLayout } from "@/components/shell/shell-layout";
import { getPlannerTaskById, listPlannerLinkOptions } from "@/server/planner/service";

import { archivePlannerTaskAction, deletePlannerTaskAction, restorePlannerTaskFromListAction, updatePlannerTaskAction } from "../../actions";

function taskMeta(task: { status: string; priority: string; scheduledFor?: string; dueAt?: string; completedAt?: string }) {
  if (task.status === "DONE") {
    return task.completedAt ? `Done ${new Date(task.completedAt).toLocaleString("zh-CN")}` : "Done";
  }

  if (task.dueAt) {
    return `Due ${new Date(task.dueAt).toLocaleString("zh-CN")}`;
  }

  if (task.scheduledFor) {
    return `Planned ${new Date(task.scheduledFor).toLocaleString("zh-CN")}`;
  }

  return `${task.priority} priority`;
}

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
  searchParams?: Promise<{ error?: string; restored?: string; confirmDelete?: string }>;
}) {
  const [{ id }, resolvedSearchParams, task, linkOptions] = await Promise.all([
    params,
    searchParams ? searchParams : Promise.resolve(undefined),
    params.then(({ id: taskId }) => getPlannerTaskById(taskId, { includeArchived: true })),
    listPlannerLinkOptions(10)
  ]);

  if (!task) {
    notFound();
  }

  const confirmDelete = resolvedSearchParams?.confirmDelete === task.id;

  return (
    <ShellLayout title="Edit task" description="Keep the task aligned with what you actually need to do next.">
      {resolvedSearchParams?.error === "update-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          Could not update the task. Check the fields and try again.
        </section>
      ) : null}

      {resolvedSearchParams?.error === "delete-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          Could not delete the task. Please try again.
        </section>
      ) : resolvedSearchParams?.error === "restore-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          Could not restore the task. Please try again.
        </section>
      ) : resolvedSearchParams?.restored === "1" ? (
        <section className="rounded-[2rem] bg-primary-container/40 px-6 py-4 text-sm text-primary shadow-ambient">
          Task restored.
        </section>
      ) : null}

      {task.status === "ARCHIVED" ? (
        <section className="rounded-[2rem] bg-surface-container-low p-8 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Archived</p>
          <h2 className="mt-3 font-headline text-3xl text-foreground">This task is currently archived</h2>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            Restore it to bring it back into the live planner.
          </p>
          <div className="mt-6 rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
            <p className="text-sm font-semibold text-foreground">{task.title}</p>
            <p className="mt-2 text-sm leading-6 text-foreground/70">{task.description || "No description."}</p>
            <p className="mt-3 text-xs text-foreground/55">{taskMeta(task)}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <form action={restorePlannerTaskFromListAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <button type="submit" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient transition-colors duration-200 hover:bg-primary/90">
                Restore
              </button>
            </form>
            <Link href="/planner?view=archived" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient transition-colors duration-200 hover:bg-primary/5">
              Back
            </Link>
          </div>
        </section>
      ) : (
        <>
          {confirmDelete ? (
            <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 shadow-ambient">
              <p className="text-xs uppercase tracking-[0.2em] text-rose-700">Delete confirmation</p>
              <h2 className="mt-3 font-headline text-3xl text-foreground">Delete this task?</h2>
              <p className="mt-3 text-sm leading-6 text-foreground/70">
                <strong>{task.title}</strong> will be permanently removed.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <form action={deletePlannerTaskAction}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="confirmed" value="true" />
                  <button type="submit" className="rounded-full bg-rose-700 px-5 py-3 text-sm font-semibold text-white shadow-ambient transition-colors duration-200 hover:bg-rose-800">
                    Delete forever
                  </button>
                </form>
                <Link href={`/planner/${task.id}/edit`} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient transition-colors duration-200 hover:bg-primary/5">
                  Cancel
                </Link>
              </div>
            </section>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <form action={archivePlannerTaskAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <button type="submit" className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-ambient transition-colors duration-200 hover:bg-rose-700">
                Move to archived
              </button>
            </form>
            <Link href={`/planner/${task.id}/edit?confirmDelete=${task.id}`} className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-rose-700 shadow-ambient transition-colors duration-200 hover:bg-rose-50">
              Delete
            </Link>
          </div>

          <PlannerTaskForm
            action={updatePlannerTaskAction}
            taskId={task.id}
            mode="edit"
            linkOptions={linkOptions}
            submitLabel="Save task"
            titleText="Edit task"
            introText="Adjust the task only as much as you need."
            initialData={{
              title: task.title,
              description: task.description,
              priority: task.priority,
              status: task.status,
              scheduledFor: toDateTimeLocal(task.scheduledFor),
              dueAt: toDateTimeLocal(task.dueAt),
              relatedNoteSlug: task.relatedNoteSlug ?? "",
              relatedDraftId: task.relatedDraftId ?? ""
            }}
          />
        </>
      )}
    </ShellLayout>
  );
}
