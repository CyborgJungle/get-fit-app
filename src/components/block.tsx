import { useState, type ReactNode } from "react";
import { Chevron } from "@/components/kit";
import { Grip } from "@/components/sortable";
import { cn } from "@/lib/utils";

/**
 * Compact exercise block: grip, number, full name (wraps, never cut off),
 * optional line below the name, optional right-side action and an expand
 * arrow. Expanded content (reps/sets/weight) shows underneath.
 */
export function Block({
  index,
  name,
  sub,
  action,
  children,
  defaultOpen = false,
  className,
  highlight,
}: {
  index: number;
  name: string;
  /** Small line under the name, e.g. set dots. */
  sub?: ReactNode;
  /** Right-side button, e.g. remove. */
  action?: ReactNode;
  /** Expanded details. */
  children?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  highlight?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={cn(
        "border-[1.5px] border-[var(--ink)] bg-[var(--sage)]",
        highlight && "outline outline-[1.5px] outline-offset-[3px] outline-[var(--ink)]",
        className,
      )}
    >
      <div className="flex min-h-[52px] items-stretch">
        <button
          type="button"
          onClick={() => children && setOpen((o) => !o)}
          aria-expanded={children ? open : undefined}
          className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-2.5 pr-3 text-left"
        >
          <Grip />
          <span className="w-5 shrink-0 font-mono text-[11px] text-[var(--faint)]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block break-words text-[16px] leading-snug">{name}</span>
            {sub && <span className="mt-1 flex items-center gap-1.5">{sub}</span>}
          </span>
          {children && <Chevron open={open} />}
        </button>
        {action}
      </div>
      {open && children}
    </div>
  );
}

/** Square ✕ button on the right edge of a block. */
export function BlockRemove({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex w-11 shrink-0 items-center justify-center border-l-[1.5px] border-[var(--ink)] font-mono text-[14px] active:bg-[var(--sage-2)]"
    >
      ✕
    </button>
  );
}
