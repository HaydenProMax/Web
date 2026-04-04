import { redirect } from "next/navigation";

import { auth } from "@/auth";

export async function getCurrentUserId() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/sign-in");
  }

  return userId;
}
