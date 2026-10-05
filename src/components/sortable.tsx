import { useEffect, useRef, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";

/**
 * Vertical list you reorder by press-and-hold, then drag (touch), or click-drag
 * (mouse). A short hold keeps normal scrolling and taps working. While dragging,
 * holding the item near the top or bottom scrolls the list, faster the closer
 * to the edge, so an item can travel the whole list in one go.
 */
export function SortableList<T>({
  items,
  getId,
  onReorder,
  render,
  className,
}: {
  items: T[];
  getId: (item: T) => string;
  /** Called with the new order and the moved item's old/new index. */
  onReorder: (next: T[], from: number, to: number) => void;
  render: (item: T, index: number, dragging: boolean) => ReactNode;
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map(getId);
  const listRef = useRef<HTMLDivElement>(null);
  const edgeScroll = useEdgeScroll(listRef);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    edgeScroll.stop();
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    navigator.vibrate?.(10);
    onReorder(arrayMove(items, from, to), from, to);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      // Our own edge scroller (below) is smoother and knows about sticky bars.
      autoScroll={false}
      onDragStart={edgeScroll.start}
      onDragEnd={onDragEnd}
      onDragCancel={edgeScroll.stop}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div ref={listRef} className={className}>
          {items.map((item, i) => (
            <SortableRow key={ids[i]} id={ids[i]}>
              {(dragging) => render(item, i, dragging)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/** Nearest scrolling ancestor, or null for the page itself. */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let n = el?.parentElement; n && n !== document.body; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if (oy === "auto" || oy === "scroll") return n;
  }
  return null;
}

/**
 * Scrolls while the finger/pointer is held in the top or bottom zone of the
 * scroll area. For the page, sticky/fixed bars marked with
 * data-scroll-edge="top" | "bottom" shrink the area, so the zone starts where
 * the list becomes hidden. Runs on requestAnimationFrame for smooth motion.
 */
function useEdgeScroll(listRef: React.RefObject<HTMLDivElement | null>) {
  const state = useRef<{ y: number | null; raf: number; last: number; off: () => void } | null>(
    null,
  );

  const stop = () => {
    const s = state.current;
    if (!s) return;
    cancelAnimationFrame(s.raf);
    s.off();
    state.current = null;
  };

  const start = ({ activatorEvent }: DragStartEvent) => {
    stop();
    const box = scrollParent(listRef.current);
    const onMove = (e: PointerEvent | TouchEvent | MouseEvent) => {
      const pt = "touches" in e ? e.touches[0] : e;
      if (pt && state.current) state.current.y = pt.clientY;
    };
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    const a = activatorEvent as TouchEvent | MouseEvent | null;
    const first = a && "touches" in a ? a.touches[0] : a;
    const s = {
      y: first && "clientY" in first ? first.clientY : null,
      raf: 0,
      last: performance.now(),
      off: () => {
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("mousemove", onMove);
      },
    };
    state.current = s;

    const area = () => {
      if (box) {
        const r = box.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      }
      let top = 0;
      let bottom = window.innerHeight;
      document.querySelectorAll<HTMLElement>("[data-scroll-edge]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.height === 0) return;
        if (el.dataset.scrollEdge === "top") top = Math.max(top, r.bottom);
        else bottom = Math.min(bottom, r.top);
      });
      return { top, bottom };
    };

    const tick = (now: number) => {
      if (state.current !== s) return;
      const dt = Math.min(50, now - s.last) / 1000;
      s.last = now;
      if (s.y !== null) {
        const { top, bottom } = area();
        const zone = Math.max(56, Math.min(110, (bottom - top) * 0.2));
        // 0 at the inner edge of the zone, 1 at (or past) the edge itself.
        const up = Math.min(1, Math.max(0, (top + zone - s.y) / zone));
        const down = Math.min(1, Math.max(0, (s.y - (bottom - zone)) / zone));
        // Stop once the list's own end is in view (no scrolling into empty space).
        const list = listRef.current?.getBoundingClientRect();
        const more = list ? (up > 0 ? list.top < top + 8 : list.bottom > bottom - 8) : true;
        const depth = !more ? 0 : up > 0 ? -up : down;
        if (depth !== 0) {
          // Eased: gentle near the zone's start, ~1800 px/s at the edge.
          const px = Math.sign(depth) * Math.pow(Math.abs(depth), 1.6) * 1800 * dt;
          if (box) box.scrollTop += px;
          else window.scrollBy(0, px);
        }
      }
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
  };

  useEffect(() => stop, []);
  return { start, stop };
}

function SortableRow({ id, children }: { id: string; children: (dragging: boolean) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        // Vertical only.
        transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined,
        transition,
        // Let the page scroll normally; dragging starts only after the hold.
        touchAction: "manipulation",
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
      }}
      className={cn(
        "relative",
        // Above sticky headers while dragging, so the item never slides under them.
        isDragging && "z-30 shadow-[0_8px_24px_rgba(38,38,38,0.25)]",
      )}
    >
      {children(isDragging)}
    </div>
  );
}

/** Small six-dot grip shown on draggable blocks. */
export function Grip() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden className="shrink-0 opacity-40">
      {[2, 8, 14].map((y) =>
        [2, 8].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" fill="currentColor" />),
      )}
    </svg>
  );
}
