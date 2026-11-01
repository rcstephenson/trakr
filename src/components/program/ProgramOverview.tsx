import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Pencil } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Card, Mono, SectionLabel } from '../ui';
import type { Program, WorkoutTemplate } from '../../domain/types';

export function SchedulePills({ program }: { program: Program }) {
  const names = new Map(program.workouts.map((w) => [w.id, w.name]));
  return (
    <ol aria-label="Weekly schedule" className="flex gap-1 overflow-x-auto px-gutter pb-1">
      {program.schedule.map((entry, i) => {
        const rest = entry === 'rest';
        return (
          <li
            key={i}
            className={[
              'relative flex min-w-[68px] shrink-0 flex-col items-start rounded-chip border px-2.5 py-2',
              rest ? 'border-dashed border-hairline text-muted' : 'border-ink bg-raised text-ink',
            ].join(' ')}
          >
            {rest ? null : (
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-accent" />
            )}
            <span className="micro">Day {i + 1}</span>
            <span className="mt-0.5 whitespace-nowrap text-sm font-semibold">
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
          <li key={i} className="flex gap-3 px-3 py-2">
            <Mono className="w-5 shrink-0 pt-0.5 text-xs text-muted">
              {String(i + 1).padStart(2, '0')}
            </Mono>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-ink">{nameOf(item.exerciseId)}</span>
                <Mono className="shrink-0 text-xs text-ink">
                  {item.sets} ×{' '}
                  {item.repMin === item.repMax ? item.repMin : `${item.repMin}–${item.repMax}`}
                </Mono>
              </div>
              {item.notes ? <p className="text-xs text-muted">{item.notes}</p> : null}
              {item.alternatives.length > 0 ? (
                <p className="text-xs text-muted">
                  or {item.alternatives.map(nameOf).join(', or ')}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </Card>
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
        <div className="pb-4 pt-1 text-sm text-ink [&_a]:text-accent [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:mb-1 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_table]:mb-2 [&_table]:block [&_table]:overflow-x-auto [&_td]:border-b [&_td]:border-hairline [&_td]:px-2 [&_td]:py-1 [&_th]:px-2 [&_th]:text-left [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5">
          <ReactMarkdown>{notes}</ReactMarkdown>
        </div>
      ) : null}
    </Card>
  );
}
