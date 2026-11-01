import { useMemo, useState } from 'react';
import { Button, Sheet } from '../ui';
import { slugify } from '../../domain/markdownImport';
import type { Equipment, Exercise, ExerciseKind, LoadType } from '../../domain/types';

const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'other'];
const KINDS: ExerciseKind[] = ['compound', 'isolation'];
const LOADS: LoadType[] = ['total', 'per-hand', 'bodyweight-plus', 'none'];

const field =
  'min-h-touch w-full rounded-btn border border-border bg-surface px-3 text-sm text-text';

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="block text-sm font-medium text-text">
      {label}
      <select className={`${field} mt-1`} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Choose a catalog exercise or create a custom one. */
export function ExercisePicker({
  open,
  title,
  catalog,
  exclude = [],
  onClose,
  onPick,
}: {
  open: boolean;
  title: string;
  catalog: Exercise[];
  exclude?: string[];
  onClose: () => void;
  onPick: (exercise: Exercise) => void;
}) {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<Equipment>('other');
  const [kind, setKind] = useState<ExerciseKind>('compound');
  const [load, setLoad] = useState<LoadType>('total');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((e) => !exclude.includes(e.id) && e.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, exclude, query]);

  const reset = () => {
    setQuery('');
    setCreating(false);
    setName('');
  };
  const close = () => {
    reset();
    onClose();
  };
  const pick = (e: Exercise) => {
    reset();
    onPick(e);
  };

  const create = () => {
    const trimmed = name.trim();
    const base = slugify(trimmed) || 'custom-exercise';
    const taken = new Set(catalog.map((e) => e.id));
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    pick({ id, name: trimmed, equipment, kind, load, muscles: [], custom: true });
  };

  return (
    <Sheet open={open} onClose={close} title={title}>
      {creating ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create();
          }}
        >
          <label className="block text-sm font-medium text-text">
            Name
            <input
              className={`${field} mt-1`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <Select label="Equipment" value={equipment} options={EQUIPMENT} onChange={setEquipment} />
          <Select label="Kind" value={kind} options={KINDS} onChange={setKind} />
          <Select label="Load" value={load} options={LOADS} onChange={setLoad} />
          <Button type="submit" fullWidth disabled={!name.trim()}>
            Create exercise
          </Button>
          <Button variant="secondary" fullWidth onClick={() => setCreating(false)}>
            Back to list
          </Button>
        </form>
      ) : (
        <>
          <label className="mb-3 block text-sm font-medium text-text">
            Search exercises
            <input
              type="search"
              className={`${field} mt-1`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <ul className="mb-3 flex flex-col">
            {matches.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => pick(e)}
                  className="flex min-h-touch w-full flex-col justify-center border-b border-border text-left"
                >
                  <span className="text-sm font-medium text-text">{e.name}</span>
                  <span className="text-xs text-muted">
                    {e.equipment} · {e.kind}
                  </span>
                </button>
              </li>
            ))}
            {matches.length === 0 ? (
              <li className="py-3 text-sm text-muted">No exercises match.</li>
            ) : null}
          </ul>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              setName(query.trim());
              setCreating(true);
            }}
          >
            Create custom exercise
          </Button>
        </>
      )}
    </Sheet>
  );
}
