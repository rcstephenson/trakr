import { useEffect, useId, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

export interface StepperProps {
  value: number;
  step: number;
  min?: number;
  /** Unit label shown beside the value, e.g. "lb". */
  unit?: string;
  /** Accessible name for the field, e.g. "Weight". */
  label: string;
  onChange: (value: number) => void;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export function Stepper({ value, step, min = 0, unit, label, onChange }: StepperProps) {
  const id = useId();
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = (next: number) => onChange(round(Math.max(min, next)));

  const handleBlur = () => {
    const parsed = Number.parseFloat(text.replace(',', '.'));
    if (Number.isFinite(parsed)) commit(parsed);
    else setText(String(value));
  };

  const btn =
    'inline-flex min-h-touch min-w-touch items-center justify-center rounded-btn border border-hairline bg-raised text-ink active:bg-accent-soft disabled:opacity-40';

  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={label}>
      <button
        type="button"
        className={btn}
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => commit(value - step)}
      >
        <Minus size={18} aria-hidden="true" />
      </button>
      <div className="flex min-h-touch min-w-[72px] items-center justify-center gap-1">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="num w-14 rounded-btn bg-transparent py-2 text-center text-base font-semibold text-ink"
        />
        {unit ? <span className="text-xs text-muted">{unit}</span> : null}
      </div>
      <button
        type="button"
        className={btn}
        aria-label={`Increase ${label}`}
        onClick={() => commit(value + step)}
      >
        <Plus size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
