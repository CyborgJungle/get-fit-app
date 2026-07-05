import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

type ExerciseRow = {
  id: string;
  name: string;
  category: string;
  muscle_group: string;
  default_sets: number;
  default_reps: number;
  default_weight: number;
};

const toExercise = (r: ExerciseRow): Exercise => ({
  id: r.id,
  name: r.name,
  category: r.category as Category,
  muscleGroup: r.muscle_group,
  defaultSets: r.default_sets,
  defaultReps: r.default_reps,
  defaultWeight: Number(r.default_weight),
});

/** Ensures a signed-in (possibly anonymous) user exists. */
export async function ensureAuth(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id) return data.session.user.id;
  const { data: signIn, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return signIn.user!.id;
}

export function useExercises() {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: async (): Promise<Exercise[]> => {
      await ensureAuth();
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as ExerciseRow[]).map(toExercise);
    },
  });
}

export function useAddExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: Omit<Exercise, "id">) => {
      const user_id = await ensureAuth();
      const { error } = await supabase.from("exercises").insert({
        user_id,
        name: e.name,
        category: e.category,
        muscle_group: e.muscleGroup,
        default_sets: e.defaultSets,
        default_reps: e.defaultReps,
        default_weight: e.defaultWeight,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Exercise> }) => {
      const row: Record<string, unknown> = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.category !== undefined) row.category = patch.category;
      if (patch.muscleGroup !== undefined) row.muscle_group = patch.muscleGroup;
      if (patch.defaultSets !== undefined) row.default_sets = patch.defaultSets;
      if (patch.defaultReps !== undefined) row.default_reps = patch.defaultReps;
      if (patch.defaultWeight !== undefined) row.default_weight = patch.defaultWeight;
      row.updated_at = new Date().toISOString();
      const { error } = await supabase.from("exercises").update(row).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}

/**
 * Map of exercise id → how many of the last 3 finished sessions contained it.
 * Derived from set_logs so it survives across devices.
 */
export function useRecentUsage() {
  return useQuery({
    queryKey: ["recent-usage"],
    queryFn: async (): Promise<Map<string, number>> => {
      await ensureAuth();
      // Grab last 3 sessions that have logs
      const { data: sessions, error } = await supabase
        .from("workout_sessions")
        .select("id")
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      const ids = (sessions ?? []).map((s) => s.id);
      if (ids.length === 0) return new Map();
      const { data: logs, error: e2 } = await supabase
        .from("set_logs")
        .select("session_id, exercise_id")
        .in("session_id", ids);
      if (e2) throw e2;
      const map = new Map<string, number>();
      const perSession = new Map<string, Set<string>>();
      (logs ?? []).forEach((l) => {
        if (!l.exercise_id || !l.session_id) return;
        let seen = perSession.get(l.session_id);
        if (!seen) {
          seen = new Set();
          perSession.set(l.session_id, seen);
        }
        if (seen.has(l.exercise_id)) return;
        seen.add(l.exercise_id);
        map.set(l.exercise_id, (map.get(l.exercise_id) ?? 0) + 1);
      });
      return map;
    },
  });
}

export async function createWorkoutSession(restSeconds: number): Promise<string> {
  const user_id = await ensureAuth();
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({ user_id, rest_seconds: restSeconds })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function logSet(input: {
  sessionId: string;
  exerciseId: string | null;
  exerciseName: string;
  category: Category;
  muscleGroup: string;
  setNumber: number;
  reps: number;
  weight: number;
}) {
  const user_id = await ensureAuth();
  const { error } = await supabase.from("set_logs").insert({
    user_id,
    session_id: input.sessionId,
    exercise_id: input.exerciseId,
    exercise_name: input.exerciseName,
    category: input.category,
    muscle_group: input.muscleGroup,
    set_number: input.setNumber,
    reps: input.reps,
    weight: input.weight,
  });
  if (error) throw error;
}

export async function endWorkoutSession(sessionId: string) {
  const { error } = await supabase
    .from("workout_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function deleteWorkoutSession(sessionId: string) {
  await supabase.from("workout_sessions").delete().eq("id", sessionId);
}
