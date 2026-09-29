/**
 * Tim's exercise library, imported once into the app. Weights are in dots
 * (⚡ count from the original tables; a feather = 0). Exercises that appeared
 * in several tables are listed once with all their groups; the values are
 * from the first table they appeared in.
 */
export type LibraryExercise = {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  tags: string[];
  note?: string;
};

export const LIBRARY: LibraryExercise[] = [
  // Warm-up
  { name: "Push-Ups", sets: 5, reps: 10, weight: 0, tags: ["warm-up"] },
  { name: "Bodyweight Squats", sets: 5, reps: 15, weight: 0, tags: ["warm-up"] },
  { name: "Sit-Ups", sets: 5, reps: 10, weight: 0, tags: ["warm-up"] },

  // Push: chest / shoulders / triceps
  { name: "Flat Dumbbell Bench Press", sets: 3, reps: 8, weight: 3, tags: ["push", "full body"] },
  {
    name: "Overhead Tricep Extension",
    sets: 3,
    reps: 10,
    weight: 2,
    tags: ["push", "full body"],
  },
  { name: "Incline Dumbbell Chest Press", sets: 3, reps: 8, weight: 3, tags: ["push"] },
  { name: "Lateral Raises", sets: 3, reps: 8, weight: 1, tags: ["push"] },
  { name: "Dips", sets: 3, reps: 15, weight: 0, tags: ["push"] },
  { name: "Chest Flies", sets: 3, reps: 8, weight: 2, tags: ["push", "full body"] },
  { name: "Dumbbell Skull Crushers", sets: 3, reps: 9, weight: 1, tags: ["push", "full body"] },
  { name: "Dumbbell Shoulder Press", sets: 3, reps: 10, weight: 1, tags: ["push"] },
  { name: "Plank Dumbbell Pull-Through", sets: 3, reps: 16, weight: 3, tags: ["push"] },

  // Pull: back / biceps / rear delts
  { name: "Single-Arm Dumbbell Row", sets: 3, reps: 12, weight: 4, tags: ["pull"] },
  {
    name: "Bent-Over Dumbbell Row",
    sets: 3,
    reps: 8,
    weight: 3,
    tags: ["pull", "full body"],
    note: "Single or double arm.",
  },
  { name: "Lateral Raises (Full Range)", sets: 3, reps: 12, weight: 0, tags: ["pull"] },
  { name: "Preacher Curls", sets: 3, reps: 12, weight: 1, tags: ["pull", "full body"] },
  {
    name: "Lying Dumbbell Reverse Flies",
    sets: 3,
    reps: 12,
    weight: 0,
    tags: ["pull", "full body"],
  },
  { name: "Hammer Curls", sets: 3, reps: 15, weight: 2, tags: ["pull"] },
  { name: "Reverse-Grip Dumbbell Row", sets: 3, reps: 12, weight: 2, tags: ["pull"] },
  { name: "Russian Twists", sets: 3, reps: 15, weight: 2, tags: ["pull"] },
  { name: "Dumbbell Thrusters", sets: 2, reps: 16, weight: 0, tags: ["pull"] },
  { name: "Farmer's Carry Hold", sets: 2, reps: 45, weight: 4, tags: ["pull", "full body"] },
  { name: "Shadow Boxing", sets: 2, reps: 30, weight: 0, tags: ["pull"] },

  // Legs: legs / glutes / calves
  { name: "Deep Weighted Squats", sets: 3, reps: 15, weight: 2, tags: ["legs", "full body"] },
  {
    name: "Dumbbell Romanian Deadlifts",
    sets: 3,
    reps: 15,
    weight: 4,
    tags: ["legs", "full body"],
  },
  { name: "Dumbbell Bulgarian Split Squats", sets: 3, reps: 8, weight: 2, tags: ["legs"] },
  { name: "Calf Raises", sets: 3, reps: 12, weight: 4, tags: ["legs"] },
  { name: "Glute Press", sets: 3, reps: 20, weight: 4, tags: ["legs"] },
  { name: "Dumbbell Sumo Squats", sets: 3, reps: 15, weight: 4, tags: ["legs"] },
  { name: "Dumbbell Straight-Arm Sit-Ups", sets: 3, reps: 15, weight: 2, tags: ["legs"] },
  { name: "Plank", sets: 1, reps: 110, weight: 0, tags: ["legs"] },
  { name: "Goblet Squats", sets: 3, reps: 10, weight: 4, tags: ["legs"] },
  { name: "Dumbbell Swings", sets: 3, reps: 10, weight: 0, tags: ["legs"] },
  { name: "Walking Lunges / Step-Ups", sets: 3, reps: 8, weight: 1, tags: ["legs"] },

  // Full body (only the ones not already above)
  {
    name: "Hammer Curls + Shoulder Press",
    sets: 3,
    reps: 10,
    weight: 1,
    tags: ["full body"],
    note: "Superset.",
  },
  { name: "Dragon Flag", sets: 3, reps: 25, weight: 0, tags: ["full body"] },
  { name: "Dumbbell Side Bends", sets: 3, reps: 15, weight: 4, tags: ["full body"] },
];
