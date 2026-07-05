import { useEffect, useState, useCallback } from "react";

export type Category = "push" | "pull" | "legs" | "mixed" | "core" | "cardio";
export const CATEGORIES: Category[] = ["push", "pull", "legs", "mixed", "core", "cardio"];

export type Exercise = {
  id: string;
  name: string;
  category: Category;
  muscleGroup: string;
  defaultSets: number;
  defaultReps: number;
  defaultWeight: number;
};

export type SessionExercise = {
  exerciseId: string;
  name: string;
  category: Category;
  muscleGroup: string;
  sets: number;
  reps: number;
  weight: number;
  completedSets: number;
};

export type Session = {
  id: string;
  startedAt: number;
  endedAt?: number;
  restSeconds: number;
  exercises: SessionExercise[];
};

const K_EX = "kinetic.exercises.v1";
const K_PROG = "kinetic.program.v1";
const K_ACTIVE = "kinetic.activeSession.v1";
const K_HIST = "kinetic.history.v1";
const K_REST = "kinetic.restSeconds.v1";

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
  window.localStorage.setItem(key, JSON.stringify(val));
  window.dispatchEvent(new CustomEvent("kinetic:store", { detail: { key } }));
}

function useLocal<T>(key: string, fallback: T) {
  const [val, setVal] = useState<T>(() => read(key, fallback));
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { key: string } | undefined;
      if (!detail || detail.key === key) setVal(read(key, fallback));
    };
    window.addEventListener("kinetic:store", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("kinetic:store", handler);
      window.removeEventListener("storage", handler);
    };
  }, [key]);
  const set = useCallback((next: T | ((prev: T) => T)) => {
    setVal((prev) => {
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      write(key, v);
      return v;
    });
  }, [key]);
  return [val, set] as const;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const SEED: Exercise[] = [
  { id: uid(), name: "Incline Bench Press", category: "push", muscleGroup: "Chest", defaultSets: 4, defaultReps: 8, defaultWeight: 60 },
  { id: uid(), name: "Weighted Pullups", category: "pull", muscleGroup: "Back", defaultSets: 4, defaultReps: 6, defaultWeight: 15 },
  { id: uid(), name: "Barbell Squats", category: "legs", muscleGroup: "Quads", defaultSets: 4, defaultReps: 8, defaultWeight: 100 },
  { id: uid(), name: "Lateral Raise", category: "push", muscleGroup: "Shoulders", defaultSets: 3, defaultReps: 12, defaultWeight: 12 },
  { id: uid(), name: "Barbell Row", category: "pull", muscleGroup: "Back", defaultSets: 4, defaultReps: 8, defaultWeight: 70 },
];

export function useExercises() {
  const [items, setItems] = useLocal<Exercise[]>(K_EX, SEED);
  const add = (e: Omit<Exercise, "id">) => setItems((p) => [...p, { ...e, id: uid() }]);
  const update = (id: string, patch: Partial<Exercise>) =>
    setItems((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const remove = (id: string) => setItems((p) => p.filter((x) => x.id !== id));
  return { items, add, update, remove };
}

export function useProgram() {
  const [ids, setIds] = useLocal<string[]>(K_PROG, []);
  const toggle = (id: string) =>
    setIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const clear = () => setIds([]);
  const move = (id: string, dir: -1 | 1) =>
    setIds((p) => {
      const i = p.indexOf(id);
      if (i < 0) return p;
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const c = [...p];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  return { ids, toggle, clear, move };
}

export function useHistory() {
  const [history, setHistory] = useLocal<Session[]>(K_HIST, []);
  const push = (s: Session) => setHistory((p) => [s, ...p].slice(0, 50));
  return { history, push };
}

export function useActiveSession() {
  const [session, setSession] = useLocal<Session | null>(K_ACTIVE, null);
  return [session, setSession] as const;
}

export function useRestSeconds() {
  return useLocal<number>(K_REST, 90);
}

/** Returns how many of the last 3 sessions this exercise appeared in (0..3). */
export function useRecentUsage(): Map<string, number> {
  const { history } = useHistory();
  const recent = history.slice(0, 3);
  const map = new Map<string, number>();
  recent.forEach((s) => {
    const seen = new Set<string>();
    s.exercises.forEach((e) => {
      if (seen.has(e.exerciseId)) return;
      seen.add(e.exerciseId);
      map.set(e.exerciseId, (map.get(e.exerciseId) ?? 0) + 1);
    });
  });
  return map;
}

export function makeSessionExercise(e: Exercise): SessionExercise {
  return {
    exerciseId: e.id,
    name: e.name,
    category: e.category,
    muscleGroup: e.muscleGroup,
    sets: e.defaultSets,
    reps: e.defaultReps,
    weight: e.defaultWeight,
    completedSets: 0,
  };
}

export const newId = uid;
