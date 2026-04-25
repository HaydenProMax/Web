import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { authenticateApiRequest } from "@/app/api/auth-guard";
import { archiveCheckInHabit, createCheckInAuditLog } from "@/server/check-in/service";

type RouteContext = {
  params: Promise<{
    habitId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { habitId } = await context.params;

  try {
    const result = await archiveCheckInHabit(habitId, { ownerId: auth.userId });
    const requestId = crypto.randomUUID();

    await createCheckInAuditLog({
      ownerId: auth.userId,
      habitId,
      action: "ARCHIVE_HABIT",
      source: auth.authMethod,
      requestId,
      result
    });

    return NextResponse.json({
      ok: true,
      data: result,
      meta: {
        authMethod: auth.authMethod,
        requestId
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to archive check-in habit."
      },
      { status: 400 }
    );
  }
}
