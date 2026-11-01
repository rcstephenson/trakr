import { useEffect, useRef, useState, type Ref } from 'react';
import { Check, CornerDownLeft } from 'lucide-react';
import { parseSetEntry, type SetEntryResult } from '../../domain/setEntry';
import { formatWeight } from '../../domain/units';
import type { LoadType, Unit } from '../../domain/types';

export type ParsedSet = Extract<SetEntryResult, { ok: true }>;

export interface SetRowProps {
  /** 0-based set index. */
  index: number;
  completed: boolean;
  isWarmup: boolean;
  rir?: number;
  load: LoadType;
  unit: Unit;
  /** Text shown until the user edits it: the logged set, a prefill, or '' (placeholder shown). */
  baseText: string;
  /** Called with the parsed values on Enter / the log button (also updates a logged row). */
  onLog: (parsed: ParsedSet) => void;
  /** Called by the check button on a logged row. */
  onUnlog: () => void;
  onOptions: () => void;
  inputRef?: Ref<HTMLInputElement>;
}

function previewText(parsed: ParsedSet, load: LoadType): string {
  if (load === 'none') return `${parsed.reps} reps`;
  const w = formatWeight(parsed.weight, parsed.unit, parsed.unit, {
    perHand: load === 'per-hand',
    bodyweightPlus: load === 'bodyweight-plus',
  });
  return `${w} × ${parsed.reps}`;
}

/** One set: a single `weight x reps` text input (SPEC 6.1) with a log / un-log button. */
export function SetRow(props: SetRowProps) {
  const { index, completed, isWarmup, rir, load, unit, baseText } = props;
  const n = index + 1;
  const [edited, setEdited] = useState<string | null>(null);
  const el = useRef<HTMLInputElement | null>(null);
  // A prefill that arrives after focus moved here (e.g. carried over from the row above) is
  // selected too, so typing replaces it instead of appending.
  useEffect(() => {
    if (edited === null && el.current && document.activeElement === el.current) el.current.select();
  }, [baseText, edited]);
  const dirty = edited !== null && edited !== baseText;
  const value = edited ?? baseText;
  const muted = !completed && edited === null && baseText !== '';
  const parsed = parseSetEntry(value, { load, unit });
  const showFeedback = dirty && value.trim() !== '';

  function submit() {
    if (!parsed.ok) return;
    props.onLog(parsed);
    setEdited(null);
  }

  const showLogButton = !completed || dirty;

  return (
    <li
      className={`flex min-h-12 items-start gap-1 rounded-btn ${completed ? 'bg-success-soft' : ''}`}
      data-testid="set-row"
      data-completed={completed}
    >
      <button
        type="button"
        onClick={props.onOptions}
        aria-label={`Set ${n} options`}
        className="tabular flex h-12 w-7 shrink-0 flex-col items-center justify-center text-sm font-semibold text-muted"
      >
        <span className={isWarmup ? 'text-warning' : ''}>{isWarmup ? 'W' : n}</span>
        {rir !== undefined ? <span className="text-[10px] leading-none">R{rir}</span> : null}
      </button>
      <div className="min-w-0 flex-1">
        <input
          ref={(node) => {
            el.current = node;
            const r = props.inputRef;
            if (typeof r === 'function') r(node);
            else if (r) (r as { current: HTMLInputElement | null }).current = node;
          }}
          type="text"
          inputMode="text"
          enterKeyHint="done"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          aria-label={`Set ${n} entry`}
          placeholder={load === 'none' ? 'reps' : 'weight x reps'}
          value={value}
          onChange={(e) => setEdited(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          className={`tabular h-12 w-full rounded-btn bg-transparent px-2 font-mono text-base placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            muted ? 'text-muted' : 'text-text'
          }`}
        />
        {showFeedback ? (
          <p
            className={`tabular -mt-1 px-2 pb-1 font-mono text-xs ${
              parsed.ok ? 'text-muted' : 'text-danger'
            }`}
            data-testid="set-feedback"
          >
            {parsed.ok ? previewText(parsed, load) : parsed.hint}
          </p>
        ) : null}
      </div>
      {showLogButton ? (
        <button
          type="button"
          onClick={submit}
          disabled={!parsed.ok}
          aria-label={completed ? `Update set ${n}` : `Log set ${n}`}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-btn border border-border text-muted disabled:opacity-40"
        >
          <CornerDownLeft size={22} aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          onClick={props.onUnlog}
          aria-label={`Un-log set ${n}`}
          aria-pressed
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-btn bg-success text-on-accent"
        >
          <Check size={22} aria-hidden="true" />
        </button>
      )}
    </li>
  );
}
