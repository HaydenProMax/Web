export const dynamic = "force-dynamic";

import { CheckInHabitManager } from "@/components/check-in/check-in-habit-manager";
import { CheckInFeedbackToast } from "@/components/check-in/check-in-feedback-toast";
import { CheckInStatsPanel } from "@/components/check-in/check-in-stats-panel";
import { CheckInTodayList } from "@/components/check-in/check-in-today-list";
import { ShellLayout } from "@/components/shell/shell-layout";
import { getCheckInOverview, listCheckInHabits, listTodayCheckInHabits } from "@/server/check-in/service";

function buildDateLabel() {
  return new Date().toLocaleDateString("zh-CN", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

function getToast(searchParams: Record<string, string | string[] | undefined>) {
  if (searchParams.error) {
    return {
      tone: "error" as const,
      message: "Something went wrong. Try again."
    };
  }

  if (searchParams.created) {
    return {
      tone: "success" as const,
      message: "Habit added."
    };
  }

  if (searchParams.updated) {
    return {
      tone: "success" as const,
      message: "Saved."
    };
  }

  if (searchParams.archived) {
    return {
      tone: "success" as const,
      message: "Habit archived."
    };
  }

  return null;
}

export default async function CheckInPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({}));
  const [overview, todayHabits, habits] = await Promise.all([
    getCheckInOverview(),
    listTodayCheckInHabits(),
    listCheckInHabits()
  ]);
  const toast = getToast(resolvedSearchParams);

  return (
    <ShellLayout title="Check-in">
      {toast ? <CheckInFeedbackToast tone={toast.tone} message={toast.message} /> : null}

      <p className="mb-6 text-xs uppercase tracking-[0.18em] text-primary/70">{buildDateLabel()}</p>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_340px] 2xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <div>
          <CheckInTodayList habits={todayHabits} />
        </div>

        <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <CheckInStatsPanel overview={overview} />
          <CheckInHabitManager habitCount={habits.length} />
        </aside>
      </div>
    </ShellLayout>
  );
}
