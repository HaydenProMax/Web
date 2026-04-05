import { NextResponse } from "next/server";

import { requireApiSession } from "@/app/api/auth-guard";
import { createWritingDraft, getWritingOverview, listWritingDrafts } from "@/server/writing/service";

export async function GET() {
  const unauthorized = await requireApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  const [drafts, overview] = await Promise.all([
    listWritingDrafts(),
    getWritingOverview()
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      drafts,
      count: drafts.length,
      totalCount: overview.draftCount
    }
  });
}

export async function POST(request: Request) {
  const unauthorized = await requireApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    let payload: Record<string, unknown> = {};

    if (contentType.includes("application/json")) {
      payload = (await request.json()) as Record<string, unknown>;
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const rawContent = formData.get("content")?.toString() ?? "[]";

      payload = {
        title: formData.get("title")?.toString() ?? "",
        summary: formData.get("summary")?.toString() ?? "",
        coverImageUrl: formData.get("coverImageUrl")?.toString() ?? "",
        sourceNoteSlug: formData.get("sourceNoteSlug")?.toString() ?? "",
        visibility: formData.get("visibility")?.toString() ?? "",
        content: JSON.parse(rawContent)
      };
    }

    const draft = await createWritingDraft(payload);
    return NextResponse.json({ ok: true, data: draft }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create writing draft."
      },
      { status: 400 }
    );
  }
}
