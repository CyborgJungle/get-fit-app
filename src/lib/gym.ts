import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LIBRARY } from "@/lib/library";
import { tidyLibrary } from "@/lib/tidy";

/**
 * All app state lives on the device (localStorage). The phone is the single
 * source of truth; on first launch we import any exercises from the previous
 * version of the app (Supabase, anonymous per-device user).
 */

export type Exercise = {
  id: string;
  name: string;
  reps: number;
  sets: number;
  /** 0–5 dots */
  weight: number;
  /** Weight in kg, used when the weight unit setting is "kg". */
  kg?: number;
  /** Group tags, stored lowercase (e.g. "legs"). */
  tags?: string[];
  note: string;
  url: string;
};

export type WorkoutItem = {
  id: string;
  name: string;
  reps: number;
  sets: number;
  weight: number;
  kg?: number;
  done: number;
};

export type Workout = {
  startedAt: number;
  items: WorkoutItem[];
  current: number;
  /** When set, the rest timer is running (or has run out) and ends at this epoch ms. */
  restEndsAt: number | null;
  finishedAt: number | null;
  /** Names of the presets used to build this workout. */
  presets?: string[];
};

const K_EX = "gr.exercises.v1";
const K_WOD = "gr.wod.v1";
const K_WORKOUT = "gr.workout.v1";
const K_REST = "gr.rest.v1";
const K_IMPORTED = "gr.imported.v1";
const K_DAYS = "gr.days.v1";
const K_UNIT = "gr.weightUnit.v1";
const K_GROUP = "gr.groupByTag.v1";
const K_PRESETS = "gr.presets.v1";
const K_LOG = "gr.dayLog.v1";
const K_WOD_PRESETS = "gr.wodPresets.v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* storage full / blocked */
  }
  window.dispatchEvent(new CustomEvent("gr:store", { detail: { key } }));
}

