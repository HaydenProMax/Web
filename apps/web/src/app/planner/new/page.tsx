import { ShellLayout } from "@/components/shell/shell-layout";
import { PlannerTaskForm } from "@/components/planner/planner-task-form";
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
    ? "Capture the next execution step for this draft and keep the writing flow moving."
    : selectedNote
      ? "Turn the current note into a concrete next step so the idea keeps moving."
      : "";

  return (
    <ShellLayout
      title="New Task"
      description="Planner now supports linking work back to the notes and drafts that generated it, turning the task layer into a real coordination surface."
    >
      {resolvedSearchParams?.error === "create-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          The task could not be created. Check the required fields and try again.
        </section>
      ) : null}

      <PlannerTaskForm
        action={createPlannerTaskAction}
        linkOptions={linkOptions}
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