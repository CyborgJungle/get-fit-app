/** Muscle groups shown on the body map (and stored per exercise). */
export const MUSCLES = [
  { id: "chest", label: "Chest" },
  { id: "shoulders", label: "Shoulders" },
  { id: "biceps", label: "Biceps" },
  { id: "triceps", label: "Triceps" },
  { id: "forearms", label: "Forearms" },
  { id: "abs", label: "Abs" },
  { id: "obliques", label: "Obliques" },
  { id: "traps", label: "Traps" },
  { id: "upperback", label: "Upper back" },
  { id: "lats", label: "Lats" },
  { id: "lowerback", label: "Lower back" },
  { id: "glutes", label: "Glutes" },
  { id: "quads", label: "Quads" },
  { id: "hamstrings", label: "Hamstrings" },
  { id: "adductors", label: "Adductors" },
  { id: "calves", label: "Calves" },
] as const;

export type Muscle = (typeof MUSCLES)[number]["id"];

const LABEL = new Map<string, string>(MUSCLES.map((m) => [m.id, m.label]));
export const muscleLabel = (id: string) => LABEL.get(id) ?? id;
