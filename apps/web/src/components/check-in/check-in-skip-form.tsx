"use client";

import type { CheckInSkipReasonTag } from "@workspace/types/index";

import { markCheckInSkippedAction } from "@/app/check-in/actions";

const SKIP_REASON_OPTIONS: Array<{ value: CheckInSkipReasonTag; label: string }> = [
  { value: "SICK", label: "Sick" },
  { value: "BUSY", label: "Busy" },
  { value: "OUT", label: "Out" },
  { value: "REST", label: "Rest" },
  { value: "FORGOT", label: "Forgot" },
  { value: "OTHER", label: "Other" }
];

type CheckInSkipFormProps = {
  habitId: string;
  onCancel?: () => void;
};

export function CheckInSkipForm({ habitId, onCancel }: CheckInSkipFormProps) {
  return (
    <form action={markCheckInSkippedAction} className="rounded-[1.3rem] bg-surface-container p-4">
      <input type="hidden" name="habitId" value={habitId} />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tertiary">Skip reason</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {SKIP_REASON_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-tertiary"
          >
            <input type="radio" name="reasonTag" value={option.value} defaultChecked={option.value === "BUSY"} />
            {option.label}
          </label>
        ))}
      </div>
      <textarea
        name="note"
        rows={3}
        placeholder="Optional note"
        className="mt-4 w-full rounded-[1.1rem] bg-white px-4 py-3 text-sm text-foreground outline-none"
      />
      <div className="mt-4 flex justify-end gap-3">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-foreground/10 bg-white px-5 py-2 text-sm font-semibold text-foreground/72"
          >
            Cancel
          </button>
        ) : null}
        <button type="submit" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-ambient">
          Confirm Skip
        </button>
      </div>
    </form>
  );
}
