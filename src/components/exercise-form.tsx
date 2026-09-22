import { useEffect, useState } from "react";
import { cleanTag, fmtKg, uid, useExercises, useWeightUnit, type Exercise } from "@/lib/gym";
import { Sheet, TagChip, WeightDots } from "@/components/kit";
import { cn } from "@/lib/utils";

const blank = (): Exercise => ({
  id: uid(),
  name: "",
  reps: 10,
  sets: 3,
  weight: 0,
  kg: 0,
  tags: [],
  note: "",
  url: "",
});

export function ExerciseForm({
  open,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  initial: Exercise | null;
  onClose: () => void;
  onSave: (e: Exercise) => void;
  onDelete?: (id: string) => void;
}) {
  const [unit] = useWeightUnit();
  const [ex, setEx] = useState<Exercise>(blank);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (open) {
      setEx(initial ?? blank());
      setConfirmDelete(false);
    }
  }, [open, initial]);

  const set = <K extends keyof Exercise>(k: K, v: Exercise[K]) => setEx((p) => ({ ...p, [k]: v }));
  const valid = ex.name.trim().length > 0;
  const submit = () => {
    if (!valid) return;
    onSave({ ...ex, name: ex.name.trim(), note: ex.note.trim(), url: ex.url.trim() });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? "Edit exercise" : "New exercise"}
      action={
        <button
          onClick={submit}
          disabled={!valid}
          className="h-9 bg-[var(--ink)] px-4 text-[13px] uppercase tracking-wide text-[var(--ink-fg)] disabled:opacity-35"
        >
          Save
        </button>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        autoComplete="off"
      >
        <Field label="Name">
          <input
            name="exercise-name"
            value={ex.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Pull up"
            className="w-full bg-transparent text-[22px] leading-tight outline-none placeholder:text-[var(--faint)]"
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="done"
          />
        </Field>
        <div className="grid grid-cols-[1fr_1fr_1.3fr] bg-[var(--ink)] text-[var(--ink-fg)]">
          <Stepper label="Reps" value={ex.reps} onChange={(v) => set("reps", v)} max={99} />
          <Stepper label="Sets" value={ex.sets} onChange={(v) => set("sets", v)} max={12} divider />
          {unit === "kg" ? (
            <Stepper
              label="Weight · kg"
              value={ex.kg ?? 0}
              onChange={(v) => set("kg", v)}
              min={0}
              max={500}
              divider
              display={<KgInput value={ex.kg ?? 0} onChange={(v) => set("kg", v)} />}
            />
          ) : (
            <Stepper
              label="Weight"
              value={ex.weight}
              onChange={(v) => set("weight", v)}
              min={0}
              max={5}
              divider
              display={<WeightDots value={ex.weight} size={7} />}
            />
          )}
        </div>
        <TagField value={ex.tags ?? []} onChange={(t) => set("tags", t)} />
        <Field label="Notes">
          <textarea
            name="exercise-notes"
            value={ex.note}
            onChange={(e) => set("note", e.target.value)}
            rows={2}
            placeholder="Cues, setup, grip…"
            className="w-full resize-none bg-transparent font-mono text-[14px] leading-snug outline-none placeholder:text-[var(--faint)]"
          />
        </Field>
        <Field label="Link">
          <input
            name="exercise-link"
            value={ex.url}
            onChange={(e) => set("url", e.target.value)}
            placeholder="youtube.com/…"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            className="w-full bg-transparent font-mono text-[14px] outline-none placeholder:text-[var(--faint)]"
          />
        </Field>
        {initial && onDelete && (
          <button
            type="button"
            onClick={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              onDelete(initial.id);
              onClose();
            }}
            className="h-12 w-full font-mono text-[11px] uppercase underline underline-offset-4"
          >
            {confirmDelete ? "Tap again to delete" : "Delete exercise"}
          </button>
        )}
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block border-b-[1.5px] border-[var(--ink)] px-4 pb-2.5 pt-2">
      <span className="mb-0.5 block font-mono text-[10px] uppercase text-[var(--faint)]">
        {label}
      </span>
      {children}
    </label>
  );
}

/** Label on top, then [−] value [+] on one row. */
function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max,
  divider,
  display,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max: number;
  divider?: boolean;
  display?: React.ReactNode;
}) {
  const btn =
    "flex h-9 w-9 shrink-0 items-center justify-center border border-[#4a4d4a] text-[18px] active:bg-[var(--ink-2)]";
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 px-2.5 pb-2.5 pt-2",
        divider && "border-l border-[#4a4d4a]",
      )}
    >
      <span className="font-mono text-[9px] uppercase text-[var(--ink-muted)]">{label}</span>
      <span className="flex items-center justify-between gap-1">
        <button
          type="button"
          className={btn}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Less ${label}`}
        >
          −
        </button>
        <span className="flex min-w-0 justify-center text-[22px] leading-none tabular-nums">
          {display ?? value}
        </span>
        <button
          type="button"
          className={btn}
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`More ${label}`}
        >
          +
        </button>
      </span>
    </div>
  );
}

/** Typed kg value (decimals allowed); keeps a local draft so "12." can be typed. */
function KgInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState(fmtKg(value));
  useEffect(() => {
    if (Number(draft.replace(",", ".")) !== value) setDraft(fmtKg(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      value={draft}
      inputMode="decimal"
      enterKeyHint="done"
      aria-label="Weight in kg"
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9.,]/g, "");
        setDraft(t);
        const n = Number(t.replace(",", "."));
        if (t !== "" && Number.isFinite(n)) onChange(Math.min(500, Math.max(0, n)));
      }}
      onBlur={() => setDraft(fmtKg(value))}
      className="w-full min-w-0 bg-transparent text-center text-[22px] leading-none tabular-nums outline-none"
    />
  );
}

/** Tag picker: tap existing tags to toggle, type a new one and press return/+ to add. */
function TagField({ value, onChange }: { value: string[]; onChange: (t: string[]) => void }) {
  const { list } = useExercises();
  const [draft, setDraft] = useState("");
  const known = Array.from(new Set([...list.flatMap((e) => e.tags ?? []), ...value])).sort();
  const toggle = (t: string) =>
    onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  const add = () => {
    const t = cleanTag(draft);
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="border-b-[1.5px] border-[var(--ink)] px-4 pb-2.5 pt-2">
      <span className="mb-1.5 block font-mono text-[10px] uppercase text-[var(--faint)]">
        Group
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {known.map((t) => (
          <TagChip key={t} active={value.includes(t)} onClick={() => toggle(t)}>
            {t}
          </TagChip>
        ))}
        <span className="inline-flex h-7 items-center border-[1.5px] border-dashed border-[var(--ink)]">
          <input
            name="exercise-tag"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                add();
              }
            }}
            onBlur={add}
            placeholder="new tag"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            enterKeyHint="done"
            className="w-24 bg-transparent px-2 font-mono text-[16px] leading-none outline-none placeholder:text-[11px] placeholder:uppercase placeholder:text-[var(--faint)]"
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={add}
            className="h-full border-l-[1.5px] border-dashed border-[var(--ink)] px-2 text-[14px]"
            aria-label="Add tag"
          >
            +
          </button>
        </span>
      </div>
    </div>
  );
}
