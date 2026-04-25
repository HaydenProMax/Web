import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { authenticateApiRequest } from "@/app/api/auth-guard";
import { createCheckInAuditLog, updateCheckInHabitFields } from "@/server/check-in/service";

type RouteContext = {
  params: Promise<{
    habitId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { habitId } = await context.params;

  try {
    const payload = await request.json();
    const habit = await updateCheckInHabitFields(habitId, payload, { ownerId: auth.userId });
    const requestId = crypto.randomUUID();

    await createCheckInAuditLog({
      ownerId: auth.userId,
      habitId,
      action: "UPDATE_HABIT",
      source: auth.authMethod,
      requestId,
      payload,
      result: habit
    });

    return NextResponse.json({
      ok: true,
      data: habit,
      meta: {
        authMethod: auth.authMethod,
        requestId
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to update check-in habit."
      },
      { status: 400 }
    );
  }
}
