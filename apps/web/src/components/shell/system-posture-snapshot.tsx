import Link from "next/link";

import type { SystemPostureSnapshot } from "@workspace/types/index";

export function SystemPostureSnapshotCard({
  snapshot,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  hint
}: {
  snapshot: SystemPostureSnapshot;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  hint?: {
    eyebrow: string;
    title: string;
    description: string;
  };
}) {
  return (
    <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Posture Snapshot</p>
          <h2 className="mt-3 font-headline text-3xl text-foreground">{title}</h2>
        </div>
        <span className="text-sm text-foreground/50">{snapshot.visibleModuleCount} visible modules | {snapshot.hiddenModuleCount} hidden</span>
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/70">{description}</p>

{hint ? (
        <div className="mt-6 rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">{hint.eyebrow}</p>
          <h3 className="mt-3 font-headline text-2xl text-foreground">{hint.title}</h3>
          <p className="mt-3 text-sm leading-6 text-foreground/70">{hint.description}</p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Current Lens</p>
          <p className="mt-3 font-headline text-2xl text-foreground">{snapshot.currentLensLabel}</p>
          <p className="mt-2 text-sm text-foreground/60">The replay surface the shell will resume right now.</p>
        </div>
        <div className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Default Habit</p>
          <p className="mt-3 font-headline text-2xl text-foreground">{snapshot.defaultLensLabel}</p>
          <p className="mt-2 text-sm text-foreground/60">The baseline replay mode your workstation is biased toward.</p>
        </div>
        <div className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Aligned Module</p>
          <p className="mt-3 font-headline text-2xl text-foreground">{snapshot.alignedModuleName}</p>
          <p className="mt-2 text-sm text-foreground/60">The module most naturally matched to your replay habit.</p>
        </div>
        <div className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Locked Shell</p>
          <p className="mt-3 font-headline text-2xl text-foreground">{snapshot.lockedModuleCount}</p>
          <p className="mt-2 text-sm text-foreground/60">Infrastructure modules kept reachable for safe recovery.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={primaryHref} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-ambient">
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link href={secondaryHref} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
            {secondaryLabel}
          </Link>
        ) : null}
        <Link href={snapshot.alignedModuleHref} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary shadow-ambient">
          Open {snapshot.alignedModuleName}
        </Link>
      </div>
    </section>
  );
}
