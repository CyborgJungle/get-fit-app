import { createFileRoute } from "@tanstack/react-router";
import {
  BACKGROUNDS,
  MAX_PRESETS,
  useBackground,
  usePresets,
  useRestSeconds,
  useWeightUnit,
  type Preset,
} from "@/lib/gym";
import { PresetForm } from "@/components/preset-form";
import { useState } from "react";
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
  const { presets, save, remove } = usePresets();
  const [bg, setBg] = useBackground();
  const [editing, setEditing] = useState<Preset | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const openPreset = (p: Preset | null) => {
    setEditing(p);
    setFormOpen(true);
  };
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
      <p className="mt-2 font-mono text-[11px] text-[var(--faint)]">
        Plays even with the silent switch on. Keep the screen on during a workout; the app stops the
        screen from dimming while a workout runs.
      </p>

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

      <div className="mt-8">
        <SectionLabel
          n="06"
          right={
            <span className="font-mono text-[11px] tabular-nums text-[var(--faint)]">
              {presets.length}/{MAX_PRESETS}
            </span>
          }
        >
          Presets
        </SectionLabel>
        <ul className="mt-3 space-y-2">
          {presets.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => openPreset(p)}
                className="flex h-12 w-full items-center gap-3 bg-[var(--ink)] px-3 text-left text-[var(--ink-fg)] active:bg-[var(--ink-2)]"
              >
                <span className="min-w-0 flex-1 truncate text-[17px]">{p.name}</span>
                <span className="font-mono text-[11px] text-[var(--faint)]">{p.ids.length} ex</span>
                <span className="font-mono text-[11px] uppercase underline underline-offset-4">
                  Edit
                </span>
              </button>
            </li>
          ))}
        </ul>
        {presets.length < MAX_PRESETS && (
          <button
            onClick={() => openPreset(null)}
            className="mt-1 flex h-11 w-full items-center justify-center font-mono text-[12px] uppercase active:opacity-50"
          >
            + Add preset
          </button>
        )}
      </div>

      <div className="mt-8">
        <SectionLabel n="07">Background</SectionLabel>
        <div className="mt-4 flex gap-5 px-1">
          {BACKGROUNDS.map((b) => (
            <button
              key={b.id}
              onClick={() => setBg(b.id)}
              aria-label={b.label}
              aria-pressed={bg === b.id}
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{
                boxShadow: bg === b.id ? "0 0 0 1.5px var(--ink)" : undefined,
              }}
            >
              <span
                className="block h-9 w-9 rounded-full border border-[rgba(38,38,38,0.35)]"
                style={{ background: b.color }}
              />
            </button>
          ))}
        </div>
      </div>

      <PresetForm
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSave={save}
        onDelete={remove}
      />
    </Shell>
  );
}
