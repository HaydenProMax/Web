import Link from "next/link";
import type { ReactNode } from "react";

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
  const [navigationItems, snapshot, activityReentry, postureSnapshot, rememberedWorkflow] = await Promise.all([
    getNavigationItems(),
    getSettingsSnapshot(),
    getPreferredActivityReentry(),
    getSystemPostureSnapshot(),
    getRememberedWorkflowSummary()
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 flex-col bg-surface-container px-6 py-8 md:flex">
          <div className="mb-10 px-2">
            <p className="font-headline text-2xl italic text-primary">Komorebi</p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-foreground/60">
              {snapshot.preferences.displayName || "个人工作站"}
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
                      当前焦点
                    </span>
                  ) : null}
                </span>
              </Link>
            ))}
          </nav>

          <section className="mt-8 rounded-[1.75rem] bg-surface-container-low p-5 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">桌面控制台</p>
            <h2 className="mt-3 font-headline text-2xl text-foreground">随时掌握当前工作姿态</h2>
            <p className="mt-3 text-sm leading-6 text-foreground/65">桌面壳层会持续显示当前回放视角、对齐模块和下一步动作，不需要每次先回到页面正文。</p>
            <div className="mt-5 space-y-3 text-xs uppercase tracking-[0.16em] text-primary">
              <div className="rounded-[1.25rem] bg-white/80 px-4 py-3 shadow-ambient">
                <span>当前视角</span>
                <p className="mt-2 text-sm font-semibold tracking-normal text-foreground">{postureSnapshot.currentLensLabel}</p>
              </div>
              <div className="rounded-[1.25rem] bg-white/80 px-4 py-3 shadow-ambient">
                <span>对齐模块</span>
                <p className="mt-2 text-sm font-semibold tracking-normal text-foreground">{postureSnapshot.alignedModuleName}</p>
              </div>
              <div className="rounded-[1.25rem] bg-white/80 px-4 py-3 shadow-ambient">
                <span>工作流记忆</span>
                <p className="mt-2 text-sm font-semibold tracking-normal text-foreground">{rememberedWorkflow.active ? rememberedWorkflow.title : "跟随实时姿态"}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3">
              <Link href={activityReentry.nextStep.href} className="rounded-full bg-primary px-4 py-3 text-center text-sm font-semibold text-white shadow-ambient">
                {activityReentry.nextStep.label}
              </Link>
              <div className="flex gap-3">
                <Link href={activityReentry.href} className="flex-1 rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-primary shadow-ambient">
                  回到当前视角
                </Link>
                <Link href={rememberedWorkflow.href} className="flex-1 rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-primary shadow-ambient">
                  {rememberedWorkflow.active ? "打开工作流" : "打开命令台"}
                </Link>
              </div>
              <Link href="/settings#replay-habit" className="rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-primary shadow-ambient">
                调整回放习惯
              </Link>
            </div>
          </section>

          <Link href="/modules" className="mt-8 rounded-full bg-gradient-to-br from-primary to-primary-dim px-5 py-4 text-center text-sm font-semibold text-white shadow-ambient">
            管理模块
          </Link>
          <form action={signOutAction} className="mt-3">
            <button type="submit" className="w-full rounded-full bg-white px-5 py-4 text-center text-sm font-semibold text-primary shadow-ambient">
              退出登录
            </button>
          </form>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-outline-variant/20 bg-background/90 px-6 py-4 backdrop-blur md:px-10">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">个人工作区</p>
                <h1 className="font-headline text-3xl text-foreground md:text-4xl">{title}</h1>
              </div>
              <div className="flex w-full max-w-xl flex-col gap-3">
                <form action="/search" className="flex items-center gap-3 rounded-full bg-surface-container-low px-3 py-2 shadow-ambient">
                  <input
                    type="search"
                    name="q"
                    placeholder="搜索或执行命令..."
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-foreground/45"
                  />
                  <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                    前往
                  </button>
                </form>
                <Link href={activityReentry.href} className="inline-flex w-fit items-center rounded-full bg-surface-container-low px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
                  回到{activityReentry.label}视角
                </Link>
                <div className="flex flex-wrap items-center gap-2 rounded-[1.25rem] bg-surface-container-low px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary shadow-ambient">
                  <span>当前姿态</span>
                  <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] tracking-[0.14em]">{postureSnapshot.currentLensLabel}</span>
                  <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] tracking-[0.14em]">习惯 {postureSnapshot.defaultLensLabel}</span>
                  <Link href={postureSnapshot.alignedModuleHref} className="rounded-full bg-white/80 px-2 py-1 text-[10px] tracking-[0.14em] hover:text-primary-dim">
                    {postureSnapshot.alignedModuleName}
                  </Link>
                  <Link href={rememberedWorkflow.href} className="rounded-full bg-white/80 px-2 py-1 text-[10px] tracking-[0.14em] hover:text-primary-dim">
                    {rememberedWorkflow.active ? `工作流 ${rememberedWorkflow.title}` : "未固定工作流"}
                  </Link>
                  <Link href="/settings#replay-habit" className="rounded-full bg-white px-2 py-1 text-[10px] tracking-[0.14em] hover:text-primary-dim">
                    调整
                  </Link>
                </div>
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
