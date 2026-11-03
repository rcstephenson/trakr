import * as setsRepo from '../../db/repositories/sets';
import { formatRepsText, formatWeightText } from '../../domain/setEntry';
import type { Exercise, Session, SessionTarget, SetEntry, Settings } from '../../domain/types';
import { useLastPerformance } from '../../hooks/useLastPerformance';
import { EntryFields, type ParsedEntry } from './EntryFields';
import { entrySet, formatLast, prefillFromLast, weightInUnit } from './prefill';

export interface ExerciseRowProps {
  session: Session;
  target: SessionTarget;
  exercise: Exercise | undefined;
  /** Every set of the session. */
  sets: SetEntry[];
  settings: Settings;
  /** Called after a new exercise entry is logged, so the screen can move on to the next row. */
  onLogged: (slotIndex: number) => void;
}

function repRange(t: SessionTarget): string {
  return t.repMin === t.repMax ? `${t.repMin}` : `${t.repMin}–${t.repMax}`;
}

/**
 * One ledger row: the exercise on the left, its single weight + reps entry on the right. The entry
 * applies to all of the target's sets (SPEC 6.1).
 */
export function ExerciseRow(props: ExerciseRowProps) {
  const { session, target, exercise, settings } = props;
  const slot = target.slotIndex;
  const load = exercise?.load ?? 'total';
  const name = exercise?.name ?? target.exerciseId;
  const setCount = Math.max(1, target.sets);

  const last = useLastPerformance(target.exerciseId, session.id);
  const lastSets = last?.sets;

  const slotSets = props.sets.filter(
    (s) => s.slotIndex === slot && s.exerciseId === target.exerciseId,
  );
  const logged = entrySet(slotSets);
  const pre = prefillFromLast(lastSets, settings.unit);

  const source = logged ? { weight: weightInUnit(logged, settings.unit), reps: logged.reps } : pre;
  const baseWeight = source ? formatWeightText(source.weight, load) : '';
  const baseReps = source ? formatRepsText(source.reps) : '';

  async function submit(parsed: ParsedEntry) {
    const wasLogged = !!logged;
    // Move on right away so the keyboard stays up; the write lands a moment later.
    if (!wasLogged) props.onLogged(slot);
    await setsRepo.replaceExerciseSets({
      sessionId: session.id,
      slotIndex: slot,
      exerciseId: target.exerciseId,
      count: setCount,
      weight: parsed.weight,
      unit: parsed.unit,
      reps: parsed.reps,
    });
  }

  return (
    <li
      className="group relative grid min-h-16 grid-cols-[minmax(0,42fr)_minmax(0,58fr)] border-t border-hairline first:border-t-0"
      data-testid="exercise-row"
      data-slot={slot}
      data-logged={!!logged}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 hidden w-0.5 bg-accent-ink group-focus-within:block"
      />
      <div className="min-w-0 py-2.5 pl-3 pr-2">
        <h3 className="text-sm font-semibold leading-[18px] tracking-tight text-ink [overflow-wrap:anywhere]">
          <span className="num mr-1.5 text-xs font-medium text-muted">
            {String(slot + 1).padStart(2, '0')}
          </span>
          {name}
        </h3>
        <p className="num mt-1 text-xs leading-4 text-muted">
          {target.sets} × {repRange(target)}
          {lastSets && lastSets.length > 0 ? (
            <span data-testid="last-line">
              {' · '}
              <span className="micro">Last</span> {formatLast(lastSets, settings.unit, exercise)}
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex border-l border-hairline">
        <EntryFields
          label={name}
          load={load}
          unit={settings.unit}
          baseWeight={baseWeight}
          baseReps={baseReps}
          completed={!!logged}
          onSubmit={(p) => void submit(p)}
          onUnlog={() => void setsRepo.removeExerciseSets(session.id, slot, target.exerciseId)}
        />
      </div>
    </li>
  );
}
