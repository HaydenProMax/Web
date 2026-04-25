import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { authenticateApiRequest } from "@/app/api/auth-guard";
import { createCheckInAuditLog, updateCheckInStatusesForDate } from "@/server/check-in/service";

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const payload = await request.json();
    const result = await updateCheckInStatusesForDate(payload, { ownerId: auth.userId });
    const requestId = crypto.randomUUID();

    await createCheckInAuditLog({
      ownerId: auth.userId,
      action: "UPDATE_DATE",
      source: auth.authMethod,
      requestId,
      targetDate: result.date,
      payload,
      result
    });

    return NextResponse.json({
      ok: true,
      data: result,
      meta: {
        authMethod: auth.authMethod,
        requestId
      }
    }, { status: result.ok ? 200 : 207 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to update check-ins for the requested date."
      },
      { status: 400 }
    );
  }
}