function useLocal<T>(key: string, fallback: T) {
  // Start from the fallback so SSR and first client render match; hydrate after mount.
  const [val, setVal] = useState<T>(fallback);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setVal(read(key, fallback));
    setReady(true);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { key: string } | undefined;
      if (!detail || detail.key === key) setVal(read(key, fallback));
    };
    window.addEventListener("gr:store", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("gr:store", handler);
      window.removeEventListener("storage", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = read(key, fallback);
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      write(key, v);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return [val, set, ready] as const;
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function useExercises() {
  const [list, setList, ready] = useLocal<Exercise[]>(K_EX, []);
  const save = (e: Exercise) =>
    setList((p) =>
      p.some((x) => x.id === e.id) ? p.map((x) => (x.id === e.id ? e : x)) : [...p, e],
    );
  const remove = (id: string) => setList((p) => p.filter((x) => x.id !== id));
  return { list, save, remove, ready };
}

export function useWod() {
  const [ids, setIds] = useLocal<string[]>(K_WOD, []);
  const add = (more: string[]) => setIds((p) => [...p, ...more.filter((id) => !p.includes(id))]);
  const remove = (id: string) => setIds((p) => p.filter((x) => x !== id));
  const move = (id: string, dir: -1 | 1) =>
    setIds((p) => {
      const i = p.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= p.length) return p;
      const c = [...p];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  // Presets picked for the current WOD selection.
  const [presetIds, setPresetIds] = useLocal<string[]>(K_WOD_PRESETS, []);
  const clear = () => {
    setIds([]);
    setPresetIds([]);
  };
  const replace = (next: string[], presets: string[] = []) => {
    setIds(next);
    setPresetIds(presets);
  };
  return { ids, presetIds, add, remove, move, clear, replace };
}

export function useWorkout() {
  return useLocal<Workout | null>(K_WORKOUT, null);
}

/** Local-date key, e.g. 2026-09-22. */
export function dayKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Days on which a workout was finished (not ended early). */
export function useTrainedDays() {
  const [days] = useLocal<string[]>(K_DAYS, []);
  return days;
}

/** What was done on a finished workout day (latest workout of that day wins). */
export type DayLog = {
  finishedAt: number;
  durationMs: number;
  items: WorkoutItem[];
  presets?: string[];
};

export function useDayLogs() {
  const [logs] = useLocal<Record<string, DayLog>>(K_LOG, {});
  return logs;
}

/** Called when a workout is finished: dot today and save (or replace) its log. */
export function markTrainedToday(workout?: Workout) {
  const today = dayKey(new Date());
  const days = read<string[]>(K_DAYS, []);
  if (!days.includes(today)) write(K_DAYS, [...days, today]);
  if (workout) {
    const now = Date.now();
    const logs = read<Record<string, DayLog>>(K_LOG, {});
    write(K_LOG, {
      ...logs,
      [today]: {
        finishedAt: now,
        durationMs: now - workout.startedAt,
        items: workout.items,
        presets: workout.presets ?? [],
      },
    });
  }
}

/** Add or remove a day's dot by hand (calendar edit mode). */
export function toggleTrainedDay(key: string) {
  const days = read<string[]>(K_DAYS, []);
  if (days.includes(key)) {
    write(
      K_DAYS,
      days.filter((d) => d !== key),
    );
    // Removing the dot also drops that day's saved workout.
    const logs = read<Record<string, DayLog>>(K_LOG, {});
    if (logs[key]) {
      const rest = { ...logs };
      delete rest[key];
      write(K_LOG, rest);
    }
  } else {
    // Manual dots don't save a workout list.
    write(K_DAYS, [...days, key]);
  }
}

/** Saved exercise selections (max 5), picked in the WOD selector. */
export type Preset = { id: string; name: string; ids: string[] };
export const MAX_PRESETS = 5;

/** Preset ids whose (still existing, not locked) exercises are all selected. */
export function activePresetIds(
  presets: Preset[],
  selected: string[],
  existing: Set<string>,
  locked: string[] = [],
) {
  return presets
    .filter((p) => {
      const ids = p.ids.filter((id) => existing.has(id) && !locked.includes(id));
      return ids.length > 0 && ids.every((id) => selected.includes(id));
    })
    .map((p) => p.id);
}

export function usePresets() {
  const [presets, setPresets] = useLocal<Preset[]>(K_PRESETS, []);
  const save = (p: Preset) =>
    setPresets((all) =>
      all.some((x) => x.id === p.id)
        ? all.map((x) => (x.id === p.id ? p : x))
        : [...all, p].slice(0, MAX_PRESETS),
    );
  const remove = (id: string) => setPresets((all) => all.filter((x) => x.id !== id));
  return { presets, save, remove };
}

/** Search match on name, group tags or note (q already lowercased). */
export const matchesQuery = (e: { name: string; note?: string; tags?: string[] }, q: string) =>
  [e.name, e.note, ...(e.tags ?? [])].some((t) => t?.toLowerCase().includes(q));

/** Normalise a typed tag: trimmed, single spaces, lowercase. */
export const cleanTag = (t: string) => t.trim().replace(/\s+/g, " ").toLowerCase();

/** Whether the Exercises page groups cards by tag. */
export function useGroupByTag() {
  return useLocal<boolean>(K_GROUP, false);
}

/** Background colour themes (same muted tint, only the paper colour changes). */
export const BACKGROUNDS = [
  { id: "sage", label: "Sage", color: "#bcc8be" },
  { id: "cream", label: "Creamy white", color: "#ebe5d8" },
  { id: "pink", label: "Muted pink", color: "#dcc4c1" },
  { id: "orange", label: "Muted orange", color: "#e1c7ab" },
] as const;
export type Background = (typeof BACKGROUNDS)[number]["id"];
export const K_BG = "gr.background.v1";

export function applyBackground(bg: string) {
  if (typeof document === "undefined") return;
  const found = BACKGROUNDS.find((b) => b.id === bg) ?? BACKGROUNDS[0];
  document.documentElement.dataset.bg = found.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", found.color);
}

export function useBackground() {
  const [bg, setBgRaw] = useLocal<Background>(K_BG, "sage");
  const setBg = (b: Background) => {
    setBgRaw(b);
    applyBackground(b);
  };
  return [bg, setBg] as const;
}

export type WeightUnit = "dots" | "kg";
export function useWeightUnit() {
  const [unit, setUnit] = useLocal<WeightUnit>(K_UNIT, "dots");
  return [unit, setUnit] as const;
}

export const fmtKg = (n: number) => String(Math.round(n * 100) / 100);

export const REST_DEFAULT = 90;
export function useRestSeconds() {
  const [rest, setRest] = useLocal<number>(K_REST, REST_DEFAULT);
  return [rest, setRest] as const;
}

/** Old app stored weight in kg on this 5-step scale; map to 1–5 dots (and keep the kg). */
const OLD_WEIGHTS = [6, 10.75, 15.5, 20.25, 25];
function kgToDots(kg: number) {
  let best = 0;
  OLD_WEIGHTS.forEach((w, i) => {
    if (Math.abs(w - kg) < Math.abs(OLD_WEIGHTS[best] - kg)) best = i;
  });
  return best + 1;
}

/** One-time import of exercises saved by the previous version of the app. */
export async function importLegacyExercises() {
  if (typeof window === "undefined" || read(K_IMPORTED, false)) return;
  if (read<Exercise[]>(K_EX, []).length > 0) {
    write(K_IMPORTED, true);
    return;
  }
  try {
    const { data: s } = await supabase.auth.getSession();
    // Only import when this device already has a user from the old app.
    if (!s.session) {
      write(K_IMPORTED, true);
      return;
    }
    const { data, error } = await supabase
      .from("exercises")
      .select("id,name,default_sets,default_reps,default_weight")
      .order("created_at", { ascending: true });
    if (error) return; // try again next launch
    const imported: Exercise[] = (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      reps: r.default_reps,
      sets: r.default_sets,
      weight: kgToDots(Number(r.default_weight)),
      kg: Number(r.default_weight),
      note: "",
      url: "",
    }));
    if (read<Exercise[]>(K_EX, []).length === 0 && imported.length) write(K_EX, imported);
    write(K_IMPORTED, true);
  } catch {
    /* offline: retry next launch */
  }
}

/** Everything that belongs to a person and is synced to their account. */
export const SYNC_KEYS = [
  K_EX,
  K_PRESETS,
  K_DAYS,
  K_LOG,
  K_REST,
  K_UNIT,
  K_GROUP,
  "gr.background.v1",
  K_WOD,
  K_WOD_PRESETS,
] as const;

/** Snapshot of all synced keys (raw JSON values). */
export function exportState(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of SYNC_KEYS) {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(k) : null;
    if (raw !== null) {
      try {
        out[k] = JSON.parse(raw);
      } catch {
        /* skip */
      }
    }
  }
  return out;
}

