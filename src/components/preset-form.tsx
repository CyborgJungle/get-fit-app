import { useEffect, useMemo, useState } from "react";
import { uid, useExercises, type Preset } from "@/lib/gym";
import { Sheet } from "@/components/kit";
import { GroupToggle, PickList } from "@/components/pick-list";

/** Create / edit a preset: a name plus a picked list of exercises. */
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
  const existing = useMemo(() => new Set(list.map((e) => e.id)), [list]);
  const [name, setName] = useState("");
  const [ids, setIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setIds(initial?.ids.filter((id) => existing.has(id)) ?? []);
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const valid = name.trim().length > 0 && ids.length > 0;
  const submit = () => {
    if (!valid) return;
    onSave({ id: initial?.id ?? uid(), name: name.trim(), ids });
    onClose();
  };
  const toggle = (id: string) =>
    setIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
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
      <div className="flex h-12 items-center border-b-[1.5px] border-[var(--ink)] pl-4 pr-2">
        <span className="font-mono text-[10px] uppercase text-[var(--faint)]">
          Exercises · {ids.length}
        </span>
        {list.length > 0 && <GroupToggle className="ml-auto h-8" />}
      </div>
      {list.length === 0 ? (
        <p className="px-4 py-6 font-mono text-[12px] uppercase text-[var(--faint)]">
          Add exercises first
        </p>
      ) : (
        <PickList list={list} selected={ids} onToggle={toggle} />
      )}
      {initial && onDelete && (
        <button
          type="button"
          onClick={() => {
            if (!confirmDelete) return setConfirmDelete(true);
            onDelete(initial.id);
            onClose();
          }}
          className="h-12 w-full font-mono text-[11px] uppercase underline underline-offset-4"
        >
          {confirmDelete ? "Tap again to delete" : "Delete preset"}
        </button>
      )}
    </Sheet>
  );
}
