import { NextResponse } from "next/server";

import { requireApiSession } from "@/app/api/auth-guard";
import { updateWritingDraft } from "@/server/writing/service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const draft = await updateWritingDraft(id, payload);
    return NextResponse.json({ ok: true, data: draft });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to update writing draft."
      },
      { status: 400 }
    );
  }
}
