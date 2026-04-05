import { ShellLayout } from "@/components/shell/shell-layout";
import { KnowledgeNoteForm } from "@/components/knowledge/knowledge-note-form";

import { createKnowledgeNoteAction } from "./actions";

function buildEmptyKnowledgeSeed() {
  return {
    title: "",
    summary: "",
    domainName: "",
    tags: "",
    content: JSON.stringify(
      [
        {
          type: "paragraph",
          content: "从这里开始记录笔记。"
        }
      ],
      null,
      2
    )
  };
}

export default async function NewKnowledgeNotePage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <ShellLayout
      title="新建笔记"
      description="创建一条结构化笔记，为领域、标签、关联写作和后续回流预留空间。"
    >
      {resolvedSearchParams?.error === "invalid-content-json" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          内容 JSON 无法解析，请修正结构后重试。
        </section>
      ) : null}

      {resolvedSearchParams?.error === "create-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          笔记创建失败，请检查必填项后重试。
        </section>
      ) : null}

      <KnowledgeNoteForm
        action={createKnowledgeNoteAction}
        initialData={buildEmptyKnowledgeSeed()}
      />
    </ShellLayout>
  );
}
