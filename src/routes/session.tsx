import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useActiveSession,
  useRestSeconds,
  type SessionExercise,
} from "@/lib/store";
import { logSet, endWorkoutSession, deleteWorkoutSession } from "@/lib/db";
import { playAlarm, primeAudio } from "@/lib/alarm";

export const Route = createFileRoute("/session")({
  component: SessionPage,
});

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function SessionPage() {
  const [session, setSession] = useActiveSession();
  const qc = useQueryClient();
  const [restSeconds, setRestSeconds] = useRestSeconds();
  const navigate = useNavigate();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const alarmedRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (timerEndsAt && now >= timerEndsAt && !alarmedRef.current) {
      alarmedRef.current = true;
      playAlarm();
    }
  }, [now, timerEndsAt]);

  const elapsedSession = session ? Math.floor((now - session.startedAt) / 1000) : 0;
  const remaining = timerEndsAt ? Math.max(0, Math.ceil((timerEndsAt - now) / 1000)) : 0;
  const timerRunning = !!timerEndsAt && remaining > 0;
  const timerDoneFlash = !!timerEndsAt && remaining === 0;

  const current = session?.exercises[currentIdx];

  const setsProgressRatio = useMemo(() => {
    if (!current || current.sets === 0) return 0;
    return Math.min(1, current.completedSets / current.sets);
  }, [current]);

  if (!session) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-display text-4xl uppercase">No active session</h1>
          <p className="text-sm text-muted-foreground uppercase tracking-widest">
            Build a program to get started.
          </p>
          <Link
            to="/"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 font-display uppercase tracking-widest"
          >
            Go to library
          </Link>
        </div>
      </div>
    );
  }

  const updateCurrent = (patch: Partial<SessionExercise>) => {
    setSession({
      ...session,
      exercises: session.exercises.map((e, i) =>
        i === currentIdx ? { ...e, ...patch } : e,
      ),
    });
  };

  const startBreak = () => {
    primeAudio();
    alarmedRef.current = false;
    setTimerEndsAt(Date.now() + session.restSeconds * 1000);
  };

  const logSetTap = () => {
    if (!current) return;
    const setNumber = current.completedSets + 1;
    const nextCompleted = Math.min(current.sets, setNumber);
    updateCurrent({ completedSets: nextCompleted });

    // Fire-and-forget persist to Supabase for later analysis
    void logSet({
      sessionId: session.dbId,
      exerciseId: current.exerciseId,
      exerciseName: current.name,
      category: current.category,
      muscleGroup: current.muscleGroup,
      setNumber,
      reps: current.reps,
      weight: current.weight,
    }).catch((e) => console.error("logSet failed", e));

    if (nextCompleted < current.sets) {
      startBreak();
    } else {
      setTimerEndsAt(null);
    }
  };

  const goNext = () => {
    setTimerEndsAt(null);
    setCurrentIdx((i) => Math.min(session.exercises.length - 1, i + 1));
  };
  const goPrev = () => {
    setTimerEndsAt(null);
    setCurrentIdx((i) => Math.max(0, i - 1));
  };

  const finishSession = async () => {
    try {
      await endWorkoutSession(session.dbId);
    } catch (e) {
      console.error(e);
    }
    setSession(null);
    qc.invalidateQueries({ queryKey: ["recent-usage"] });
    navigate({ to: "/" });
  };

  const abandonSession = async () => {
    if (!confirm("Discard this session?")) return;
    try {
      await deleteWorkoutSession(session.dbId);
    } catch (e) {
      console.error(e);
    }
    setSession(null);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex justify-between items-end">
        <div>
          <span className="text-[10px] text-primary uppercase tracking-[0.2em] font-bold">
            Live Session
          </span>
          <h1 className="text-3xl font-display uppercase leading-none tracking-tight">
            KINETIC
          </h1>
        </div>
        <div className="text-right">
          <div className="text-2xl font-display tabular-nums">{fmt(elapsedSession)}</div>
          <button
            onClick={abandonSession}
            className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive"
          >
            Discard
          </button>
        </div>
      </header>

      <section className="px-4 py-5 space-y-5">
        {current && (
          <>
            <div className="border-l-4 border-primary pl-4 py-1">
              <div className="flex justify-between items-start">
                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-widest">
                  Set {Math.min(current.completedSets + 1, current.sets)}/{current.sets}
                </span>
                <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
                  {current.category} / {current.muscleGroup}
                </span>
              </div>
              <h2 className="text-4xl font-display uppercase tracking-tighter mt-2 leading-none">
                {current.name}
              </h2>
            </div>

            {/* Timer / kinetic ring */}
            <div
              className={
                "relative aspect-square w-full max-w-sm mx-auto border border-border flex flex-col items-center justify-center overflow-hidden " +
                (timerDoneFlash ? "animate-pulse-once" : "")
              }
            >
              <div className="absolute inset-4 border border-dashed border-muted rounded-full opacity-20" />
              <div
                className={
                  "absolute inset-0 rounded-full border-[14px] " +
                  (timerRunning
                    ? "border-primary/10 border-t-primary border-r-primary animate-spin"
                    : "border-border")
                }
                style={
                  timerRunning
                    ? { animationDuration: `${session.restSeconds}s` }
                    : undefined
                }
              />
              <div className="text-[96px] font-display leading-none tabular-nums">
                {timerRunning ? remaining : timerDoneFlash ? "GO" : current.completedSets}
              </div>
              <div className="text-primary font-bold tracking-widest uppercase text-xs">
                {timerRunning
                  ? "Rest Timer"
                  : timerDoneFlash
                    ? "Break Over"
                    : `${current.completedSets}/${current.sets} Sets Done`}
              </div>
              {!timerRunning && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>Break:</span>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={session.restSeconds}
                    onChange={(e) => {
                      const v = Math.max(5, Number(e.target.value) || 0);
                      setSession({ ...session, restSeconds: v });
                      setRestSeconds(v);
                    }}
                    className="w-14 bg-transparent border border-border text-center text-foreground outline-none focus:border-primary"
                  />
                  <span>sec</span>
                </div>
              )}
            </div>

            {/* Live editable stats */}
            <div className="grid grid-cols-3 gap-px bg-border border border-border">
              {(
                [
                  ["Sets", "sets"],
                  ["Reps", "reps"],
                  ["Weight KG", "weight"],
                ] as const
              ).map(([label, key]) => (
                <div key={key} className="bg-background p-3 flex flex-col items-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-widest">
                    {label}
                  </span>
                  <input
                    type="number"
                    value={current[key]}
                    onChange={(e) =>
                      updateCurrent({ [key]: Number(e.target.value) || 0 } as Partial<SessionExercise>)
                    }
                    className="w-full bg-transparent text-center text-3xl font-display outline-none focus:text-primary tabular-nums"
                  />
                </div>
              ))}
            </div>

            {/* Set pips */}
            <div className="flex gap-1.5">
              {Array.from({ length: Math.max(1, current.sets) }).map((_, i) => (
                <div
                  key={i}
                  className={
                    "h-2 flex-1 " +
                    (i < current.completedSets ? "bg-primary" : "bg-border")
                  }
                  style={{ transitionDelay: `${i * 30}ms` }}
                />
              ))}
            </div>
            <div className="h-1 bg-border">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${setsProgressRatio * 100}%` }}
              />
            </div>

            {/* HUGE TAP TARGET */}
            {timerRunning ? (
              <button
                onClick={() => setTimerEndsAt(null)}
                className="w-full h-28 bg-background border-2 border-primary text-primary flex flex-col items-center justify-center active:scale-[0.98] transition-transform"
              >
                <span className="text-4xl font-display uppercase">Skip Rest</span>
                <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">
                  Timer running · {remaining}s
                </span>
              </button>
            ) : (
              <button
                onClick={logSetTap}
                disabled={current.completedSets >= current.sets}
                className="w-full h-28 bg-primary text-primary-foreground flex flex-col items-center justify-center active:scale-[0.98] transition-transform disabled:opacity-40"
              >
                <span className="text-4xl font-display uppercase">
                  {current.completedSets >= current.sets ? "Sets Complete" : "Set Complete"}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">
                  {current.completedSets >= current.sets
                    ? "Tap Next below"
                    : "Tap to log & start break"}
                </span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={goPrev}
                disabled={currentIdx === 0}
                className="h-12 border border-border text-foreground font-display uppercase tracking-widest text-sm disabled:opacity-30"
              >
                ← Prev
              </button>
              <button
                onClick={goNext}
                disabled={currentIdx >= session.exercises.length - 1}
                className="h-12 border border-border text-foreground font-display uppercase tracking-widest text-sm disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </>
        )}

        {/* Queue */}
        <div className="space-y-2 pt-4">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
            Program · {currentIdx + 1} / {session.exercises.length} · drag to reorder
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={session.exercises.map((e) => e.exerciseId)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="border border-border divide-y divide-border">
                {session.exercises.map((e, i) => (
                  <SortableQueueItem
                    key={e.exerciseId}
                    exercise={e}
                    index={i}
                    isCurrent={i === currentIdx}
                    onSelect={() => {
                      setTimerEndsAt(null);
                      setCurrentIdx(i);
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      </section>

      <nav className="fixed bottom-0 inset-x-0 bg-background border-t border-border p-3 z-40 flex gap-2">
        <Link
          to="/"
          className="flex-1 h-12 border border-border flex items-center justify-center font-display uppercase tracking-widest text-sm"
        >
          Library
        </Link>
        <button
          onClick={finishSession}
          className="flex-[2] h-12 bg-primary text-primary-foreground font-display uppercase tracking-widest text-sm active:scale-[0.98]"
        >
          Finish Session
        </button>
      </nav>
    </div>
  );
}
