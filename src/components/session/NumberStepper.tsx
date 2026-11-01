import { useEffect, useId, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

export interface NumberStepperProps {
  /** Accessible name, e.g. "Set 2 weight". */
  label: string;
  /** `null` renders an empty field (no history to prefill from). */
  value: number | null;
  step: number;
  /** Shown in muted colour: prefilled but not yet edited or completed. */
  muted?: boolean;
  onChange: (value: number) => void;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

const btn =
  'inline-flex h-12 w-10 shrink-0 items-center justify-center rounded-btn border border-border bg-surface text-text active:bg-accent-soft';

/** Compact − value + control sized for a 390 px row: 40 × 48 px buttons. */
export function NumberStepper({ label, value, step, muted, onChange }: NumberStepperProps) {
  const id = useId();
  const [text, setText] = useState(value === null ? '' : String(value));

  // Re-sync from the outside (steppers, prefill) but never clobber what is being typed
  // (e.g. "8." while entering 8.5).
  useEffect(() => {
    setText((t) => {
      const typed = Number.parseFloat(t.replace(',', '.'));
      if (value === null) return Number.isFinite(typed) ? t : '';
      return typed === value ? t : String(value);
    });
  }, [value]);

  const parse = (t: string) => Number.parseFloat(t.replace(',', '.'));

  const commit = (n: number) => onChange(round(Math.max(0, n)));

  const handleBlur = () => {
    const parsed = parse(text);
    if (Number.isFinite(parsed)) {
      if (parsed !== value) commit(parsed);
      else setText(String(parsed));
    } else {
      setText(value === null ? '' : String(value));
    }
  };

  return (
    <div className="inline-flex items-center">
      <button
        type="button"
        className={btn}
        aria-label={`Decrease ${label}`}
        onClick={() => commit((value ?? 0) - step)}
      >
        <Minus size={16} aria-hidden="true" />
      </button>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder="–"
        value={text}
        onChange={(e) => {
          // Commit as the user types so a tap on the check never races the blur.
          setText(e.target.value);
          const parsed = parse(e.target.value);
          if (Number.isFinite(parsed) && parsed >= 0 && parsed !== value) commit(parsed);
        }}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className={`tabular h-12 w-11 min-w-0 bg-transparent text-center text-base font-semibold ${
          muted ? 'text-muted' : 'text-text'
        }`}
      />
      <button
        type="button"
        className={btn}
        aria-label={`Increase ${label}`}
        onClick={() => commit((value ?? 0) + step)}
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
