import type { ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
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
 * (mouse). A short hold keeps normal scrolling and taps working.
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

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    navigator.vibrate?.(10);
    onReorder(arrayMove(items, from, to), from, to);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={className}>
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
      className={cn("relative", isDragging && "z-10 shadow-[0_8px_24px_rgba(38,38,38,0.25)]")}
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
