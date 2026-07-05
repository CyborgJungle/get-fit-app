export const WEIGHT_PRESETS = [6, 10.75, 15.5, 20.25, 25];

export function WeightPresetPills({
  value,
  onPick,
}: {
  value: number;
  onPick: (v: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {WEIGHT_PRESETS.map((w) => {
        const active = Math.abs(value - w) < 0.001;
        return (
          <button
            type="button"
            key={w}
            onClick={() => onPick(w)}
            className={
              "px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest border tabular-nums transition-colors " +
              (active
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground")
            }
          >
            {w} KG
          </button>
        );
      })}
    </div>
  );
}
