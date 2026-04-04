"use server";

import AuthError from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";

function resolveSafeCallbackPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export async function signInAction(formData: FormData) {
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const callbackPath = resolveSafeCallbackPath(formData.get("callbackUrl")?.toString());

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackPath
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/sign-in?error=invalid-credentials&callbackUrl=${encodeURIComponent(callbackPath)}`);
    }

    throw error;
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/sign-in" });
}