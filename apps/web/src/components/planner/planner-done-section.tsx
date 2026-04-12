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
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/65">
              Recent wins stay nearby so you can review them or reopen them without hunting.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-foreground/55 shadow-ambient">{count}</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-ambient">
              {open ? "Collapse" : "Expand"}
            </span>
          </div>
        </summary>
        <div className="mt-5 space-y-3">{children}</div>
      </details>
    </section>
  );
}
