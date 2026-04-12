"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import type { PlannerQuickAddState } from "@/app/planner/actions";
import { quickCreatePlannerTaskAction } from "@/app/planner/actions";

const initialState: PlannerQuickAddState = {
  success: false,
  message: "",
  timestamp: 0
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-ambient transition-colors duration-200 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Adding..." : "Add"}
    </button>
  );
}

export function PlannerQuickAdd() {
  const [state, formAction] = useActionState(quickCreatePlannerTaskAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.timestamp) {
      return;
    }

    if (state.success) {
      formRef.current?.reset();
    }

    inputRef.current?.focus();
  }, [state]);

  return (
    <div className="mx-auto mt-6 max-w-3xl rounded-[1.75rem] border border-white/70 bg-white/92 p-4 shadow-ambient">
      <form ref={formRef} action={formAction} className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          ref={inputRef}
          name="title"
          placeholder="Add a task for today"
          className="min-w-0 flex-1 rounded-2xl border border-outline-variant/30 bg-white px-4 py-3 text-sm outline-none transition-colors duration-200 focus:border-primary/40"
        />
        <input type="hidden" name="description" value="" />
        <input type="hidden" name="priority" value="MEDIUM" />
        <input type="hidden" name="status" value="TODO" />
        <input type="hidden" name="scheduledFor" value="" />
        <input type="hidden" name="dueAt" value="" />
        <input type="hidden" name="relatedNoteSlug" value="" />
        <input type="hidden" name="relatedDraftId" value="" />
        <SubmitButton />
      </form>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-foreground/50">
          <span className="rounded-full bg-surface-container-low px-3 py-1">Quick add</span>
          <span className="rounded-full bg-surface-container-low px-3 py-1">One-line capture</span>
          <span className="rounded-full bg-surface-container-low px-3 py-1">Edit later if needed</span>
        </div>
        <p className={state.success ? "text-emerald-700" : "text-rose-700"} aria-live="polite">
          {state.message || " "}
        </p>
      </div>
    </div>
  );
}
