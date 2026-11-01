import { useState } from 'react';
import type { Exercise } from '../../domain/types';
import { SectionLabel, Sheet } from '../ui';

export interface SwapSheetProps {
  open: boolean;
  onClose: () => void;
  currentId: string;
  /** Exercise ids offered by the workout template for this slot. */
  alternativeIds: string[];
  catalog: Exercise[];
  onPick: (exerciseId: string) => void;
}

function Option({ exercise, onPick }: { exercise: Exercise; onPick: (id: string) => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(exercise.id)}
        className="flex min-h-touch w-full items-center justify-between gap-3 rounded-btn px-3 text-left text-sm text-ink active:bg-bg"
      >
        <span className="min-w-0 truncate font-medium">{exercise.name}</span>
        <span className="micro shrink-0">{exercise.equipment}</span>
      </button>
    </li>
  );
}

/** Slot alternatives first, then the searchable catalog. */
export function SwapSheet({
  open,
  onClose,
  currentId,
  alternativeIds,
  catalog,
  onPick,
}: SwapSheetProps) {
  const [query, setQuery] = useState('');
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const alternatives = alternativeIds
    .filter((id) => id !== currentId)
    .flatMap((id) => {
      const e = byId.get(id);
      return e ? [e] : [];
    });
  const q = query.trim().toLowerCase();
  const others = catalog.filter(
    (e) =>
      e.id !== currentId &&
      !alternativeIds.includes(e.id) &&
      (q === '' || e.name.toLowerCase().includes(q)),
  );
  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title="Swap exercise">
      {alternatives.length > 0 ? (
        <section aria-label="Alternatives" className="mb-3">
          <SectionLabel as="h3" index={1} className="mb-1">
            Alternatives
          </SectionLabel>
          <ul>
            {alternatives.map((e) => (
              <Option key={e.id} exercise={e} onPick={onPick} />
            ))}
          </ul>
        </section>
      ) : null}
      <section aria-label="All exercises">
        <SectionLabel as="h3" index={alternatives.length > 0 ? 2 : 1} className="mb-2">
          All exercises
        </SectionLabel>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises"
          aria-label="Search exercises"
          className="mb-2 min-h-touch w-full rounded-btn border border-hairline-strong bg-bg px-3 text-base text-ink"
        />
        {others.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted">No matching exercises.</p>
        ) : (
          <ul>
            {others.map((e) => (
              <Option key={e.id} exercise={e} onPick={onPick} />
            ))}
          </ul>
        )}
      </section>
    </Sheet>
  );
}
