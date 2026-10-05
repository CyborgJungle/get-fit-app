import type { DayLog, Exercise, Preset } from "@/lib/gym";
import type { Muscle } from "@/lib/muscles";

/**
 * One-time clean-up of an exercise library: gives every known exercise its
 * proper name in one style (Title Case, singular, equipment first), merges
 * doubles (also old spellings like "Bench press" vs "Flat Dumbbell Bench
 * Press") and adds the muscles each exercise trains to its notes.
 *
 * Presets, the WOD selection and saved calendar days follow the merge, so
 * nothing points at a removed double.
 */

type Entry = {
  name: string;
  /** Main target muscles, for the body map. */
  targets: Muscle[];
  /** Readable list for the notes. */
  muscles: string;
  /** Other ways the exercise has been written. Matched loosely (case, dashes, plurals, "dumbbell"). */
  aka?: string[];
};

export const CATALOG: Entry[] = [
  // Warm-up / bodyweight
  {
    name: "Push-Up",
    targets: ["chest", "shoulders", "triceps", "abs"],
    muscles: "chest, front delts, triceps, core",
    aka: ["Push up", "Pushup", "Press up"],
  },
  {
    name: "Bodyweight Squat",
    targets: ["quads", "glutes", "adductors"],
    muscles: "quads, glutes, adductors, core",
    aka: ["Air squat", "Squat (bodyweight)"],
  },
  {
    name: "Sit-Up",
    targets: ["abs", "obliques"],
    muscles: "abs, hip flexors, obliques",
    aka: ["Situp"],
  },
  {
    name: "Plank",
    targets: ["abs", "obliques", "shoulders"],
    muscles: "core (deep abs, abs, obliques), shoulders, glutes",
    aka: ["Front plank", "Forearm plank"],
  },
  {
    name: "Side Plank",
    targets: ["obliques", "abs"],
    muscles: "obliques, deep abs, glute med, shoulders",
  },
  {
    name: "Dragon Flag",
    targets: ["abs", "obliques"],
    muscles: "abs, hip flexors, lower back, lats (stabilising)",
  },
  { name: "Russian Twist", targets: ["obliques", "abs"], muscles: "obliques, abs, hip flexors" },
  { name: "Crunch", targets: ["abs"], muscles: "abs" },
  { name: "Bicycle Crunch", targets: ["abs", "obliques"], muscles: "abs, obliques, hip flexors" },
  {
    name: "Leg Raise",
    targets: ["abs"],
    muscles: "lower abs, hip flexors",
    aka: ["Lying leg raise"],
  },
  {
    name: "Mountain Climber",
    targets: ["abs", "shoulders", "quads"],
    muscles: "core, hip flexors, shoulders, quads",
  },
  {
    name: "Burpee",
    targets: ["chest", "shoulders", "triceps", "abs", "quads", "glutes"],
    muscles: "full body: quads, glutes, chest, shoulders, triceps, core",
  },
  {
    name: "Jumping Jack",
    targets: ["shoulders", "glutes", "calves"],
    muscles: "calves, glutes, hip abductors, shoulders (cardio)",
  },
  {
    name: "Shadow Boxing",
    targets: ["shoulders", "abs", "obliques"],
    muscles: "shoulders, core, obliques, calves (cardio)",
  },
  {
    name: "Superman",
    targets: ["lowerback", "glutes", "hamstrings"],
    muscles: "lower back, glutes, hamstrings, rear delts",
  },
  {
    name: "Bird Dog",
    targets: ["lowerback", "abs", "glutes"],
    muscles: "lower back, deep abs, glutes, shoulders",
  },
  { name: "Wall Sit", targets: ["quads", "glutes"], muscles: "quads, glutes, adductors" },
  {
    name: "Triceps Dip",
    targets: ["triceps", "chest", "shoulders"],
    muscles: "triceps, chest, front delts",
    aka: ["Dip", "Bench dip", "Chair dip", "Tricep dip"],
  },
  {
    name: "Pull-Up",
    targets: ["lats", "biceps", "upperback"],
    muscles: "lats, biceps, mid traps, rhomboids, rear delts",
    aka: ["Pullup"],
  },
  {
    name: "Chin-Up",
    targets: ["lats", "biceps"],
    muscles: "lats, biceps, brachialis, mid traps",
    aka: ["Chinup"],
  },

  // Chest
  {
    name: "Dumbbell Bench Press",
    targets: ["chest", "shoulders", "triceps"],
    muscles: "chest, front delts, triceps",
    aka: [
      "Flat dumbbell bench press",
      "Bench press",
      "Flat bench press",
      "Chest press",
      "Flat dumbbell chest press",
    ],
  },
  {
    name: "Incline Dumbbell Bench Press",
    targets: ["chest", "shoulders", "triceps"],
    muscles: "upper chest, front delts, triceps",
    aka: [
      "Incline dumbbell chest press",
      "Incline bench press",
      "Incline chest press",
      "Incline press",
    ],
  },
  {
    name: "Dumbbell Floor Press",
    targets: ["chest", "triceps"],
    muscles: "chest, triceps, front delts",
    aka: ["Floor press"],
  },
  {
    name: "Dumbbell Chest Fly",
    targets: ["chest", "shoulders"],
    muscles: "chest, front delts",
    aka: ["Chest flies", "Chest fly", "Dumbbell fly", "Flat dumbbell fly", "Flies"],
  },
  {
    name: "Dumbbell Pullover",
    targets: ["lats", "chest", "triceps"],
    muscles: "lats, chest, triceps (long head), serratus",
    aka: ["Pullover", "Pull over"],
  },

  // Shoulders
  {
    name: "Dumbbell Shoulder Press",
    targets: ["shoulders", "triceps", "traps"],
    muscles: "front and side delts, triceps, upper traps",
    aka: [
      "Shoulder press",
      "Overhead press",
      "Dumbbell overhead press",
      "Military press",
      "Seated shoulder press",
    ],
  },
  {
    name: "Arnold Press",
    targets: ["shoulders", "triceps"],
    muscles: "front and side delts, triceps, upper chest",
  },
  {
    name: "Dumbbell Lateral Raise",
    targets: ["shoulders", "traps"],
    muscles: "side delts, upper traps",
    aka: ["Lateral raise", "Side raise", "Side lateral raise"],
  },
  {
    name: "Full-Range Lateral Raise",
    targets: ["shoulders", "traps"],
    muscles: "side delts, upper traps, front delts",
    aka: ["Lateral raises (full range)", "Lateral raise full range", "Full range lateral raise"],
  },
  {
    name: "Dumbbell Front Raise",
    targets: ["shoulders", "chest"],
    muscles: "front delts, upper chest",
    aka: ["Front raise"],
  },
  {
    name: "Lying Dumbbell Reverse Fly",
    targets: ["shoulders", "upperback", "traps"],
    muscles: "rear delts, rhomboids, mid traps",
    aka: [
      "Reverse fly",
      "Reverse flies",
      "Lying reverse fly",
      "Rear delt fly",
      "Bent-over reverse fly",
      "Prone reverse fly",
    ],
  },
  { name: "Dumbbell Shrug", targets: ["traps"], muscles: "upper traps", aka: ["Shrug", "Shrugs"] },
  {
    name: "Dumbbell Upright Row",
    targets: ["shoulders", "traps", "biceps"],
    muscles: "side delts, upper traps, biceps",
    aka: ["Upright row"],
  },

  // Triceps
  {
    name: "Dumbbell Overhead Triceps Extension",
    targets: ["triceps"],
    muscles: "triceps (long head)",
    aka: [
      "Overhead tricep extension",
      "Overhead triceps extension",
      "Tricep extension",
      "Triceps extension",
    ],
  },
  {
    name: "Dumbbell Skull Crusher",
    targets: ["triceps"],
    muscles: "triceps",
    aka: ["Skull crusher", "Skullcrusher", "Lying triceps extension", "Lying tricep extension"],
  },
  {
    name: "Dumbbell Triceps Kickback",
    targets: ["triceps"],
    muscles: "triceps",
    aka: ["Tricep kickback", "Triceps kickback", "Kickback"],
  },
  {
    name: "Close-Grip Dumbbell Press",
    targets: ["triceps", "chest"],
    muscles: "triceps, chest, front delts",
    aka: ["Close grip press"],
  },

  // Back
  {
    name: "Single-Arm Dumbbell Row",
    targets: ["lats", "upperback", "biceps"],
    muscles: "lats, rhomboids, mid traps, rear delts, biceps",
    aka: ["One arm row", "One-arm dumbbell row", "Single arm row", "Single arm dumbbell row"],
  },
  {
    name: "Dumbbell Bent-Over Row",
    targets: ["lats", "upperback", "biceps", "lowerback"],
    muscles: "lats, rhomboids, mid traps, rear delts, biceps, lower back",
    aka: ["Bent over dumbbell row", "Bent over row", "Bent-over row", "Dumbbell row"],
  },
  {
    name: "Reverse-Grip Dumbbell Row",
    targets: ["lats", "upperback", "biceps"],
    muscles: "lats, rhomboids, biceps, rear delts, mid traps",
    aka: ["Reverse grip row", "Underhand dumbbell row", "Underhand row", "Supinated row"],
  },
  {
    name: "Renegade Row",
    targets: ["lats", "upperback", "abs", "triceps"],
    muscles: "lats, rhomboids, core, chest, triceps",
    aka: ["Dumbbell renegade row"],
  },
  {
    name: "Dumbbell Plank Pull-Through",
    targets: ["abs", "obliques", "shoulders"],
    muscles: "core (abs, obliques), shoulders, lats",
    aka: ["Plank dumbbell pull through", "Plank pull through", "Plank pull-through"],
  },

  // Biceps / forearms
  {
    name: "Dumbbell Biceps Curl",
    targets: ["biceps", "forearms"],
    muscles: "biceps, brachialis, forearms",
    aka: ["Bicep curl", "Biceps curl", "Curl", "Dumbbell curl", "Standing curl"],
  },
  {
    name: "Dumbbell Hammer Curl",
    targets: ["biceps", "forearms"],
    muscles: "brachialis, brachioradialis, biceps",
    aka: ["Hammer curl"],
  },
  {
    name: "Dumbbell Preacher Curl",
    targets: ["biceps"],
    muscles: "biceps (short head), brachialis",
    aka: ["Preacher curl"],
  },
  {
    name: "Concentration Curl",
    targets: ["biceps"],
    muscles: "biceps (peak), brachialis",
    aka: ["Dumbbell concentration curl"],
  },
  {
    name: "Zottman Curl",
    targets: ["biceps", "forearms"],
    muscles: "biceps, brachioradialis, forearm extensors",
  },
  {
    name: "Hammer Curl + Shoulder Press",
    targets: ["biceps", "forearms", "shoulders", "triceps"],
    muscles: "brachialis, biceps, brachioradialis, front and side delts, triceps",
    aka: [
      "Hammer curls + shoulder press",
      "Hammer curl and shoulder press",
      "Hammer curl to press",
      "Hammer curl shoulder press",
    ],
  },
  {
    name: "Farmer's Carry",
    targets: ["forearms", "traps", "abs"],
    muscles: "forearms (grip), upper traps, core, glutes",
    aka: [
      "Farmer's carry hold",
      "Farmers carry",
      "Farmer carry",
      "Farmer's walk",
      "Farmers walk",
      "Farmer's hold",
      "Farmers hold",
    ],
  },
  {
    name: "Wrist Curl",
    targets: ["forearms"],
    muscles: "forearm flexors",
    aka: ["Dumbbell wrist curl"],
  },

  // Legs / glutes
  {
    name: "Goblet Squat",
    targets: ["quads", "glutes", "adductors", "abs"],
    muscles: "quads, glutes, adductors, core, upper back",
    aka: ["Dumbbell goblet squat"],
  },
  {
    name: "Deep Dumbbell Squat",
    targets: ["quads", "glutes", "adductors", "hamstrings"],
    muscles: "quads, glutes, adductors, hamstrings",
    aka: ["Deep weighted squat", "Weighted squat", "Deep squat"],
  },
  {
    name: "Dumbbell Sumo Squat",
    targets: ["adductors", "glutes", "quads"],
    muscles: "adductors, glutes, quads",
    aka: ["Sumo squat", "Plié squat", "Plie squat"],
  },
  {
    name: "Dumbbell Bulgarian Split Squat",
    targets: ["quads", "glutes", "adductors"],
    muscles: "quads, glutes, adductors, hamstrings",
    aka: ["Bulgarian split squat", "Rear foot elevated split squat"],
  },
  {
    name: "Dumbbell Split Squat",
    targets: ["quads", "glutes"],
    muscles: "quads, glutes, adductors",
    aka: ["Split squat"],
  },
  {
    name: "Dumbbell Romanian Deadlift",
    targets: ["hamstrings", "glutes", "lowerback"],
    muscles: "hamstrings, glutes, lower back",
    aka: [
      "Romanian deadlift",
      "RDL",
      "Dumbbell RDL",
      "Stiff leg deadlift",
      "Stiff-legged deadlift",
    ],
  },
  {
    name: "Dumbbell Deadlift",
    targets: ["glutes", "hamstrings", "quads", "lowerback", "traps"],
    muscles: "glutes, hamstrings, quads, lower back, traps",
    aka: ["Deadlift"],
  },
  {
    name: "Single-Leg Romanian Deadlift",
    targets: ["hamstrings", "glutes", "lowerback"],
    muscles: "hamstrings, glutes, glute med, lower back",
    aka: ["Single leg deadlift", "Single leg RDL", "One leg deadlift"],
  },
  {
    name: "Walking Lunge / Step-Up",
    targets: ["quads", "glutes", "hamstrings"],
    muscles: "quads, glutes, hamstrings, adductors",
    aka: [
      "Walking lunges / step-ups",
      "Walking lunges/step-ups",
      "Walking lunge or step up",
      "Lunges / step ups",
    ],
  },
  {
    name: "Walking Lunge",
    targets: ["quads", "glutes", "hamstrings", "adductors"],
    muscles: "quads, glutes, hamstrings, adductors",
    aka: ["Walking lunges", "Dumbbell walking lunge"],
  },
  {
    name: "Reverse Lunge",
    targets: ["glutes", "quads", "hamstrings"],
    muscles: "glutes, quads, hamstrings",
    aka: ["Dumbbell reverse lunge"],
  },
  {
    name: "Lunge",
    targets: ["quads", "glutes", "hamstrings"],
    muscles: "quads, glutes, hamstrings, adductors",
    aka: ["Dumbbell lunge", "Forward lunge"],
  },
  {
    name: "Step-Up",
    targets: ["quads", "glutes"],
    muscles: "quads, glutes, hamstrings",
    aka: ["Dumbbell step up", "Step ups", "Box step up"],
  },
  {
    name: "Dumbbell Hip Thrust",
    targets: ["glutes", "hamstrings"],
    muscles: "glutes, hamstrings",
    aka: ["Glute press", "Hip thrust", "Glute thrust"],
  },
  {
    name: "Glute Bridge",
    targets: ["glutes", "hamstrings"],
    muscles: "glutes, hamstrings",
    aka: ["Dumbbell glute bridge", "Bridge", "Hip bridge"],
  },
  {
    name: "Dumbbell Calf Raise",
    targets: ["calves"],
    muscles: "calves (gastrocnemius, soleus)",
    aka: ["Calf raise", "Standing calf raise"],
  },
  {
    name: "Dumbbell Swing",
    targets: ["glutes", "hamstrings", "lowerback", "shoulders"],
    muscles: "glutes, hamstrings, lower back, core, shoulders",
    aka: ["Dumbbell swings", "Swing", "Kettlebell swing"],
  },
  {
    name: "Dumbbell Thruster",
    targets: ["quads", "glutes", "shoulders", "triceps"],
    muscles: "quads, glutes, shoulders, triceps, core",
    aka: ["Thruster", "Squat to press"],
  },

  // Core with weight
  {
    name: "Dumbbell Straight-Arm Sit-Up",
    targets: ["abs", "shoulders"],
    muscles: "abs, hip flexors, front delts (holding)",
    aka: ["Straight arm sit up", "Dumbbell straight arm situp", "Weighted sit up"],
  },
  {
    name: "Dumbbell Side Bend",
    targets: ["obliques"],
    muscles: "obliques, quadratus lumborum",
    aka: ["Side bend", "Side bends"],
  },
];

