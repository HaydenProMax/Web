import { NextResponse } from "next/server";

import { authenticateApiRequest } from "@/app/api/auth-guard";
import { updateTodayCheckInStatuses } from "@/server/check-in/service";

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const payload = await request.json();
    const result = await updateTodayCheckInStatuses(payload, { ownerId: auth.userId });

    return NextResponse.json({
      ok: true,
      data: result,
      meta: {
        authMethod: auth.authMethod
      }
    }, { status: result.ok ? 200 : 207 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to update today's check-ins."
      },
      { status: 400 }
    );
  }
}
