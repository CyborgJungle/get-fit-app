import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fmtKg, useWeightUnit } from "@/lib/gym";

/* ─── Dots ──────────────────────────────────────────────────────────── */

export function Dot({
  filled,
  size = 16,
  className,
  tone = "ink",
}: {
  filled: boolean;
  size?: number;
  className?: string;
  tone?: "ink" | "light";
}) {
  const c = tone === "ink" ? "var(--ink)" : "var(--ink-fg)";
  // SVG keeps the fill exactly centred in the ring at any size.
  const u = 20 / size; // viewBox units per pixel
  const sw = 1.5 * u;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <circle cx="10" cy="10" r={10 - sw / 2} fill="none" stroke={c} strokeWidth={sw} />
      {filled && (
        <circle
          className="animate-dot-in"
          cx="10"
          cy="10"
          r={10 - sw - u}
          fill={c}
          style={{ transformOrigin: "10px 10px" }}
        />
      )}
    </svg>
  );
}

/** Borderless "add" button with a ringed plus, used for empty lists. */
export function EmptyAdd({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex aspect-[2/1] w-full flex-col items-center justify-center gap-3 active:opacity-60"
    >
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r="31" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
        <path d="M32 20v24M20 32h24" stroke="var(--ink)" strokeWidth="1.5" />
      </svg>
      <span className="font-mono text-[11px] uppercase">{label}</span>
    </button>
  );
}

