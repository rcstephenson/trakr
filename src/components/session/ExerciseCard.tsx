import { useRef, useState } from 'react';
import { ArrowLeftRight, Check, MessageSquare, Plus } from 'lucide-react';
import * as setsRepo from '../../db/repositories/sets';
import { formatSetEntry } from '../../domain/setEntry';
import type {
  Exercise,
  LoadType,
  Session,
  SessionTarget,
  SetEntry,
  Settings,
} from '../../domain/types';
import { useLastPerformance } from '../../hooks/useLastPerformance';
import { Button, Card, SectionLabel, SegmentedBar, Sheet } from '../ui';
import { formatSets, prefillForSet, weightInUnit } from './prefill';
import { SetRow, type ParsedSet } from './SetRow';

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
}

/** A not-yet-logged row's warm-up / RIR flags, and text carried over from a previous action. */
interface Draft {
  /** Text to show in the row (muted) in place of the history prefill. */
  text?: string;
  isWarmup?: boolean;
  rir?: number;
}

function repRange(t: SessionTarget): string {
  return t.repMin === t.repMax ? `${t.repMin}` : `${t.repMin}–${t.repMax}`;
}

export function ExerciseCard(props: ExerciseCardProps) {
  const { session, target, exercise, settings, note } = props;
  const slot = target.slotIndex;
  const load: LoadType = exercise?.load ?? 'total';

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
  const inputs = useRef<Record<number, HTMLInputElement | null>>({});

  const rowCount = Math.max(target.sets + extra, maxEntry + 1);
  const rows = Array.from({ length: rowCount }, (_, i) => i);
  const completedCount = rows.filter((i) => entries.has(i)).length;
  const allDone = rowCount > 0 && completedCount === rowCount;

  function historyText(i: number): string {
    const pre = prefillForSet(lastSets, i, settings.unit);
    return pre ? formatSetEntry(pre.weight, pre.reps, load) : '';
  }

  function baseTextFor(i: number): string {
    const entry = entries.get(i);
    if (entry) return formatSetEntry(weightInUnit(entry, settings.unit), entry.reps, load);
    return drafts[i]?.text ?? historyText(i);
  }

  function patchDraft(i: number, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [i]: { ...d[i], ...patch } }));
  }

  function focusNext(i: number) {
    for (let j = i + 1; j < rowCount; j++) {
      if (!entries.has(j)) {
        inputs.current[j]?.focus();
        return;
      }
    }
  }

  async function log(i: number, parsed: ParsedSet) {
    const entry = entries.get(i);
    if (entry) {
      await setsRepo.update(entry.id, {
        weight: parsed.weight,
        unit: parsed.unit,
        reps: parsed.reps,
      });
      return;
    }
    const draft = drafts[i];
    const text = formatSetEntry(parsed.weight, parsed.reps, load);
    // Move on right away so the keyboard stays up; the next row is prefilled below.
    focusNext(i);
    setDrafts((d) => {
      const next = { ...d };
      delete next[i];
      const j = i + 1;
      // Carry the numbers to the next row, unless history already prefills it.
      if (j < rowCount && !entries.has(j) && !next[j]?.text && !historyText(j)) {
        next[j] = { ...next[j], text };
      }
      return next;
    });
    await setsRepo.add({
      sessionId: session.id,
      exerciseId: target.exerciseId,
      slotIndex: slot,
      setIndex: i,
      weight: parsed.weight,
      unit: parsed.unit,
      reps: parsed.reps,
      isWarmup: draft?.isWarmup ?? false,
      ...(draft?.rir !== undefined ? { rir: draft.rir } : {}),
    });
  }

  async function unlog(i: number) {
    const entry = entries.get(i);
    if (!entry) return;
    // Keep the logged numbers in the row so nothing the user typed is lost.
    patchDraft(i, {
      text: formatSetEntry(weightInUnit(entry, settings.unit), entry.reps, load),
      isWarmup: entry.isWarmup,
      rir: entry.rir,
    });
    await setsRepo.remove(entry.id);
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

  const index = String(slot + 1).padStart(2, '0');

  if (allDone && !expanded) {
    return (
      <Card className="!p-0" data-testid="exercise-card" data-slot={slot}>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={`${name}, all sets complete. Expand`}
          className="flex min-h-touch w-full items-center gap-3 p-3 text-left"
        >
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-chip bg-accent text-on-accent">
            <Check size={16} strokeWidth={3} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-mono text-xs font-semibold uppercase tracking-wide text-ink">
              <span className="mr-1.5 text-muted">{index}</span>
              {name}
            </span>
            <span className="num block truncate text-xs text-muted">
              {formatSets(loggedSets, settings.unit, exercise)}
            </span>
          </span>
        </button>
      </Card>
    );
  }

  const optionEntry = optionsRow !== null ? entries.get(optionsRow) : undefined;
  const optionDraft = optionsRow !== null ? drafts[optionsRow] : undefined;
  const optionWarmup = optionEntry?.isWarmup ?? optionDraft?.isWarmup ?? false;
  const optionRir = optionEntry ? optionEntry.rir : optionDraft?.rir;
  const actionClass =
    'inline-flex min-h-touch flex-1 items-center justify-center gap-1.5 whitespace-nowrap font-mono text-micro font-medium uppercase tracking-micro text-ink active:bg-bg';

  return (
    <Card className="!p-0" data-testid="exercise-card" data-slot={slot}>
      <div className="px-3 pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 font-mono text-xs font-semibold uppercase leading-5 tracking-wide text-ink">
            <span className="mr-1.5 text-accent" aria-hidden="true">
              {index} ·
            </span>
            {name}
          </h3>
          <span className="num shrink-0 text-xs text-muted">
            {target.sets} × {repRange(target)}
          </span>
        </div>
        {lastSets && lastSets.length > 0 ? (
          <p className="num mt-1 text-xs text-muted" data-testid="last-line">
            <span className="micro mr-1.5">Last:</span>{' '}
            {formatSets(lastSets, settings.unit, exercise)}
          </p>
        ) : null}
        {note ? (
          <p className="mt-1.5 border-l-2 border-hairline pl-2 text-xs text-ink">{note}</p>
        ) : null}
        <SegmentedBar
          className="mt-3"
          value={completedCount}
          total={rowCount}
          label={`${completedCount} of ${rowCount} sets logged`}
        />
      </div>

      <ul className="mt-2 border-t border-hairline">
        {rows.map((i) => {
          const entry = entries.get(i);
          const draft = drafts[i];
          return (
            <SetRow
              key={i}
              index={i}
              completed={!!entry}
              isWarmup={entry?.isWarmup ?? draft?.isWarmup ?? false}
              rir={entry ? entry.rir : draft?.rir}
              load={load}
              unit={settings.unit}
              baseText={baseTextFor(i)}
              inputRef={(el) => {
                inputs.current[i] = el;
              }}
              onLog={(parsed) => void log(i, parsed)}
              onUnlog={() => void unlog(i)}
              onOptions={() => setOptionsRow(i)}
            />
          );
        })}
      </ul>

      <div className="flex divide-x divide-hairline border-t border-hairline">
        <button
          type="button"
          className={actionClass}
          onClick={() => setExtra(rowCount + 1 - target.sets)}
        >
          <Plus size={14} aria-hidden="true" />
          Add set
        </button>
        <button type="button" className={`${actionClass} !flex-[1.7]`} onClick={props.onSwap}>
          <ArrowLeftRight size={14} aria-hidden="true" />
          Swap exercise
        </button>
        <button type="button" className={actionClass} onClick={props.onNote}>
          <MessageSquare size={14} aria-hidden="true" />
          Note
        </button>
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
            <SectionLabel as="p" className="mb-2">
              Reps in reserve
            </SectionLabel>
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
