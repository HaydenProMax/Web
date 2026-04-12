"use client";

import { useState, type ReactNode } from "react";

type PlannerDoneSectionProps = {
  count: number;
  children: ReactNode;
};

export function PlannerDoneSection({ count, children }: PlannerDoneSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
      <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary className="flex cursor-pointer list-none flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-primary/75">List</p>
            <h2 className="mt-2 font-headline text-3xl text-foreground">Done</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/60">Finished tasks stay tucked away until you need them again.</p>
          </div>
          <div className="grid grid-cols-[6.5rem_3rem] items-center justify-end gap-3">
            <span className="inline-flex w-[6.5rem] justify-center rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
              {open ? "Hide" : "Show"}
            </span>
            <span className="inline-flex w-[3rem] justify-center rounded-full bg-white px-3 py-1 text-sm font-semibold text-foreground/55 shadow-ambient">{count}</span>
          </div>
        </summary>
        <div className="mt-4 space-y-2.5">{children}</div>
      </details>
    </section>
  );
}
