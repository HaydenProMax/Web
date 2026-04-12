import { PlannerTaskForm } from "@/components/planner/planner-task-form";
import { ShellLayout } from "@/components/shell/shell-layout";
import { listPlannerLinkOptions } from "@/server/planner/service";

import { createPlannerTaskAction } from "./actions";

export default async function NewPlannerTaskPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; note?: string; draft?: string }>;
}) {
  const [resolvedSearchParams, linkOptions] = await Promise.all([
    searchParams ? searchParams : Promise.resolve(undefined),
    listPlannerLinkOptions(10)
  ]);

  const selectedNote = linkOptions.notes.find((option) => option.value === (resolvedSearchParams?.note ?? ""));
  const selectedDraft = linkOptions.drafts.find((option) => option.value === (resolvedSearchParams?.draft ?? ""));
  const seededTitle = selectedDraft
    ? `Move ${selectedDraft.title} forward`
    : selectedNote
      ? `Follow up on ${selectedNote.title}`
      : "";
  const seededDescription = selectedDraft
    ? "Capture the next step and keep this draft moving."
    : selectedNote
      ? "Turn this note into a concrete next step."
      : "";

  return (
    <ShellLayout title="New task" description="Create a task without leaving the planner flow.">
      {resolvedSearchParams?.error === "create-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          Could not create the task. Check the required fields and try again.
        </section>
      ) : null}

      <PlannerTaskForm
        action={createPlannerTaskAction}
        linkOptions={linkOptions}
        titleText="Create task"
        introText="Capture it now and adjust the details only if you need to."
        initialData={{
          title: seededTitle,
          description: seededDescription,
          priority: selectedDraft || selectedNote ? "HIGH" : "MEDIUM",
          status: "TODO",
          scheduledFor: "",
          dueAt: "",
          relatedNoteSlug: selectedNote?.value ?? "",
          relatedDraftId: selectedDraft?.value ?? ""
        }}
      />
    </ShellLayout>
  );
}
