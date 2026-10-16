import { createFileRoute } from "@tanstack/react-router";
import {
  BACKGROUNDS,
  MAX_PRESETS,
  useBackground,
  useExercises,
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
import { signIn, signOut, useAccount } from "@/lib/sync";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Workout by Tim" }] }),
  component: SettingsPage,
});

const PRESETS = [30, 50, 60];

function SettingsPage() {
  const [rest, setRest] = useRestSeconds();
  const [unit, setUnit] = useWeightUnit();
  const { presets, save, remove } = usePresets();
  const { list } = useExercises();
  // Presets keep ids of deleted exercises harmlessly; only count the real ones.
  const existing = new Set(list.map((e) => e.id));
  const [bg, setBg] = useBackground();
  const [editing, setEditing] = useState<Preset | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const openPreset = (p: Preset | null) => {
    setEditing(p);
    setFormOpen(true);
  };
  const step = (d: number) => setRest(Math.min(600, Math.max(5, rest + d)));
  const btn =
    "flex h-14 w-14 items-center justify-center border-[1.5px] border-[var(--ink)] text-[24px] font-light active:bg-[var(--sage-2)]";

  return (
    <Shell>
      <AccountSection />
      <SectionLabel n="06">Rest timer</SectionLabel>

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
          scheduleAlarm(0, 3);
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
        <SectionLabel n="07">Weight</SectionLabel>
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
          n="08"
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
            <li key={p.id} className="flex h-12 bg-[var(--ink)] text-[var(--ink-fg)]">
              <button
                onClick={() => openPreset(p)}
                className="flex min-w-0 flex-1 items-center gap-3 px-3 text-left active:bg-[var(--ink-2)]"
              >
                <span className="min-w-0 flex-1 truncate text-[17px]">{p.name}</span>
                <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                  {p.ids.filter((id) => existing.has(id)).length} ex
                </span>
                <span className="font-mono text-[11px] uppercase underline underline-offset-4">
                  Edit
                </span>
              </button>
              <button
                onClick={() => {
                  if (confirmDelete !== p.id) return setConfirmDelete(p.id);
                  remove(p.id);
                  setConfirmDelete(null);
                }}
                aria-label={`Delete ${p.name}`}
                className={
                  "flex shrink-0 items-center justify-center border-l border-[#4a4d4a] font-mono uppercase active:bg-[var(--ink-2)] " +
                  (confirmDelete === p.id ? "w-24 text-[11px]" : "w-12 text-[15px]")
                }
              >
                {confirmDelete === p.id ? "Delete?" : "✕"}
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
        <SectionLabel n="09">Background</SectionLabel>
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

function AccountSection() {
  const a = useAccount();
  if (a.status === "loading" || a.status === "off") return null;
  return (
    <div className="mb-8">
      <SectionLabel n="05">Account</SectionLabel>
      {a.status === "signed-in" && a.user ? (
        <div className="mt-3 flex items-center gap-3 bg-[var(--ink)] px-3 py-3 text-[var(--ink-fg)]">
          {a.user.picture ? (
            <img
              src={a.user.picture}
              alt=""
              referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-full"
            />
          ) : (
            <span className="h-9 w-9 rounded-full border border-[var(--ink-muted)]" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px]">{a.user.name}</span>
            <span className="block truncate font-mono text-[10px] text-[var(--ink-muted)]">
              {a.error ?? (a.syncedAt ? "Saved to your account" : "Syncing…")}
            </span>
          </span>
          <button
            onClick={() => void signOut()}
            className="font-mono text-[11px] uppercase underline underline-offset-4"
          >
            Sign out
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={signIn}
            className="mt-3 flex h-14 w-full items-center justify-center gap-3 bg-[var(--ink)] text-[15px] uppercase tracking-wide text-[var(--ink-fg)] active:bg-[var(--ink-2)]"
          >
            <GoogleMark />
            Sign in with Google
          </button>
          <p className="mt-2 font-mono text-[11px] text-[var(--faint)]">
            Saves your exercises, presets and calendar to your account, so they come back on a new
            phone.
          </p>
        </>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
