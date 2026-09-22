import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

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
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full", className)}
      style={{ width: size, height: size, border: `1.5px solid ${c}` }}
    >
      {filled && (
        <span
          className="animate-dot-in block rounded-full"
          style={{ width: size - 3, height: size - 3, background: c }}
        />
      )}
    </span>
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

export function StatStrip({ reps, sets, weight }: { reps: number; sets: number; weight: number }) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1.35fr] bg-[var(--ink)] text-[var(--ink-fg)]">
      <Stat label="Reps">{reps}</Stat>
      <Stat label="Sets" divider>
        {sets}
      </Stat>
      <Stat label="Weight" divider>
        <span className="flex h-[24px] items-center">
          <WeightDots value={weight} />
        </span>
      </Stat>
    </div>
  );
}

function Stat({
  label,
  children,
  divider,
}: {
  label: string;
  children: ReactNode;
  divider?: boolean;
}) {
  return (
    <div className={cn("flex flex-col px-3 pb-1.5 pt-1", divider && "border-l border-[#4a4d4a]")}>
      <span className="font-mono text-[9px] uppercase text-[var(--ink-muted)]">{label}</span>
      <span className="text-[20px] leading-[24px] tabular-nums">{children}</span>
    </div>
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
    <div className="flex items-baseline gap-3 border-b border-[var(--faint)] pb-2">
      <span className="font-mono text-[11px] text-[var(--faint)]">{n}</span>
      <span className="text-[14px] uppercase tracking-wide">{children}</span>
      {right && <span className="ml-auto">{right}</span>}
    </div>
  );
}

/* ─── App shell: logo header + bottom tab bar ────────────────────────── */

const NAV = [
  { to: "/", label: "Exercises", icon: IconList },
  { to: "/wod", label: "WOD", icon: IconWod },
  { to: "/calendar", label: "Calendar", icon: IconCalendar },
  { to: "/settings", label: "Settings", icon: IconSettings },
] as const;

export function Shell({ children, hideHeader }: { children: ReactNode; hideHeader?: boolean }) {
  return (
    <div className="mx-auto min-h-[100dvh] max-w-[520px] px-4 pb-[calc(var(--tabbar)+var(--dock-gap)+24px)] pt-safe">
      {/* Ink band behind the status bar / Dynamic Island when running full-screen. */}
      <div className="fixed inset-x-0 top-0 z-[60] h-[env(safe-area-inset-top)] bg-[var(--ink)]" />
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

/**
 * Floating dock snapped to the bottom edge. Its gap follows the device's
 * home-indicator inset, so it hugs the bottom on every iPhone and still has
 * breathing room on phones/browsers without one.
 */
function TabBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-[var(--dock-gap)] z-40 px-2.5">
      <div className="mx-auto grid h-[var(--tabbar)] max-w-[500px] grid-cols-4 gap-1 rounded-[26px] border-[1.5px] border-[var(--ink)] bg-[var(--sage)]/90 p-1 shadow-[0_8px_24px_rgba(38,38,38,0.18)] backdrop-blur-md">
        {NAV.map((n) => {
          const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-[21px] text-[10px] uppercase tracking-wide transition-colors",
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
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="16" height="6" />
        <rect x="2" y="11" width="16" height="6" />
      </g>
    </svg>
  );
}

function IconWod() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="4" fill="currentColor" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
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
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <g stroke="currentColor" strokeWidth="1.5">
        <line x1="2" y1="6" x2="18" y2="6" />
        <line x1="2" y1="14" x2="18" y2="14" />
      </g>
      <circle cx="7" cy="6" r="2.5" fill="currentColor" />
      <circle cx="13" cy="14" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function Logo() {
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
        "flex h-10 items-center justify-center border-[1.5px] border-[var(--ink)] px-4 text-[13px] uppercase tracking-wide",
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
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-[rgba(38,38,38,0.35)]"
        onClick={onClose}
      />
      <div className="animate-sheet-up relative mx-auto flex max-h-[88dvh] w-full max-w-[520px] flex-col border-t-[1.5px] border-[var(--ink)] bg-[var(--sage)] pb-safe">
        <div className="flex items-center border-b-[1.5px] border-[var(--ink)] px-4 py-3">
          <span className="text-[15px] uppercase tracking-wide">{title}</span>
          <button
            onClick={onClose}
            className="ml-auto -mr-2 p-2 font-mono text-[12px] uppercase"
            aria-label="Close"
          >
            Close ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="px-4 pb-3 pt-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ─── Chevron ───────────────────────────────────────────────────────── */

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
