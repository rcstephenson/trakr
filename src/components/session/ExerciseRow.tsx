import * as sessionsRepo from '../../db/repositories/sessions';
import * as setsRepo from '../../db/repositories/sets';
import { prescriptionText, type SlotOption } from '../../domain/alternatives';
import { formatRepsText, formatWeightText } from '../../domain/setEntry';
import { InlineSelect } from '../ui';
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
  /**
   * The program's options for this slot (default first). With more than one, the name becomes a
   * dropdown that swaps the slot's exercise.
   */
  options?: SlotOption[];
  nameOf?: (exerciseId: string) => string;
  /** A primary lift of the workout: its name is blue so it stands out while logging. */
  primary?: boolean;
}

/**
 * One ledger row: the exercise on the left, its single weight + reps entry on the right. The entry
 * applies to all of the target's sets.
 */
export function ExerciseRow(props: ExerciseRowProps) {
  const { session, target, exercise, settings } = props;
  const slot = target.slotIndex;
  const load = exercise?.load ?? 'total';
  const name = exercise?.name ?? target.exerciseId;
  // A completion exercise is one "done" mark, whatever the slot's set count.
  const setCount = load === 'completion' ? 1 : Math.max(1, target.sets);

  const last = useLastPerformance(target.exerciseId, session.id);
  const lastSets = last?.sets;

  const slotSets = props.sets.filter(
    (s) => s.slotIndex === slot && s.exerciseId === target.exerciseId,
  );
  const logged = entrySet(slotSets);
  const skipped = !logged && (session.skippedSlots ?? []).includes(slot);
  const pre = prefillFromLast(lastSets, settings.unit);

  // A skipped row shows empty fields; a logged one its values; otherwise last time's prefill.
  const source = logged
    ? { weight: weightInUnit(logged, settings.unit), reps: logged.reps }
    : skipped
      ? null
      : pre;
  const baseWeight = source ? formatWeightText(source.weight, load) : '';
  const baseReps = source ? formatRepsText(source.reps) : '';

  async function skip() {
    if (!logged && !skipped) props.onLogged(slot);
    await sessionsRepo.skipSlot(session.id, slot, target.exerciseId);
  }

  const options = props.options ?? [];
  const swappable = options.length > 1;
  const primary = props.primary === true;
  const nameColor = primary ? 'text-lift' : 'text-ink';

  async function swap(exerciseId: string) {
    const option = options.find((o) => o.exerciseId === exerciseId);
    if (!option || exerciseId === target.exerciseId) return;
    await sessionsRepo.swapExercise(session.id, slot, exerciseId, {
      sets: option.sets,
      repMin: option.repMin,
      repMax: option.repMax,
    });
  }

  async function submit(parsed: ParsedEntry) {
    const wasDone = !!logged || skipped;
    // Move on right away so the keyboard stays up; the write lands a moment later.
    if (!wasDone) props.onLogged(slot);
    if (skipped) await sessionsRepo.unskipSlot(session.id, slot);
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
      data-skipped={skipped}
      data-primary={primary}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 z-10 hidden w-0.5 bg-accent-ink group-focus-within:block"
      />
      {/* relative: a swap dropdown covers this whole cell, a full-size target. */}
      <div className="relative min-w-0 py-2.5 pl-3 pr-2">
        <h3
          className={`text-sm font-semibold leading-[18px] tracking-tight [overflow-wrap:anywhere] ${nameColor}`}
        >
          <span className="num mr-1.5 text-xs font-medium text-muted">
            {String(slot + 1).padStart(2, '0')}
          </span>
          {swappable ? (
            <InlineSelect
              label={
                logged
                  ? `${name} (clear the entry to switch exercise)`
                  : `Exercise ${slot + 1}: switch to an alternative`
              }
              value={target.exerciseId}
              options={options.map((o) => ({
                value: o.exerciseId,
                label: props.nameOf?.(o.exerciseId) ?? o.exerciseId,
              }))}
              // Logged sets belong to the exercise they were logged for: clear the entry first.
              disabled={!!logged}
              onChange={(id) => void swap(id)}
              className={`text-sm font-semibold leading-[18px] tracking-tight ${nameColor}`}
            />
          ) : (
            name
          )}
          {primary ? <span className="sr-only"> (primary lift)</span> : null}
        </h3>
        <p className="num mt-1 text-xs leading-4 text-muted">
          {prescriptionText(target, load)}
        </p>
        {lastSets && lastSets.length > 0 ? (
          <p className="num text-xs leading-4 text-muted" data-testid="last-line">
            <span className="micro">Last</span>
            {' '}
            {formatLast(lastSets, settings.unit, exercise)}
          </p>
        ) : null}
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
          skipped={skipped}
          onSkip={() => void skip()}
          onUnskip={() => void sessionsRepo.unskipSlot(session.id, slot)}
        />
      </div>
    </li>
  );
}