/** Replace all synced keys with the given snapshot (missing keys are cleared). */
export function importState(data: Record<string, unknown>, keys: readonly string[] = SYNC_KEYS) {
  for (const k of keys) {
    if (k in data) write(k, data[k]);
    else {
      try {
        window.localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent("gr:store", { detail: { key: k } }));
    }
  }
  const bg = data["gr.background.v1"];
  applyBackground(typeof bg === "string" ? bg : "sage");
}

/** The one example exercise a brand-new account starts with. */
export const exampleExercise = (): Exercise => ({
  id: uid(),
  name: "Push-Ups",
  reps: 10,
  sets: 3,
  weight: 0,
  kg: 0,
  tags: ["example"],
  note: "Muscles: chest, front delts, triceps, core.\nExample exercise. Tap Edit to change it, or + Add to create your own.",
  url: "",
});

/** Loose name key so "Push up" and "Push-Ups" count as the same exercise. */
const nameKey = (n: string) =>
  n
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((w) => (w.length > 2 && w.endsWith("s") ? w.slice(0, -1) : w))
    .join("");

const K_SEEDED = "gr.library.v1";

/**
 * One-time import of Tim's exercise library on a phone that already has
 * exercises. Skips exercises already there (same name, loosely matched) but
 * adds the library's groups to them. Fresh phones get one example instead.
 */
export function seedLibrary() {
  if (typeof window === "undefined" || read(K_SEEDED, false)) return;
  const list = read<Exercise[]>(K_EX, []);
  // A fresh phone (new person) starts with one example instead of Tim's library.
  if (list.length === 0) {
    write(K_EX, [exampleExercise()]);
    write(K_SEEDED, true);
    return;
  }
  const byKey = new Map(list.map((e) => [nameKey(e.name), e]));
  const next = [...list];
  for (const l of LIBRARY) {
    const have = byKey.get(nameKey(l.name));
    if (have) {
      have.tags = Array.from(new Set([...(have.tags ?? []), ...l.tags]));
      continue;
    }
    const ex: Exercise = {
      id: uid(),
      name: l.name,
      reps: l.reps,
      sets: l.sets,
      weight: l.weight,
      kg: 0,
      tags: l.tags,
      note: l.note ?? "",
      url: "",
    };
    next.push(ex);
    byKey.set(nameKey(l.name), ex);
  }
  write(K_EX, next);
  write(K_SEEDED, true);
}

const K_TIDY = "gr.tidy.v1";

/**
 * Run the exercise clean-up (proper names, doubles merged, muscles in the
 * notes; see tidy.ts) once on this phone. Only writes what actually changed,
 * so a phone that already has the cleaned data from the account changes nothing.
 */
export function tidyOnce() {
  if (typeof window === "undefined" || read(K_TIDY, false)) return;
  const ex = read<Exercise[]>(K_EX, []);
  const presets = read<Preset[]>(K_PRESETS, []);
  const wod = read<string[]>(K_WOD, []);
  const logs = read<Record<string, DayLog>>(K_LOG, {});
  const r = tidyLibrary(ex, presets, wod, logs);
  const writeIfChanged = (k: string, was: unknown, now: unknown) => {
    if (JSON.stringify(was) !== JSON.stringify(now)) write(k, now);
  };
  writeIfChanged(K_EX, ex, r.exercises);
  writeIfChanged(K_PRESETS, presets, r.presets);
  writeIfChanged(K_WOD, wod, r.wod);
  writeIfChanged(K_LOG, logs, r.logs);
  write(K_TIDY, true);
}

export function fmtDuration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
}

/** Tags A–Z (an exercise with several tags shows in each), untagged last. */
export function groupByTag<T extends { tags?: string[] }>(list: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const ex of list) {
    const tags = ex.tags?.length ? ex.tags : [""];
    for (const t of tags) map.set(t, [...(map.get(t) ?? []), ex]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
    .map(([t, items]) => [t || "No group", items]);
}
