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
  const seeded标题 = selectedDraft
    ? `推进 ${selectedDraft.title}`
    : selectedNote
      ? `跟进 ${selectedNote.title}`
      : "";
  const seeded说明 = selectedDraft
    ? "为这篇草稿记录下一步执行动作，让写作继续推进。"
    : selectedNote
      ? "把当前笔记转成明确的下一步动作，让思路继续推进。"
      : "";

  return (
    <ShellLayout
      title="新建任务"
      description="规划模块现在支持把任务回链到产生它的笔记和草稿，让任务层成为真正的协调面。"
    >
      {resolvedSearchParams?.error === "create-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          任务创建失败，请检查必填项后重试。
        </section>
      ) : null}

      <PlannerTaskForm
        action={createPlannerTaskAction}
        linkOptions={linkOptions}
        initialData={{
          title: seeded标题,
          description: seeded说明,
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
