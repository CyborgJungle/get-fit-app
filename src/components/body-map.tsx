import { cn } from "@/lib/utils";
import type { Muscle } from "@/lib/muscles";

/**
 * Front and back body in the app's line style. Muscles are tappable shapes:
 * filled ink when selected, light when they have exercises, dashed when none.
 * Shapes are drawn for the left half and mirrored; a few sit on the centre line.
 */

type Shape = { m: Muscle; d: string; center?: boolean };

const ARM_UPPER =
  "M51 108 C47 120 45 134 46 148 L57 149 C59 135 62 120 66 96 C60 99 54 103 51 108 Z";
const FOREARM = "M45 154 C39 172 35 192 34 214 L44 216 C48 196 54 176 58 155 Z";
const DELT =
  "M67 68 C56 67 48 76 47 90 C47 96 48 101 50 105 C55 96 61 90 69 86 C70 80 70 73 67 68 Z";

const FRONT: Shape[] = [
  { m: "traps", d: "M89 55 C84 60 77 64 70 66 L90 67 Z" },
  { m: "shoulders", d: DELT },
  { m: "chest", d: "M98 70 L72 70 C67 77 65 88 67 99 C71 109 84 115 98 112 Z" },
  { m: "biceps", d: ARM_UPPER },
  { m: "forearms", d: FOREARM },
  { m: "abs", center: true, d: "M87 117 L113 117 L111 185 C108 195 92 195 89 185 Z" },
  {
    m: "obliques",
    d: "M68 106 C72 113 78 117 84 119 L86 186 C80 188 75 193 72 199 C70 178 66 150 68 106 Z",
  },
  {
    m: "quads",
    d: "M70 214 C65 240 66 272 74 298 L89 298 C91 276 91 246 89 222 C83 217 77 214 70 214 Z",
  },
  {
    m: "adductors",
    d: "M92 222 C96 222 99 224 99 229 C99 246 97 262 92 280 C93 262 93 240 92 222 Z",
  },
  { m: "calves", d: "M73 312 C68 330 69 356 75 382 L81 382 C79 358 78 334 80 312 Z" },
];

const BACK: Shape[] = [
  {
    m: "traps",
    center: true,
    d: "M100 50 L90 54 C84 60 76 64 69 67 C78 70 86 76 92 86 L100 116 L108 86 C114 76 122 70 131 67 C124 64 116 60 110 54 Z",
  },
  { m: "shoulders", d: DELT },
  {
    m: "upperback",
    d: "M72 72 C80 74 86 80 89 89 L96 116 C96 122 94 126 90 126 C82 120 75 112 72 102 C70 92 70 82 72 72 Z",
  },
  {
    m: "lats",
    d: "M70 110 C77 120 84 126 91 130 L88 172 C82 170 77 165 74 158 C69 140 68 125 70 110 Z",
  },
  { m: "lowerback", center: true, d: "M95 134 L100 138 L105 134 L110 193 L90 193 Z" },
  { m: "triceps", d: ARM_UPPER },
  { m: "forearms", d: FOREARM },
  { m: "glutes", d: "M98 200 C86 196 72 200 69 214 C66 232 78 245 98 242 Z" },
  {
    m: "hamstrings",
    d: "M70 242 C66 262 68 283 74 300 L91 300 C95 282 97 264 97 249 C88 251 78 249 70 242 Z",
  },
  { m: "calves", d: "M73 310 C64 326 66 348 76 364 L91 364 C99 348 99 326 92 310 Z" },
];

/** Non-tappable outline parts (left half unless noted). */
const FRONT_OUTLINE = [
  "M74 386 L89 386 L90 395 C84 399 73 399 70 395 Z", // foot
  "M82 312 L92 312 C93 340 90 362 88 382 L83 382 C82 358 82 334 82 312 Z", // shin
  "M33 220 C29 226 28 238 33 246 C37 250 43 248 45 242 L46 222 Z", // hand
  "M72 202 C82 197 92 196 100 199", // hip line
];
const BACK_OUTLINE = [
  "M74 386 L89 386 L90 395 C84 399 73 399 70 395 Z",
  "M79 368 L89 368 L88 384 L80 384 Z", // achilles
  "M33 220 C29 226 28 238 33 246 C37 250 43 248 45 242 L46 222 Z",
];

