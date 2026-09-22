import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useExercises, type Exercise } from "@/lib/gym";
import { LineButton, SectionLabel, Shell } from "@/components/kit";
import { ExerciseCard } from "@/components/exercise-card";
import { ExerciseForm } from "@/components/exercise-form";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Exercises — Get Ripped" }] }),
  component: ExercisesPage,
});

function ExercisesPage() {
  const { list, save, remove, ready } = useExercises();
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };

  return (
    <Shell>
      <SectionLabel
        n="01"
        right={
          <LineButton className="h-8 px-3" onClick={openNew}>
            + Add
          </LineButton>
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
        {list.map((ex) => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            onEdit={() => {
              setEditing(ex);
              setOpen(true);
            }}
          />
        ))}
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
