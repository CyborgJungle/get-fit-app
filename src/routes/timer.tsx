import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  fmtClock,
  personalBest,
  uid,
  useTimeRecords,
  useTimed,
  useTimerRun,
  useTimerSeconds,
  useTimerSelection,
  type TimedExercise,
  type TimeRecord,
} from "@/lib/gym";
import { Dot, EmptyAdd, LineButton, Shell, Sheet, InkButton } from "@/components/kit";
import { DotMatrix, TimerRing } from "@/components/timer";
import { playBlip, primeAudio, scheduleAlarm, type ScheduledAlarm } from "@/lib/alarm";
import { allowSleep, keepAwake } from "@/lib/keep-awake";
import { useNow, useReached } from "@/lib/use-now";
import { sameExercise, titleCase } from "@/lib/tidy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/timer")({
  head: () => ({ meta: [{ title: "Timer — Workout by Tim" }] }),
  component: TimerPage,
});

const PRESETS = [30, 60, 120, 180, 300];
const SUGGESTIONS = ["Plank", "Side Plank", "Wall Sit", "Dead Hang", "Hollow Hold"];

/** The countdown alarm lives outside the page, so it still goes off if you switch tabs. */
let countdownAlarm: ScheduledAlarm | null = null;
const stopCountdownAlarm = () => {
  countdownAlarm?.cancel();
  countdownAlarm = null;
};

