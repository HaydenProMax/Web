import { NextResponse } from "next/server";

import { authenticateApiRequest } from "@/app/api/auth-guard";
import { listCheckInAuditLogs } from "@/server/check-in/service";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const limitValue = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitValue) ? limitValue : 20;
  const habitId = searchParams.get("habitId")?.trim() ?? "";

  try {
    const logs = await listCheckInAuditLogs({
      ownerId: auth.userId,
      limit,
      habitId: habitId || undefined
    });

    return NextResponse.json({
      ok: true,
      data: {
        logs,
        count: logs.length
      },
      meta: {
        authMethod: auth.authMethod
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load check-in audit logs."
      },
      { status: 400 }
    );
  }
}
