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
  return (
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

      <details className="mt-4 rounded-[1.4rem] bg-surface-container p-4" open={habitCount === 0}>
        <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
          Start
        </summary>
        <form action={createCheckInHabitAction} className="mt-4 space-y-3">
          <input
            name="title"
            placeholder="Habit name"
            className="w-full rounded-[1rem] bg-white px-4 py-3 text-sm text-foreground outline-none"
          />
          <textarea
            name="description"
            rows={3}
            placeholder="A short reminder"
            className="w-full rounded-[1rem] bg-white px-4 py-3 text-sm text-foreground outline-none"
          />
          <select
            name="scheduleType"
            defaultValue="DAILY"
            className="w-full rounded-[1rem] bg-white px-4 py-3 text-sm text-foreground outline-none"
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKDAYS">Weekdays</option>
            <option value="CUSTOM">Custom weekdays</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            {WEEKDAY_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2 rounded-[0.95rem] bg-white px-3 py-3 text-xs font-semibold text-foreground/70">
                <input type="checkbox" name="scheduleDays" value={option.value} />
                {option.label}
              </label>
            ))}
          </div>
          <button type="submit" className="w-full rounded-full bg-primary px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white">
            Add habit
          </button>
        </form>
      </details>
    </section>
  );
}
