"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setArchiveItemFavorite } from "@/server/archive/service";

function parseArchiveCollection(value: string | null | undefined) {
  if (value === "all" || value === "favorites" || value === "resources") {
    return value;
  }

  return undefined;
}

function parseFavoriteToggle(value: string | null | undefined) {
  if (value === "1") {
    return true;
  }

  if (value === "0") {
    return false;
  }

  return undefined;
}

export async function toggleArchiveFavoriteAction(formData: FormData) {
  const itemId = formData.get("itemId")?.toString() ?? "";
  const nextValue = parseFavoriteToggle(formData.get("nextValue")?.toString());
  const parsedCollection = parseArchiveCollection(formData.get("collection")?.toString());
  const collection = parsedCollection ?? "all";

  if (!parsedCollection && formData.get("collection") !== null) {
    redirect(`/archive?collection=${collection}&error=invalid-collection`);
  }

  if (!itemId) {
    redirect(`/archive?collection=${collection}&error=missing-item`);
  }

  if (nextValue === undefined) {
    redirect(`/archive?collection=${collection}&error=favorite-failed`);
  }

  try {
    await setArchiveItemFavorite(itemId, nextValue);
  } catch {
    redirect(`/archive?collection=${collection}&error=favorite-failed`);
  }

  revalidatePath("/");
  revalidatePath("/archive");
  redirect(`/archive?collection=${collection}&updated=1`);
}
