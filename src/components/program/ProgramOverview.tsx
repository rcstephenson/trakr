import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Pencil } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Card } from '../ui';
import type { Program, WorkoutTemplate } from '../../domain/types';

export function SchedulePills({ program }: { program: Program }) {
  const names = new Map(program.workouts.map((w) => [w.id, w.name]));
  return (
    <ol aria-label="Weekly schedule" className="flex gap-2 overflow-x-auto px-gutter pb-1">
      {program.schedule.map((entry, i) => {
        const rest = entry === 'rest';
        return (
          <li
            key={i}
            className={[
              'flex min-w-[64px] shrink-0 flex-col items-center rounded-full border px-3 py-2',
              rest ? 'border-border text-muted' : 'border-accent bg-accent-soft text-accent',
            ].join(' ')}
          >
            <span className="text-xs text-muted">Day {i + 1}</span>
            <span className="whitespace-nowrap text-sm font-medium">
              {rest ? 'Rest' : (names.get(entry) ?? entry)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function WorkoutCard({ program, workout }: { program: Program; workout: WorkoutTemplate }) {
  const names = new Map(program.exercises.map((e) => [e.id, e.name]));
  const nameOf = (id: string) => names.get(id) ?? id;
  return (
    <Card aria-label={workout.name} role="region">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-text">{workout.name}</h2>
        <Link
          to={`/program/edit/${workout.id}`}
          aria-label={`Edit ${workout.name}`}
          className="inline-flex min-h-touch items-center gap-1 rounded-btn px-3 text-sm font-semibold text-accent"
        >
          <Pencil size={16} aria-hidden="true" />
          Edit
        </Link>
      </div>
      <ol className="divide-y divide-border">
        {workout.items.map((item, i) => (
          <li key={i} className="py-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-text">{nameOf(item.exerciseId)}</span>
              <span className="tabular shrink-0 text-sm text-text">
                {item.sets} × {item.repMin === item.repMax ? item.repMin : `${item.repMin}–${item.repMax}`}
              </span>
            </div>
            {item.notes ? <p className="text-xs text-muted">{item.notes}</p> : null}
            {item.alternatives.length > 0 ? (
              <p className="text-xs text-muted">
                or {item.alternatives.map(nameOf).join(', or ')}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function NotesSection({ notes }: { notes: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-touch w-full items-center justify-between text-left text-xl font-semibold text-text"
      >
        Notes
        <ChevronDown
          size={20}
          aria-hidden="true"
          className={open ? 'rotate-180 transition-transform' : 'transition-transform'}
        />
      </button>
      {open ? (
        <div className="mt-2 text-sm text-text [&_a]:text-accent [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:mb-1 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_table]:mb-2 [&_table]:block [&_table]:overflow-x-auto [&_td]:border-b [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:px-2 [&_th]:text-left [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5">
          <ReactMarkdown>{notes}</ReactMarkdown>
        </div>
      ) : null}
    </Card>
  );
}
