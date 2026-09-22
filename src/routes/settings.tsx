import { createFileRoute } from "@tanstack/react-router";
import { useRestSeconds } from "@/lib/gym";
import { LineButton, SectionLabel, Shell } from "@/components/kit";
import { DotMatrix } from "@/components/timer";
import { primeAudio, scheduleAlarm } from "@/lib/alarm";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Get Ripped" }] }),
  component: SettingsPage,
});

const PRESETS = [30, 45, 60, 90, 120, 180];

function SettingsPage() {
  const [rest, setRest] = useRestSeconds();
  const step = (d: number) => setRest(Math.min(600, Math.max(5, rest + d)));
  const btn =
    "flex h-14 w-14 items-center justify-center border-[1.5px] border-[var(--ink)] text-[24px] font-light active:bg-[var(--sage-2)]";

  return (
    <Shell>
      <SectionLabel n="03">Rest timer</SectionLabel>

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
            {p >= 60 && p % 60 === 0
              ? `${p / 60} min`
              : p > 60
                ? `${Math.floor(p / 60)}:${String(p % 60).padStart(2, "0")}`
                : `${p} s`}
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
    </Shell>
  );
}
