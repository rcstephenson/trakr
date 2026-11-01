import { useSortable } from '@dnd-kit/sortable';
import { GripVertical, Plus, Trash2, X } from 'lucide-react';
import { Card, Stepper } from '../ui';
import type { WorkoutItem } from '../../domain/types';

export interface DraftItem {
  key: string;
  item: WorkoutItem;
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
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: draft.key });
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
      <Card className={isDragging ? 'shadow-card ring-2 ring-accent' : ''} role="group" aria-label={name}>
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
          <h2 className="min-w-0 flex-1 text-base font-semibold text-text">{name}</h2>
          <button
            type="button"
            aria-label={`Remove ${name}`}
            onClick={onRemove}
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-btn text-muted"
          >
            <Trash2 size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Stepper
            label={`Sets for ${name}`}
            value={item.sets}
            step={1}
            min={1}
            onChange={(sets) => onChange({ ...item, sets })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Stepper
            label={`Min reps for ${name}`}
            value={item.repMin}
            step={1}
            min={1}
            onChange={(repMin) => onChange({ ...item, repMin, repMax: Math.max(repMin, item.repMax) })}
          />
          <Stepper
            label={`Max reps for ${name}`}
            value={item.repMax}
            step={1}
            min={1}
            onChange={(repMax) => onChange({ ...item, repMax, repMin: Math.min(repMax, item.repMin) })}
          />
        </div>

        <label className="mt-2 block text-xs text-muted">
          Notes for {name}
          <input
            type="text"
            value={item.notes}
            onChange={(e) => onChange({ ...item, notes: e.target.value })}
            className="mt-1 min-h-touch w-full rounded-btn border border-border bg-surface px-3 text-sm text-text"
          />
        </label>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {item.alternatives.map((alt) => (
            <span
              key={alt}
              className="inline-flex min-h-touch items-center gap-1 rounded-full border border-border pl-3 text-sm text-text"
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
            className="inline-flex min-h-touch items-center gap-1 rounded-btn px-2 text-sm font-semibold text-accent"
          >
            <Plus size={16} aria-hidden="true" />
            Add alternative
          </button>
        </div>
      </Card>
    </div>
  );
}
