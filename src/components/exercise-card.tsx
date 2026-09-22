import { useState, type ReactNode } from "react";
import type { Exercise } from "@/lib/gym";
import { Chevron, StatStrip, TagChip } from "@/components/kit";

/** Boxed exercise: name row (+ optional leading slot), black stat strip, expandable note/link. */
export function ExerciseCard({
  ex,
  lead,
  onEdit,
  trailing,
}: {
  ex: Pick<Exercise, "name" | "reps" | "sets" | "weight"> &
    Partial<Pick<Exercise, "note" | "url" | "kg" | "tags">>;
  lead?: ReactNode;
  onEdit?: () => void;
  trailing?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const expandable = onEdit || ex.note || ex.url || ex.tags?.length;
  return (
    <div className="border-[1.5px] border-[var(--ink)]">
      <div className="flex min-h-[44px] items-center gap-3 pl-3">
        {lead}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-3 text-left"
          onClick={() => expandable && setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="min-w-0 flex-1 truncate text-[19px] leading-tight">{ex.name}</span>
          {expandable && <Chevron open={open} />}
        </button>
        {trailing}
      </div>
      <StatStrip reps={ex.reps} sets={ex.sets} weight={ex.weight} kg={ex.kg} />
      {open && (
        <div className="space-y-2 px-3 py-3 font-mono text-[12px] leading-relaxed">
          {ex.tags && ex.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {ex.tags.map((t) => (
                <TagChip key={t}>{t}</TagChip>
              ))}
            </div>
          )}
          {ex.note ? (
            <p className="whitespace-pre-wrap">{ex.note}</p>
          ) : (
            <p className="text-[var(--faint)]">No notes.</p>
          )}
          {ex.url && (
            <a
              href={normalizeUrl(ex.url)}
              target="_blank"
              rel="noreferrer"
              className="block truncate underline underline-offset-4"
            >
              ↗ {ex.url.replace(/^https?:\/\//, "")}
            </a>
          )}
          {onEdit && (
            <button onClick={onEdit} className="pt-1 uppercase underline underline-offset-4">
              Edit
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function normalizeUrl(u: string) {
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}