const DROP = new Set(["dumbbell", "dumbbells", "db", "the", "a", "with"]);

/** Loose key: case, dashes, spacing, plurals and "dumbbell" don't matter. */
export function looseKey(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/é/g, "e")
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !DROP.has(w))
    .map((w) =>
      w.endsWith("ies") && w.length > 4
        ? w.slice(0, -3) + "y"
        : w.length > 2 && w.endsWith("s") && !w.endsWith("ss")
          ? w.slice(0, -1)
          : w,
    )
    .join("");
}

const BY_KEY = new Map<string, Entry>();
for (const e of CATALOG) {
  for (const n of [e.name, ...(e.aka ?? [])]) {
    const k = looseKey(n);
    if (!BY_KEY.has(k)) BY_KEY.set(k, e);
  }
}

export const findEntry = (name: string) => BY_KEY.get(looseKey(name));

/** Main target muscles for a known exercise name (empty when unknown). */
export const targetsFor = (name: string): Muscle[] => findEntry(name)?.targets ?? [];

/** Same exercise? Same name loosely, or two names of one known exercise. */
export function sameExercise(a: string, b: string) {
  const ka = looseKey(a);
  if (!ka) return false;
  if (ka === looseKey(b)) return true;
  const ea = findEntry(a);
  return !!ea && ea === findEntry(b);
}

