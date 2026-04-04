"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setArchiveItemFavorite } from "@/server/archive/service";

function resolveArchiveCollection(value: string | null | undefined) {
  if (value === "favorites" || value === "resources") {
    return value;
  }

  return "all";
}

export async function toggleArchiveFavoriteAction(formData: FormData) {
  const itemId = formData.get("itemId")?.toString() ?? "";
  const nextValue = formData.get("nextValue")?.toString() === "1";
  const collection = resolveArchiveCollection(formData.get("collection")?.toString());

  if (!itemId) {
    redirect(`/archive?collection=${collection}&error=missing-item`);
  }

  try {
    await setArchiveItemFavorite(itemId, nextValue);
    revalidatePath("/");
    revalidatePath("/archive");
    redirect(`/archive?collection=${collection}&updated=1`);
  } catch {
    redirect(`/archive?collection=${collection}&error=favorite-failed`);
  }
}