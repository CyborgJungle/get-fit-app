import { useEffect, useMemo, useState } from "react";
import { uid, useExercises, type Preset } from "@/lib/gym";
import { InkButton, SearchBox, Sheet, StatStrip } from "@/components/kit";
import { GroupToggle, PickList } from "@/components/pick-list";
import { Block, BlockRemove } from "@/components/block";
import { SortableList } from "@/components/sortable";

/**
 * Create / edit a preset, laid out like the WOD: a name, the chosen exercises
 * as compact blocks (hold and drag to sort — the order is saved), and
 * "+ Add exercise" to search and pick more.
 */
export function PresetForm({
  open,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  initial: Preset | null;
  onClose: () => void;
  onSave: (p: Preset) => void;
  onDelete?: (id: string) => void;
}) {
  const { list } = useExercises();
  const byId = useMemo(() => new Map(list.map((e) => [e.id, e])), [list]);
  const [name, setName] = useState("");
  const [ids, setIds] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setIds(initial?.ids.filter((id) => byId.has(id)) ?? []);
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const items = ids.map((id) => byId.get(id)).filter((e) => !!e);
  const valid = name.trim().length > 0 && items.length > 0;
  const submit = () => {
    if (!valid) return;
    onSave({ id: initial?.id ?? uid(), name: name.trim(), ids: items.map((e) => e.id) });
    onClose();
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={initial ? "Edit preset" : "New preset"}
        action={
          <button
            onClick={submit}
            disabled={!valid}
            className="h-9 bg-[var(--ink)] px-4 text-[13px] uppercase tracking-wide text-[var(--ink-fg)] disabled:opacity-35"
          >
            Save
          </button>
        }
      >
        <label className="block border-b-[1.5px] border-[var(--ink)] px-4 pb-2.5 pt-2">
          <span className="mb-0.5 block font-mono text-[10px] uppercase text-[var(--faint)]">
            Name
          </span>
          <input
            name="preset-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Push day"
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="done"
            className="w-full bg-transparent text-[22px] leading-tight outline-none placeholder:text-[var(--faint)]"
          />
        </label>

        <div className="px-4 pb-2 pt-3">
          <span className="mb-2 block font-mono text-[10px] uppercase text-[var(--faint)]">
            Exercises · {items.length}
          </span>
          {items.length > 0 && (
            <SortableList
              items={items}
              getId={(e) => e.id}
              onReorder={(next) => setIds(next.map((e) => e.id))}
              className="space-y-2"
              render={(ex, i) => (
                <Block
                  index={i}
                  name={ex.name}
                  action={
                    <BlockRemove
                      onClick={() => setIds((p) => p.filter((x) => x !== ex.id))}
                      label={`Remove ${ex.name}`}
                    />
                  }
                >
                  <StatStrip reps={ex.reps} sets={ex.sets} weight={ex.weight} kg={ex.kg} />
                </Block>
              )}
            />
          )}
          {items.length > 1 && (
            <p className="pt-2 text-center font-mono text-[10px] uppercase text-[var(--faint)]">
              Hold and drag to reorder
            </p>
          )}
          <button
            type="button"
            onClick={() => setPicking(true)}
            disabled={list.length === 0}
            className="flex h-11 w-full items-center justify-center font-mono text-[12px] uppercase active:opacity-50 disabled:opacity-40"
          >
            {list.length === 0 ? "Add exercises first" : "+ Add exercise"}
          </button>
        </div>

        {initial && onDelete && (
          <button
            type="button"
            onClick={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              onDelete(initial.id);
              onClose();
            }}
            className="h-12 w-full border-t border-[var(--faint)] font-mono text-[11px] uppercase underline underline-offset-4"
          >
            {confirmDelete ? "Tap again to delete" : "Delete preset"}
          </button>
        )}
      </Sheet>

      <AddExercises
        open={picking}
        have={ids}
        onClose={() => setPicking(false)}
        onAdd={(more) => {
          setIds((p) => [...p, ...more.filter((id) => !p.includes(id))]);
          setPicking(false);
        }}
      />
    </>
  );
}

/** Searchable picker; exercises already in the preset are shown greyed out. */
function AddExercises({
  open,
  have,
  onClose,
  onAdd,
}: {
  open: boolean;
  have: string[];
  onClose: () => void;
  onAdd: (ids: string[]) => void;
}) {
  const { list } = useExercises();
  const [sel, setSel] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (open) {
      setSel([]);
      setQuery("");
    }
  }, [open]);
  const toggle = (id: string) =>
    setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add exercises"
      action={<GroupToggle />}
      footer={
        <InkButton onClick={() => onAdd(sel)} disabled={sel.length === 0}>
          {sel.length ? `Add ${sel.length}` : "Add"}
        </InkButton>
      }
    >
      <div className="sticky top-0 z-10 border-b border-[var(--ink)] bg-[var(--sage)] px-4 py-2.5">
        <SearchBox value={query} onChange={setQuery} />
      </div>
      <PickList list={list} selected={sel} onToggle={toggle} locked={have} query={query} />
    </Sheet>
  );
}