function Figure({
  shapes,
  outline,
  front,
  label,
  selected,
  available,
  onToggle,
}: {
  shapes: Shape[];
  outline: string[];
  front: boolean;
  label: string;
  selected: string[];
  available: Set<string>;
  onToggle: (m: Muscle) => void;
}) {
  const muscle = (s: Shape, key: string, mirror: boolean) => {
    const on = selected.includes(s.m);
    const has = available.has(s.m);
    return (
      <path
        key={key}
        d={s.d}
        transform={mirror ? "translate(200 0) scale(-1 1)" : undefined}
        onClick={() => onToggle(s.m)}
        className={cn("cursor-pointer transition-[fill] duration-150", !on && "active:opacity-60")}
        fill={on ? "var(--ink)" : has ? "var(--sage-2)" : "transparent"}
        stroke="var(--ink)"
        strokeWidth={1.3}
        strokeDasharray={on || has ? undefined : "2 2.5"}
        strokeLinejoin="round"
      >
        <title>{s.m}</title>
      </path>
    );
  };
  const line = (d: string, key: string, mirror: boolean) => (
    <path
      key={key}
      d={d}
      transform={mirror ? "translate(200 0) scale(-1 1)" : undefined}
      fill="none"
      stroke="var(--ink)"
      strokeWidth={1}
      strokeOpacity={0.45}
      strokeLinejoin="round"
      pointerEvents="none"
    />
  );
  return (
    <figure className="flex flex-col items-center gap-1.5">
      <svg
        viewBox="20 2 160 402"
        className="h-auto w-full max-w-[148px]"
        role="group"
        aria-label={label}
      >
        {/* head + neck */}
        <ellipse
          cx="100"
          cy="28"
          rx="15"
          ry="19"
          fill="none"
          stroke="var(--ink)"
          strokeWidth={1.3}
        />
        {front && <circle cx="100" cy="28" r="1.6" fill="var(--ink)" opacity={0.5} />}
        {line("M93 46 L92 55 M107 46 L108 55", "neck", false)}
        {outline.flatMap((d, i) => [line(d, `o${i}`, false), line(d, `o${i}m`, true)])}
        {/* knees */}
        <circle cx="82" cy="305" r="4" fill="none" stroke="var(--ink)" strokeOpacity={0.45} />
        <circle cx="118" cy="305" r="4" fill="none" stroke="var(--ink)" strokeOpacity={0.45} />
        {shapes.flatMap((s, i) =>
          s.center
            ? [muscle(s, `s${i}`, false)]
            : [muscle(s, `s${i}`, false), muscle(s, `s${i}m`, true)],
        )}
        {front && (
          // Six-pack lines on top of the abs shape.
          <g
            pointerEvents="none"
            stroke={selected.includes("abs") ? "var(--sage)" : "var(--ink)"}
            strokeWidth={1}
            strokeOpacity={0.6}
          >
            <path d="M100 119 L100 190 M88 140 L112 140 M88 162 L112 162" fill="none" />
          </g>
        )}
      </svg>
      <figcaption className="font-mono text-[10px] uppercase text-[var(--faint)]">
        {label}
      </figcaption>
    </figure>
  );
}

export function BodyMap({
  selected,
  available,
  onToggle,
}: {
  selected: string[];
  /** Muscles that have at least one exercise. */
  available: Set<string>;
  onToggle: (m: Muscle) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Figure
        shapes={FRONT}
        outline={FRONT_OUTLINE}
        front
        label="Front"
        selected={selected}
        available={available}
        onToggle={onToggle}
      />
      <Figure
        shapes={BACK}
        outline={BACK_OUTLINE}
        front={false}
        label="Back"
        selected={selected}
        available={available}
        onToggle={onToggle}
      />
    </div>
  );
}
