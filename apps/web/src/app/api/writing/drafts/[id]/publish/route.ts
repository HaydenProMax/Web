import { NextResponse } from "next/server";

import { requireApiSession } from "@/app/api/auth-guard";
import { publishWritingDraft } from "@/server/writing/service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;

  try {
    const post = await publishWritingDraft(id);
    return NextResponse.json({ ok: true, data: post }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to publish draft."
      },
      { status: 400 }
    );
  }
}
