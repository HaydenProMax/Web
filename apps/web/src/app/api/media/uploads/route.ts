import { NextResponse } from "next/server";

import { requireApiSession } from "@/app/api/auth-guard";
import { createEmbedMediaAsset, createUploadedImageAsset } from "@/server/media/service";
import { isUploadableFile } from "@/server/media/schema";

export async function POST(request: Request) {
  const unauthorized = await requireApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const embedUrl = formData.get("embedUrl")?.toString() ?? "";

  try {
    if (isUploadableFile(file)) {
      const asset = await createUploadedImageAsset(file, {
        altText: formData.get("altText")?.toString() ?? "",
        fieldName: formData.get("fieldName")?.toString() ?? "",
        entityType: formData.get("entityType")?.toString() ?? "",
        entityId: formData.get("entityId")?.toString() ?? "",
        moduleKey: formData.get("moduleKey")?.toString() ?? ""
      });

      return NextResponse.json({ ok: true, data: asset }, { status: 201 });
    }

    if (embedUrl) {
      const asset = await createEmbedMediaAsset({
        embedUrl,
        altText: formData.get("altText")?.toString() ?? "",
        fieldName: formData.get("fieldName")?.toString() ?? "",
        entityType: formData.get("entityType")?.toString() ?? "",
        entityId: formData.get("entityId")?.toString() ?? "",
        moduleKey: formData.get("moduleKey")?.toString() ?? ""
      });

      return NextResponse.json({ ok: true, data: asset }, { status: 201 });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Provide either an image file or an embedUrl."
      },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to store media asset."
      },
      { status: 400 }
    );
  }
}
