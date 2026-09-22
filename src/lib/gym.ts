import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  /** 1–5 dots */
  weight: number;
  note: string;
  url: string;
};

export type WorkoutItem = {
  id: string;
  name: string;
  reps: number;
  sets: number;
  weight: number;
  done: number;
};

export type Workout = {
  startedAt: number;
  items: WorkoutItem[];
  current: number;
  /** When set, the rest timer is running (or has run out) and ends at this epoch ms. */
  restEndsAt: number | null;
  finishedAt: number | null;
};

const K_EX = "gr.exercises.v1";
const K_WOD = "gr.wod.v1";
const K_WORKOUT = "gr.workout.v1";
const K_REST = "gr.rest.v1";
const K_IMPORTED = "gr.imported.v1";
const K_DAYS = "gr.days.v1";

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
  const clear = () => setIds([]);
  const replace = (next: string[]) => setIds(next);
  return { ids, add, remove, move, clear, replace };
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

export function markTrainedToday() {
  const today = dayKey(new Date());
  const days = read<string[]>(K_DAYS, []);
  if (!days.includes(today)) write(K_DAYS, [...days, today]);
}

export const REST_DEFAULT = 90;
export function useRestSeconds() {
  const [rest, setRest] = useLocal<number>(K_REST, REST_DEFAULT);
  return [rest, setRest] as const;
}

/** Old app stored weight in kg on this 5-step scale; map to 1–5 dots. */
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
      note: "",
      url: "",
    }));
    if (read<Exercise[]>(K_EX, []).length === 0 && imported.length) write(K_EX, imported);
    write(K_IMPORTED, true);
  } catch {
    /* offline: retry next launch */
  }
}

export function fmtDuration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
}
