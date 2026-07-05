import { useEffect, useState } from "react";
import { CATEGORIES, type Category, type Exercise, useExercises } from "@/lib/store";

type Props = {
  initial: Exercise | null;
  onClose: () => void;
  onDelete?: () => void;
};

const MUSCLE_SUGGESTIONS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
  "Forearms",
];

export function ExerciseFormDialog({ initial, onClose, onDelete }: Props) {
  const { add, update } = useExercises();
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "push");
  const [muscleGroup, setMuscleGroup] = useState(initial?.muscleGroup ?? "Chest");
  const [defaultSets, setDefaultSets] = useState(initial?.defaultSets ?? 4);
  const [defaultReps, setDefaultReps] = useState(initial?.defaultReps ?? 8);
  const [defaultWeight, setDefaultWeight] = useState(initial?.defaultWeight ?? 20);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      category,
      muscleGroup: muscleGroup.trim() || "—",
      defaultSets: Math.max(1, defaultSets),
      defaultReps: Math.max(1, defaultReps),
      defaultWeight: Math.max(0, defaultWeight),
    };
    if (isEdit && initial) update(initial.id, payload);
    else add(payload);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-background border border-primary/40 border-t-4 border-t-primary p-5 space-y-4"
      >
        <div className="flex justify-between items-end">
          <div>
            <span className="text-[10px] text-primary uppercase tracking-[0.2em] font-bold">
              {isEdit ? "Edit" : "New"}
            </span>
            <h2 className="text-3xl font-display uppercase leading-none">Exercise</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            Name
          </span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Incline Bench Press"
            className="w-full bg-transparent border border-border px-3 py-2 text-lg font-display uppercase outline-none focus:border-primary"
          />
        </label>

        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            Category
          </span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(c)}
                className={
                  "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border " +
                  (category === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground")
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            Muscle Group
          </span>
          <input
            list="muscle-list"
            value={muscleGroup}
            onChange={(e) => setMuscleGroup(e.target.value)}
            className="w-full bg-transparent border border-border px-3 py-2 outline-none focus:border-primary"
          />
          <datalist id="muscle-list">
            {MUSCLE_SUGGESTIONS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>

        <div className="grid grid-cols-3 gap-px bg-border border border-border">
          {(
            [
              ["Sets", defaultSets, setDefaultSets],
              ["Reps", defaultReps, setDefaultReps],
              ["Weight KG", defaultWeight, setDefaultWeight],
            ] as const
          ).map(([label, val, setter]) => (
            <div key={label} className="bg-background p-2 flex flex-col items-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                {label}
              </span>
              <input
                type="number"
                value={val}
                onChange={(e) => setter(Number(e.target.value) || 0)}
                className="w-full bg-transparent text-center text-2xl font-display outline-none focus:text-primary tabular-nums"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="h-12 px-4 border border-border text-muted-foreground hover:text-destructive hover:border-destructive font-display uppercase tracking-widest text-xs"
            >
              Delete
            </button>
          )}
          <button
            type="submit"
            className="flex-1 h-12 bg-primary text-primary-foreground font-display uppercase tracking-widest active:scale-[0.98]"
          >
            {isEdit ? "Save" : "Add to Library"}
          </button>
        </div>
      </form>
    </div>
  );
}
