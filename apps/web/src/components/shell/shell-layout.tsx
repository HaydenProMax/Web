import Link from "next/link";
import type { ReactNode } from "react";

import { auth } from "@/auth";

import { signOutAction } from "@/app/sign-in/actions";
import { getNavigationItems } from "@/lib/navigation";
import { getPreferredActivityReentry } from "@/server/activity/preferences";
import { getRememberedWorkflowSummary } from "@/server/search/preferences";
import { getSettingsSnapshot, getSystemPostureSnapshot } from "@/server/settings/service";

type ShellLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export async function ShellLayout({ title, description, children }: ShellLayoutProps) {
  const [session, navigationItems, snapshot, activityReentry, postureSnapshot, rememberedWorkflow] = await Promise.all([
    auth(),
    getNavigationItems(),
    getSettingsSnapshot(),
    getPreferredActivityReentry(),
    getSystemPostureSnapshot(),
    getRememberedWorkflowSummary()
  ]);

  const sessionIdentity = session?.user?.email ?? session?.user?.name ?? "Signed-in workspace user";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 flex-col bg-surface-container px-6 py-8 md:flex">
          <div className="mb-10 px-2">
            <p className="font-headline text-2xl italic text-primary">Komorebi</p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-foreground/60">
              {snapshot.preferences.displayName || "Personal Workstation"}
            </p>
            <p className="mt-2 text-sm text-foreground/55">{snapshot.preferences.curatorTitle}</p>
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-surface-container-low hover:text-primary"
              >
                <span className="flex items-center justify-between gap-3">
                  <span>{item.label}</span>
                  {item.replayAligned ? (
                    <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                      Focus
                    </span>
                  ) : null}
                </span>
              </Link>
            ))}
          </nav>

          <section className="mt-8 rounded-[1.75rem] bg-surface-container-low p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Desktop Console</p>
            <h2 className="mt-3 font-headline text-2xl text-foreground">Keep the workstation posture in reach</h2>
            <p className="mt-3 text-sm leading-6 text-foreground/65">Your desktop shell now keeps the live replay lane and next-step launch close without sending you back through a page body first.</p>
            <div className="mt-5 space-y-3 text-xs uppercase tracking-[0.16em] text-primary">
              <div className="rounded-[1.25rem] bg-white/80 px-4 py-3 shadow-ambient">
                <span>Current Lens</span>
                <p className="mt-2 text-sm font-semibold tracking-normal text-foreground">{postureSnapshot.currentLensLabel}</p>
              </div>
              <div className="rounded-[1.25rem] bg-white/80 px-4 py-3 shadow-ambient">
                <span>Aligned Module</span>
                <p className="mt-2 text-sm font-semibold tracking-normal text-foreground">{postureSnapshot.alignedModuleName}</p>
              </div>
              <div className="rounded-[1.25rem] bg-white/80 px-4 py-3 shadow-ambient">
                <span>Workflow Memory</span>
                <p className="mt-2 text-sm font-semibold tracking-normal text-foreground">{rememberedWorkflow.active ? rememberedWorkflow.title : "Following live posture"}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3">
              <Link href={activityReentry.nextStep.href} className="rounded-full bg-primary px-4 py-3 text-center text-sm font-semibold text-white shadow-ambient">
                {activityReentry.nextStep.label}
              </Link>
              <div className="flex gap-3">
                <Link href={activityReentry.href} className="flex-1 rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-primary shadow-ambient">
                  Resume Lens
                </Link>
                <Link href={rememberedWorkflow.href} className="flex-1 rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-primary shadow-ambient">
                  {rememberedWorkflow.active ? "Open Workflow" : "Open Command Desk"}
                </Link>
              </div>
              <Link href="/settings#replay-habit" className="rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-primary shadow-ambient">
                Tune Habit
              </Link>
            </div>
          </section>

          <div className="mt-8 rounded-[1.5rem] bg-white/80 px-5 py-4 text-sm text-foreground/65 shadow-ambient">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Session Active</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{sessionIdentity}</p>
              </div>
              <form action={signOutAction}>
                <button type="submit" className="rounded-full bg-surface-container-low px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient">
                  Sign Out
                </button>
              </form>
            </div>
            <p className="mt-2 text-sm text-foreground/60">This shell is unlocked because an Auth.js session is already active in this browser.</p>
          </div>

          <Link href="/modules" className="mt-8 rounded-full bg-gradient-to-br from-primary to-primary-dim px-5 py-4 text-center text-sm font-semibold text-white shadow-ambient">
            Manage Modules
          </Link>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-outline-variant/20 bg-background/90 px-6 py-4 backdrop-blur md:px-10">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Sanctuary</p>
                <h1 className="font-headline text-3xl text-foreground md:text-4xl">{title}</h1>
              </div>
              <div className="w-full max-w-xl">
                <form action="/search" className="flex items-center gap-3 rounded-full bg-surface-container-low px-3 py-2 shadow-ambient">
                  <input
                    type="search"
                    name="q"
                    placeholder="Search or run a command..."
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-foreground/45"
                  />
                  <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                    Go
                  </button>
                </form>
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 py-10 md:px-10">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
              <p className="max-w-2xl text-base leading-7 text-foreground/70">{description}</p>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}



