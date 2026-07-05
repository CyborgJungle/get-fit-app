import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useExercises,
  useProgram,
  useRecentUsage,
  useActiveSession,
  useRestSeconds,
  makeSessionExercise,
  CATEGORIES,
  type Category,
  type Exercise,
} from "@/lib/store";
import { ExerciseFormDialog } from "@/components/exercise-form-dialog";

export const Route = createFileRoute("/")({
  component: Home,
});

function CategoryPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border transition-colors " +
        (active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-transparent text-muted-foreground border-border hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function UsageDots({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-1 shrink-0" title={`Used in ${count} of last 3 sessions`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={
            "size-3 rounded-full " + (i < count ? "bg-primary" : "bg-primary/15")
          }
        />
      ))}
    </div>
  );
}

function Home() {
  const { items, remove } = useExercises();
  const { ids, toggle, clear, move } = useProgram();
  const usage = useRecentUsage();
  const [active, setActive] = useActiveSession();
  const [restSeconds, setRestSeconds] = useRestSeconds();
  const [filter, setFilter] = useState<Category | "all">("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Exercise | null | undefined>(undefined);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    return items.filter((e) => {
      if (filter !== "all" && e.category !== filter) return false;
      if (q && !`${e.name} ${e.muscleGroup}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, filter, q]);

  const selected = ids
    .map((id) => items.find((e) => e.id === id))
    .filter((x): x is Exercise => !!x);

  const startSession = () => {
    if (selected.length === 0) return;
    setActive({
      id: crypto.randomUUID(),
      startedAt: Date.now(),
      restSeconds,
      exercises: selected.map(makeSessionExercise),
    });
    navigate({ to: "/session" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-40">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-4 flex justify-between items-end">
        <div>
          <span className="text-[10px] text-primary uppercase tracking-[0.2em] font-bold">
            Build Program
          </span>
          <h1 className="text-4xl font-display uppercase leading-none tracking-tight">
            KINETIC
          </h1>
        </div>
        {active ? (
          <Link
            to="/session"
            className="border border-primary text-primary px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
          >
            Resume
          </Link>
        ) : (
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Rest</div>
            <input
              type="number"
              min={5}
              step={5}
              value={restSeconds}
              onChange={(e) => setRestSeconds(Math.max(5, Number(e.target.value) || 0))}
              className="w-20 bg-transparent text-right text-2xl font-display tabular-nums outline-none focus:text-primary"
            />
            <span className="text-[10px] text-muted-foreground uppercase">sec break</span>
          </div>
        )}
      </header>

      <section className="px-4 pt-6 space-y-4">
        <div className="flex gap-2 items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="SEARCH EXERCISES"
            className="flex-1 bg-transparent border border-border px-3 py-2 text-sm outline-none focus:border-primary placeholder:text-muted-foreground uppercase tracking-widest text-xs"
          />
          <button
            onClick={() => setEditing(null)}
            className="size-10 border border-primary text-primary flex items-center justify-center text-2xl leading-none shrink-0"
            aria-label="Add exercise"
          >
            +
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          <CategoryPill active={filter === "all"} onClick={() => setFilter("all")}>
            All
          </CategoryPill>
          {CATEGORIES.map((c) => (
            <CategoryPill key={c} active={filter === c} onClick={() => setFilter(c)}>
              {c}
            </CategoryPill>
          ))}
        </div>
      </section>

      <section className="px-4 mt-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Library · {filtered.length}
          </h3>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="text-primary">●</span> Recent sessions
          </span>
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="border border-dashed border-border p-8 text-center text-muted-foreground text-xs uppercase tracking-widest">
              No exercises. Tap + to add one.
            </div>
          )}
          {filtered.map((e) => {
            const isSelected = ids.includes(e.id);
            return (
              <div
                key={e.id}
                className={
                  "group p-3 border flex items-center gap-4 transition-colors " +
                  (isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-white/[0.02]")
                }
              >
                <UsageDots count={usage.get(e.id) ?? 0} />
                <button
                  className="flex-1 text-left"
                  onClick={() => toggle(e.id)}
                >
                  <div className="flex justify-between items-center gap-2">
                    <h4 className="font-display uppercase text-lg leading-tight">
                      {e.name}
                    </h4>
                    <span className="text-[10px] text-muted-foreground uppercase whitespace-nowrap">
                      {e.muscleGroup} / {e.category}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-0.5 text-[10px] text-muted-foreground font-bold uppercase">
                    <span>
                      {e.defaultSets} × {e.defaultReps} @ {e.defaultWeight}KG
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => setEditing(e)}
                  className="text-[10px] text-muted-foreground hover:text-primary uppercase tracking-widest px-2"
                  aria-label="Edit"
                >
                  Edit
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Program builder tray */}
      <nav className="fixed bottom-0 inset-x-0 bg-background border-t border-primary/40 p-3 z-40">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {selected.length === 0 ? (
              <div className="h-12 border border-border px-3 flex items-center text-[10px] uppercase tracking-widest text-muted-foreground">
                Tap exercises to build today&apos;s program
              </div>
            ) : (
              <div className="border border-border">
                <div className="flex justify-between items-center px-3 py-1.5 border-b border-border">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {selected.length} in program
                  </span>
                  <button
                    onClick={clear}
                    className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive"
                  >
                    Clear
                  </button>
                </div>
                <ul className="max-h-40 overflow-y-auto">
                  {selected.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center gap-2 px-3 py-1.5 border-t border-border first:border-t-0 text-sm"
                    >
                      <span className="flex-1 truncate font-display uppercase">{e.name}</span>
                      <button
                        onClick={() => move(e.id, -1)}
                        className="size-6 text-muted-foreground hover:text-primary"
                        aria-label="Up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(e.id, 1)}
                        className="size-6 text-muted-foreground hover:text-primary"
                        aria-label="Down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => toggle(e.id)}
                        className="size-6 text-muted-foreground hover:text-destructive"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button
            onClick={startSession}
            disabled={selected.length === 0}
            className="h-12 px-5 bg-primary text-primary-foreground font-display uppercase tracking-widest text-sm disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
          >
            Start
          </button>
        </div>
      </nav>

      {editing !== undefined && (
        <ExerciseFormDialog
          initial={editing}
          onClose={() => setEditing(undefined)}
          onDelete={
            editing
              ? () => {
                  remove(editing.id);
                  setEditing(undefined);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
