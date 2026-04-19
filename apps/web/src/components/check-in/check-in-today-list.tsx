import type { CheckInHabitSummary } from "@workspace/types/index";

import { CheckInHabitCard } from "@/components/check-in/check-in-habit-card";

type CheckInTodayListProps = {
  habits: CheckInHabitSummary[];
};

export function CheckInTodayList({ habits }: CheckInTodayListProps) {
  const activeHabits = habits.filter((habit) => habit.todayStatus !== "DONE");
  const completedHabits = habits.filter((habit) => habit.todayStatus === "DONE");

  return (
    <section className="rounded-[1.8rem] border border-white/70 bg-white/88 p-5 shadow-ambient">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary/75">Today</p>
          <h2 className="mt-2 font-headline text-3xl text-foreground">Today&apos;s check-ins</h2>
        </div>
        <div className="rounded-full bg-surface-container px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {habits.length} scheduled
        </div>
      </div>

      {habits.length > 0 ? (
        <div className="mt-5 space-y-5">
          {activeHabits.length > 0 ? (
            <div className="space-y-4">
              {activeHabits.map((habit) => (
                <CheckInHabitCard key={habit.id} habit={habit} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.6rem] bg-surface-container px-5 py-6">
              <p className="font-semibold text-foreground">Everything scheduled for today is done.</p>
              <p className="mt-2 text-sm leading-7 text-foreground/62">
                Nice work. You can review the completed group below if needed.
              </p>
            </div>
          )}

          {completedHabits.length > 0 ? (
            <details className="rounded-[1.5rem] bg-surface-container px-4 py-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
                Completed today ({completedHabits.length})
              </summary>
              <div className="mt-4 space-y-3">
                {completedHabits.map((habit) => (
                  <CheckInHabitCard key={habit.id} habit={habit} />
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 rounded-[1.6rem] bg-surface-container px-5 py-6">
          <p className="font-semibold text-foreground">Nothing is scheduled for today yet.</p>
          <p className="mt-2 text-sm leading-7 text-foreground/62">
            Add a habit from the right, then today&apos;s action list will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
