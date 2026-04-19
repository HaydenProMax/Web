import type { CheckInOverview } from "@workspace/types/index";

type CheckInStatsPanelProps = {
  overview: CheckInOverview;
};

export function CheckInStatsPanel({ overview }: CheckInStatsPanelProps) {
  const todayTotal = overview.todayDoneCount + overview.todayPendingCount;

  return (
    <section className="rounded-[1.8rem] border border-white/70 bg-white/88 p-5 shadow-ambient">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary/75">Stats</p>
          <h2 className="mt-2 font-headline text-2xl text-foreground">Today</h2>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.16em] text-foreground/45">Complete</p>
          <p className="mt-1 text-3xl font-semibold text-foreground">{overview.todayDoneCount}/{todayTotal}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[1.1rem] bg-surface-container px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-foreground/45">Done today</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{overview.todayDoneCount}</p>
        </div>
        <div className="rounded-[1.1rem] bg-surface-container px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-foreground/45">Open</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{overview.todayPendingCount}</p>
        </div>
      </div>
    </section>
  );
}
