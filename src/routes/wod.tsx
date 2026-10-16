import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fmtDuration,
  activePresetIds,
  usePresets,
  markTrainedToday,
  useExercises,
  useRestSeconds,
  useWod,
  useWorkout,
  itemFinished,
  nextActive,
  type Workout,
} from "@/lib/gym";
import {
  Dot,
  SearchBox,
  EmptyAdd,
  InkButton,
  LineButton,
  SectionLabel,
  Sheet,
  Shell,
  StatStrip,
} from "@/components/kit";
import { Block, BlockRemove } from "@/components/block";
import { Grip, SortableList } from "@/components/sortable";
import { GroupToggle, PickList, PresetChips } from "@/components/pick-list";
import { TimerRing } from "@/components/timer";
import { primeAudio, scheduleAlarm, type ScheduledAlarm } from "@/lib/alarm";
import { cn } from "@/lib/utils";
import { keepAwake, useKeepAwake } from "@/lib/keep-awake";
import { useNow, useReached } from "@/lib/use-now";

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
  const { presets } = usePresets();
  const [picking, setPicking] = useState(false);
  const byId = useMemo(() => new Map(list.map((e) => [e.id, e])), [list]);
  const items = wod.ids.map((id) => byId.get(id)).filter((e) => !!e);

  const start = () => {
    if (!items.length) return;
    primeAudio();
    const inWod = new Set(items.map((e) => e.id));
    const usedPresets = presets
      .filter((p) => wod.presetIds.includes(p.id))
      .filter((p) => p.ids.filter((id) => byId.has(id)).every((id) => inWod.has(id)))
      .map((p) => p.name);
    onStart({
      presets: usedPresets,
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
        {items.length === 0 && <EmptyAdd label="Pick exercises" onClick={() => setPicking(true)} />}
        {items.length > 0 && (
          <SortableList
            items={items}
            getId={(e) => e.id}
            onReorder={(next) =>
              wod.replace(
                next.map((e) => e.id),
                wod.presetIds,
              )
            }
            className="space-y-2"
            render={(ex, i) => (
              <Block
                index={i}
                name={ex.name}
                action={
                  <BlockRemove onClick={() => wod.remove(ex.id)} label={`Remove ${ex.name}`} />
                }
              >
                <StatStrip reps={ex.reps} sets={ex.sets} weight={ex.weight} kg={ex.kg} />
              </Block>
            )}
          />
        )}
        {items.length > 0 && (
          <p className="pt-1 text-center font-mono text-[10px] uppercase text-[var(--faint)]">
            Hold and drag to reorder
          </p>
        )}
      </div>

      {items.length > 0 && (
        <div
          data-scroll-edge="bottom"
          className="fixed inset-x-0 bottom-[calc(var(--tabbar)+var(--dock-bottom))] z-30 bg-[var(--sage)]"
        >
          <div className="mx-auto max-w-[520px] px-4 pb-2.5 pt-3">
            <InkButton onClick={start}>Start</InkButton>
          </div>
        </div>
      )}

      <Picker
        open={picking}
        onClose={() => setPicking(false)}
        selected={wod.ids.filter((id) => byId.has(id))}
        selectedPresets={wod.presetIds}
        onConfirm={(ids, presetIds) => {
          wod.replace(ids, presetIds);
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
  selectedPresets = [],
  locked = [],
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  selected: string[];
  /** Presets already chosen for this selection (tapped earlier). */
  selectedPresets?: string[];
  /** Already in a running workout: shown as selected, can't be toggled. */
  locked?: string[];
  onConfirm: (ids: string[], presetIds: string[]) => void;
}) {
  const { list } = useExercises();
  const { presets } = usePresets();
  const existing = useMemo(() => new Set(list.map((e) => e.id)), [list]);
  const [sel, setSel] = useState<string[]>(selected);
  const [query, setQuery] = useState("");
  // Presets actually tapped on; only these count as "used" for the calendar.
  const [used, setUsed] = useState<string[]>(selectedPresets);
  useEffect(() => {
    if (open) {
      setSel(selected);
      setUsed(selectedPresets);
      setQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const toggle = (id: string) =>
    setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const adding = locked.length > 0;
  const fresh = sel.filter((id) => !locked.includes(id));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={adding ? "Add exercises" : "Pick exercises"}
      action={list.length > 0 && <GroupToggle />}
      footer={
        list.length > 0 && (
          <InkButton
            onClick={() => {
              const active = activePresetIds(presets, sel, existing, locked);
              onConfirm(
                sel,
                used.filter((id) => active.includes(id)),
              );
            }}
            disabled={adding && fresh.length === 0}
          >
            {adding
              ? fresh.length
                ? `Add ${fresh.length}`
                : "Add"
              : sel.length
                ? `Use ${sel.length}`
                : "Clear selection"}
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
        <>
          <div className="sticky top-0 z-10 border-b border-[var(--ink)] bg-[var(--sage)] px-4 py-2.5">
            <SearchBox value={query} onChange={setQuery} />
          </div>
          {!query && (
            <PresetChips
              presets={presets}
              selected={sel}
              onChange={(ids, presetId, on) => {
                setSel(ids);
                setUsed((u) => (on ? [...u, presetId] : u.filter((x) => x !== presetId)));
              }}
              locked={locked}
              existing={existing}
            />
          )}
          <PickList
            list={list}
            selected={sel}
            onToggle={toggle}
            locked={locked}
            numbered={!adding}
            query={query}
          />
        </>
      )}
    </Sheet>
  );
}

/* ─── Runner ────────────────────────────────────────────────────────── */

/**
 * The rest alarm lives outside the runner, so it still goes off when you switch
 * to another tab mid-rest; tapping the rest button (or ending) silences it.
 */
let restAlarm: ScheduledAlarm | null = null;
const armRestAlarm = (seconds: number) => {
  restAlarm?.cancel();
  restAlarm = scheduleAlarm(seconds);
};
const stopRestAlarm = () => {
  restAlarm?.cancel();
  restAlarm = null;
};

function Elapsed({ since }: { since: number }) {
  const now = useNow(true, 500);
  return <span className="tabular-nums">{fmtDuration(now - since)}</span>;
}

function RestRing({ endsAt, rest }: { endsAt: number | null; rest: number }) {
  const now = useNow(endsAt !== null);
  // `now` can be a moment old right after a tap; never show more than the rest time.
  const remaining = endsAt === null ? rest : Math.min(rest, (endsAt - now) / 1000);
  return <TimerRing total={rest} remaining={remaining} size={146} />;
}

function Runner({
  workout,
  setWorkout,
}: {
  workout: Workout;
  setWorkout: (w: Workout | null) => void;
}) {
  const [rest] = useRestSeconds();
  const headRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [adding, setAdding] = useState(false);
  const { list } = useExercises();
  const awake = useKeepAwake();

  const { presets } = usePresets();
  const addExercises = (ids: string[], presetIds: string[]) => {
    const names = presets.filter((p) => presetIds.includes(p.id)).map((p) => p.name);
    const usedPresets = Array.from(new Set([...(workout.presets ?? []), ...names]));
    const have = new Set(workout.items.map((it) => it.id));
    const extra = ids
      .filter((id) => !have.has(id))
      .map((id) => list.find((e) => e.id === id))
      .filter((e) => !!e)
      .map((e) => ({
        id: e.id,
        name: e.name,
        reps: e.reps,
        sets: e.sets,
        weight: e.weight,
        kg: e.kg ?? 0,
        done: 0,
      }));
    if (extra.length)
      setWorkout({ ...workout, items: [...workout.items, ...extra], presets: usedPresets });
    setAdding(false);
  };

  const resting = workout.restEndsAt !== null;
  const over = useReached(workout.restEndsAt);

  const cur = workout.items[workout.current];
  // Where to go next, past done and skipped exercises (-1: nothing left).
  const next = nextActive(workout.items, workout.current);
  const isLast = next === -1;
  const curDone = cur ? itemFinished(cur) : false;
  // Everything is done or skipped: next tap finishes the workout.
  const finishReady = !resting && isLast && curDone;

  // Keep the current exercise tucked right under the sticky controls. Re-runs on
  // every action, so after scrolling up to look back, a tap snaps back into place.
  // Once the last set of an exercise is in and the rest starts, already show the next one.
  const [alignTick, setAlignTick] = useState(0);
  const focus = resting && curDone && !isLast ? next : workout.current;
  useEffect(() => {
    const el = itemRefs.current[focus];
    const head = headRef.current;
    if (!el || !head) return;
    const y = el.getBoundingClientRect().top + window.scrollY - head.offsetHeight - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }, [focus, alignTick]);

  // Re-arm the alarm if the app was reloaded mid-rest (e.g. iOS evicted it).
  useEffect(() => {
    const left = workout.restEndsAt ? (workout.restEndsAt - Date.now()) / 1000 : 0;
    if (left > 0 && !restAlarm) armRestAlarm(left);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const press = () => {
    primeAudio();
    void keepAwake(); // re-take the screen lock inside the tap (most reliable on iOS)
    setAlignTick((t) => t + 1);
    if (resting) {
      // End of rest confirms the next set. If this exercise is complete, move on.
      stopRestAlarm();
      setWorkout({
        ...workout,
        restEndsAt: null,
        current: curDone && !isLast ? next : workout.current,
      });
      return;
    }
    if (finishReady) {
      markTrainedToday(workout);
      setWorkout({ ...workout, finishedAt: Date.now(), restEndsAt: null });
      window.scrollTo(0, 0);
      return;
    }
    if (curDone) {
      setWorkout({ ...workout, current: next });
      return;
    }
    const items = workout.items.map((it, i) =>
      i === workout.current ? { ...it, done: it.done + 1 } : it,
    );
    // Last set of the whole workout: no rest, wait for the Finish tap.
    if (itemFinished(items[workout.current]) && nextActive(items, workout.current) === -1) {
      stopRestAlarm();
      setWorkout({ ...workout, items, restEndsAt: null });
      return;
    }
    armRestAlarm(rest);
    setWorkout({ ...workout, items, restEndsAt: Date.now() + rest * 1000 });
  };

  /** Skip (or un-skip) an exercise for this workout only. */
  const toggleSkip = (i: number) => {
    const items = workout.items.map((it, j) => (j === i ? { ...it, skipped: !it.skipped } : it));
    let current = workout.current;
    // Skipping the exercise you're on moves on to the next one (not mid-rest:
    // the rest tap does that).
    if (i === current && items[i].skipped && !resting) {
      const n = nextActive(items, i);
      if (n !== -1) current = n;
    }
    setAlignTick((t) => t + 1);
    setWorkout({ ...workout, items, current });
  };

  const end = () => {
    if (!confirmEnd) {
      setConfirmEnd(true);
      setTimeout(() => setConfirmEnd(false), 3000);
      return;
    }
    stopRestAlarm();
    setWorkout({ ...workout, finishedAt: Date.now(), restEndsAt: null });
  };

  const setsDone = workout.items.reduce((n, it) => n + it.done, 0);
  // Skipped exercises only count the sets that were actually done.
  const setsTotal = workout.items.reduce((n, it) => n + (it.skipped ? it.done : it.sets), 0);

  return (
    <Shell hideHeader>
      <div
        ref={headRef}
        data-scroll-edge="top"
        className="sticky top-0 z-20 -mx-4 bg-[var(--sage)] px-4 pb-3 pt-safe"
      >
        <div className="flex items-center gap-3 pb-2 pt-3 font-mono text-[11px] uppercase">
          <Elapsed since={workout.startedAt} />
          <span className="text-[var(--faint)]">
            Set {setsDone}/{setsTotal}
          </span>
          {awake && <span className="text-[var(--faint)]">· Screen on</span>}
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
            <RestRing endsAt={workout.restEndsAt} rest={rest} />
            <span className="h-3 font-mono text-[10px] uppercase">
              {finishReady ? "Done" : over ? "Go" : resting ? "Rest" : "Ready"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 pb-[55dvh]">
        <SortableList
          items={workout.items}
          getId={(it) => it.id}
          onReorder={(next) => {
            // The current exercise stays current wherever it moves.
            const curId = workout.items[workout.current]?.id;
            setWorkout({
              ...workout,
              items: next,
              current: Math.max(
                0,
                next.findIndex((it) => it.id === curId),
              ),
            });
          }}
          className="space-y-2"
          render={(it, i) => {
            const done = it.done >= it.sets;
            const skipped = !!it.skipped;
            const isCur = i === workout.current;
            return (
              <div
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                className={cn(
                  "transition-opacity",
                  skipped ? "opacity-45" : !isCur && (done ? "opacity-45" : "opacity-75"),
                )}
              >
                <div className="border-[1.5px] border-[var(--ink)] bg-[var(--sage)]">
                  <div className="flex min-h-[48px] items-center gap-2.5 py-2 pl-2.5 pr-3">
                    <Grip />
                    <span className="w-5 shrink-0 font-mono text-[11px] text-[var(--faint)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 break-words text-[17px] leading-snug",
                        skipped && "line-through decoration-[1.5px]",
                      )}
                    >
                      {it.name}
                    </span>
                    {done && !skipped ? (
                      <span className="font-mono text-[11px] uppercase">Done</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleSkip(i)}
                        // Keep the tap from starting a drag.
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="-my-2 -mr-1 shrink-0 px-1 py-2 font-mono text-[11px] uppercase underline underline-offset-4"
                        aria-label={skipped ? `Don't skip ${it.name}` : `Skip ${it.name}`}
                      >
                        {skipped ? "Undo skip" : "Skip"}
                      </button>
                    )}
                  </div>
                  <StatStrip reps={it.reps} sets={it.sets} weight={it.weight} kg={it.kg} />
                  <div className="flex flex-wrap items-center gap-2.5 px-3 py-2.5">
                    {Array.from({ length: it.sets }).map((_, s) => (
                      <Dot key={s} filled={s < it.done} size={isCur ? 22 : 16} />
                    ))}
                  </div>
                </div>
              </div>
            );
          }}
        />
        <button
          onClick={() => setAdding(true)}
          className="flex h-11 w-full items-center justify-center font-mono text-[12px] uppercase active:opacity-50"
        >
          + Add exercise
        </button>
      </div>

      <Picker
        open={adding}
        onClose={() => setAdding(false)}
        selected={[]}
        locked={workout.items.map((it) => it.id)}
        onConfirm={addExercises}
      />
    </Shell>
  );
}

/* ─── Summary ───────────────────────────────────────────────────────── */

function Summary({ workout, onDone }: { workout: Workout; onDone: () => void }) {
  const wod = useWod();
  const exDone = workout.items.filter((it) => !it.skipped && it.done >= it.sets).length;
  const skipped = workout.items.filter((it) => it.skipped).length;
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
              <span className="text-[16px] text-[var(--ink-muted)]">
                /{workout.items.length - skipped}
              </span>
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
          Finish
        </InkButton>
      </div>
    </Shell>
  );
}
