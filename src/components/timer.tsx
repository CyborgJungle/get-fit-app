/* 5×7 dot-matrix digits */
const GLYPHS: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};

const COLON = ["0", "0", "1", "0", "1", "0", "0"];
const glyph = (ch: string) => (ch === ":" ? COLON : (GLYPHS[ch] ?? GLYPHS["0"]));
const glyphWidth = (ch: string) => glyph(ch)[0].length;
/** Dot columns a text takes (1 blank column between characters). */
const matrixCols = (text: string) =>
  text.split("").reduce((n, ch, i) => n + glyphWidth(ch) + (i ? 1 : 0), 0);

export function DotMatrix({
  text,
  pitch = 4.2,
  className,
}: {
  text: string;
  pitch?: number;
  className?: string;
}) {
  const chars = text.split("");
  const cols = matrixCols(text);
  const r = pitch * 0.4;
  let x0 = 0;
  return (
    <svg
      width={cols * pitch}
      height={7 * pitch}
      viewBox={`0 0 ${cols * pitch} ${7 * pitch}`}
      className={className}
      role="img"
      aria-label={text}
    >
      {chars.map((ch, ci) => {
        const left = x0;
        x0 += glyphWidth(ch) + 1;
        return glyph(ch).map((row, y) =>
          row
            .split("")
            .map((bit, x) =>
              bit === "1" ? (
                <circle
                  key={`${ci}-${x}-${y}`}
                  cx={(left + x) * pitch + pitch / 2}
                  cy={y * pitch + pitch / 2}
                  r={r}
                  fill="var(--ink)"
                />
              ) : null,
            ),
        );
      })}
    </svg>
  );
}

/** Dotted ring with a solid arc sweeping clockwise from 12 o'clock; seconds in the middle. */
export function TimerRing({
  total,
  remaining,
  size = 128,
  text,
  progress: progressOverride,
}: {
  total: number;
  remaining: number;
  size?: number;
  /** Shown in the middle instead of the seconds left (e.g. "1:05"). */
  text?: string;
  /** 0–1 arc, instead of how much of `total` has passed. */
  progress?: number;
}) {
  const stroke = 3;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const progress =
    progressOverride !== undefined
      ? Math.min(1, Math.max(0, progressOverride))
      : total > 0
        ? Math.min(1, Math.max(0, 1 - remaining / total))
        : 0;
  const secs = Math.max(0, Math.ceil(remaining));
  const label = text ?? String(secs);
  const pitch = Math.min(7.5, (size * (text ? 0.64 : 0.5)) / matrixCols(label));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={1.5}
          strokeDasharray="2 4"
          opacity={0.7}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          style={{ transition: "stroke-dashoffset 0.25s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <DotMatrix text={label} pitch={pitch} />
      </div>
    </div>
  );
}
