import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { dayKey, useTrainedDays } from "@/lib/gym";
import { SectionLabel, Shell } from "@/components/kit";
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
        n="03"
        right={
          <span className="font-mono text-[11px] uppercase tabular-nums">
            {monthDone} {monthDone === 1 ? "day" : "days"}
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
              <div
                key={i}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1.5",
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
                        hit ? "animate-dot-in bg-[var(--ink)]" : "bg-transparent",
                      )}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

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
