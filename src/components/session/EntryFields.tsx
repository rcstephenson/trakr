import { useEffect, useRef, useState } from 'react';
import { Check, CornerDownLeft, Minus } from 'lucide-react';
import { isSkipEntry, parseWeightReps, type WeightRepsResult } from '../../domain/setEntry';
import { formatWeight } from '../../domain/units';
import type { LoadType, Unit } from '../../domain/types';

export type ParsedEntry = Extract<WeightRepsResult, { ok: true }>;

export interface EntryFieldsProps {
  /** Accessible name stem: "Bench Press" gives "Bench Press weight" / "Bench Press reps". */
  label: string;
  load: LoadType;
  unit: Unit;
  /** Text shown until the user edits it: the logged values, a history prefill, or ''. */
  baseWeight: string;
  baseReps: string;
  completed: boolean;
  /** Called with the parsed values on Enter in reps / the log button (also rewrites a logged one). */
  onSubmit: (parsed: ParsedEntry) => void;
  /** Called by the tick on a logged entry. */
  onUnlog: () => void;
  /** The exercise is recorded as skipped. Only used where skipping is offered (`onSkip`). */
  skipped?: boolean;
  /** Submitting `x` or a blank entry records a skip. Without it, those entries are just invalid. */
  onSkip?: () => void;
  /** Called by the skipped mark to clear the skip. */
  onUnskip?: () => void;
}

function previewText(parsed: ParsedEntry, load: LoadType): string {
  if (load === 'none') return `${parsed.reps} reps`;
  const w = formatWeight(parsed.weight, parsed.unit, parsed.unit, {
    bodyweightPlus: load === 'bodyweight-plus',
    perHand: load === 'per-hand',
  });
  return `${w} × ${parsed.reps}`;
}

/**
 * The entry for a `completion` exercise: one button that marks it done (no weight or reps), and
 * un-marks it once done.
 */
function CompletionEntry(props: {
  label: string;
  unit: Unit;
  completed: boolean;
  skipped: boolean;
  onSubmit: (parsed: ParsedEntry) => void;
  onUnlog: () => void;
  onUnskip?: () => void;
}) {
  const { label, completed, skipped } = props;
  const action = completed
    ? { onClick: props.onUnlog, aria: `Un-mark ${label} done` }
    : skipped
      ? { onClick: () => props.onUnskip?.(), aria: `Un-skip ${label}` }
      : {
          onClick: () => props.onSubmit({ ok: true, weight: 0, reps: 1, unit: props.unit }),
          aria: `Mark ${label} done`,
        };
  return (
    <div className="flex min-w-0 flex-1" data-testid="entry-fields">
      <button
        type="button"
        onClick={action.onClick}
        aria-label={action.aria}
        aria-pressed={completed || skipped}
        className={`flex h-full min-h-12 min-w-0 flex-1 items-center justify-center gap-2 font-mono text-xs font-semibold uppercase tracking-micro ${
          completed ? 'text-accent' : 'text-muted'
        }`}
      >
        {completed ? (
          <>
            <Check size={20} strokeWidth={3} aria-hidden="true" />
            Done
          </>
        ) : skipped ? (
          <>
            <Minus size={20} strokeWidth={3} aria-hidden="true" />
            Skipped
          </>
        ) : (
          'Mark done'
        )}
      </button>
    </div>
  );
}

const inputBase =
  'num h-12 w-full min-w-0 bg-transparent px-1 text-center text-lg font-medium placeholder:text-sm placeholder:font-normal placeholder:text-muted focus-visible:outline-offset-[-2px]';

/**
 * The single entry for an exercise: a weight field and a reps field side by side, a
 * log / update / un-log button, and a one-line caption (unit and reps labels, the parsed preview,
 * or a hint). Enter in weight moves to reps; Enter in reps submits.
 */
