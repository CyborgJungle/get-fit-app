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

export function StatStrip({
  reps,
  sets,
  weight,
  kg,
}: {
  reps: number;
  sets: number;
  weight: number;
  kg?: number;
}) {
  const [unit] = useWeightUnit();
  return (
    <div className="grid grid-cols-[1fr_1fr_1.35fr] bg-[var(--ink)] text-[var(--ink-fg)]">
      <Stat label="Reps">{reps}</Stat>
      <Stat label="Sets" divider>
        {sets}
      </Stat>
      <Stat label="Weight" divider>
        {unit === "kg" ? (
          <>
            {fmtKg(kg ?? 0)}
            <span className="ml-1 font-mono text-[11px] text-[var(--ink-muted)]">kg</span>
          </>
        ) : (
          <span className="flex h-[24px] items-center">
            <WeightDots value={weight} />
          </span>
        )}
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
    <nav className="fixed inset-x-0 bottom-[var(--dock-bottom)] z-40 px-2.5">
      <div className="mx-auto grid h-[var(--tabbar)] max-w-[500px] grid-cols-4 gap-1 rounded-[28px] border-[1.5px] border-[var(--ink)] bg-[var(--sage)]/90 p-1 shadow-[0_8px_24px_rgba(38,38,38,0.18)] backdrop-blur-md">
        {NAV.map((n) => {
          const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 rounded-[23px] text-[11px] uppercase tracking-wide transition-colors",
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
  // Keep the sheet sitting on top of the on-screen keyboard instead of letting
  // iOS pan the whole page.
  const [kb, setKb] = useState({ bottom: 0, maxH: 0 });
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const vv = window.visualViewport;
    const update = () => {
      if (!vv) return;
      const bottom = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKb({ bottom, maxH: vv.height });
      if (vv.offsetTop) window.scrollTo(0, 0);
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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ bottom: kb.bottom }}>
      <button
        aria-label="Close"
        className="absolute inset-0 bg-[rgba(38,38,38,0.35)]"
        onClick={onClose}
      />
      <div
        className="animate-sheet-up relative mx-auto flex w-full max-w-[520px] flex-col border-t-[1.5px] border-[var(--ink)] bg-[var(--sage)]"
        style={{
          maxHeight: kb.maxH ? Math.min(kb.maxH - 24, window.innerHeight * 0.88) : "88dvh",
          paddingBottom: kb.bottom ? 0 : "var(--home-pad)",
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
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="shrink-0 px-4 pb-3 pt-3">{footer}</div>}
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
