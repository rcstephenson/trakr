import { useState } from 'react';
import { Plus, Trophy } from 'lucide-react';
import * as setsRepo from '../../db/repositories/sets';
import { formatRepsText, formatWeightText } from '../../domain/setEntry';
import { formatWeight } from '../../domain/units';
import type { Exercise, SetEntry, Settings } from '../../domain/types';
import { weightInUnit } from '../session/prefill';
import { EntryFields } from '../session/EntryFields';
import { Button, Card, Sheet } from '../ui';
import { formatUniformRun, isUniformRun, type SetGroup } from './detail';

export interface ExerciseSetsProps {
  sessionId: string;
  group: SetGroup;
  exercise: Exercise | undefined;
  settings: Settings;
  note?: string;
  editing: boolean;
  /** Ids of sets that set a PR. */
  prSetIds: ReadonlySet<string>;
}

function setText(s: SetEntry, exercise: Exercise | undefined, settings: Settings): string {
  if (exercise?.load === 'none') return `${s.reps} reps`;
  const w = formatWeight(s.weight, s.unit, settings.unit, {
    perHand: exercise?.load === 'per-hand',
    bodyweightPlus: exercise?.load === 'bodyweight-plus',
  });
  return `${w} × ${s.reps}`;
}

export function ExerciseSets({
  sessionId,
  group,
  exercise,
  settings,
  note,
  editing,
  prSetIds,
}: ExerciseSetsProps) {
  const [optionsId, setOptionsId] = useState<string | null>(null);
  const name = exercise?.name ?? group.exerciseId;
  const load = exercise?.load ?? 'total';
  const optionSet = group.sets.find((s) => s.id === optionsId);

  // Read view rows: identical working sets collapse into one "3 × 100 lb × 8" line; warm-ups and
  // legacy differing sets stay one row each.
  const working = group.sets.filter((s) => !s.isWarmup);
  const uniform = isUniformRun(working);
  const readRows: { sets: SetEntry[]; number: number }[] = [];
  group.sets.forEach((s, i) => {
    if (uniform && !s.isWarmup) {
      if (s === working[0]) readRows.push({ sets: working, number: i + 1 });
      return;
    }
    readRows.push({ sets: [s], number: i + 1 });
  });

  async function addSet() {
    const last = group.sets[group.sets.length - 1];
    await setsRepo.add({
      sessionId,
      exerciseId: group.exerciseId,
      slotIndex: group.slotIndex,
      setIndex: last ? Math.max(...group.sets.map((s) => s.setIndex)) + 1 : 0,
      weight: last ? last.weight : 0,
      unit: last ? last.unit : settings.unit,
      reps: last ? last.reps : (group.repMin ?? 1),
    });
  }

  return (
    <Card className="!p-0 overflow-hidden" data-testid="detail-exercise">
      <div className="px-3 pt-3">
        <h3 className="font-mono text-xs font-semibold uppercase leading-5 tracking-wide text-ink">
          <span className="mr-1.5 text-accent" aria-hidden="true">
            {String(group.slotIndex + 1).padStart(2, '0')} ·
          </span>
          {name}
        </h3>
        {note ? (
          <p className="mt-1.5 border-l-2 border-hairline pl-2 text-xs text-ink">{note}</p>
        ) : null}
      </div>

      {editing ? (
        <>
          <ul className="mt-2 border-t border-hairline">
            {group.sets.map((s, i) => (
              <li
                key={s.id}
                className="flex border-t border-hairline first:border-t-0"
                data-testid="edit-set-row"
              >
                <button
                  type="button"
                  onClick={() => setOptionsId(s.id)}
                  aria-label={`Set ${i + 1} options`}
                  className="num flex h-12 w-12 shrink-0 items-center justify-center text-xs font-medium text-muted"
                >
                  {s.isWarmup ? (
                    <span className="rounded-chip border border-pr px-1 font-semibold text-ink">
                      W
                    </span>
                  ) : (
                    String(i + 1).padStart(2, '0')
                  )}
                </button>
                <div className="flex min-w-0 flex-1 border-l border-hairline">
                  <EntryFields
                    label={`Set ${i + 1}`}
                    load={load}
                    unit={settings.unit}
                    baseWeight={formatWeightText(weightInUnit(s, settings.unit), load)}
                    baseReps={formatRepsText(s.reps)}
                    completed
                    onSubmit={(p) =>
                      void setsRepo.update(s.id, { weight: p.weight, unit: p.unit, reps: p.reps })
                    }
                    onUnlog={() => void setsRepo.remove(s.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-hairline">
            <button
              type="button"
              onClick={() => void addSet()}
              className="inline-flex min-h-touch w-full items-center justify-center gap-1.5 font-mono text-micro font-medium uppercase tracking-micro text-ink active:bg-bg"
            >
              <Plus size={14} aria-hidden="true" />
              Add set
            </button>
          </div>
          <Sheet
            open={optionsId !== null && !!optionSet}
            onClose={() => setOptionsId(null)}
            title={`Set ${optionSet ? group.sets.indexOf(optionSet) + 1 : ''} options`}
          >
            {optionSet ? (
              <div className="flex flex-col gap-4">
                <Button
                  variant={optionSet.isWarmup ? 'primary' : 'secondary'}
                  fullWidth
                  aria-pressed={optionSet.isWarmup}
                  onClick={() =>
                    void setsRepo.update(optionSet.id, { isWarmup: !optionSet.isWarmup })
                  }
                >
                  Warm-up set
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => {
                    void setsRepo.remove(optionSet.id);
                    setOptionsId(null);
                  }}
                >
                  Delete set
                </Button>
                <Button variant="secondary" fullWidth onClick={() => setOptionsId(null)}>
                  Done
                </Button>
              </div>
            ) : null}
          </Sheet>
        </>
      ) : (
        <ul className="mt-2 border-t border-hairline">
          {readRows.map((row) => {
            const pr = row.sets.some((x) => prSetIds.has(x.id));
            const first = row.sets[0];
            return (
              <li
                key={first.id}
                data-testid="detail-set"
                className={`num relative flex min-h-[44px] items-center gap-3 border-t border-hairline pr-3 text-base first:border-t-0 ${
                  first.isWarmup ? 'text-muted' : 'text-ink'
                }`}
              >
                <span className="w-10 text-center text-xs text-muted">
                  {first.isWarmup ? (
                    <span className="rounded-chip border border-pr px-1 font-semibold text-ink">
                      W
                    </span>
                  ) : row.sets.length > 1 ? null : (
                    String(row.number).padStart(2, '0')
                  )}
                </span>
                <span className="font-medium">
                  {row.sets.length > 1
                    ? formatUniformRun(row.sets, exercise, settings.unit)
                    : setText(first, exercise, settings)}
                </span>
                {first.rir !== undefined && row.sets.length === 1 ? (
                  <span className="micro">RIR {first.rir}</span>
                ) : null}
                {pr ? (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-ink">
                    <Trophy size={14} className="text-pr" aria-hidden="true" />
                    PR
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
