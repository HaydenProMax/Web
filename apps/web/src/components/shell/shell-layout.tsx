import Link from "next/link";
import type { ReactNode } from "react";

import { signOutAction } from "@/app/sign-in/actions";
import { getNavigationItems } from "@/lib/navigation";
import { getSettingsSnapshot } from "@/server/settings/service";

type ShellLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export async function ShellLayout({ title, description, children }: ShellLayoutProps) {
  const [navigationItems, snapshot] = await Promise.all([
    getNavigationItems(),
    getSettingsSnapshot()
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 flex-col bg-surface-container px-6 py-8 md:flex">
          <div className="mb-10 rounded-[2rem] border border-white/60 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(246,238,222,0.9)_54%,_rgba(229,212,173,0.8)_100%)] px-5 py-5 shadow-ambient">
            <div className="whitespace-nowrap font-headline leading-none">
              <p className="text-[2rem] tracking-[-0.06em] text-foreground/80">Hayden Garden</p>
            </div>
            <div className="mt-4 h-px w-14 bg-primary/18" />
            <p className="mt-3 max-w-[14rem] font-headline text-[1.02rem] italic leading-7 tracking-[-0.01em] text-primary/88">
              Tend the days, and the days will shape the garden.
            </p>
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

            <form action={signOutAction} className="pt-2">
              <button
                type="submit"
                className="w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-foreground/70 transition-colors hover:bg-surface-container-low hover:text-primary"
              >
                <span className="flex items-center justify-between gap-3">
                  <span>Sign Out</span>
                  <span className="text-xs text-foreground/35">Exit</span>
                </span>
              </button>
            </form>
          </nav>
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
