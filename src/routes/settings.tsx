import { createFileRoute } from "@tanstack/react-router";
import { useRestSeconds, useWeightUnit } from "@/lib/gym";
import { LineButton, SectionLabel, Shell } from "@/components/kit";
import { DotMatrix } from "@/components/timer";
import { primeAudio, scheduleAlarm } from "@/lib/alarm";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Workout by Tim" }] }),
  component: SettingsPage,
});

const PRESETS = [30, 50, 60];

function SettingsPage() {
  const [rest, setRest] = useRestSeconds();
  const [unit, setUnit] = useWeightUnit();
  const step = (d: number) => setRest(Math.min(600, Math.max(5, rest + d)));
  const btn =
    "flex h-14 w-14 items-center justify-center border-[1.5px] border-[var(--ink)] text-[24px] font-light active:bg-[var(--sage-2)]";

  return (
    <Shell>
      <SectionLabel n="04">Rest timer</SectionLabel>

      <div className="mt-4 flex items-center justify-between gap-3 border-[1.5px] border-[var(--ink)] p-3">
        <button className={btn} onClick={() => step(-5)} aria-label="5 seconds less">
          −
        </button>
        <div className="flex flex-col items-center gap-2">
          <DotMatrix text={String(rest)} pitch={6} />
          <span className="font-mono text-[10px] uppercase">seconds</span>
        </div>
        <button className={btn} onClick={() => step(5)} aria-label="5 seconds more">
          +
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {PRESETS.map((p) => (
          <LineButton
            key={p}
            active={p === rest}
            onClick={() => setRest(p)}
            className="h-11 font-mono"
          >
            {p} s
          </LineButton>
        ))}
      </div>

      <button
        onClick={() => {
          primeAudio();
          scheduleAlarm(0);
        }}
        className="mt-6 font-mono text-[11px] uppercase underline underline-offset-4"
      >
        Test alarm sound
      </button>

      <div className="mt-8">
        <SectionLabel n="05">Weight</SectionLabel>
        <div className="mt-3 grid grid-cols-2 border-[1.5px] border-[var(--ink)] p-1">
          {(
            [
              ["dots", "● Dots"],
              ["kg", "KG"],
            ] as const
          ).map(([u, label]) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              aria-pressed={unit === u}
              className={
                "h-11 font-mono text-[13px] uppercase " +
                (unit === u ? "bg-[var(--ink)] text-[var(--ink-fg)]" : "active:bg-[var(--sage-2)]")
              }
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 font-mono text-[11px] text-[var(--faint)]">
          {unit === "kg"
            ? "Weights show as kilograms. Enter them per exercise."
            : "Weights show as 0–5 dots."}
        </p>
      </div>
    </Shell>
  );
}
