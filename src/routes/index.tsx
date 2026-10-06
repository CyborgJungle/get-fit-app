import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { groupByTag, matchesQuery, useExercises, useGroupByTag, type Exercise } from "@/lib/gym";
import { MUSCLES, muscleLabel, type Muscle } from "@/lib/muscles";
import {
  EmptyAdd,
  GroupHeader,
  LineButton,
  SearchBox,
  SectionLabel,
  Shell,
  useOpenGroups,
} from "@/components/kit";
import { ExerciseCard } from "@/components/exercise-card";
import { ExerciseForm } from "@/components/exercise-form";
import { BodyMap } from "@/components/body-map";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Exercises — Workout by Tim" }] }),
  component: ExercisesPage,
});

function ExercisesPage() {
  const { list, save, remove, ready } = useExercises();
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [open, setOpen] = useState(false);
  const [groupSetting, setGroupSetting] = useGroupByTag();
  const [query, setQuery] = useState("");
  const [body, setBody] = useState(false);
  // Group or Body, never both: switching one on switches the other off.
  // (Body only hides the grouping here; the stored Group setting stays as is.)
  const grouped = groupSetting && !body;
  const [muscles, setMuscles] = useState<Muscle[]>([]);
  const q = query.trim().toLowerCase();
  const picking = body && muscles.length > 0;

  let shown = q ? list.filter((e) => matchesQuery(e, q)) : list;
  if (picking) {
    // Exercises for any picked muscle; the ones hitting more of them first.
    const hits = (e: Exercise) =>
      (e.muscles ?? []).filter((m) => muscles.includes(m as Muscle)).length;
    shown = shown.filter((e) => hits(e) > 0).sort((a, b) => hits(b) - hits(a));
  }
  const groups = useOpenGroups(!!q || picking);

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
          <span className="flex gap-1.5">
            {list.length > 0 && (
              <>
                <LineButton
                  className="h-8 gap-1.5 px-2.5"
                  active={grouped}
                  aria-pressed={grouped}
                  onClick={() => {
                    if (body) {
                      setBody(false);
                      setGroupSetting(true);
                    } else setGroupSetting(!groupSetting);
                  }}
                >
                  <span
                    className={cn(
                      "block h-2 w-2 rounded-full border border-current",
                      grouped && "bg-current",
                    )}
                  />
                  Group
                </LineButton>
                <LineButton
                  className="h-8 gap-1.5 px-2.5"
                  active={body}
                  aria-pressed={body}
                  onClick={() => setBody(!body)}
                >
                  <BodyIcon />
                  Body
                </LineButton>
              </>
            )}
            <LineButton className="h-8 px-2.5" onClick={openNew}>
              + Add
            </LineButton>
          </span>
        }
      >
        Exercises
      </SectionLabel>

      {body && list.length > 0 && (
        <BodyPanel
          list={list}
          muscles={muscles}
          onChange={setMuscles}
          matches={picking ? shown.length : null}
        />
      )}

      {list.length > 0 && <SearchBox value={query} onChange={setQuery} className="mt-4" />}

      <div className={cn("pb-10 pt-4", grouped ? "space-y-1" : "space-y-2")}>
        {(q || picking) && shown.length === 0 && (
          <p className="py-8 text-center font-mono text-[12px] uppercase text-[var(--faint)]">
            {q ? `No exercises match “${query.trim()}”` : "No exercises for these muscles yet"}
          </p>
        )}
        {ready && list.length === 0 && (
          <EmptyAdd label="Add your first exercise" onClick={openNew} />
        )}
        {grouped
          ? groupByTag(shown, !q && !picking && list.length > 0).map(([tag, items]) => {
              const isOpen = groups.isOpen(tag);
              return (
                <section key={tag} className="space-y-2">
                  <GroupHeader
                    tag={tag}
                    count={items.length}
                    open={isOpen}
                    onToggle={groups.toggle && (() => groups.toggle!(tag))}
                  />
                  {isOpen &&
                    (items.length ? (
                      <div className="space-y-2 pb-3">{items.map((ex) => card(ex))}</div>
                    ) : (
                      <p className="pb-3 font-mono text-[11px] uppercase text-[var(--faint)]">
                        Nothing here yet · add the “{tag}” group to an exercise
                      </p>
                    ))}
                </section>
              );
            })
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

/** Body map + muscle chips; picked muscles filter the list below. */
function BodyPanel({
  list,
  muscles,
  onChange,
  matches,
}: {
  list: Exercise[];
  muscles: Muscle[];
  onChange: (m: Muscle[]) => void;
  matches: number | null;
}) {
  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const e of list) for (const m of e.muscles ?? []) c.set(m, (c.get(m) ?? 0) + 1);
    return c;
  }, [list]);
  const available = useMemo(() => new Set(counts.keys()), [counts]);
  const unmapped = list.filter((e) => !e.muscles?.length).length;
  const toggle = (m: Muscle) =>
    onChange(muscles.includes(m) ? muscles.filter((x) => x !== m) : [...muscles, m]);

  return (
    <div className="mt-4 border-[1.5px] border-[var(--ink)]">
      <div className="px-3 pb-2 pt-4">
        <BodyMap selected={muscles} available={available} onToggle={toggle} />
      </div>
      <div className="flex flex-wrap gap-1.5 border-t border-[var(--ink)] px-3 py-3">
        {MUSCLES.map(({ id, label }) => {
          const on = muscles.includes(id);
          const n = counts.get(id) ?? 0;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(id)}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 border-[1.5px] px-2 font-mono text-[10.5px] uppercase",
                on
                  ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--ink-fg)]"
                  : n
                    ? "border-[var(--ink)] active:bg-[var(--sage-2)]"
                    : "border-dashed border-[var(--faint)] text-[var(--faint)]",
              )}
            >
              {label}
              <span className={on ? "text-[var(--ink-muted)]" : "text-[var(--faint)]"}>{n}</span>
            </button>
          );
        })}
      </div>
      <div className="flex min-h-11 items-center gap-3 border-t border-[var(--ink)] px-3 font-mono text-[11px] uppercase">
        {matches === null ? (
          <span className="text-[var(--faint)]">Tap a muscle to see its exercises</span>
        ) : (
          <span className="min-w-0 flex-1 truncate">
            {matches} for {muscles.map(muscleLabel).join(" + ")}
          </span>
        )}
        {muscles.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="ml-auto shrink-0 py-2 uppercase underline underline-offset-4"
          >
            Clear
          </button>
        )}
      </div>
      {unmapped > 0 && (
        <p className="border-t border-dashed border-[var(--faint)] px-3 py-2 font-mono text-[10px] uppercase text-[var(--faint)]">
          {unmapped} {unmapped === 1 ? "exercise has" : "exercises have"} no muscles yet · Edit to
          add them
        </p>
      )}
    </div>
  );
}

function BodyIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden className="shrink-0">
      <circle cx="5" cy="2" r="1.7" fill="currentColor" />
      <path
        d="M1 5.2h8M5 4.5v3.3M5 7.8L2.8 11.5M5 7.8l2.2 3.7"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
      />
    </svg>
  );
}
