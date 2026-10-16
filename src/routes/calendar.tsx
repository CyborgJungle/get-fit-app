import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { dayKey, fmtDuration, toggleTrainedDay, useDayLogs, useTrainedDays } from "@/lib/gym";
import { LogList } from "@/components/pick-list";
import { LineButton, SectionLabel, Shell, TagChip } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Workout by Tim" }] }),
  component: CalendarPage,
});

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function CalendarPage() {
  const days = useTrainedDays();
  const done = useMemo(() => new Set(days), [days]);
  // Resolve "today" on the client only, so SSR and hydration agree.
  const [today, setToday] = useState<Date | null>(null);
  const [month, setMonth] = useState<{ y: number; m: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const logs = useDayLogs();
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    const t = new Date();
    setToday(t);
    setMonth({ y: t.getFullYear(), m: t.getMonth() });
  }, []);

  if (!month || !today) return <Shell>{null}</Shell>;

  const first = new Date(month.y, month.m, 1);
  const count = new Date(month.y, month.m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);

  const todayKey = dayKey(today);
  const selectedKey = picked ?? todayKey;
  const log = done.has(selectedKey) ? logs[selectedKey] : undefined;
  const selectedDate = new Date(selectedKey + "T12:00:00");
  const monthDone = cells.filter(
    (d) => d && done.has(dayKey(new Date(month.y, month.m, d))),
  ).length;
  const isCurrent = month.y === today.getFullYear() && month.m === today.getMonth();
  const shift = (d: number) =>
    setMonth((p) => {
      if (!p) return p;
      const n = new Date(p.y, p.m + d, 1);
      return { y: n.getFullYear(), m: n.getMonth() };
    });

  const navBtn =
    "flex h-10 w-10 items-center justify-center border-[1.5px] border-[var(--ink)] text-[18px] active:bg-[var(--sage-2)]";

  return (
    <Shell>
      <SectionLabel
        n="04"
        right={
          <span className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tabular-nums">
              {monthDone} {monthDone === 1 ? "day" : "days"}
            </span>
            <LineButton
              className="h-8 px-3"
              active={editing}
              aria-pressed={editing}
              onClick={() => setEditing(!editing)}
            >
              {editing ? "Done" : "Edit"}
            </LineButton>
          </span>
        }
      >
        Calendar
      </SectionLabel>

      <div className="mt-4 flex items-center gap-2">
        <button className={navBtn} onClick={() => shift(-1)} aria-label="Previous month">
          ‹
        </button>
        <button
          className="flex-1 text-center text-[18px] uppercase tracking-wide"
          onClick={() => setMonth({ y: today.getFullYear(), m: today.getMonth() })}
          aria-label="Back to this month"
        >
          {first.toLocaleDateString("en-GB", { month: "long" })}{" "}
          <span className="font-mono text-[14px] text-[var(--faint)]">{month.y}</span>
        </button>
        <button className={navBtn} onClick={() => shift(1)} aria-label="Next month">
          ›
        </button>
      </div>

      <div className="mt-3 border-[1.5px] border-[var(--ink)]">
        <div className="grid grid-cols-7 bg-[var(--ink)] text-[var(--ink-muted)]">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="py-1.5 text-center font-mono text-[10px]">
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const key = d ? dayKey(new Date(month.y, month.m, d)) : "";
            const hit = d !== null && done.has(key);
            return (
              <button
                key={i}
                type="button"
                tabIndex={d !== null ? 0 : -1}
                onClick={() => {
                  if (d === null) return;
                  if (editing) toggleTrainedDay(key);
                  else setPicked(key);
                }}
                aria-label={d ? `${key}${hit ? ", trained" : ""}` : undefined}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1.5",
                  d !== null ? "active:bg-[var(--sage-2)]" : "cursor-default",
                  !editing && d !== null && key === selectedKey && "bg-[var(--sage-2)]",
                  i % 7 !== 0 && "border-l border-[var(--faint)]/40",
                  i >= 7 && "border-t border-[var(--faint)]/40",
                )}
              >
                {d !== null && (
                  <>
                    <span
                      className={cn(
                        "font-mono text-[11px] tabular-nums",
                        key === todayKey ? "underline decoration-[1.5px] underline-offset-4" : "",
                        !hit && "text-[var(--faint)]",
                      )}
                    >
                      {d}
                    </span>
                    <span
                      className={cn(
                        "block h-2.5 w-2.5 rounded-full",
                        hit
                          ? "animate-dot-in bg-[var(--ink)]"
                          : editing
                            ? "border border-[var(--faint)]"
                            : "bg-transparent",
                      )}
                    />
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {log && !editing && (
        <div className="mt-6">
          <div className="flex items-baseline gap-3 pb-2 font-mono text-[11px] uppercase">
            <span>
              {selectedDate.toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
            <span className="text-[var(--faint)]">
              {log.items.filter((it) => !it.skipped).length} ex
              {log.items.some((it) => it.skipped) &&
                ` · ${log.items.filter((it) => it.skipped).length} skipped`}{" "}
              · {fmtDuration(log.durationMs)}
            </span>
          </div>
          {log.presets && log.presets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-3">
              {log.presets.map((name) => (
                <TagChip key={name}>{name}</TagChip>
              ))}
            </div>
          )}
          <LogList items={log.items} />
        </div>
      )}

      {!isCurrent && (
        <button
          className="mt-3 font-mono text-[11px] uppercase underline underline-offset-4"
          onClick={() => setMonth({ y: today.getFullYear(), m: today.getMonth() })}
        >
          Today
        </button>
      )}
    </Shell>
  );
}
