import { Link } from 'react-router-dom';
import type { Session } from '../../domain/types';
import { Button, buttonClass, Card, Mono, SegmentedBar, type SegmentState } from '../ui';

/** One slot of the program's repeating schedule (a workout or `rest`). */
export interface CycleSlot {
  id: string;
  /** Short label under the segment, e.g. `UA` or `REST`. */
  label: string;
}

/** `Upper A` -> `UA`; `rest` -> `REST`. */
export function slotLabel(id: string, name?: string): string {
  if (id === 'rest') return 'REST';
  const words = (name ?? id).split(/[\s-]+/).filter(Boolean);
  return words
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

/** The 7-day schedule as segments: slots before `nextIndex` are done, the next one is lit. */
function CycleStrip({ cycle, nextIndex }: { cycle: CycleSlot[]; nextIndex: number }) {
  const states: SegmentState[] = cycle.map((slot, i) => {
    if (slot.id === 'rest') return 'rest';
    if (i === nextIndex) return 'current';
    return i < nextIndex ? 'done' : 'off';
  });
  const next = cycle[nextIndex];
  return (
    <div data-testid="cycle-strip">
      <SegmentedBar
        states={states}
        label={`Schedule: ${cycle.map((c) => c.label).join(', ')}${next ? `; next is ${next.label}` : ''}`}
      />
      <ol className="mt-1.5 flex gap-1" aria-hidden="true">
        {cycle.map((slot, i) => (
          <li
            key={i}
            className={`micro flex-1 text-center text-[10px] ${
              i === nextIndex ? '!text-ink font-semibold' : ''
            }`}
          >
            {slot.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

export interface NextUpHeroProps {
  workoutName: string;
  exerciseCount: number;
  starting: boolean;
  onStart: () => void;
  onChoose: () => void;
  cycle?: CycleSlot[];
  /** Index of the next slot within `cycle`; -1 when unknown. */
  nextIndex?: number;
}

export function NextUpHero({
  workoutName,
  exerciseCount,
  starting,
  onStart,
  onChoose,
  cycle,
  nextIndex = -1,
}: NextUpHeroProps) {
  return (
    <Card tone="raised" className="flex flex-col gap-5 p-5">
      <div>
        <p className="micro flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-2 rounded-[2px] bg-accent" />
          Next up
        </p>
        <h2 className="mt-2 break-words text-display font-semibold tracking-tighter text-ink">
          {workoutName}
        </h2>
        <p className="micro mt-1">
          <Mono className="text-ink">{exerciseCount}</Mono>{' '}
          {exerciseCount === 1 ? 'exercise' : 'exercises'}
        </p>
      </div>
      {cycle && cycle.length > 0 ? <CycleStrip cycle={cycle} nextIndex={nextIndex} /> : null}
      <div className="flex flex-col gap-1">
        <Button fullWidth disabled={starting} onClick={onStart} className="min-h-[56px] text-base">
          Start
        </Button>
        <Button variant="ghost" fullWidth onClick={onChoose}>
          Choose another workout
        </Button>
      </div>
    </Card>
  );
}

/** `12:04` in the user's locale, 24h. Static: Trakr never shows a running clock. */
export function formatStartedAt(startedAt: string): string {
  return new Date(startedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function ResumeHero({ session }: { session: Session }) {
  return (
    <Card tone="raised" className="relative flex flex-col gap-5 overflow-hidden p-5 pl-6">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-accent" />
      <div>
        <p className="micro flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-2 rounded-[2px] bg-accent" />
          In progress · started <Mono>{formatStartedAt(session.startedAt)}</Mono>
        </p>
        <h2 className="mt-2 break-words text-display font-semibold tracking-tighter text-ink">
          {session.workoutName}
        </h2>
      </div>
      <Link
        to={`/session/${session.id}`}
        className={`${buttonClass('primary', true)} min-h-[56px] text-base`}
      >
        Resume {session.workoutName}
      </Link>
    </Card>
  );
}
