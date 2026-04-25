import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { authenticateApiRequest } from "@/app/api/auth-guard";
import { createCheckInAuditLog, createCheckInHabit, listCheckInHabits } from "@/server/check-in/service";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const habits = await listCheckInHabits({ ownerId: auth.userId });

    return NextResponse.json({
      ok: true,
      data: {
        habits,
        count: habits.length
      },
      meta: {
        authMethod: auth.authMethod
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load check-in habits."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const payload = await request.json();
    const habit = await createCheckInHabit(payload, { ownerId: auth.userId });
    const requestId = crypto.randomUUID();

    await createCheckInAuditLog({
      ownerId: auth.userId,
      habitId: habit.id,
      action: "CREATE_HABIT",
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
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create check-in habit."
      },
      { status: 400 }
    );
  }
}
