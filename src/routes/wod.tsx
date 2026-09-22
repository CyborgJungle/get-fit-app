import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fmtDuration,
  markTrainedToday,
  useExercises,
  useRestSeconds,
  useWod,
  useWorkout,
  type Workout,
} from "@/lib/gym";
import {
  Dot,
  InkButton,
  LineButton,
  SectionLabel,
  Sheet,
  Shell,
  StatStrip,
} from "@/components/kit";
import { ExerciseCard } from "@/components/exercise-card";
import { TimerRing } from "@/components/timer";
import { primeAudio, scheduleAlarm, type ScheduledAlarm } from "@/lib/alarm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wod")({
  head: () => ({ meta: [{ title: "WOD — Workout by Tim" }] }),
  component: WodPage,
});

function WodPage() {
  const [workout, setWorkout, ready] = useWorkout();
  if (!ready) return <Shell>{null}</Shell>;
  if (workout?.finishedAt) return <Summary workout={workout} onDone={() => setWorkout(null)} />;
  if (workout) return <Runner workout={workout} setWorkout={setWorkout} />;
  return <Planner onStart={setWorkout} />;
}

/* ─── Planner ───────────────────────────────────────────────────────── */

function Planner({ onStart }: { onStart: (w: Workout) => void }) {
  const { list } = useExercises();
  const wod = useWod();
  const [picking, setPicking] = useState(false);
  const byId = useMemo(() => new Map(list.map((e) => [e.id, e])), [list]);
  const items = wod.ids.map((id) => byId.get(id)).filter((e) => !!e);

  const start = () => {
    if (!items.length) return;
    primeAudio();
    onStart({
      startedAt: Date.now(),
      current: 0,
      restEndsAt: null,
      finishedAt: null,
      items: items.map((e) => ({
        id: e.id,
        name: e.name,
        reps: e.reps,
        sets: e.sets,
        weight: e.weight,
        kg: e.kg ?? 0,
        done: 0,
      })),
    });
    window.scrollTo(0, 0);
  };

  return (
    <Shell>
      <SectionLabel
        n="02"
        right={
          items.length > 0 && (
            <LineButton className="h-8 px-3" onClick={() => setPicking(true)}>
              + Add
            </LineButton>
          )
        }
      >
        Workout of the day
      </SectionLabel>

      <div className="space-y-3 pb-20 pt-4">
        {items.length === 0 && (
          <button
            onClick={() => setPicking(true)}
            className="flex aspect-[2/1] w-full flex-col items-center justify-center gap-3 border-[1.5px] border-dashed border-[var(--ink)] active:bg-[var(--sage-2)]"
            aria-label="Add exercises"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-[1.5px] border-[var(--ink)] text-[34px] font-light leading-none">
              +
            </span>
            <span className="font-mono text-[11px] uppercase">Pick exercises</span>
          </button>
        )}
        {items.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            lead={
              <span className="font-mono text-[11px] text-[var(--faint)]">
                {String(i + 1).padStart(2, "0")}
              </span>
            }
            trailing={
              <span className="flex self-stretch border-l-[1.5px] border-[var(--ink)]">
                <button
                  className="w-10 font-mono text-[14px] disabled:opacity-25"
                  disabled={i === 0}
                  onClick={() => wod.move(ex.id, -1)}
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  className="w-10 border-l border-[var(--faint)] font-mono text-[14px]"
                  onClick={() => wod.remove(ex.id)}
                  aria-label="Remove"
                >
                  ✕
                </button>
              </span>
            }
          />
        ))}
      </div>

      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(var(--tabbar)+var(--dock-bottom))] z-30 bg-[var(--sage)]">
          <div className="mx-auto max-w-[520px] px-4 pb-2.5 pt-3">
            <InkButton onClick={start}>
              Start
              <span className="font-mono text-[11px] opacity-60">
                {items.length} × ex · {items.reduce((n, e) => n + e.sets, 0)} sets
              </span>
              →
            </InkButton>
          </div>
        </div>
      )}

      <Picker
        open={picking}
        onClose={() => setPicking(false)}
        selected={wod.ids.filter((id) => byId.has(id))}
        onConfirm={(ids) => {
          wod.replace(ids);
          setPicking(false);
        }}
      />
    </Shell>
  );
}

