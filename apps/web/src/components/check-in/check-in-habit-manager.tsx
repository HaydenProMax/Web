"use client";

import { useState } from "react";

import { createCheckInHabitAction } from "@/app/check-in/actions";

type CheckInHabitManagerProps = {
  habitCount: number;
};

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" }
];

export function CheckInHabitManager({ habitCount }: CheckInHabitManagerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="rounded-[1.8rem] border border-white/70 bg-white/88 p-5 shadow-ambient">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-primary/75">New habit</p>
            <h2 className="mt-2 font-headline text-2xl text-foreground">Add one</h2>
          </div>
          <div className="rounded-full bg-surface-container px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {habitCount}
          </div>
        </div>

        <div className="mt-4 rounded-[1.4rem] bg-surface-container p-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full rounded-full bg-primary px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-90"
          >
            Start
          </button>
        </div>
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/18 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-[1.6rem] border border-white/80 bg-white/96 p-6 shadow-ambient">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-primary/75">New habit</p>
                <h3 className="mt-2 font-headline text-2xl text-foreground">Add one</h3>
                <p className="mt-3 text-sm leading-7 text-foreground/62">
                  Keep it light. You can adjust the title, reminder, and schedule before saving.
                </p>
              </div>
              <div className="rounded-full bg-surface-container px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {habitCount}
              </div>
            </div>

            <form action={createCheckInHabitAction} className="mt-5 space-y-3">
              <input
                name="title"
                placeholder="Habit name"
                className="w-full rounded-[1rem] bg-surface-container px-4 py-3 text-sm text-foreground outline-none"
              />
              <textarea
                name="description"
                rows={3}
                placeholder="A short reminder"
                className="w-full rounded-[1rem] bg-surface-container px-4 py-3 text-sm text-foreground outline-none"
              />
              <select
                name="scheduleType"
                defaultValue="DAILY"
                className="w-full rounded-[1rem] bg-surface-container px-4 py-3 text-sm text-foreground outline-none"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKDAYS">Weekdays</option>
                <option value="CUSTOM">Custom weekdays</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                {WEEKDAY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 rounded-[0.95rem] bg-surface-container px-3 py-3 text-xs font-semibold text-foreground/70"
                  >
                    <input type="checkbox" name="scheduleDays" value={option.value} />
                    {option.label}
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-foreground/10 bg-surface-container px-5 py-2 text-sm font-semibold text-foreground/72"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-ambient">
                  Add habit
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
