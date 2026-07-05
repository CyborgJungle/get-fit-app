import { useEffect, useState, useCallback } from "react";
import type { Category, Exercise } from "@/lib/db";

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

export type ActiveSession = {
  /** Row id in workout_sessions (Supabase) */
  dbId: string;
  startedAt: number;
  restSeconds: number;
  exercises: SessionExercise[];
};

const K_PROG = "kinetic.program.v1";
const K_ACTIVE = "kinetic.activeSession.v2";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setVal((prev) => {
        const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        write(key, v);
        return v;
      });
    },
    [key],
  );
  return [val, set] as const;
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

export function useActiveSession() {
  const [session, setSession] = useLocal<ActiveSession | null>(K_ACTIVE, null);
  return [session, setSession] as const;
}

export function useRestSeconds() {
  return useLocal<number>(K_REST, 90);
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
