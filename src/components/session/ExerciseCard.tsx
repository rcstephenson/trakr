import { useState } from 'react';
import { ArrowLeftRight, Check, MessageSquare, Plus } from 'lucide-react';
import * as setsRepo from '../../db/repositories/sets';
import type { Exercise, Session, SessionTarget, SetEntry, Settings } from '../../domain/types';
import { useLastPerformance } from '../../hooks/useLastPerformance';
import { Button, Card, Sheet } from '../ui';
import { formatSets, prefillForSet, weightInUnit } from './prefill';
import { SetRow } from './SetRow';

export interface ExerciseCardProps {
  session: Session;
  target: SessionTarget;
  exercise: Exercise | undefined;
  /** Every set of the session. */
  sets: SetEntry[];
  settings: Settings;
  note: string;
  onSwap: () => void;
  onNote: () => void;
  onSetCompleted: (target: SessionTarget) => void;
}

/** A not-yet-logged row the user has touched (or that was auto-filled from the row above). */
interface Draft {
  weight: number | null;
  reps: number | null;
  touched: boolean;
  isWarmup: boolean;
  rir?: number;
}

function repRange(t: SessionTarget): string {
  return t.repMin === t.repMax ? `${t.repMin}` : `${t.repMin}–${t.repMax}`;
}

