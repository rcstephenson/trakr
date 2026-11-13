import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Pencil } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Card, InlineSelect, Mono, SectionLabel } from '../ui';
import { prescriptionText, slotOptions } from '../../domain/alternatives';
import type { LoadType, Program, WorkoutItem, WorkoutTemplate } from '../../domain/types';

export function SchedulePills({ program }: { program: Program }) {
  const names = new Map(program.workouts.map((w) => [w.id, w.name]));
  return (
    // Equal-width columns so a full week fits the screen without horizontal scrolling;
    // workout names wrap onto two lines ("Upper / A") instead of widening the pill.
    <ol
      aria-label="Weekly schedule"
      className="grid gap-0.5 px-gutter pb-1"
      style={{ gridTemplateColumns: `repeat(${program.schedule.length}, minmax(0, 1fr))` }}
    >
      {program.schedule.map((entry, i) => {
        const rest = entry === 'rest';
        return (
          <li
            key={i}
            className={[
              'relative flex min-w-0 flex-col items-center overflow-hidden rounded-chip border px-0 py-1.5 text-center',
              rest ? 'border-dashed border-hairline text-muted' : 'border-ink bg-raised text-ink',
            ].join(' ')}
          >
            {rest ? null : (
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-accent-ink" />
            )}
            <span className="micro" aria-hidden="true">
              D{i + 1}
            </span>
            <span className="sr-only">Day {i + 1}: </span>
            <span className="mt-0.5 w-full break-words text-[11px] font-semibold leading-tight tracking-tight">
              {rest ? 'Rest' : (names.get(entry) ?? entry)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function WorkoutCard({
  program,
  workout,
  index,
}: {
  program: Program;
  workout: WorkoutTemplate;
  index?: number;
}) {
  const names = new Map(program.exercises.map((e) => [e.id, e.name]));
  const nameOf = (id: string) => names.get(id) ?? id;
  const loads = new Map(program.exercises.map((e) => [e.id, e.load]));
  const loadOf = (id: string) => loads.get(id);
  const idx = index !== undefined ? String(index).padStart(2, '0') : null;
  return (
    <Card aria-label={workout.name} role="region" className="!p-0">
      <div className="flex items-center justify-between gap-2 border-b border-hairline py-1 pl-3 pr-1">
        <h2 className="flex min-w-0 items-baseline gap-2 text-base font-semibold tracking-tight text-ink">
          {idx ? (
            <span aria-hidden="true" className="num text-xs font-medium text-accent">
              {idx}
            </span>
          ) : null}
          <span className="truncate">{workout.name}</span>
        </h2>
        <Link
          to={`/program/edit/${workout.id}`}
          aria-label={`Edit ${workout.name}`}
          className="inline-flex min-h-touch items-center gap-1.5 rounded-btn px-3 font-mono text-xs font-semibold uppercase tracking-micro text-accent"
        >
          <Pencil size={14} aria-hidden="true" />
          Edit
        </Link>
      </div>
      <ol className="divide-y divide-hairline">
        {workout.items.map((item, i) => (
          <WorkoutItemRow key={i} item={item} index={i} nameOf={nameOf} loadOf={loadOf} />
        ))}
      </ol>
    </Card>
  );
}

/**
 * One exercise of a workout card. With alternatives, the name is a dropdown that previews each
 * option's own sets, reps and notes (the swap itself happens on the session screen).
 */
function WorkoutItemRow({
  item,
  index,
  nameOf,
  loadOf,
}: {
  item: WorkoutItem;
  index: number;
  nameOf: (id: string) => string;
  loadOf: (id: string) => LoadType | undefined;
}) {
  const options = slotOptions(item);
  const [selectedId, setSelectedId] = useState(item.exerciseId);
  const shown = options.find((o) => o.exerciseId === selectedId) ?? options[0];
  const nameClass = `text-sm text-ink ${item.primary ? 'font-bold' : 'font-medium'}`;
  return (
    // relative: the dropdown covers the whole row, so the tap target is the full width.
    <li className="relative flex gap-3 px-3 py-2">
      <Mono className="w-5 shrink-0 pt-0.5 text-xs text-muted">
        {String(index + 1).padStart(2, '0')}
      </Mono>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0">
            {options.length > 1 ? (
              <InlineSelect
                label={`Exercise ${index + 1} and its alternatives`}
                value={shown.exerciseId}
                options={options.map((o) => ({ value: o.exerciseId, label: nameOf(o.exerciseId) }))}
                onChange={setSelectedId}
                className={nameClass}
              />
            ) : (
              <span className={nameClass}>{nameOf(item.exerciseId)}</span>
            )}
            {item.primary ? <span className="sr-only"> (primary lift)</span> : null}
          </span>
          <Mono className="shrink-0 text-xs text-ink">
            {prescriptionText(shown, loadOf(shown.exerciseId))}
          </Mono>
        </div>
        {shown.notes ? <p className="text-xs text-muted">{shown.notes}</p> : null}
      </div>
    </li>
  );
}

export function NotesSection({ notes }: { notes: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="!py-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-touch w-full items-center justify-between gap-3 text-left"
      >
        <SectionLabel as="p" className="flex-1">
          Notes
        </SectionLabel>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`shrink-0 text-muted ${open ? 'rotate-180 transition-transform' : 'transition-transform'}`}
        />
      </button>
      {open ? (
        <div className="pb-4 pt-1 text-sm leading-relaxed text-ink [&_a]:text-accent [&_em]:italic [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2:first-child]:mt-0 [&_h2]:mb-1.5 [&_h2]:mt-5 [&_h2]:border-b [&_h2]:border-hairline [&_h2]:pb-1 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:text-muted [&_li]:mb-1 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p]:text-muted [&_strong]:font-semibold [&_strong]:text-ink [&_table]:mb-2 [&_table]:block [&_table]:overflow-x-auto [&_td]:border-b [&_td]:border-hairline [&_td]:px-2 [&_td]:py-1 [&_th]:px-2 [&_th]:text-left [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:marker:text-muted">
          <ReactMarkdown>{notes}</ReactMarkdown>
        </div>
      ) : null}
    </Card>
  );
}
