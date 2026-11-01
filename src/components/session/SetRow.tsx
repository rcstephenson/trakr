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
  const invalid = showFeedback && !parsed.ok;

  return (
    <li
      className={`group relative flex min-h-12 items-start border-t border-hairline first:border-t-0 ${
        invalid ? 'bg-raised' : ''
      }`}
      data-testid="set-row"
      data-completed={completed}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 hidden w-0.5 bg-accent-ink group-focus-within:block"
      />
      <button
        type="button"
        onClick={props.onOptions}
        aria-label={`Set ${n} options`}
        className="num flex h-12 w-12 shrink-0 flex-col items-center justify-center text-xs font-medium text-muted"
      >
        {isWarmup ? (
          <span className="rounded-chip border border-pr px-1 font-semibold text-ink">W</span>
        ) : (
          <span>{String(n).padStart(2, '0')}</span>
        )}
        {rir !== undefined ? <span className="text-micro leading-none">R{rir}</span> : null}
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
          aria-invalid={invalid || undefined}
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
          className={`num h-12 w-full bg-transparent px-2 text-base font-medium placeholder:font-normal placeholder:text-muted focus-visible:outline-offset-[-2px] ${
            muted ? 'text-muted' : invalid ? 'text-danger' : 'text-ink'
          }`}
        />
        {showFeedback ? (
          <p
            className={`num -mt-2 px-2 pb-1.5 text-micro uppercase tracking-micro ${
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
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center border-l border-hairline text-muted disabled:opacity-30"
        >
          <CornerDownLeft size={20} aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          onClick={props.onUnlog}
          aria-label={`Un-log set ${n}`}
          aria-pressed
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center text-accent"
        >
          <Check size={22} strokeWidth={3} aria-hidden="true" />
        </button>
      )}
    </li>
  );
}
