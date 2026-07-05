import { Feather, Zap } from "lucide-react";
import { WEIGHT_PRESETS } from "@/components/weight-preset-pills";

/**
 * Visual weight indicator matched to WEIGHT_PRESETS:
 *  6      → feather
 *  10.75  → 1 bolt
 *  15.5   → 2 bolts
 *  20.25  → 3 bolts
 *  25     → 4 bolts
 * Anything not on the scale snaps to the closest preset.
 */
function nearestPresetIndex(weight: number): number {
  let best = 0;
  let bestDist = Infinity;
  WEIGHT_PRESETS.forEach((w, i) => {
    const d = Math.abs(w - weight);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

export function WeightIcon({
  weight,
  className = "",
}: {
  weight: number;
  className?: string;
}) {
  const idx = nearestPresetIndex(weight);
  const label = `${weight} KG`;
  if (idx === 0) {
    return (
      <span className={"inline-flex items-center " + className} aria-label={label} title={label}>
        <Feather className="size-3.5 text-muted-foreground" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span
      className={"inline-flex items-center gap-0.5 text-primary " + className}
      aria-label={label}
      title={label}
    >
      {Array.from({ length: idx }).map((_, i) => (
        <Zap key={i} className="size-3.5 fill-current" strokeWidth={0} />
      ))}
    </span>
  );
}
