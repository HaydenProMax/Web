import Link from "next/link";

import { ShellLayout } from "@/components/shell/shell-layout";
import { WritingDraftForm } from "@/components/writing/writing-draft-form";
import { getKnowledgeNoteBySlug } from "@/server/knowledge/service";

import { createWritingDraftAction } from "./actions";

function buildDraftSeedFromNote(note: NonNullable<Awaited<ReturnType<typeof getKnowledgeNoteBySlug>>>) {
  return {
    title: `${note.title} Draft`,
    summary: note.summary || `A writing thread grown from the note '${note.title}”。`,
    coverImageUrl: "",
    sourceNoteSlug: note.slug,
    visibility: "PRIVATE" as const,
    content: JSON.stringify(
      [
        {
          type: "paragraph",
          content: `这篇草稿来自知识笔记“${note.title}”。`
        },
        ...note.content
      ],
      null,
      2
    )
  };
}

function buildEmptyDraftSeed() {
  return {
    title: "",
    summary: "",
    coverImageUrl: "",
    sourceNoteSlug: "",
    visibility: "PRIVATE" as const,
    content: JSON.stringify(
      [
        {
          type: "paragraph",
          content: "从这里开始写作。"
        }
      ],
      null,
      2
    )
  };
}

export default async function NewWritingDraftPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; sourceNote?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const sourceNoteSlug = resolvedSearchParams?.sourceNote ?? "";
  const sourceNote = sourceNoteSlug ? await getKnowledgeNoteBySlug(sourceNoteSlug) : undefined;
  const initialData = sourceNote ? buildDraftSeedFromNote(sourceNote) : buildEmptyDraftSeed();

  return (
    <ShellLayout
      title="新建草稿"
      description="创建一篇富媒体草稿，可以承接来源笔记、插入图片与视频，并在准备好后顺畅进入正式写作流。"
    >
      {resolvedSearchParams?.error === "invalid-content-json" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          内容 JSON 无法解析，请修正结构后重试。
        </section>
      ) : null}

      {resolvedSearchParams?.error === "create-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          草稿创建失败，请检查标题、摘要、媒体链接和内容块后重试。
        </section>
      ) : null}
      {sourceNote ? (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] bg-primary-container/30 px-6 py-4 text-sm text-primary shadow-ambient">
          <p>
            这篇草稿会回链到知识库中的 <span className="font-semibold">{sourceNote.title}</span>。
          </p>
          <Link href={`/knowledge/${sourceNote.slug}`} className="font-semibold underline">
            打开来源笔记
          </Link>
        </section>
      ) : null}

      <WritingDraftForm
        action={createWritingDraftAction}
        mode="create"
        initialData={initialData}
      />
    </ShellLayout>
  );
}