export function ExerciseCard(props: ExerciseCardProps) {
  const { session, target, exercise, settings, note } = props;
  const slot = target.slotIndex;
  const showWeight = exercise?.load !== 'none';
  const step = settings.increments[exercise?.equipment ?? 'other'];

  const last = useLastPerformance(target.exerciseId, session.id);
  const lastSets = last?.sets;

  const entries = new Map<number, SetEntry>();
  for (const s of props.sets) {
    if (s.slotIndex === slot && s.exerciseId === target.exerciseId) entries.set(s.setIndex, s);
  }
  const maxEntry = Math.max(-1, ...entries.keys());

  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [extra, setExtra] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [optionsRow, setOptionsRow] = useState<number | null>(null);

  const rowCount = Math.max(target.sets + extra, maxEntry + 1);
  const rows = Array.from({ length: rowCount }, (_, i) => i);
  const completedCount = rows.filter((i) => entries.has(i)).length;
  const allDone = rowCount > 0 && completedCount === rowCount;

  function valuesFor(i: number): { weight: number | null; reps: number | null; muted: boolean } {
    const entry = entries.get(i);
    if (entry) return { weight: weightInUnit(entry, settings.unit), reps: entry.reps, muted: false };
    const draft = drafts[i];
    if (draft) return { weight: draft.weight, reps: draft.reps, muted: !draft.touched };
    const pre = prefillForSet(lastSets, i, settings.unit);
    if (pre) return { ...pre, muted: true };
    return { weight: null, reps: null, muted: false };
  }

  function patchDraft(i: number, patch: Partial<Draft>) {
    setDrafts((d) => {
      const cur = valuesFor(i);
      const base: Draft = d[i] ?? {
        weight: cur.weight,
        reps: cur.reps,
        touched: false,
        isWarmup: false,
      };
      return { ...d, [i]: { ...base, ...patch } };
    });
  }

  function edit(i: number, patch: { weight?: number; reps?: number }) {
    const entry = entries.get(i);
    if (entry) {
      void setsRepo.update(entry.id, {
        ...(patch.weight !== undefined ? { weight: patch.weight, unit: settings.unit } : {}),
        ...(patch.reps !== undefined ? { reps: patch.reps } : {}),
      });
    } else {
      patchDraft(i, { ...patch, touched: true });
    }
  }

  async function toggle(i: number) {
    const entry = entries.get(i);
    if (entry) {
      // Un-complete: keep the logged numbers in the row so nothing the user typed is lost.
      patchDraft(i, {
        weight: weightInUnit(entry, settings.unit),
        reps: entry.reps,
        touched: true,
        isWarmup: entry.isWarmup,
        rir: entry.rir,
      });
      await setsRepo.remove(entry.id);
      return;
    }
    const v = valuesFor(i);
    if (v.reps === null || v.reps <= 0 || (showWeight && v.weight === null)) return;
    const draft = drafts[i];
    await setsRepo.add({
      sessionId: session.id,
      exerciseId: target.exerciseId,
      slotIndex: slot,
      setIndex: i,
      weight: showWeight ? (v.weight ?? 0) : 0,
      unit: settings.unit,
      reps: v.reps,
      isWarmup: draft?.isWarmup ?? false,
      ...(draft?.rir !== undefined ? { rir: draft.rir } : {}),
    });
    setDrafts((d) => {
      const next = { ...d };
      delete next[i];
      const j = i + 1;
      // Auto-fill the next row with the same numbers, unless history already prefills it.
      if (j < rowCount && !entries.has(j) && !next[j] && !prefillForSet(lastSets, j, settings.unit)) {
        next[j] = { weight: v.weight, reps: v.reps, touched: false, isWarmup: false };
      }
      return next;
    });
    props.onSetCompleted(target);
  }

  function setWarmup(i: number, isWarmup: boolean) {
    const entry = entries.get(i);
    if (entry) void setsRepo.update(entry.id, { isWarmup });
    else patchDraft(i, { isWarmup });
  }

  function setRir(i: number, rir: number | undefined) {
    const entry = entries.get(i);
    if (entry) void setsRepo.update(entry.id, { rir });
    else patchDraft(i, { rir });
  }

  async function deleteRow(i: number) {
    const entry = entries.get(i);
    if (entry) await setsRepo.remove(entry.id);
    setDrafts((d) => {
      const next = { ...d };
      delete next[i];
      return next;
    });
    if (i >= target.sets && i === rowCount - 1) setExtra((e) => Math.max(0, e - 1));
    setOptionsRow(null);
  }

  const name = exercise?.name ?? target.exerciseId;
  const loggedSets = rows.flatMap((i) => {
    const e = entries.get(i);
    return e ? [e] : [];
  });

  if (allDone && !expanded) {
    return (
      <Card className="!p-0" data-testid="exercise-card" data-slot={slot}>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={`${name}, all sets complete. Expand`}
          className="flex min-h-touch w-full items-center gap-3 p-4 text-left"
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success text-on-accent">
            <Check size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold text-text">{name}</span>
            <span className="block truncate text-xs text-muted">
              {formatSets(loggedSets, settings.unit, exercise)}
            </span>
          </span>
        </button>
      </Card>
    );
  }

  const weightLegend =
    exercise?.load === 'bodyweight-plus'
      ? `Added ${settings.unit}`
      : exercise?.load === 'per-hand'
        ? `${settings.unit} each`
        : settings.unit;

  const optionEntry = optionsRow !== null ? entries.get(optionsRow) : undefined;
  const optionDraft = optionsRow !== null ? drafts[optionsRow] : undefined;
  const optionWarmup = optionEntry?.isWarmup ?? optionDraft?.isWarmup ?? false;
  const optionRir = optionEntry ? optionEntry.rir : optionDraft?.rir;

  return (
    <Card className="!px-3" data-testid="exercise-card" data-slot={slot}>
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h3 className="min-w-0 text-base font-semibold text-text">{name}</h3>
        <span className="tabular shrink-0 text-xs text-muted">
          {target.sets} × {repRange(target)}
        </span>
      </div>
      {lastSets && lastSets.length > 0 ? (
        <p className="tabular mt-0.5 px-1 text-xs text-muted" data-testid="last-line">
          Last: {formatSets(lastSets, settings.unit, exercise)}
        </p>
      ) : null}
      {note ? <p className="mt-1 px-1 text-xs text-text">{note}</p> : null}

      <div className="mt-3 flex items-center justify-between gap-1 px-0 text-[11px] uppercase tracking-wide text-muted">
        <span className="w-7" aria-hidden="true" />
        {showWeight ? <span className="w-[124px] text-center">{weightLegend}</span> : null}
        <span className="w-[124px] text-center">Reps</span>
        <span className="w-12" aria-hidden="true" />
      </div>
      <ul className="mt-1 flex flex-col gap-1">
        {rows.map((i) => {
          const v = valuesFor(i);
          const entry = entries.get(i);
          const draft = drafts[i];
          return (
            <SetRow
              key={i}
              index={i}
              completed={!!entry}
              isWarmup={entry?.isWarmup ?? draft?.isWarmup ?? false}
              rir={entry ? entry.rir : draft?.rir}
              weight={v.weight}
              reps={v.reps}
              muted={v.muted}
              showWeight={showWeight}
              weightStep={step}
              onWeight={(w) => edit(i, { weight: w })}
              onReps={(r) => edit(i, { reps: r })}
              onToggle={() => void toggle(i)}
              onOptions={() => setOptionsRow(i)}
            />
          );
        })}
      </ul>

      <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-border pt-2">
        <Button variant="ghost" onClick={() => setExtra(rowCount + 1 - target.sets)}>
          <Plus size={16} aria-hidden="true" />
          Add set
        </Button>
        <Button variant="ghost" onClick={props.onSwap}>
          <ArrowLeftRight size={16} aria-hidden="true" />
          Swap exercise
        </Button>
        <Button variant="ghost" onClick={props.onNote}>
          <MessageSquare size={16} aria-hidden="true" />
          Note
        </Button>
      </div>

      <Sheet
        open={optionsRow !== null}
        onClose={() => setOptionsRow(null)}
        title={`Set ${(optionsRow ?? 0) + 1} options`}
      >
        <div className="flex flex-col gap-4">
          <Button
            variant={optionWarmup ? 'primary' : 'secondary'}
            fullWidth
            aria-pressed={optionWarmup}
            onClick={() => optionsRow !== null && setWarmup(optionsRow, !optionWarmup)}
          >
            Warm-up set
          </Button>
          <div>
            <p className="mb-2 text-sm text-muted">Reps in reserve</p>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  variant={optionRir === n ? 'primary' : 'secondary'}
                  className="flex-1 !px-0"
                  aria-pressed={optionRir === n}
                  aria-label={`RIR ${n}`}
                  onClick={() =>
                    optionsRow !== null && setRir(optionsRow, optionRir === n ? undefined : n)
                  }
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
          <Button
            variant="danger"
            fullWidth
            onClick={() => optionsRow !== null && void deleteRow(optionsRow)}
          >
            Delete set
          </Button>
          <Button variant="secondary" fullWidth onClick={() => setOptionsRow(null)}>
            Done
          </Button>
        </div>
      </Sheet>
    </Card>
  );
}
