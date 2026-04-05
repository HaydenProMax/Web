import { notFound } from "next/navigation";

import { KnowledgeNoteForm } from "@/components/knowledge/knowledge-note-form";
import { ShellLayout } from "@/components/shell/shell-layout";
import { getKnowledgeNoteBySlug } from "@/server/knowledge/service";

import { updateKnowledgeNoteAction } from "../../new/actions";

export default async function EditKnowledgeNotePage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const note = await getKnowledgeNoteBySlug(resolvedParams.slug);

  if (!note) {
    notFound();
  }

  return (
    <ShellLayout
      title={`编辑 ${note.title}`}
      description="知识编辑沿用与创建相同的结构化模型，因此修改会留在模块内部，同时保留领域、标签和阅读流。"
    >
      {resolvedSearchParams?.error === "invalid-content-json" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          The content JSON could not be parsed. Please fix the JSON structure and try again.
        </section>
      ) : null}

      {resolvedSearchParams?.error === "save-failed" ? (
        <section className="rounded-[2rem] bg-rose-100 px-6 py-4 text-sm text-rose-700 shadow-ambient">
          笔记保存失败，请检查字段后重试。
        </section>
      ) : null}

      <KnowledgeNoteForm
        action={updateKnowledgeNoteAction.bind(null, note.slug)}
        mode="edit"
        initialData={{
          title: note.title,
          summary: note.summary,
          domainName: note.domainName ?? "",
          tags: note.tags.join(", "),
          content: JSON.stringify(note.content, null, 2)
        }}
      />
    </ShellLayout>
  );
}