/** Unknown names keep their words, in Title Case with tidy spacing. */
export function titleCase(name: string) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/(^|[\s\-/(+])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase());
}

export const MUSCLES_PREFIX = "Muscles:";

/** Note with a "Muscles: …" first line (replacing an older one), the rest kept. */
export function withMuscles(note: string, muscles: string) {
  const rest = note
    .split("\n")
    .filter((l) => !l.trim().startsWith(MUSCLES_PREFIX))
    .join("\n")
    .trim();
  return `${MUSCLES_PREFIX} ${muscles}.${rest ? `\n${rest}` : ""}`;
}

export type TidyResult = {
  exercises: Exercise[];
  presets: Preset[];
  wod: string[];
  logs: Record<string, DayLog>;
  /** old id → id it was merged into */
  merged: Record<string, string>;
};

export function tidyLibrary(
  list: Exercise[],
  presets: Preset[],
  wod: string[],
  logs: Record<string, DayLog>,
): TidyResult {
  const out: Exercise[] = [];
  const byName = new Map<string, Exercise>();
  const merged: Record<string, string> = {};
  const nameOf = new Map<string, string>();

  for (const ex of list) {
    const entry = findEntry(ex.name);
    const name = entry ? entry.name : titleCase(ex.name);
    const key = entry ? `#${entry.name}` : looseKey(name) || name;
    const note = entry ? withMuscles(ex.note ?? "", entry.muscles) : (ex.note ?? "").trim();
    const keep = byName.get(key);
    if (!keep) {
      const next: Exercise = { ...ex, name, note };
      byName.set(key, next);
      out.push(next);
      nameOf.set(ex.id, name);
      continue;
    }
    // A double: fold it into the first one, keeping anything the first lacks.
    merged[ex.id] = keep.id;
    nameOf.set(ex.id, keep.name);
    keep.tags = Array.from(new Set([...(keep.tags ?? []), ...(ex.tags ?? [])]));
    if (!keep.url && ex.url) keep.url = ex.url;
    if (!keep.kg && ex.kg) keep.kg = ex.kg;
    const extra = (entry ? withMuscles(ex.note ?? "", entry.muscles) : (ex.note ?? ""))
      .split("\n")
      .filter((l) => l.trim() && !keep.note.includes(l.trim()));
    if (extra.length) keep.note = [keep.note, ...extra].filter(Boolean).join("\n");
  }

  const remap = (ids: string[]) => Array.from(new Set(ids.map((id) => merged[id] ?? id)));

  const nextLogs: Record<string, DayLog> = {};
  for (const [day, log] of Object.entries(logs)) {
    nextLogs[day] = {
      ...log,
      items: log.items.map((it) => ({
        ...it,
        id: merged[it.id] ?? it.id,
        name: nameOf.get(it.id) ?? it.name,
      })),
    };
  }

  return {
    exercises: out,
    presets: presets.map((p) => ({ ...p, ids: remap(p.ids) })),
    wod: remap(wod),
    logs: nextLogs,
    merged,
  };
}