function Picker({
  open,
  onClose,
  selected,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  selected: string[];
  onConfirm: (ids: string[]) => void;
}) {
  const { list } = useExercises();
  const [sel, setSel] = useState<string[]>(selected);
  useEffect(() => {
    if (open) setSel(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const toggle = (id: string) =>
    setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Pick exercises"
      footer={
        list.length > 0 && (
          <InkButton onClick={() => onConfirm(sel)}>
            {sel.length
              ? `Use ${sel.length} exercise${sel.length > 1 ? "s" : ""}`
              : "Clear selection"}{" "}
            →
          </InkButton>
        )
      }
    >
      {list.length === 0 ? (
        <div className="space-y-4 px-4 py-8 text-center">
          <p className="font-mono text-[12px] uppercase">No exercises yet</p>
          <Link to="/" className="inline-block underline underline-offset-4" onClick={onClose}>
            Create some first →
          </Link>
        </div>
      ) : (
        <ul>
          {list.map((ex) => {
            const on = sel.includes(ex.id);
            return (
              <li key={ex.id} className="border-b border-[var(--ink)]">
                <button
                  onClick={() => toggle(ex.id)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-[var(--sage-2)]"
                >
                  <Dot filled={on} size={18} />
                  <span className="min-w-0 flex-1 truncate text-[18px]">{ex.name}</span>
                  <span className="font-mono text-[11px] text-[var(--faint)]">
                    {ex.sets}×{ex.reps}
                  </span>
                  {on && (
                    <span className="w-5 text-right font-mono text-[11px]">
                      {sel.indexOf(ex.id) + 1}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

/* ─── Runner ────────────────────────────────────────────────────────── */

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/** Keep the iPhone screen awake while a workout runs. */
function useWakeLock() {
  useEffect(() => {
    type WL = { release: () => Promise<void> };
    let lock: WL | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WL> } };
    const req = () =>
      nav.wakeLock
        ?.request("screen")
        .then((l) => (lock = l))
        .catch(() => {});
    req();
    const onVis = () => document.visibilityState === "visible" && req();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => {});
    };
  }, []);
}

function Runner({
  workout,
  setWorkout,
}: {
  workout: Workout;
  setWorkout: (w: Workout | null) => void;
}) {
  const [rest] = useRestSeconds();
  const now = useNow(true);
  const alarm = useRef<ScheduledAlarm | null>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [confirmEnd, setConfirmEnd] = useState(false);
  useWakeLock();

  const resting = workout.restEndsAt !== null;
  const remaining = resting ? (workout.restEndsAt! - now) / 1000 : rest;
  const over = resting && remaining <= 0;

  const cur = workout.items[workout.current];
  const isLast = workout.current === workout.items.length - 1;
  const curDone = cur ? cur.done >= cur.sets : false;
  // All sets of the last exercise are in: next tap finishes the workout.
  const finishReady = !resting && isLast && curDone;

  // Keep the current exercise tucked right under the sticky controls. Re-runs on
  // every action, so after scrolling up to look back, a tap snaps back into place.
  const [alignTick, setAlignTick] = useState(0);
  const current = workout.current;
  useEffect(() => {
    const el = itemRefs.current[current];
    const head = headRef.current;
    if (!el || !head) return;
    const y = el.getBoundingClientRect().top + window.scrollY - head.offsetHeight - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }, [current, alignTick]);

  useEffect(() => () => alarm.current?.cancel(), []);

  const press = () => {
    primeAudio();
    setAlignTick((t) => t + 1);
    if (resting) {
      // End of rest confirms the next set. If this exercise is complete, move on.
      alarm.current?.cancel();
      alarm.current = null;
      setWorkout({
        ...workout,
        restEndsAt: null,
        current: curDone && !isLast ? workout.current + 1 : workout.current,
      });
      return;
    }
    if (finishReady) {
      markTrainedToday();
      setWorkout({ ...workout, finishedAt: Date.now(), restEndsAt: null });
      window.scrollTo(0, 0);
      return;
    }
    if (curDone) {
      setWorkout({ ...workout, current: workout.current + 1 });
      return;
    }
    const items = workout.items.map((it, i) =>
      i === workout.current ? { ...it, done: it.done + 1 } : it,
    );
    // Last set of the whole workout: no rest, wait for the Finish tap.
    if (isLast && items[workout.current].done >= items[workout.current].sets) {
      alarm.current?.cancel();
      setWorkout({ ...workout, items, restEndsAt: null });
      return;
    }
    alarm.current?.cancel();
    alarm.current = scheduleAlarm(rest);
    setWorkout({ ...workout, items, restEndsAt: Date.now() + rest * 1000 });
  };

  const end = () => {
    if (!confirmEnd) {
      setConfirmEnd(true);
      setTimeout(() => setConfirmEnd(false), 3000);
      return;
    }
    alarm.current?.cancel();
    setWorkout({ ...workout, finishedAt: Date.now(), restEndsAt: null });
  };

  const setsDone = workout.items.reduce((n, it) => n + it.done, 0);
  const setsTotal = workout.items.reduce((n, it) => n + it.sets, 0);

  return (
    <Shell hideHeader>
      <div ref={headRef} className="sticky top-0 z-20 -mx-4 bg-[var(--sage)] px-4 pb-3 pt-safe">
        <div className="flex items-center gap-3 pb-2 pt-3 font-mono text-[11px] uppercase">
          <span className="tabular-nums">{fmtDuration(now - workout.startedAt)}</span>
          <span className="text-[var(--faint)]">
            Set {setsDone}/{setsTotal}
          </span>
          <button onClick={end} className="-my-2 ml-auto py-2 underline underline-offset-4">
            {confirmEnd ? "Tap to end" : "End"}
          </button>
        </div>
        <div className="grid grid-cols-2 border-[1.5px] border-[var(--ink)]">
          <button
            onClick={press}
            className="flex aspect-square items-center justify-center border-r-[1.5px] border-[var(--ink)] active:bg-[var(--sage-2)]"
            aria-label={
              finishReady ? "Finish workout" : resting ? "Start next set" : "Set done, start rest"
            }
          >
            <span className="flex h-[80%] w-[80%] items-center justify-center rounded-full border-[1.5px] border-[var(--ink)] p-[8px]">
              {finishReady && (
                <span className="flex h-full w-full items-center justify-center rounded-full bg-[var(--ink)] text-[18px] uppercase tracking-wide text-[var(--ink-fg)]">
                  Finish
                </span>
              )}
              {resting && (
                <span
                  className={cn(
                    "block h-full w-full rounded-full bg-[var(--ink-2)]",
                    over ? "animate-dot-pulse" : "animate-dot-in",
                  )}
                />
              )}
            </span>
          </button>
          <div className="flex aspect-square flex-col items-center justify-center gap-1">
            <TimerRing total={rest} remaining={remaining} size={146} />
            <span className="h-3 font-mono text-[10px] uppercase">
              {finishReady ? "Done" : over ? "Go" : resting ? "Rest" : "Ready"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 pb-[55dvh]">
        {workout.items.map((it, i) => {
          const done = it.done >= it.sets;
          const isCur = i === workout.current;
          return (
            <div
              key={it.id + i}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className={cn(
                "border-[1.5px] border-[var(--ink)] transition-opacity",
                !isCur && (done ? "opacity-40" : "opacity-70"),
              )}
            >
              <div className="flex min-h-[44px] items-center gap-3 px-3">
                <span className="font-mono text-[11px] text-[var(--faint)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate text-[19px] leading-tight">{it.name}</span>
                {done && <span className="font-mono text-[11px] uppercase">Done</span>}
              </div>
              <StatStrip reps={it.reps} sets={it.sets} weight={it.weight} kg={it.kg} />
              <div className="flex flex-wrap items-center gap-2.5 px-3 py-2.5">
                {Array.from({ length: it.sets }).map((_, s) => (
                  <Dot key={s} filled={s < it.done} size={isCur ? 22 : 16} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

/* ─── Summary ───────────────────────────────────────────────────────── */

function Summary({ workout, onDone }: { workout: Workout; onDone: () => void }) {
  const wod = useWod();
  const exDone = workout.items.filter((it) => it.done >= it.sets).length;
  const setsDone = workout.items.reduce((n, it) => n + it.done, 0);
  const time = fmtDuration((workout.finishedAt ?? Date.now()) - workout.startedAt);
  return (
    <Shell>
      <SectionLabel n="02">Workout complete</SectionLabel>
      <div className="mt-4 bg-[var(--ink)] px-5 pb-6 pt-5 text-[var(--ink-fg)]">
        <p className="font-mono text-[10px] uppercase text-[var(--ink-muted)]">Total time</p>
        <p className="text-[64px] leading-none tracking-tight tabular-nums">{time}</p>
        <div className="mt-6 grid grid-cols-2 border-t border-[#4a4d4a] pt-4">
          <div>
            <p className="font-mono text-[10px] uppercase text-[var(--ink-muted)]">Exercises</p>
            <p className="text-[32px] leading-tight tabular-nums">
              {exDone}
              <span className="text-[16px] text-[var(--ink-muted)]">/{workout.items.length}</span>
            </p>
          </div>
          <div className="border-l border-[#4a4d4a] pl-4">
            <p className="font-mono text-[10px] uppercase text-[var(--ink-muted)]">Sets</p>
            <p className="text-[32px] leading-tight tabular-nums">{setsDone}</p>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <InkButton
          onClick={() => {
            wod.clear();
            onDone();
          }}
        >
          Finish →
        </InkButton>
      </div>
    </Shell>
  );
}
