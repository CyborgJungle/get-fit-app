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
import { WeightPresetPills } from "@/components/weight-preset-pills";
import { scheduleAlarm, primeAudio, type ScheduledAlarm } from "@/lib/alarm";

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
  useRestSeconds();
  const navigate = useNavigate();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const alarmedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !session || active.id === over.id) return;
    const oldIndex = session.exercises.findIndex((e) => e.exerciseId === active.id);
    const newIndex = session.exercises.findIndex((e) => e.exerciseId === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const nextExercises = arrayMove(session.exercises, oldIndex, newIndex);
    setSession({ ...session, exercises: nextExercises });
    // Keep pointer on the same exercise the user was on
    setCurrentIdx((idx) => {
      if (idx === oldIndex) return newIndex;
      if (oldIndex < idx && newIndex >= idx) return idx - 1;
      if (oldIndex > idx && newIndex <= idx) return idx + 1;
      return idx;
    });
  };

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

            {/* Rectangular tap target with countdown bar */}
            <button
              type="button"
              onClick={timerRunning ? () => setTimerEndsAt(null) : logSetTap}
              disabled={!timerRunning && current.completedSets >= current.sets}
              className={
                "relative w-full h-24 border overflow-hidden flex items-center justify-between px-5 active:scale-[0.99] transition-transform disabled:opacity-40 " +
                (timerRunning
                  ? "border-primary bg-background text-primary"
                  : "border-primary bg-primary text-primary-foreground") +
                (timerDoneFlash ? " animate-pulse-once" : "")
              }
            >
              {timerRunning && (
                <div
                  className="absolute inset-y-0 left-0 bg-primary/15 pointer-events-none transition-[width] duration-200 ease-linear"
                  style={{
                    width: `${(remaining / session.restSeconds) * 100}%`,
                  }}
                />
              )}
              <div className="relative text-[64px] font-display leading-none tabular-nums">
                {timerRunning ? remaining : timerDoneFlash ? "GO" : current.completedSets}
              </div>
              <div className="relative text-right font-bold tracking-widest uppercase text-xs leading-tight">
                {timerRunning ? (
                  <>
                    <div className="text-2xl font-display normal-case tracking-normal">
                      Skip Rest
                    </div>
                    <div className="opacity-70">Rest · {session.restSeconds}s</div>
                  </>
                ) : timerDoneFlash ? (
                  <div className="text-2xl font-display">Break Over</div>
                ) : current.completedSets >= current.sets ? (
                  <div className="text-2xl font-display">Sets Complete</div>
                ) : (
                  <>
                    <div className="text-2xl font-display">Set Complete</div>
                    <div className="opacity-80">Tap to log &amp; rest</div>
                  </>
                )}
              </div>
            </button>


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

            <WeightPresetPills
              value={current.weight}
              onPick={(w) => updateCurrent({ weight: w })}
            />

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

function SortableQueueItem({
  exercise,
  index,
  isCurrent,
  onSelect,
}: {
  exercise: SessionExercise;
  index: number;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.exerciseId });
  const done = exercise.completedSets >= exercise.sets && exercise.sets > 0;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
      }}
      className={
        "flex items-center gap-2 px-2 py-2 " +
        (isCurrent ? "bg-primary/10 " : "bg-background ") +
        (isDragging ? "opacity-80 shadow-lg" : "")
      }
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="touch-none px-2 py-1 text-muted-foreground hover:text-primary cursor-grab active:cursor-grabbing select-none"
      >
        ⋮⋮
      </button>
      <span
        className={
          "text-xs font-mono w-6 " +
          (done ? "text-primary" : "text-muted-foreground")
        }
      >
        {done ? "✓" : String(index + 1).padStart(2, "0")}
      </span>
      <button onClick={onSelect} className="flex-1 text-left min-w-0">
        <div className="flex justify-between items-center gap-2">
          <span
            className={
              "font-display uppercase truncate " +
              (isCurrent ? "text-primary" : "text-foreground")
            }
          >
            {exercise.name}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase whitespace-nowrap tabular-nums">
            {exercise.completedSets}/{exercise.sets} × {exercise.reps} @ {exercise.weight}
          </span>
        </div>
      </button>
    </li>
  );
}