const shortDate = (at: number) =>
  new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function TimerPage() {
  const [run, setRun] = useTimerRun();
  const [setSecs, setSetSecs] = useTimerSeconds();
  const [selId, setSelId] = useTimerSelection();
  const { list: timed, add: addTimed, remove: removeTimed } = useTimed();
  const { records, add: addRecord } = useTimeRecords();
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // The last saved stopwatch time, shown until the next start.
  const [saved, setSaved] = useState<{ exId: string; ms: number; pr: boolean } | null>(null);

  // A running stopwatch decides the exercise; otherwise the selection does.
  const activeId = run?.kind === "up" ? run.exId : selId;
  const sel = timed.find((e) => e.id === activeId) ?? null;
  const stopwatch = run ? run.kind === "up" : !!sel;
  const best = sel ? personalBest(records, sel.id) : null;

  const now = useNow(!!run);
  const over = useReached(run?.kind === "down" ? run.endsAt : null);

  // After a reload mid-countdown, make sure the alarm is set again.
  useEffect(() => {
    if (run?.kind === "down" && run.endsAt > Date.now() && !countdownAlarm) {
      countdownAlarm = scheduleAlarm((run.endsAt - Date.now()) / 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Keep the screen on while a timer runs.
  const running = !!run;
  useEffect(() => {
    if (running) void keepAwake();
    else allowSleep();
    return allowSleep;
  }, [running]);

  const press = () => {
    primeAudio();
    void keepAwake();
    if (run) {
      if (run.kind === "up") {
        playBlip();
        const ms = Date.now() - run.startedAt;
        const prev = personalBest(records, run.exId);
        if (ms >= 1000) {
          addRecord({ id: uid(), exId: run.exId, ms, at: run.startedAt });
          setSaved({ exId: run.exId, ms, pr: ms > (prev?.ms ?? 0) });
        }
      } else if (Date.now() < run.endsAt) {
        playBlip(); // cancelled early
      }
      // (A finished countdown is already beeping; the tap just silences it.)
      stopCountdownAlarm();
      setRun(null);
      return;
    }
    playBlip();
    setSaved(null);
    const t = Date.now();
    if (sel) {
      setRun({ kind: "up", startedAt: t, exId: sel.id });
    } else {
      stopCountdownAlarm();
      countdownAlarm = scheduleAlarm(setSecs);
      setRun({ kind: "down", startedAt: t, endsAt: t + setSecs * 1000, total: setSecs });
    }
  };

  const pick = (id: string) => {
    if (run) return;
    setSaved(null);
    setSelId(selId === id ? null : id);
  };

  // ── clock face ──
  let text: string;
  let progress: number | undefined;
  let status: string;
  if (stopwatch) {
    // Idle after a stop: keep showing the time that was just saved.
    const ms =
      run?.kind === "up" ? now - run.startedAt : saved && saved.exId === sel?.id ? saved.ms : 0;
    text = fmtClock(ms);
    // Arc fills up to the PR; with no PR yet it sweeps once a minute.
    progress = best ? ms / best.ms : (ms % 60000) / 60000;
    status = run
      ? best && ms > best.ms
        ? "New PR"
        : "Running"
      : saved && saved.exId === sel?.id
        ? saved.pr
          ? "New PR"
          : "Saved"
        : "Stopwatch";
  } else {
    const left = run?.kind === "down" ? Math.max(0, run.endsAt - now) : setSecs * 1000;
    text = fmtClock(run?.kind === "down" ? Math.ceil(left / 1000) * 1000 : left);
    progress = run?.kind === "down" ? 1 - left / (run.total * 1000) : 0;
    status = !run ? "Ready" : over ? "Time" : "Counting";
  }

  const step = (d: number) => setSetSecs(Math.min(5940, Math.max(5, setSecs + d)));

  return (
    <Shell hideHeader>
      <div className="sticky top-0 z-20 -mx-4 bg-[var(--sage)] px-4 pb-3 pt-safe">
        <div className="flex items-center gap-3 pb-2 pt-3 font-mono text-[11px] uppercase">
          <span className="min-w-0 truncate">
            {stopwatch ? `Stopwatch${sel ? ` · ${sel.name}` : ""}` : "Countdown"}
          </span>
        </div>
        <div className="grid grid-cols-2 border-[1.5px] border-[var(--ink)]">
          <button
            onClick={press}
            className="flex aspect-square items-center justify-center border-r-[1.5px] border-[var(--ink)] active:bg-[var(--sage-2)]"
            aria-label={
              run
                ? stopwatch
                  ? "Stop and save"
                  : over
                    ? "Stop the alarm"
                    : "Cancel countdown"
                : stopwatch
                  ? "Start stopwatch"
                  : "Start countdown"
            }
          >
            <span className="flex h-[80%] w-[80%] items-center justify-center rounded-full border-[1.5px] border-[var(--ink)] p-[8px]">
              {run && (
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
            <TimerRing total={0} remaining={0} text={text} progress={progress} size={146} />
            <span className="h-3 font-mono text-[10px] uppercase">{status}</span>
          </div>
        </div>
      </div>

      {stopwatch && sel ? (
        <StopwatchCard
          ex={sel}
          records={records}
          saved={saved}
          running={!!run}
          onBack={() => pick(sel.id)}
        />
      ) : (
        <div className={cn("mt-4", run && "pointer-events-none opacity-50")}>
          <div className="flex items-center justify-between gap-3 border-[1.5px] border-[var(--ink)] p-3">
            <StepButton onClick={() => step(-15)} label="15 seconds less">
              −
            </StepButton>
            <div className="flex flex-col items-center gap-2">
              <DotMatrix text={fmtClock(setSecs * 1000)} pitch={5} />
              <span className="font-mono text-[10px] uppercase">set the time</span>
            </div>
            <StepButton onClick={() => step(15)} label="15 seconds more">
              +
            </StepButton>
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {PRESETS.map((p) => (
              <LineButton
                key={p}
                active={p === setSecs}
                onClick={() => setSetSecs(p)}
                className="h-10 px-0 font-mono text-[12px]"
              >
                {fmtClock(p * 1000)}
              </LineButton>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="flex h-12 items-center border-b border-[var(--faint)]">
          <span className="text-[14px] uppercase tracking-wide">Time exercises</span>
          <span className="ml-auto">
            <LineButton className="h-8 px-3" onClick={() => setAdding(true)}>
              + Add
            </LineButton>
          </span>
        </div>

        {timed.length === 0 ? (
          <div className="pt-2">
            <EmptyAdd label="Add a timed exercise" onClick={() => setAdding(true)} />
            <p className="px-4 pb-2 text-center font-mono text-[10px] uppercase text-[var(--faint)]">
              Pick one to turn the clock into a stopwatch
            </p>
          </div>
        ) : (
          <ul className={cn("mt-3 space-y-2", run && "opacity-60")}>
            {timed.map((ex) => {
              const on = ex.id === sel?.id;
              const pr = personalBest(records, ex.id);
              return (
                <li
                  key={ex.id}
                  className={cn(
                    "flex border-[1.5px] border-[var(--ink)]",
                    on && "bg-[var(--ink)] text-[var(--ink-fg)]",
                  )}
                >
                  <button
                    type="button"
                    disabled={!!run}
                    onClick={() => pick(ex.id)}
                    aria-pressed={on}
                    className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <Dot filled={on} size={18} tone={on ? "light" : "ink"} />
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-[17px] leading-snug">{ex.name}</span>
                      <span
                        className={cn(
                          "block font-mono text-[11px] uppercase",
                          on ? "text-[var(--ink-muted)]" : "text-[var(--faint)]",
                        )}
                      >
                        {pr ? `PR ${fmtClock(pr.ms)} · ${shortDate(pr.at)}` : "No time yet"}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!!run}
                    aria-label={`Delete ${ex.name}`}
                    onClick={() => {
                      if (confirmDelete !== ex.id) return setConfirmDelete(ex.id);
                      if (selId === ex.id) setSelId(null);
                      removeTimed(ex.id);
                      setConfirmDelete(null);
                    }}
                    className={cn(
                      "flex shrink-0 items-center justify-center border-l-[1.5px] font-mono uppercase",
                      on ? "border-[#4a4d4a]" : "border-[var(--ink)]",
                      confirmDelete === ex.id ? "w-20 text-[11px]" : "w-11 text-[14px]",
                    )}
                  >
                    {confirmDelete === ex.id ? "Delete?" : "✕"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AddTimed
        open={adding}
        have={timed}
        onClose={() => setAdding(false)}
        onAdd={(name) => {
          const ex = addTimed(name);
          setSelId(ex.id);
          setAdding(false);
        }}
      />
    </Shell>
  );
}

function StepButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-14 w-14 items-center justify-center border-[1.5px] border-[var(--ink)] text-[24px] font-light active:bg-[var(--sage-2)]"
    >
      {children}
    </button>
  );
}

/** The selected exercise: the time to beat, and its latest attempts. */
function StopwatchCard({
  ex,
  records,
  saved,
  running,
  onBack,
}: {
  ex: TimedExercise;
  records: TimeRecord[];
  saved: { exId: string; ms: number; pr: boolean } | null;
  running: boolean;
  onBack: () => void;
}) {
  const mine = records.filter((r) => r.exId === ex.id).sort((a, b) => b.at - a.at);
  const best = personalBest(records, ex.id);
  return (
    <div className="mt-4 border-[1.5px] border-[var(--ink)]">
      <div className="flex items-end gap-3 px-3 pb-3 pt-2.5">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase text-[var(--faint)]">
            {best ? "Time to beat (PR)" : "No time yet"}
          </p>
          <p className="text-[34px] leading-none tabular-nums">{best ? fmtClock(best.ms) : "–"}</p>
          {best && (
            <p className="mt-1 font-mono text-[11px] uppercase text-[var(--faint)]">
              {shortDate(best.at)}
            </p>
          )}
        </div>
        {!running && (
          <LineButton className="h-9 px-3" onClick={onBack}>
            Countdown
          </LineButton>
        )}
      </div>
      {saved && saved.exId === ex.id && !running && (
        <p className="border-t border-[var(--ink)] px-3 py-2 font-mono text-[11px] uppercase">
          Saved {fmtClock(saved.ms)}
          {saved.pr ? " · new PR" : ""}
        </p>
      )}
      {mine.length > 0 && (
        <ul className="border-t border-[var(--ink)]">
          {mine.slice(0, 5).map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 border-b border-dashed border-[var(--faint)] px-3 py-2 font-mono text-[12px] last:border-b-0"
            >
              <span className="flex-1 uppercase text-[var(--faint)]">{shortDate(r.at)}</span>
              {r.id === best?.id && <span className="text-[10px] uppercase">PR</span>}
              <span className="tabular-nums">{fmtClock(r.ms)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddTimed({
  open,
  have,
  onClose,
  onAdd,
}: {
  open: boolean;
  have: TimedExercise[];
  onClose: () => void;
  onAdd: (name: string) => void;
}) {
  const [name, setName] = useState("");
  useEffect(() => {
    if (open) setName("");
  }, [open]);
  const clean = titleCase(name);
  const dupe = clean ? have.find((h) => sameExercise(h.name, clean)) : undefined;
  const valid = clean.length > 0 && !dupe;
  const ideas = SUGGESTIONS.filter((s) => !have.some((h) => sameExercise(h.name, s)));
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Time exercise"
      footer={
        <InkButton onClick={() => valid && onAdd(clean)} disabled={!valid}>
          Add
        </InkButton>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onAdd(clean);
        }}
        autoComplete="off"
      >
        <label className="block border-b-[1.5px] border-[var(--ink)] px-4 pb-2.5 pt-2">
          <span className="mb-0.5 block font-mono text-[10px] uppercase text-[var(--faint)]">
            Name
          </span>
          <input
            name="timed-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Plank"
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="done"
            className="w-full bg-transparent text-[22px] leading-tight outline-none placeholder:text-[var(--faint)]"
          />
          {dupe && (
            <span className="mt-1 block font-mono text-[11px] uppercase">
              Already in your list as “{dupe.name}”
            </span>
          )}
        </label>
        {ideas.length > 0 && (
          <div className="px-4 pb-4 pt-3">
            <span className="mb-1.5 block font-mono text-[10px] uppercase text-[var(--faint)]">
              Ideas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ideas.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setName(s)}
                  className="inline-flex h-8 items-center border-[1.5px] border-[var(--ink)] px-2.5 font-mono text-[11px] uppercase active:bg-[var(--sage-2)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
