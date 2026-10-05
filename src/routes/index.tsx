import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { groupByTag, matchesQuery, useExercises, useGroupByTag, type Exercise } from "@/lib/gym";
import {
  EmptyAdd,
  GroupDivider,
  LineButton,
  SearchBox,
  SectionLabel,
  Shell,
} from "@/components/kit";
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
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? list.filter((e) => matchesQuery(e, q)) : list;

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

      {list.length > 0 && <SearchBox value={query} onChange={setQuery} className="mt-4" />}

      <div className="space-y-3 pb-10 pt-4">
        {q && shown.length === 0 && (
          <p className="py-8 text-center font-mono text-[12px] uppercase text-[var(--faint)]">
            No exercises match “{query.trim()}”
          </p>
        )}
        {ready && list.length === 0 && (
          <EmptyAdd label="Add your first exercise" onClick={openNew} />
        )}
        {grouped
          ? groupByTag(shown).map(([tag, items]) => (
              <section key={tag} className="space-y-3 pt-2">
                <GroupDivider tag={tag} count={items.length} />
                {items.map((ex) => card(ex))}
              </section>
            ))
          : shown.map((ex) => card(ex))}
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
