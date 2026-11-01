import { useState } from 'react';
import { Plus, Trophy } from 'lucide-react';
import * as setsRepo from '../../db/repositories/sets';
import { formatWeight } from '../../domain/units';
import type { Exercise, SetEntry, Settings } from '../../domain/types';
import { weightInUnit } from '../session/prefill';
import { SetRow } from '../session/SetRow';
import { Button, Card, Sheet } from '../ui';
import type { SetGroup } from './detail';

export interface ExerciseSetsProps {
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
  group,
  exercise,
  settings,
  note,
  editing,
  prSetIds,
}: ExerciseSetsProps) {
  const [optionsId, setOptionsId] = useState<string | null>(null);
  const name = exercise?.name ?? group.exerciseId;
  const showWeight = exercise?.load !== 'none';
  const step = settings.increments[exercise?.equipment ?? 'other'];
  const optionSet = group.sets.find((s) => s.id === optionsId);

  async function addSet() {
    const last = group.sets[group.sets.length - 1];
    await setsRepo.add({
      sessionId: last.sessionId,
      exerciseId: group.exerciseId,
      slotIndex: group.slotIndex,
      setIndex: Math.max(...group.sets.map((s) => s.setIndex)) + 1,
      weight: last.weight,
      unit: last.unit,
      reps: last.reps,
    });
  }

  return (
    <Card className="!px-3" data-testid="detail-exercise">
      <h3 className="px-1 text-base font-semibold text-text">{name}</h3>
      {note ? <p className="mt-1 px-1 text-xs text-text">{note}</p> : null}

      {editing ? (
        <>
          <ul className="mt-2 flex flex-col gap-1">
            {group.sets.map((s, i) => (
              <SetRow
                key={s.id}
                index={i}
                completed
                isWarmup={s.isWarmup}
                rir={s.rir}
                weight={weightInUnit(s, settings.unit)}
                reps={s.reps}
                muted={false}
                showWeight={showWeight}
                weightStep={step}
                onWeight={(w) => void setsRepo.update(s.id, { weight: w, unit: settings.unit })}
                onReps={(r) => void setsRepo.update(s.id, { reps: r })}
                onToggle={() => void setsRepo.remove(s.id)}
                onOptions={() => setOptionsId(s.id)}
              />
            ))}
          </ul>
          <div className="mt-2 border-t border-border pt-2">
            <Button variant="ghost" onClick={() => void addSet()}>
              <Plus size={16} aria-hidden="true" />
              Add set
            </Button>
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
        <ul className="mt-2 flex flex-col">
          {group.sets.map((s, i) => {
            const pr = prSetIds.has(s.id);
            return (
              <li
                key={s.id}
                data-testid="detail-set"
                className={`tabular flex min-h-[40px] items-center gap-3 px-1 text-base ${
                  s.isWarmup ? 'text-muted opacity-70' : 'text-text'
                }`}
              >
                <span className="w-6 text-sm text-muted">{s.isWarmup ? 'W' : i + 1}</span>
                <span className="font-medium">{setText(s, exercise, settings)}</span>
                {s.rir !== undefined ? (
                  <span className="text-xs text-muted">RIR {s.rir}</span>
                ) : null}
                {pr ? (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-pr">
                    <Trophy size={14} aria-hidden="true" />
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
