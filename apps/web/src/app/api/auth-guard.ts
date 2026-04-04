import { NextResponse } from "next/server";

import { auth } from "@/auth";

export async function requireApiSession() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized"
      },
      { status: 401 }
    );
  }

  return null;
}