/** Weight as 1–5 dots. On dark ground: lit dots are light, rest are dim. */
export function WeightDots({
  value,
  onChange,
  size = 10,
  tone = "light",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  tone?: "light" | "ink";
}) {
  const on = tone === "light" ? "var(--ink-fg)" : "var(--ink)";
  const off = tone === "light" ? "#4a4d4a" : "rgba(38,38,38,0.18)";
  return (
    <span
      className="inline-flex items-center"
      style={{ gap: size * 0.45 }}
      aria-label={`Weight ${value} of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const dot = (
          <span
            className="block rounded-full transition-colors"
            style={{ width: size, height: size, background: n <= value ? on : off }}
          />
        );
        return onChange ? (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="-m-1.5 p-1.5"
            aria-label={`${n} dot${n > 1 ? "s" : ""}`}
          >
            {dot}
          </button>
        ) : (
          <span key={n}>{dot}</span>
        );
      })}
    </span>
  );
}

/* ─── Stat strip (the black band) ───────────────────────────────────── */

export function StatStrip({
  reps,
  sets,
  weight,
  kg,
  compact,
}: {
  reps: number;
  sets: number;
  weight: number;
  kg?: number;
  /** One slim line (label and value side by side), for long lists. */
  compact?: boolean;
}) {
  const [unit] = useWeightUnit();
  const w =
    unit === "kg" ? (
      <>
        {fmtKg(kg ?? 0)}
        <span className="ml-1 font-mono text-[11px] text-[var(--ink-muted)]">kg</span>
      </>
    ) : (
      <span className={cn("flex items-center", compact ? "h-[20px]" : "h-[24px]")}>
        <WeightDots value={weight} size={compact ? 8 : 10} />
      </span>
    );
  return (
    <div className="grid grid-cols-[1fr_1fr_1.35fr] bg-[var(--ink)] text-[var(--ink-fg)]">
      <Stat label="Reps" compact={compact}>
        {reps}
      </Stat>
      <Stat label="Sets" divider compact={compact}>
        {sets}
      </Stat>
      <Stat label="Weight" divider compact={compact}>
        {w}
      </Stat>
    </div>
  );
}

function Stat({
  label,
  children,
  divider,
  compact,
}: {
  label: string;
  children: ReactNode;
  divider?: boolean;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        className={cn("flex h-8 items-center gap-2 px-3", divider && "border-l border-[#4a4d4a]")}
      >
        <span className="font-mono text-[9px] uppercase text-[var(--ink-muted)]">{label}</span>
        <span className="flex items-center text-[15px] leading-none tabular-nums">{children}</span>
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col px-3 pb-1.5 pt-1", divider && "border-l border-[#4a4d4a]")}>
      <span className="font-mono text-[9px] uppercase text-[var(--ink-muted)]">{label}</span>
      <span className="text-[20px] leading-[24px] tabular-nums">{children}</span>
    </div>
  );
}

/* ─── Group heading: "› LEGS 2 - - - - -", tap to open/close ─────────── */

export function GroupHeader({
  tag,
  count,
  open,
  onToggle,
  extra,
  className,
}: {
  tag: string;
  count: number;
  open: boolean;
  onToggle?: () => void;
  /** Small text after the count, e.g. how many are picked. */
  extra?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!onToggle}
      aria-expanded={open}
      className={cn(
        "flex min-h-11 w-full items-center gap-2 text-left font-mono text-[11px] uppercase active:opacity-60 disabled:active:opacity-100",
        className,
      )}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        aria-hidden
        className={cn("shrink-0 transition-transform duration-200", open && "rotate-90")}
      >
        <path d="M3 1.5L7 5L3 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span>{tag}</span>
      <span className="text-[var(--faint)]">{count}</span>
      {extra}
      <span className="ml-1 flex-1 border-b border-dashed border-[var(--faint)]" />
    </button>
  );
}

/** Which groups are open; all closed by default, all open while `forceOpen`. */
export function useOpenGroups(forceOpen: boolean) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  return {
    isOpen: (tag: string) => forceOpen || open.has(tag),
    toggle: forceOpen
      ? undefined
      : (tag: string) =>
          setOpen((p) => {
            const n = new Set(p);
            if (n.has(tag)) n.delete(tag);
            else n.add(tag);
            return n;
          }),
  };
}

/* ─── Tag chip ────────────────────────────────────────────────────── */

export function TagChip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  const cls = cn(
    "inline-flex h-7 items-center border-[1.5px] border-[var(--ink)] px-2 font-mono text-[11px] uppercase leading-none",
    active && "bg-[var(--ink)] text-[var(--ink-fg)]",
  );
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} className={cls}>
      {children}
    </button>
  ) : (
    <span className={cls}>{children}</span>
  );
}

/* ─── Section label: "01  EXERCISES" with rule ──────────────────────── */

export function SectionLabel({
  n,
  children,
  right,
}: {
  n: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    // Fixed height so the title and rule sit at the same spot on every page,
    // whether or not there are buttons on the right.
    <div className="flex h-12 items-center border-b border-[var(--faint)]">
      <span className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] text-[var(--faint)]">{n}</span>
        <span className="text-[14px] uppercase tracking-wide">{children}</span>
      </span>
      {right && <span className="ml-auto flex items-center">{right}</span>}
    </div>
  );
}

/* ─── App shell: logo header + bottom tab bar ────────────────────────── */

const NAV = [
  { to: "/", label: "Exercises", icon: IconList },
  { to: "/wod", label: "WOD", icon: IconWod },
  { to: "/timer", label: "Timer", icon: IconTimer },
  { to: "/calendar", label: "Calendar", icon: IconCalendar },
  { to: "/settings", label: "Settings", icon: IconSettings },
] as const;

export function Shell({ children, hideHeader }: { children: ReactNode; hideHeader?: boolean }) {
  return (
    <div className="mx-auto min-h-[100dvh] max-w-[520px] px-4 pb-[calc(var(--tabbar)+var(--dock-bottom)+24px)] pt-safe">
      {!hideHeader && (
        <header className="flex items-center pb-5 pt-5">
          <Logo />
        </header>
      )}
      {children}
      <TabBar />
    </div>
  );
}

/** Rounded floating dock just above the bottom edge / home indicator. */
function TabBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      data-scroll-edge="bottom"
      className="fixed inset-x-0 bottom-[var(--dock-bottom)] z-40 px-2.5"
    >
      <div className="mx-auto grid h-[var(--tabbar)] max-w-[500px] grid-cols-5 gap-0.5 rounded-[28px] border-[1.5px] border-[var(--ink)] bg-[var(--sage)]/90 p-1 shadow-[0_8px_24px_rgba(38,38,38,0.18)] backdrop-blur-md">
        {NAV.map((n) => {
          const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-[23px] text-[10px] uppercase tracking-normal transition-colors",
                active ? "bg-[var(--ink)] text-[var(--ink-fg)]" : "active:bg-[var(--sage-2)]",
              )}
            >
              <Icon />
              {n.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function IconList() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="16" height="6" />
        <rect x="2" y="11" width="16" height="6" />
      </g>
    </svg>
  );
}

function IconWod() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" aria-hidden>
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="4" fill="currentColor" />
    </svg>
  );
}

function IconTimer() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" aria-hidden>
      <circle cx="10" cy="11.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 2.5h4M10 2.5v2.5M10 11.5V8M10 11.5l2.5 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" aria-hidden>
      <rect
        x="2"
        y="3"
        width="16"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line x1="2" y1="7.5" x2="18" y2="7.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="12.5" r="1.6" fill="currentColor" />
      <circle cx="13" cy="12.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" aria-hidden>
      <g stroke="currentColor" strokeWidth="1.5">
        <line x1="2" y1="6" x2="18" y2="6" />
        <line x1="2" y1="14" x2="18" y2="14" />
      </g>
      <circle cx="7" cy="6" r="2.5" fill="currentColor" />
      <circle cx="13" cy="14" r="2.5" fill="currentColor" />
    </svg>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5" aria-label="Workout by Tim">
      <span className="flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-[var(--ink)]">
        <span className="block h-3 w-3 rounded-full bg-[var(--ink)]" />
      </span>
      <span className="flex items-baseline gap-2">
        <span className="text-[24px] font-medium leading-none tracking-[-0.02em]">Workout</span>
        <span className="font-mono text-[12px] leading-none text-[var(--faint)]">by Tim</span>
      </span>
    </div>
  );
}

/* ─── Buttons ───────────────────────────────────────────────────────── */

export function InkButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "flex h-14 w-full items-center justify-center gap-2 bg-[var(--ink)] text-[15px] uppercase tracking-wide text-[var(--ink-fg)] active:bg-[var(--ink-2)] disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function LineButton({
  children,
  className,
  active,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      className={cn(
        "flex h-10 items-center justify-center whitespace-nowrap border-[1.5px] border-[var(--ink)] px-4 text-[13px] uppercase tracking-wide",
        active ? "bg-[var(--ink)] text-[var(--ink-fg)]" : "active:bg-[var(--sage-2)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ─── Bottom sheet ──────────────────────────────────────────────────── */

export function Sheet({
  open,
  onClose,
  title,
  action,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Primary action shown in the header, so it stays reachable above the keyboard. */
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  // Pin the sheet to the *visible* viewport. When the keyboard opens, iOS
  // shrinks and may pan the visual viewport; following its top/height keeps the
  // sheet sitting right on top of the keyboard with the header in view.
  const [vp, setVp] = useState<{ top: number; height: number; kb: boolean } | null>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const vv = window.visualViewport;
    let base = 0;
    const update = () => {
      if (!vv) return;
      base = Math.max(base, vv.height);
      setVp({ top: vv.offsetTop, height: vv.height, kb: vv.height < base - 120 });
    };
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    return () => {
      document.body.style.overflow = prev;
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
    };
  }, [open]);

  // Keep the focused field in view inside the sheet once the keyboard settles.
  const reveal = (e: React.FocusEvent) => {
    const el = e.target as HTMLElement;
    if (!/^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
    setTimeout(() => el.scrollIntoView({ block: "nearest", behavior: "smooth" }), 320);
  };

  if (!open) return null;
  return (
    <div
      data-sheet
      className="fixed inset-x-0 z-50 flex flex-col justify-end"
      style={vp ? { top: vp.top, height: vp.height } : { top: 0, bottom: 0 }}
    >
      <button
        aria-label="Close"
        className="absolute inset-0 bg-[rgba(38,38,38,0.35)]"
        onClick={onClose}
      />
      <div
        className="animate-sheet-up relative mx-auto flex w-full max-w-[520px] flex-col border-t-[1.5px] border-[var(--ink)] bg-[var(--sage)]"
        style={{
          maxHeight: vp ? (vp.kb ? vp.height - 8 : vp.height * 0.88) : "88dvh",
          paddingBottom: vp?.kb ? 0 : "var(--home-pad)",
        }}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b-[1.5px] border-[var(--ink)] pl-4">
          <span className="text-[15px] uppercase tracking-wide">{title}</span>
          <span className="ml-auto">{action}</span>
          <button
            onClick={onClose}
            className="flex h-full w-14 items-center justify-center border-l-[1.5px] border-[var(--ink)] text-[16px]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain" onFocus={reveal}>
          {children}
        </div>
        {footer && !vp?.kb && <div className="shrink-0 px-4 pb-3 pt-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ─── Search box ───────────────────────────────────────────────────── */

export function SearchBox({
  value,
  onChange,
  placeholder = "Search exercises or groups",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex h-11 items-center gap-2 border-[1.5px] border-[var(--ink)] bg-[var(--sage)] px-3",
        className,
      )}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="shrink-0">
        <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <input
        type="search"
        name="exercise-search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        enterKeyHint="search"
        className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:font-mono placeholder:text-[12px] placeholder:uppercase placeholder:text-[var(--faint)] [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="-mr-1 p-1 text-[14px]"
        >
          ✕
        </button>
      )}
    </label>
  );
}

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      className={cn("transition-transform duration-200", open && "rotate-180")}
      aria-hidden
    >
      <path d="M2 5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
