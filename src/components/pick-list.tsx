import type { ReactNode } from "react";
import {
  fmtKg,
  groupByTag,
  useGroupByTag,
  useWeightUnit,
  type Exercise,
  type Preset,
  type WorkoutItem,
} from "@/lib/gym";
import { Dot, LineButton, WeightDots } from "@/components/kit";
import { cn } from "@/lib/utils";

/** Group on/off toggle, shared by every exercise list (same stored setting). */
export function GroupToggle({ className }: { className?: string }) {
  const [grouped, setGrouped] = useGroupByTag();
  return (
    <LineButton
      className={cn("h-9 gap-1.5 px-3", className)}
      active={grouped}
      aria-pressed={grouped}
      onClick={() => setGrouped(!grouped)}
    >
      <span
        className={cn("block h-2 w-2 rounded-full border border-current", grouped && "bg-current")}
      />
      Group
    </LineButton>
  );
}

/** Selectable exercise rows: hollow dot → filled when picked, optional pick order. */
export function PickList({
  list,
  selected,
  onToggle,
  locked = [],
  numbered = true,
}: {
  list: Exercise[];
  selected: string[];
  onToggle: (id: string) => void;
  /** Shown as picked but not toggleable (already in a running workout). */
  locked?: string[];
  numbered?: boolean;
}) {
  const [grouped] = useGroupByTag();
  const row = (ex: Exercise) => {
    const isLocked = locked.includes(ex.id);
    const on = isLocked || selected.includes(ex.id);
    return (
      <li key={ex.id} className="border-b border-[var(--ink)]">
        <button
          type="button"
          onClick={() => !isLocked && onToggle(ex.id)}
          className={cn(
            "flex w-full items-center gap-3 px-4 py-3.5 text-left",
            isLocked ? "opacity-40" : "active:bg-[var(--sage-2)]",
          )}
        >
          <Dot filled={on} size={18} />
          <span className="min-w-0 flex-1 truncate text-[18px]">{ex.name}</span>
          <span className="font-mono text-[11px] text-[var(--faint)]">
            {ex.sets}×{ex.reps}
          </span>
          {numbered && on && !isLocked && (
            <span className="w-5 text-right font-mono text-[11px]">
              {selected.indexOf(ex.id) + 1}
            </span>
          )}
        </button>
      </li>
    );
  };
  if (!grouped) return <ul>{list.map(row)}</ul>;
  return (
    <>
      {groupByTag(list).map(([tag, items]) => (
        <section key={tag}>
          <GroupHeader tag={tag} count={items.length} />
          <ul>{items.map(row)}</ul>
        </section>
      ))}
    </>
  );
}

function GroupHeader({ tag, count }: { tag: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2 bg-[var(--sage-2)] px-4 py-1.5 font-mono text-[11px] uppercase">
      <span>{tag}</span>
      <span className="text-[var(--faint)]">{count}</span>
    </div>
  );
}

/** Row of saved presets; a preset is "on" when all of its exercises are picked. */
export function PresetChips({
  presets,
  selected,
  onChange,
  locked = [],
  existing,
}: {
  presets: Preset[];
  selected: string[];
  onChange: (ids: string[]) => void;
  locked?: string[];
  /** Exercise ids that still exist; presets ignore deleted exercises. */
  existing: Set<string>;
}) {
  if (!presets.length) return null;
  return (
    <div className="border-b border-[var(--ink)] px-4 pb-3 pt-2.5">
      <span className="mb-1.5 block font-mono text-[10px] uppercase text-[var(--faint)]">
        Presets
      </span>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const ids = p.ids.filter((id) => existing.has(id) && !locked.includes(id));
          const on = ids.length > 0 && ids.every((id) => selected.includes(id));
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              disabled={!ids.length}
              onClick={() =>
                onChange(
                  on
                    ? selected.filter((id) => !ids.includes(id))
                    : [...selected, ...ids.filter((id) => !selected.includes(id))],
                )
              }
              className={cn(
                "inline-flex h-8 items-center gap-2 border-[1.5px] border-[var(--ink)] px-2.5 font-mono text-[11px] uppercase disabled:opacity-35",
                on ? "bg-[var(--ink)] text-[var(--ink-fg)]" : "active:bg-[var(--sage-2)]",
              )}
            >
              {p.name}
              <span className={on ? "text-[var(--ink-muted)]" : "text-[var(--faint)]"}>
                {ids.length}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Read-only rows of a finished workout (calendar day log). */
export function LogList({ items, footer }: { items: WorkoutItem[]; footer?: ReactNode }) {
  const [unit] = useWeightUnit();
  return (
    <ul className="border-t-[1.5px] border-[var(--ink)]">
      {items.map((it, i) => (
        <li key={it.id + i} className="flex items-center gap-3 border-b border-[var(--ink)] py-3">
          <Dot filled={it.done >= it.sets} size={18} />
          <span className="min-w-0 flex-1 truncate text-[18px]">{it.name}</span>
          <span className="font-mono text-[11px] tabular-nums text-[var(--faint)]">
            {it.done}/{it.sets}×{it.reps}
          </span>
          <span className="flex w-[58px] justify-end font-mono text-[11px] tabular-nums">
            {unit === "kg" ? (
              `${fmtKg(it.kg ?? 0)} kg`
            ) : (
              <WeightDots value={it.weight} size={6} tone="ink" />
            )}
          </span>
        </li>
      ))}
      {footer}
    </ul>
  );
}
