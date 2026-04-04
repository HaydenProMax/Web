import Link from "next/link";

import { signInAction } from "@/app/sign-in/actions";

function resolveSafeCallbackPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export default async function SignInPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const error = resolvedSearchParams?.error === "invalid-credentials" ? resolvedSearchParams.error : "";
  const callbackUrl = resolveSafeCallbackPath(resolvedSearchParams?.callbackUrl);
  const defaultEmail = process.env.DEFAULT_USER_EMAIL ?? "hayden@example.com";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <section className="w-full max-w-xl rounded-[2rem] bg-surface-container p-8 shadow-ambient">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Komorebi Access</p>
        <h1 className="mt-3 font-headline text-4xl text-foreground">Sign in to your workstation</h1>
        <p className="mt-4 text-sm leading-6 text-foreground/70">
          Your workstation uses a private single-user sign-in flow, so every module resolves ownership from the active session and keeps notes, tasks, writing, and archive history under one personal workspace.
        </p>

        {error ? (
          <div className="mt-6 rounded-[1.5rem] bg-white/80 px-5 py-4 text-sm text-rose-600 shadow-ambient">
            The email or access code did not match this workstation.
          </div>
        ) : null}

        <form action={signInAction} className="mt-8 grid gap-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <label className="grid gap-2 text-sm text-foreground/70">
            Email
            <input
              type="email"
              name="email"
              defaultValue={defaultEmail}
              className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-foreground/70">
            Access Code
            <input
              type="password"
              name="password"
              className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none"
            />
          </label>
          <button type="submit" className="mt-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white">
            Enter Workspace
          </button>
        </form>

        <div className="mt-8 rounded-[1.5rem] bg-white/80 p-5 text-sm leading-6 text-foreground/65">
          <p className="font-semibold text-primary">Private workspace access</p>
          <p className="mt-2">The default workspace account is <span className="font-medium text-foreground">{defaultEmail}</span>.</p>
          <p className="mt-1">The access code is read from <code className="rounded bg-surface-container-low px-1.5 py-0.5">AUTH_DEMO_PASSWORD</code> in the root <code className="rounded bg-surface-container-low px-1.5 py-0.5">.env</code>.</p>
        </div>

        <div className="mt-6 text-sm text-foreground/55">
          <Link href="https://authjs.dev" className="text-primary">
            Auth.js
          </Link>{" "}
          handles the session boundary, while workstation data remains in PostgreSQL.
        </div>
      </section>
    </main>
  );
}