export function EntryFields(props: EntryFieldsProps) {
  const { label, load, unit, baseWeight, baseReps, completed } = props;
  const [w, setW] = useState<string | null>(null);
  const [r, setR] = useState<string | null>(null);
  const weightEl = useRef<HTMLInputElement | null>(null);
  const repsEl = useRef<HTMLInputElement | null>(null);
  const hasWeight = load !== 'none';

  // A prefill that arrives after focus is already here is selected too, so typing replaces it.
  useEffect(() => {
    const active = document.activeElement;
    if (w === null && active === weightEl.current) weightEl.current?.select();
    if (r === null && active === repsEl.current) repsEl.current?.select();
  }, [baseWeight, baseReps, w, r]);

  if (load === 'completion') {
    return (
      <CompletionEntry
        label={label}
        unit={unit}
        completed={completed}
        skipped={!!props.skipped && !completed}
        onSubmit={props.onSubmit}
        onUnlog={props.onUnlog}
        onUnskip={props.onUnskip}
      />
    );
  }

  const weightText = w ?? baseWeight;
  const repsText = r ?? baseReps;
  const weightDirty = w !== null && w !== baseWeight;
  const repsDirty = r !== null && r !== baseReps;
  const dirty = weightDirty || repsDirty;
  const muted = !completed && w === null && r === null && (baseWeight !== '' || baseReps !== '');

  const skipped = !!props.skipped && !completed;
  const canSkip = !!props.onSkip;
  const opts = { load, unit };
  const parsed = parseWeightReps(weightText, repsText, opts);
  const weightRes = parseWeightReps(weightText, '1', opts);
  const repsRes = parseWeightReps('0', repsText, opts);
  const isX = (t: string) => canSkip && t.trim().toLowerCase() === 'x';
  // A skip entry: `x` in either field, or every field blank. A row that is already skipped can't
  // be skipped again (its blank fields just show the skipped state).
  const skipEntry = canSkip && !skipped && isSkipEntry(weightText, repsText, load);
  const weightBad =
    hasWeight && weightDirty && weightText.trim() !== '' && !isX(weightText) && !weightRes.ok;
  const repsBad = repsDirty && repsText.trim() !== '' && !isX(repsText) && !repsRes.ok;
  const hint =
    weightBad && !weightRes.ok ? weightRes.hint : repsBad && !repsRes.ok ? repsRes.hint : null;
  const showLogButton = (!completed && !skipped) || dirty;

  function submit() {
    if (skipEntry) {
      props.onSkip?.();
    } else if (parsed.ok) {
      props.onSubmit(parsed);
    } else {
      return;
    }
    setW(null);
    setR(null);
  }

  function unlog() {
    // Keep the logged numbers in the fields so nothing the user typed is lost.
    setW(weightText);
    setR(repsText);
    props.onUnlog();
  }

  const tone = (bad: boolean) => (bad ? 'text-danger' : muted ? 'text-muted' : 'text-ink');
  const wrapper = 'min-w-0 flex-1';
  const caption = 'num truncate text-micro uppercase tracking-micro';

  return (
    <div className="flex min-w-0 flex-1" data-testid="entry-fields">
      <div className="min-w-0 flex-1">
        <div className="flex">
          {hasWeight ? (
            <input
              ref={weightEl}
              type="text"
              inputMode="decimal"
              enterKeyHint="next"
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              aria-label={`${label} weight`}
              aria-invalid={weightBad || undefined}
              placeholder="weight"
              value={weightText}
              onChange={(e) => setW(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // `x` in weight skips straight away; anything else moves on to reps.
                  if (isX(weightText)) submit();
                  else repsEl.current?.focus();
                }
              }}
              className={`${inputBase} ${wrapper} ${tone(weightBad)}`}
            />
          ) : null}
          <input
            ref={repsEl}
            type="text"
            inputMode="numeric"
            enterKeyHint="done"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            aria-label={`${label} reps`}
            aria-invalid={repsBad || undefined}
            placeholder="reps"
            value={repsText}
            onChange={(e) => setR(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            className={`${inputBase} ${wrapper} ${hasWeight ? 'border-l border-hairline' : ''} ${tone(repsBad)}`}
          />
        </div>
        <p
          className={`${caption} px-1 pb-1 ${hint ? 'text-danger' : 'text-muted'}`}
          data-testid="entry-caption"
          {...(hint ? { role: 'status' } : {})}
        >
          {hint ? (
            hint
          ) : dirty && skipEntry ? (
            'skip'
          ) : dirty && parsed.ok ? (
            previewText(parsed, load)
          ) : skipped ? (
            'skipped'
          ) : (
            <span className="flex" aria-hidden="true">
              {hasWeight ? <span className="flex-1 text-center">{unit}</span> : null}
              <span className="flex-1 text-center">reps</span>
            </span>
          )}
        </p>
      </div>
      {showLogButton ? (
        <button
          type="button"
          onClick={submit}
          disabled={!parsed.ok && !skipEntry}
          aria-label={skipEntry ? `Skip ${label}` : completed ? `Update ${label}` : `Log ${label}`}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center border-l border-hairline text-muted disabled:opacity-30"
        >
          <CornerDownLeft size={20} aria-hidden="true" />
        </button>
      ) : skipped ? (
        <button
          type="button"
          onClick={() => {
            setW(null);
            setR(null);
            props.onUnskip?.();
          }}
          aria-label={`Un-skip ${label}`}
          aria-pressed
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center border-l border-hairline text-muted"
        >
          <Minus size={22} strokeWidth={3} aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          onClick={unlog}
          aria-label={`Un-log ${label}`}
          aria-pressed
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center border-l border-hairline text-accent"
        >
          <Check size={22} strokeWidth={3} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
