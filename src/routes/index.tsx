import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useExercises, useGroupByTag, type Exercise } from "@/lib/gym";
import { LineButton, SectionLabel, Shell } from "@/components/kit";
import { ExerciseCard } from "@/components/exercise-card";
import { ExerciseForm } from "@/components/exercise-form";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Exercises — Workout by Tim" }] }),
  component: ExercisesPage,
});

function ExercisesPage() {
  const { list, save, remove, ready } = useExercises();
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [open, setOpen] = useState(false);
  const [grouped, setGrouped] = useGroupByTag();

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };

  const card = (ex: Exercise) => (
    <ExerciseCard
      key={ex.id}
      ex={ex}
      onEdit={() => {
        setEditing(ex);
        setOpen(true);
      }}
    />
  );

  return (
    <Shell>
      <SectionLabel
        n="01"
        right={
          <span className="flex gap-2">
            {list.length > 0 && (
              <LineButton
                className="h-8 gap-1.5 px-3"
                active={grouped}
                aria-pressed={grouped}
                onClick={() => setGrouped(!grouped)}
              >
                <span
                  className={
                    "block h-2 w-2 rounded-full border border-current " +
                    (grouped ? "bg-current" : "")
                  }
                />
                Group
              </LineButton>
            )}
            <LineButton className="h-8 px-3" onClick={openNew}>
              + Add
            </LineButton>
          </span>
        }
      >
        Exercises
      </SectionLabel>

      <div className="space-y-3 pb-10 pt-4">
        {ready && list.length === 0 && (
          <button
            onClick={openNew}
            className="flex h-40 w-full flex-col items-center justify-center gap-2 border-[1.5px] border-dashed border-[var(--ink)]"
          >
            <span className="text-[32px] leading-none">+</span>
            <span className="font-mono text-[11px] uppercase">Add your first exercise</span>
          </button>
        )}
        {grouped
          ? groupByTag(list).map(([tag, items]) => (
              <section key={tag} className="space-y-3 pt-2">
                <div className="flex items-baseline gap-2 font-mono text-[11px] uppercase">
                  <span>{tag}</span>
                  <span className="text-[var(--faint)]">{items.length}</span>
                  <span className="ml-1 flex-1 border-b border-dashed border-[var(--faint)]" />
                </div>
                {items.map((ex) => card(ex))}
              </section>
            ))
          : list.map((ex) => card(ex))}
      </div>

      <ExerciseForm
        open={open}
        initial={editing}
        onClose={() => setOpen(false)}
        onSave={save}
        onDelete={remove}
      />
    </Shell>
  );
}

/** Tags A–Z (an exercise with several tags shows in each), untagged last. */
function groupByTag(list: Exercise[]): [string, Exercise[]][] {
  const map = new Map<string, Exercise[]>();
  for (const ex of list) {
    const tags = ex.tags?.length ? ex.tags : [""];
    for (const t of tags) map.set(t, [...(map.get(t) ?? []), ex]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
    .map(([t, items]) => [t || "No group", items]);
}
