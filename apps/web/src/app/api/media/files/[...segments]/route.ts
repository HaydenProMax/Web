import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getDb } from "@/server/db";
import { readFileFromLocalStorage } from "@/server/media/local-storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ segments: string[] }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { segments } = await context.params;
  const storageKey = segments.join("/");
  const db = getDb();

  const asset = await db.mediaAsset.findFirst({
    where: {
      ownerId: session.user.id,
      storageKey,
      storageProvider: "local"
    }
  });

  if (!asset) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const fileBuffer = await readFileFromLocalStorage(storageKey);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType || "application/octet-stream",
        "Cache-Control": "private, max-age=0, must-revalidate"
      }
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
