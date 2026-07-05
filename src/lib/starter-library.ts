import { supabase } from "@/integrations/supabase/client";
import { ensureAuth, type Category } from "@/lib/db";

type Seed = {
  name: string;
  category: Category;
  muscleGroup: string;
  defaultSets: number;
  defaultReps: number;
  defaultWeight: number;
};

// Weights map to WEIGHT_PRESETS: 6, 10.75, 15.5, 20.25, 25
export const STARTER_EXERCISES: Seed[] = [
  // Push · Chest / Shoulder / Triceps
  { name: "Flat Dumbbell Bench Press", category: "push", muscleGroup: "Chest", defaultSets: 3, defaultReps: 8, defaultWeight: 20.25 },
  { name: "Overhead Tricep Extension", category: "push", muscleGroup: "Triceps", defaultSets: 3, defaultReps: 10, defaultWeight: 15.5 },
  { name: "Incline Dumbbell Chest Press", category: "push", muscleGroup: "Chest", defaultSets: 3, defaultReps: 8, defaultWeight: 15.5 },
  { name: "Lateral Raises", category: "push", muscleGroup: "Shoulders", defaultSets: 3, defaultReps: 12, defaultWeight: 6 },
  { name: "Dips", category: "push", muscleGroup: "Triceps", defaultSets: 3, defaultReps: 15, defaultWeight: 6 },
  { name: "Chest Flies", category: "push", muscleGroup: "Chest", defaultSets: 3, defaultReps: 8, defaultWeight: 15.5 },
  { name: "Dumbbell Skull Crushers", category: "push", muscleGroup: "Triceps", defaultSets: 3, defaultReps: 9, defaultWeight: 10.75 },
  { name: "Dumbbell Shoulder Press", category: "push", muscleGroup: "Shoulders", defaultSets: 3, defaultReps: 10, defaultWeight: 10.75 },
  { name: "Plank Dumbbell Pull-Through", category: "push", muscleGroup: "Core", defaultSets: 3, defaultReps: 16, defaultWeight: 20.25 },

  // Pull · Back / Biceps / Rear Delts
  { name: "Single Arm Dumbbell Row", category: "pull", muscleGroup: "Back", defaultSets: 3, defaultReps: 10, defaultWeight: 10.75 },
  { name: "Bent-Over Dumbbell Row", category: "pull", muscleGroup: "Back", defaultSets: 3, defaultReps: 8, defaultWeight: 10.75 },
  { name: "Lateral Raises (full range)", category: "pull", muscleGroup: "Shoulders", defaultSets: 3, defaultReps: 12, defaultWeight: 10.75 },
  { name: "Preacher Curls", category: "pull", muscleGroup: "Biceps", defaultSets: 3, defaultReps: 12, defaultWeight: 10.75 },
  { name: "Lying Dumbbell Reverse Flies", category: "pull", muscleGroup: "Rear Delts", defaultSets: 3, defaultReps: 12, defaultWeight: 10.75 },
  { name: "Hammer Curls", category: "pull", muscleGroup: "Biceps", defaultSets: 3, defaultReps: 10, defaultWeight: 10.75 },
  { name: "Reverse Grip Dumbbell Row", category: "pull", muscleGroup: "Back", defaultSets: 3, defaultReps: 12, defaultWeight: 10.75 },
  { name: "Russian Twists", category: "pull", muscleGroup: "Core", defaultSets: 3, defaultReps: 15, defaultWeight: 10.75 },
  { name: "Dumbbell Thrusters", category: "pull", muscleGroup: "Full Body", defaultSets: 2, defaultReps: 16, defaultWeight: 10.75 },
  { name: "Farmer's Carry Hold", category: "pull", muscleGroup: "Forearms", defaultSets: 2, defaultReps: 45, defaultWeight: 15.5 },
  { name: "Shadow Boxing", category: "pull", muscleGroup: "Cardio", defaultSets: 2, defaultReps: 30, defaultWeight: 6 },
  { name: "Sit Up Weighted", category: "pull", muscleGroup: "Core", defaultSets: 3, defaultReps: 12, defaultWeight: 10.75 },

  // Legs · Legs / Glutes / Calves
  { name: "Weighted Squats (deep)", category: "legs", muscleGroup: "Quads", defaultSets: 3, defaultReps: 15, defaultWeight: 15.5 },
  { name: "Dumbbell Romanian Deadlifts", category: "legs", muscleGroup: "Hamstrings", defaultSets: 3, defaultReps: 12, defaultWeight: 25 },
  { name: "Dumbbell (Bulgarian) Split Squats", category: "legs", muscleGroup: "Quads", defaultSets: 3, defaultReps: 8, defaultWeight: 15.5 },
  { name: "Calf Raises", category: "legs", muscleGroup: "Calves", defaultSets: 3, defaultReps: 12, defaultWeight: 25 },
  { name: "Glutes Press", category: "legs", muscleGroup: "Glutes", defaultSets: 3, defaultReps: 15, defaultWeight: 25 },
  { name: "Dumbbell Sumo Squat", category: "legs", muscleGroup: "Glutes", defaultSets: 3, defaultReps: 15, defaultWeight: 20.25 },
  { name: "Dumbbell Straight Arm Sit-Ups", category: "legs", muscleGroup: "Core", defaultSets: 3, defaultReps: 15, defaultWeight: 15.5 },
  { name: "Plank", category: "legs", muscleGroup: "Core", defaultSets: 1, defaultReps: 110, defaultWeight: 6 },
  { name: "Goblet Squats", category: "legs", muscleGroup: "Quads", defaultSets: 3, defaultReps: 10, defaultWeight: 25 },
  { name: "Dumbbell Swings", category: "legs", muscleGroup: "Glutes", defaultSets: 3, defaultReps: 10, defaultWeight: 10.75 },
  { name: "Walking Lunges / Step Up", category: "legs", muscleGroup: "Legs", defaultSets: 3, defaultReps: 8, defaultWeight: 10.75 },
];

export async function seedStarterLibrary(): Promise<number> {
  const user_id = await ensureAuth();
  const rows = STARTER_EXERCISES.map((e) => ({
    user_id,
    name: e.name,
    category: e.category,
    muscle_group: e.muscleGroup,
    default_sets: e.defaultSets,
    default_reps: e.defaultReps,
    default_weight: e.defaultWeight,
  }));
  const { error } = await supabase.from("exercises").insert(rows);
  if (error) throw error;
  return rows.length;
}
