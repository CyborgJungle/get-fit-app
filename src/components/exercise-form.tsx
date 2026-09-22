import { useEffect, useState } from "react";
import { uid, type Exercise } from "@/lib/gym";
import { InkButton, Sheet, WeightDots } from "@/components/kit";

const blank = (): Exercise => ({
  id: uid(),
  name: "",
  reps: 10,
  sets: 3,
  weight: 1,
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
      footer={
        <div className="space-y-2">
          <InkButton onClick={submit} disabled={!valid}>
            Save →
          </InkButton>
          {initial && onDelete && (
            <button
              onClick={() => {
                if (!confirmDelete) return setConfirmDelete(true);
                onDelete(initial.id);
                onClose();
              }}
              className="h-11 w-full font-mono text-[12px] uppercase underline underline-offset-4"
            >
              {confirmDelete ? "Tap again to delete" : "Delete exercise"}
            </button>
          )}
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Name">
          <input
            value={ex.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Pull up"
            className="w-full bg-transparent text-[24px] leading-tight outline-none placeholder:text-[var(--faint)]"
            autoFocus={!initial}
            enterKeyHint="done"
          />
        </Field>
        <div className="grid grid-cols-[1fr_1fr_1.35fr] bg-[var(--ink)] text-[var(--ink-fg)]">
          <Stepper label="Reps" value={ex.reps} onChange={(v) => set("reps", v)} max={99} />
          <Stepper label="Sets" value={ex.sets} onChange={(v) => set("sets", v)} max={12} divider />
          <div className="flex flex-col border-l border-[#4a4d4a] px-3 pb-3 pt-1.5">
            <span className="font-mono text-[9px] uppercase text-[var(--ink-muted)]">Weight</span>
            <span className="flex flex-1 items-center">
              <WeightDots value={ex.weight} onChange={(v) => set("weight", v)} size={14} />
            </span>
          </div>
        </div>
        <Field label="Notes">
          <textarea
            value={ex.note}
            onChange={(e) => set("note", e.target.value)}
            rows={3}
            placeholder="Cues, setup, grip…"
            className="w-full resize-none bg-transparent font-mono text-[14px] outline-none placeholder:text-[var(--faint)]"
          />
        </Field>
        <Field label="Link">
          <input
            value={ex.url}
            onChange={(e) => set("url", e.target.value)}
            placeholder="youtube.com/…"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            className="w-full bg-transparent font-mono text-[14px] outline-none placeholder:text-[var(--faint)]"
          />
        </Field>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block border-b-[1.5px] border-[var(--ink)] px-4 pb-3 pt-2">
      <span className="mb-1 block font-mono text-[10px] uppercase text-[var(--faint)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Stepper({
  label,
  value,
  onChange,
  max,
  divider,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
  divider?: boolean;
}) {
  const btn =
    "flex h-9 w-9 items-center justify-center border border-[#4a4d4a] text-[18px] active:bg-[var(--ink-2)]";
  return (
    <div
      className={"flex flex-col px-3 pb-3 pt-1.5 " + (divider ? "border-l border-[#4a4d4a]" : "")}
    >
      <span className="font-mono text-[9px] uppercase text-[var(--ink-muted)]">{label}</span>
      <span className="text-[26px] leading-[32px] tabular-nums">{value}</span>
      <span className="mt-1 flex gap-1.5">
        <button
          type="button"
          className={btn}
          onClick={() => onChange(Math.max(1, value - 1))}
          aria-label={`Less ${label}`}
        >
          −
        </button>
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
