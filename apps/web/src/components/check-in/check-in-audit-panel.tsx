import type { CheckInAuditLogItem } from "@workspace/types/index";

type CheckInAuditPanelProps = {
  logs: CheckInAuditLogItem[];
};

function formatActionLabel(action: CheckInAuditLogItem["action"]) {
  if (action === "CREATE_HABIT") return "Created habit";
  if (action === "UPDATE_HABIT") return "Updated habit";
  if (action === "ARCHIVE_HABIT") return "Archived habit";
  if (action === "UPDATE_TODAY") return "Updated today";
  if (action === "UPDATE_DATE") return "Backfilled date";

  return "Reset date";
}

function formatDateLabel(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderResultSummary(log: CheckInAuditLogItem) {
  if (!log.result || typeof log.result !== "object") {
    return "";
  }

  const candidate = log.result as {
    updatedCount?: unknown;
    failedCount?: unknown;
    clearedCount?: unknown;
    ok?: unknown;
  };

  if (typeof candidate.updatedCount === "number") {
    const failedCount = typeof candidate.failedCount === "number" ? candidate.failedCount : 0;
    return failedCount > 0
      ? `${candidate.updatedCount} applied, ${failedCount} failed`
      : `${candidate.updatedCount} applied`;
  }

  if (typeof candidate.clearedCount === "number") {
    const failedCount = typeof candidate.failedCount === "number" ? candidate.failedCount : 0;
    return failedCount > 0
      ? `${candidate.clearedCount} cleared, ${failedCount} failed`
      : `${candidate.clearedCount} cleared`;
  }

  if (typeof candidate.ok === "boolean") {
    return candidate.ok ? "Applied" : "Partially applied";
  }

  return "";
}

export function CheckInAuditPanel({ logs }: CheckInAuditPanelProps) {
  return (
    <section className="rounded-[1.8rem] border border-white/70 bg-white/88 p-5 shadow-ambient">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary/75">Audit</p>
          <h2 className="mt-2 font-headline text-2xl text-foreground">Recent writes</h2>
        </div>
        <div className="rounded-full bg-surface-container px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {logs.length}
        </div>
      </div>

      {logs.length > 0 ? (
        <div className="mt-5 space-y-3">
          {logs.map((log) => {
            const resultSummary = renderResultSummary(log);

            return (
              <article key={log.id} className="rounded-[1.2rem] bg-surface-container px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{formatActionLabel(log.action)}</p>
                  <span className={log.source === "apiKey"
                    ? "rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary"
                    : "rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/55"}>
                    {log.source === "apiKey" ? "OpenClaw" : "Session"}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-foreground/68">
                  {log.habitTitle ?? "Multi-habit update"}
                  {log.targetDate ? ` · ${log.targetDate}` : ""}
                </p>

                {resultSummary ? (
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-foreground/45">{resultSummary}</p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-foreground/48">
                  <span>{formatDateLabel(log.createdAt)}</span>
                  <span className="font-mono">#{log.requestId.slice(0, 8)}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-[1.4rem] bg-surface-container px-4 py-5">
          <p className="font-semibold text-foreground">No audit records yet.</p>
          <p className="mt-2 text-sm leading-7 text-foreground/62">
            OpenClaw or session-based check-in writes will appear here once they start updating habits and entries.
          </p>
        </div>
      )}
    </section>
  );
}
