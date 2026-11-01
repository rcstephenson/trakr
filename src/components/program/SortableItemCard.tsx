import { useEffect, useId, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { GripVertical, Plus, Trash2, X } from 'lucide-react';
import { Card } from '../ui';
import type { WorkoutItem } from '../../domain/types';

export interface DraftItem {
  key: string;
  item: WorkoutItem;
}

/** Small labelled whole-number input (sets / reps). Commits valid numbers >= 1 as you type. */
function NumberField({
  label,
  caption,
  value,
  onChange,
}: {
  label: string;
  caption: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText(String(value));
  }, [value]);
  return (
    <div className="flex-1">
      <label htmlFor={id} className="micro block">
        <span className="sr-only">{label}</span>
        <span aria-hidden="true">{caption}</span>
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(e) => {
          const t = e.target.value.replace(/\D/g, '');
          setText(t);
          const n = Number.parseInt(t, 10);
          if (Number.isFinite(n) && n >= 1) onChange(n);
        }}
        onBlur={() => setText(String(value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className="num mt-1 min-h-touch w-full rounded-btn border border-hairline-strong bg-raised px-3 text-center text-base font-semibold text-ink"
      />
    </div>
  );
}
export function SortableItemCard({
  draft,
  nameOf,
  onChange,
  onRemove,
  onAddAlternative,
}: {
  draft: DraftItem;
  nameOf: (id: string) => string;
  onChange: (item: WorkoutItem) => void;
  onRemove: () => void;
  onAddAlternative: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: draft.key });
  const { item } = draft;
  const name = nameOf(item.exerciseId);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
        position: 'relative',
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      <Card
        tone="raised"
        className={isDragging ? 'ring-2 ring-accent' : ''}
        role="group"
        aria-label={name}
      >
        <div className="mb-2 flex items-center gap-1">
          <button
            type="button"
            ref={setActivatorNodeRef}
            aria-label={`Reorder ${name}`}
            className="-ml-2 inline-flex min-h-touch min-w-touch touch-none items-center justify-center rounded-btn text-muted"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={22} aria-hidden="true" />
          </button>
          <h2 className="min-w-0 flex-1 font-mono text-xs font-semibold uppercase tracking-wide text-ink">
            {name}
          </h2>
          <button
            type="button"
            aria-label={`Remove ${name}`}
            onClick={onRemove}
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-btn text-muted"
          >
            <Trash2 size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-end gap-2">
          <NumberField
            label={`Sets for ${name}`}
            caption="Sets"
            value={item.sets}
            onChange={(sets) => onChange({ ...item, sets })}
          />
          <NumberField
            label={`Min reps for ${name}`}
            caption="Min reps"
            value={item.repMin}
            onChange={(repMin) =>
              onChange({ ...item, repMin, repMax: Math.max(repMin, item.repMax) })
            }
          />
          <NumberField
            label={`Max reps for ${name}`}
            caption="Max reps"
            value={item.repMax}
            onChange={(repMax) =>
              onChange({ ...item, repMax, repMin: Math.min(repMax, item.repMin) })
            }
          />
        </div>
        <label className="micro mt-3 block">
          Notes for {name}
          <input
            type="text"
            value={item.notes}
            onChange={(e) => onChange({ ...item, notes: e.target.value })}
            className="mt-1 min-h-touch w-full rounded-btn border border-hairline-strong bg-raised px-3 text-base normal-case tracking-normal text-ink"
          />
        </label>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {item.alternatives.map((alt) => (
            <span
              key={alt}
              className="inline-flex min-h-touch items-center gap-1 rounded-chip border border-hairline bg-bg pl-3 text-xs text-ink"
            >
              or {nameOf(alt)}
              <button
                type="button"
                aria-label={`Remove alternative ${nameOf(alt)}`}
                onClick={() =>
                  onChange({ ...item, alternatives: item.alternatives.filter((a) => a !== alt) })
                }
                className="inline-flex min-h-touch min-w-touch items-center justify-center text-muted"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onAddAlternative}
            className="inline-flex min-h-touch items-center gap-1 rounded-btn px-2 font-mono text-xs font-semibold uppercase tracking-micro text-accent"
          >
            <Plus size={16} aria-hidden="true" />
            Add alternative
          </button>
        </div>
      </Card>
    </div>
  );
}
