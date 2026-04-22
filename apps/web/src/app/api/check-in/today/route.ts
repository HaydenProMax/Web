import { NextResponse } from "next/server";

import { authenticateApiRequest } from "@/app/api/auth-guard";
import { getTodayCheckInStatus } from "@/server/check-in/service";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const todayStatus = await getTodayCheckInStatus({ ownerId: auth.userId });

    return NextResponse.json({
      ok: true,
      data: todayStatus,
      meta: {
        authMethod: auth.authMethod
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load today's check-ins."
      },
      { status: 500 }
    );
  }
}
