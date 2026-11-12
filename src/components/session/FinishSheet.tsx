import type { Exercise, SetEntry, Unit } from '../../domain/types';
import { findPRs } from '../../domain/stats';
import { formatWeight } from '../../domain/units';
import { Button, SectionLabel, Sheet } from '../ui';
import { usePriorSets } from './hooks';
import { weightInUnit } from './prefill';

export interface FinishSheetProps {
  open: boolean;
  onClose: () => void;
  sets: SetEntry[];
  /** Names of the exercises with no sets, which Finish records as skipped. */
  skipped?: string[];
  exercises: Map<string, Exercise>;
  unit: Unit;
  durationMs: number;
  busy: boolean;
  onFinish: () => void;
  onDiscard: () => void;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-btn border border-hairline bg-bg p-3">
      <p className="micro">{label}</p>
      <p className="num mt-1 whitespace-nowrap text-base font-semibold tracking-tight text-ink">
        {value}
      </p>
    </div>
  );
}

/** Summary (duration, sets, volume, PRs) before marking the session completed. */
export function FinishSheet(props: FinishSheetProps) {
  const { open, sets, exercises, unit } = props;
  const working = sets.filter((s) => !s.isWarmup);
  const exerciseIds = [...new Set(working.map((s) => s.exerciseId))];
  const prior = usePriorSets(exerciseIds, unit, open && working.length > 0);

  const volume = working.reduce((sum, s) => sum + weightInUnit(s, unit) * s.reps, 0);

  const prs = exerciseIds.flatMap((id) => {
    const mine = working
      .filter((s) => s.exerciseId === id)
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
      .map((s) => ({ weight: weightInUnit(s, unit), reps: s.reps, isWarmup: false }));
    return findPRs(prior?.[id] ?? [], mine).map((pr) => ({ id, ...pr }));
  });

  const empty = sets.length === 0;
  // No timers in trakr: a zero / sub-minute duration (e.g. a backfilled session) is just noise.
  const showDuration = props.durationMs >= 60_000;

  return (
    <Sheet open={open} onClose={props.onClose} title={empty ? 'No sets logged' : 'Workout summary'}>
      {empty ? (
        <>
          <p className="mb-4 text-sm text-muted">
            Nothing logged yet. Discard this workout, or keep logging.
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="danger" fullWidth disabled={props.busy} onClick={props.onDiscard}>
              Discard workout
            </Button>
            <Button variant="secondary" fullWidth onClick={props.onClose}>
              Keep logging
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className={`mb-4 grid gap-2 ${showDuration ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {showDuration ? (
              <Stat label="Duration" value={formatDuration(props.durationMs)} />
            ) : null}
            <Stat label="Sets" value={String(working.length)} />
            <Stat label="Volume" value={formatWeight(Math.round(volume), unit, unit)} />
          </div>
          {prs.length > 0 ? (
            <section aria-label="Personal records" className="mb-4">
              <SectionLabel as="h3" className="mb-2">
                Records
              </SectionLabel>
              <ul className="flex flex-col gap-1">
                {prs.map((pr, i) => {
                  const ex = exercises.get(pr.id);
                  const w = formatWeight(pr.set.weight, unit, unit, {
                    perHand: ex?.load === 'per-hand',
                    bodyweightPlus: ex?.load === 'bodyweight-plus',
                  });
                  return (
                    <li
                      key={i}
                      className="flex items-center gap-2 border-t border-hairline py-2 text-sm text-ink first:border-t-0"
                    >
                      <span role="img" aria-label="Personal record">
                        🏆
                      </span>
                      <span className="min-w-0 flex-1 truncate">{ex?.name ?? pr.id}</span>
                      <span className="num shrink-0 font-semibold text-ink">
                        {w} × {pr.set.reps}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
          {props.skipped && props.skipped.length > 0 ? (
            <section aria-label="Skipped exercises" className="mb-4">
              <SectionLabel as="h3" className="mb-2">
                Skipped
              </SectionLabel>
              <p className="text-sm text-muted" data-testid="finish-skipped">
                {props.skipped.join(', ')}
              </p>
            </section>
          ) : null}
          <div className="flex flex-col gap-2">
            <Button fullWidth disabled={props.busy} onClick={props.onFinish}>
              Finish workout
            </Button>
            <Button variant="secondary" fullWidth onClick={props.onClose}>
              Keep logging
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}
