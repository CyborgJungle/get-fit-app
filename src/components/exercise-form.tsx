import { useEffect, useState } from "react";
import {
  DEFAULT_GROUPS,
  cleanTag,
  fmtKg,
  uid,
  useExercises,
  useWeightUnit,
  type Exercise,
} from "@/lib/gym";
import { MUSCLES } from "@/lib/muscles";
import { sameExercise, targetsFor } from "@/lib/tidy";
import { Sheet, WeightDots } from "@/components/kit";
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
  const { list } = useExercises();
  const [ex, setEx] = useState<Exercise>(blank);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Muscles follow the name (known exercises) until they're picked by hand.
  const [musclesByHand, setMusclesByHand] = useState(false);
  useEffect(() => {
    if (open) {
      setEx(initial ?? blank());
      setConfirmDelete(false);
      setMusclesByHand(!!initial?.muscles);
    }
  }, [open, initial]);

  const set = <K extends keyof Exercise>(k: K, v: Exercise[K]) => setEx((p) => ({ ...p, [k]: v }));
  const setName = (name: string) =>
    setEx((p) => {
      if (musclesByHand) return { ...p, name };
      const m = targetsFor(name);
      return { ...p, name, muscles: m.length ? m : undefined };
    });
  const name = ex.name.trim();
  // No doubles: the same name (loosely) or another name for the same exercise.
  const dupe = name ? list.find((e) => e.id !== ex.id && sameExercise(e.name, name)) : undefined;
  const valid = name.length > 0 && !dupe;
  const submit = () => {
    if (!valid) return;
    onSave({ ...ex, name, note: ex.note.trim(), url: ex.url.trim() });
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
            onChange={(e) => setName(e.target.value)}
            placeholder="Pull up"
            className="w-full bg-transparent text-[22px] leading-tight outline-none placeholder:text-[var(--faint)]"
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="done"
          />
          {dupe && (
            <span className="mt-1 block font-mono text-[11px] uppercase">
              Already in your list as “{dupe.name}”
            </span>
          )}
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
        <MuscleField
          value={ex.muscles ?? []}
          onChange={(m) => {
            setMusclesByHand(true);
            set("muscles", m);
          }}
        />
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

/** Main target muscles as toggle chips (drives the Body view). */
function MuscleField({ value, onChange }: { value: string[]; onChange: (m: string[]) => void }) {
  return (
    <div className="border-b-[1.5px] border-[var(--ink)] px-4 pb-3 pt-2">
      <span className="mb-1.5 block font-mono text-[10px] uppercase text-[var(--faint)]">
        Muscles{value.length ? ` · ${value.length}` : ""}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {MUSCLES.map(({ id, label }) => {
          const on = value.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange(
                  on
                    ? value.filter((x) => x !== id)
                    : MUSCLES.map((m) => m.id).filter((m) => m === id || value.includes(m)),
                )
              }
              className={cn(
                "inline-flex h-8 items-center border-[1.5px] border-[var(--ink)] px-2 font-mono text-[11px] uppercase",
                on ? "bg-[var(--ink)] text-[var(--ink-fg)]" : "active:bg-[var(--sage-2)]",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
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

/**
 * Group tags: selected tags as removable chips, one input that opens a short
 * suggestion list of existing tags (filtered as you type) plus "Add …" for a
 * new one. Backspace on an empty input removes the last tag.
 */
function TagField({ value, onChange }: { value: string[]; onChange: (t: string[]) => void }) {
  const { list } = useExercises();
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const q = cleanTag(draft);
  // Default groups first (always offered), then the rest A–Z.
  const known = Array.from(
    new Set([
      ...DEFAULT_GROUPS,
      ...list
        .flatMap((e) => e.tags ?? [])
        .map(cleanTag)
        .sort(),
    ]),
  );
  const suggestions = known.filter((t) => !value.includes(t) && (!q || t.includes(q)));
  const isNew = q !== "" && !known.includes(q) && !value.includes(q);
  const add = (t: string) => {
    const c = cleanTag(t);
    if (c && !value.includes(c)) onChange([...value, c]);
    setDraft("");
  };
  const remove = (t: string) => onChange(value.filter((x) => x !== t));
  const showList = focused && (suggestions.length > 0 || isNew);

  return (
    <div className="border-b-[1.5px] border-[var(--ink)] px-4 pb-2.5 pt-2">
      <span className="mb-1.5 block font-mono text-[10px] uppercase text-[var(--faint)]">
        Groups
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => remove(t)}
            aria-label={`Remove ${t}`}
            className="inline-flex h-8 items-center gap-2 bg-[var(--ink)] pl-2.5 pr-2 font-mono text-[11px] uppercase text-[var(--ink-fg)] active:bg-[var(--ink-2)]"
          >
            {t}
            <span className="text-[12px] text-[var(--ink-muted)]">✕</span>
          </button>
        ))}
        <input
          name="exercise-tag"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          // Close the list a beat later so a tap on a chip lands before the layout shifts.
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              if (q) add(isNew ? q : (suggestions[0] ?? q));
            } else if (e.key === "Backspace" && !draft && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          placeholder={value.length ? "+ group" : "+ Add group"}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          enterKeyHint="done"
          className="h-8 min-w-[7rem] flex-1 bg-transparent font-mono text-[16px] outline-none placeholder:text-[12px] placeholder:uppercase placeholder:text-[var(--faint)]"
        />
      </div>
      {showList && (
        <ul
          className="mt-2 max-h-[132px] divide-y divide-[var(--faint)] overflow-y-auto border-[1.5px] border-[var(--ink)]"
          // Keep focus in the input while tapping a suggestion.
          onMouseDown={(e) => e.preventDefault()}
        >
          {isNew && (
            <li>
              <button
                type="button"
                onClick={() => add(q)}
                className="flex h-11 w-full items-center gap-2 px-3 text-left font-mono text-[12px] uppercase active:bg-[var(--sage-2)]"
              >
                <span className="text-[16px] leading-none">+</span> Add “{q}”
              </button>
            </li>
          )}
          {suggestions.map((t) => (
            <li key={t}>
              <button
                type="button"
                onClick={() => add(t)}
                className="flex h-11 w-full items-center px-3 text-left font-mono text-[12px] uppercase active:bg-[var(--sage-2)]"
              >
                {t}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
