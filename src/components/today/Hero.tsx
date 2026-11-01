import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as sessionsRepo from '../../db/repositories/sessions';
import type { Session } from '../../domain/types';
import { useSessionSets } from '../../hooks/useSessionSets';
import { formatShortDate, fromDateKey, toDateKey } from '../../lib/dates';
import { numInputClass } from '../activity/fields';
import { DiscardWorkoutDialog } from '../session/DiscardWorkoutDialog';
import { Button, buttonClass, Card, Chip, Mono, SegmentedBar, type SegmentState } from '../ui';

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
            className={`micro flex-1 text-center ${
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

export interface WorkoutOption {
  id: string;
  name: string;
  exerciseCount: number;
}

export interface NextUpHeroProps {
  workouts: WorkoutOption[];
  /** The rotation's next workout (marked NEXT). */
  nextId: string;
  selectedId: string;
  onSelect: (workoutId: string) => void;
  /** Selected day and today, as `YYYY-MM-DD` (today is the upper bound). */
  dayKey: string;
  todayKey: string;
  onDayChange: (dayKey: string) => void;
  starting: boolean;
  onStart: () => void;
  cycle?: CycleSlot[];
  /** Index of the next slot within `cycle`; -1 when unknown. */
  nextIndex?: number;
}

function yesterdayKey(todayKey: string): string {
  const d = fromDateKey(todayKey) ?? new Date();
  d.setDate(d.getDate() - 1);
  return toDateKey(d);
}

export function NextUpHero({
  workouts,
  nextId,
  selectedId,
  onSelect,
  dayKey,
  todayKey,
  onDayChange,
  starting,
  onStart,
  cycle,
  nextIndex = -1,
}: NextUpHeroProps) {
  const selected = workouts.find((w) => w.id === selectedId) ?? workouts[0];
  if (!selected) return null;
  const yesterday = yesterdayKey(todayKey);
  const isToday = dayKey === todayKey;
  const day = fromDateKey(dayKey);
  const startLabel = isToday
    ? `Start ${selected.name}`
    : `Log ${selected.name}${day ? ` · ${formatShortDate(day)}` : ''}`;
  return (
    <Card tone="raised" className="flex flex-col gap-5 p-5">
      <div>
        <p className="micro flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-2 rounded-[2px] bg-accent" />
          {selected.id === nextId ? 'Next up' : 'Selected'}
        </p>
        <h2 className="mt-2 break-words text-display font-semibold tracking-tighter text-ink">
          {selected.name}
        </h2>
        <p className="micro mt-1">
          <Mono className="text-ink">{selected.exerciseCount}</Mono>{' '}
          {selected.exerciseCount === 1 ? 'exercise' : 'exercises'}
        </p>
      </div>
      {cycle && cycle.length > 0 ? <CycleStrip cycle={cycle} nextIndex={nextIndex} /> : null}

      <div role="radiogroup" aria-label="Workout" className="grid grid-cols-2 gap-2">
        {workouts.map((w) => {
          const on = w.id === selected.id;
          return (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onSelect(w.id)}
              className={[
                'relative flex min-h-[56px] flex-col items-start justify-center gap-0.5 rounded-btn border px-3 py-2 text-left transition-colors',
                on ? 'border-ink bg-bg' : 'border-hairline bg-surface',
              ].join(' ')}
            >
              <span className="w-full truncate text-sm font-semibold tracking-tight text-ink">
                {w.name}
              </span>
              <span className="micro">
                {w.id === nextId ? (
                  <span className="text-accent-ink">NEXT</span>
                ) : (
                  <>
                    <Mono>{w.exerciseCount}</Mono> ex
                  </>
                )}
              </span>
              {on ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-0 h-0.5 bg-accent-ink"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div role="group" aria-label="Day" className="flex flex-col gap-2">
        <p className="micro">Day</p>
        <div className="flex flex-wrap items-center gap-2">
          <Chip selected={isToday} onClick={() => onDayChange(todayKey)}>
            Today
          </Chip>
          <Chip selected={dayKey === yesterday} onClick={() => onDayChange(yesterday)}>
            Yesterday
          </Chip>
          <input
            type="date"
            aria-label="Pick a date"
            value={dayKey}
            max={todayKey}
            onChange={(e) => {
              // Ignore a cleared field and any future date typed by hand.
              if (e.target.value && e.target.value <= todayKey) onDayChange(e.target.value);
            }}
            className={`${numInputClass} !w-auto min-w-[9.5rem] flex-1`}
          />
        </div>
      </div>

      <Button fullWidth disabled={starting} onClick={onStart} className="min-h-[56px] text-base">
        {startLabel}
      </Button>
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
  const navigate = useNavigate();
  const sets = useSessionSets(session.id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const backdated = sessionsRepo.isBackdated(session);

  async function discard() {
    setConfirmOpen(false);
    await sessionsRepo.remove(session.id);
    navigate('/');
  }

  return (
    <Card tone="raised" className="relative flex flex-col gap-5 overflow-hidden p-5 pl-6">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-accent-ink" />
      <div>
        <p className="micro flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-2 rounded-[2px] bg-accent" />
          {backdated ? (
            <>
              In progress · logging for <Mono>{formatShortDate(new Date(session.startedAt))}</Mono>
            </>
          ) : (
            <>
              In progress · started <Mono>{formatStartedAt(session.startedAt)}</Mono>
            </>
          )}
        </p>
        <h2 className="mt-2 break-words text-display font-semibold tracking-tighter text-ink">
          {session.workoutName}
        </h2>
      </div>
      <div className="flex flex-col gap-2">
        <Link
          to={`/session/${session.id}`}
          className={`${buttonClass('primary', true)} min-h-[56px] text-base`}
        >
          Resume {session.workoutName}
        </Link>
        <Button
          variant="secondary"
          fullWidth
          aria-label="Discard workout"
          onClick={() => setConfirmOpen(true)}
        >
          Discard
        </Button>
      </div>
      <DiscardWorkoutDialog
        open={confirmOpen}
        setCount={sets?.length ?? 0}
        onConfirm={() => void discard()}
        onCancel={() => setConfirmOpen(false)}
      />
    </Card>
  );
}
