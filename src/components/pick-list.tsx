import type { ReactNode } from "react";
import {
  activePresetIds,
  matchesQuery,
  fmtKg,
  groupByTag,
  useGroupByTag,
  useWeightUnit,
  type Exercise,
  type Preset,
  type WorkoutItem,
} from "@/lib/gym";
import { Dot, GroupHeader, LineButton, WeightDots, useOpenGroups } from "@/components/kit";
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
  query = "",
}: {
  list: Exercise[];
  selected: string[];
  onToggle: (id: string) => void;
  /** Shown as picked but not toggleable (already in a running workout). */
  locked?: string[];
  numbered?: boolean;
  /** Filter by name, group or note. */
  query?: string;
}) {
  const [grouped] = useGroupByTag();
  const q = query.trim().toLowerCase();
  // Groups start closed; while searching they all open so every match shows.
  const groups = useOpenGroups(!!q);
  if (q) list = list.filter((e) => matchesQuery(e, q));
  if (q && list.length === 0) {
    return (
      <p className="py-8 text-center font-mono text-[12px] uppercase text-[var(--faint)]">
        No exercises match “{query.trim()}”
      </p>
    );
  }
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
          <span className="min-w-0 flex-1 break-words text-[17px] leading-snug">{ex.name}</span>
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
      {groupByTag(list).map(([tag, items]) => {
        const open = groups.isOpen(tag);
        const picked = items.filter((e) => locked.includes(e.id) || selected.includes(e.id)).length;
        return (
          <section key={tag} className="border-b border-[var(--ink)]">
            <GroupHeader
              tag={tag}
              count={items.length}
              open={open}
              onToggle={groups.toggle && (() => groups.toggle!(tag))}
              extra={
                picked > 0 && (
                  <span className="flex items-center gap-1">
                    <Dot filled size={9} />
                    {picked}
                  </span>
                )
              }
              className="px-4"
            />
            {open && (
              <ul className="border-t border-[var(--ink)] [&>li:last-child]:border-b-0">
                {items.map(row)}
              </ul>
            )}
          </section>
        );
      })}
    </>
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
  /** Called with the new selection and whether the tapped preset was switched on. */
  onChange: (ids: string[], presetId: string, on: boolean) => void;
  locked?: string[];
  /** Exercise ids that still exist; presets ignore deleted exercises. */
  existing: Set<string>;
}) {
  if (!presets.length) return null;
  const activeIds = activePresetIds(presets, selected, existing, locked);
  return (
    <div className="border-b border-[var(--ink)] px-4 pb-3 pt-2.5">
      <span className="mb-1.5 block font-mono text-[10px] uppercase text-[var(--faint)]">
        Presets
      </span>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const ids = p.ids.filter((id) => existing.has(id) && !locked.includes(id));
          const on = activeIds.includes(p.id);
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
                  p.id,
                  !on,
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
          <span className="min-w-0 flex-1 break-words text-[17px] leading-snug">{it.name}</span>
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
