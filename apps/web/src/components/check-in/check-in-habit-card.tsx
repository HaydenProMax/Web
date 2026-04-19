"use client";

import { useState } from "react";

import type { CheckInHabitSummary } from "@workspace/types/index";

import { archiveCheckInHabitAction, markCheckInDoneAction, updateCheckInHabitFieldsAction } from "@/app/check-in/actions";
import { CheckInSkipForm } from "@/components/check-in/check-in-skip-form";

type CheckInHabitCardProps = {
  habit: CheckInHabitSummary;
};

function scheduleLabel(habit: CheckInHabitSummary) {
  if (habit.scheduleType === "DAILY") {
    return "Daily";
  }

  if (habit.scheduleType === "WEEKDAYS") {
    return "Weekdays";
  }

  return "Custom";
}

export function CheckInHabitCard({ habit }: CheckInHabitCardProps) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const isDone = habit.todayStatus === "DONE";
  const isSkipped = habit.todayStatus === "SKIPPED";
  const secondaryActionClass = "rounded-full border border-foreground/10 bg-surface-container px-4 py-2 text-sm font-semibold text-foreground/72 transition hover:bg-white";

  return (
    <>
      <article className={isDone
        ? "rounded-[1.4rem] border border-secondary/10 bg-secondary-fixed/8 px-5 py-4 shadow-ambient"
        : isSkipped
          ? "rounded-[1.6rem] border border-tertiary/10 bg-tertiary-container/12 p-5 shadow-ambient"
          : "rounded-[1.6rem] border border-white/80 bg-white/88 p-5 shadow-ambient"}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-headline text-2xl tracking-[-0.04em] text-foreground">{habit.title}</h3>
              <span className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/55">
                {scheduleLabel(habit)}
              </span>
              {isDone ? (
                <span className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/55">
                  done
                </span>
              ) : null}
              {isSkipped ? (
                <span className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/55">
                  skipped
                </span>
              ) : null}
            </div>

            {!isDone && habit.description ? (
              <p className="mt-3 text-sm leading-7 text-foreground/65">{habit.description}</p>
            ) : null}

            <p className={isDone
              ? "mt-3 text-xs uppercase tracking-[0.14em] text-foreground/42"
              : "mt-4 text-xs uppercase tracking-[0.14em] text-foreground/45"}>
              Month {habit.monthlyDoneCount} / Year {habit.yearlyDoneCount} / Total {habit.totalDoneCount}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
            <button
              type="button"
              onClick={() => setArchiveOpen(true)}
              className={secondaryActionClass}
            >
              Archive
            </button>

            {!isDone ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className={secondaryActionClass}
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => setSkipOpen(true)}
                  className={secondaryActionClass}
                >
                  {isSkipped ? "Update skip note" : "Skip for today"}
                </button>

                <form action={markCheckInDoneAction}>
                  <input type="hidden" name="habitId" value={habit.id} />
                  <button type="submit" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white">
                    Done
                  </button>
                </form>
              </>
            ) : null}
          </div>
        </div>
      </article>

      {archiveOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/18 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[1.6rem] border border-white/80 bg-white/96 p-6 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.18em] text-primary/75">Archive</p>
            <h3 className="mt-2 font-headline text-2xl text-foreground">Archive this habit?</h3>
            <p className="mt-3 text-sm leading-7 text-foreground/62">
              It will leave the active list, but all past records and stats will stay intact.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setArchiveOpen(false)}
                className={secondaryActionClass}
              >
                Cancel
              </button>
              <form action={archiveCheckInHabitAction}>
                <input type="hidden" name="habitId" value={habit.id} />
                <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-ambient">
                  Confirm
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/18 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-[1.6rem] border border-white/80 bg-white/96 p-6 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.18em] text-primary/75">Edit</p>
            <h3 className="mt-2 font-headline text-2xl text-foreground">Edit habit</h3>
            <p className="mt-3 text-sm leading-7 text-foreground/62">
              Update the title or description. Existing records and stats will stay the same.
            </p>
            <form action={updateCheckInHabitFieldsAction} className="mt-5 space-y-3">
              <input type="hidden" name="habitId" value={habit.id} />
              <input
                name="title"
                defaultValue={habit.title}
                placeholder="Habit name"
                className="w-full rounded-[1rem] bg-surface-container px-4 py-3 text-sm text-foreground outline-none"
              />
              <textarea
                name="description"
                rows={4}
                defaultValue={habit.description}
                placeholder="A short reminder"
                className="w-full rounded-[1rem] bg-surface-container px-4 py-3 text-sm text-foreground outline-none"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className={secondaryActionClass}
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-ambient">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {skipOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/18 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-[1.6rem] border border-white/80 bg-white/96 p-6 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.18em] text-primary/75">Skip</p>
            <h3 className="mt-2 font-headline text-2xl text-foreground">{isSkipped ? "Update skip note" : "Skip this habit today?"}</h3>
            <p className="mt-3 text-sm leading-7 text-foreground/62">
              You can choose a reason and leave an optional note. Today&apos;s status will become skipped.
            </p>
            <div className="mt-5">
              <CheckInSkipForm habitId={habit.id} onCancel={() => setSkipOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
