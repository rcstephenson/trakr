import { Check } from 'lucide-react';
import { NumberStepper } from './NumberStepper';

export interface SetRowProps {
  /** 0-based set index. */
  index: number;
  completed: boolean;
  isWarmup: boolean;
  rir?: number;
  weight: number | null;
  reps: number | null;
  /** Prefilled or auto-filled, not yet edited or completed. */
  muted: boolean;
  showWeight: boolean;
  weightStep: number;
  onWeight: (value: number) => void;
  onReps: (value: number) => void;
  onToggle: () => void;
  onOptions: () => void;
}

/** One set: the app's most-used control. Index opens options, stepper columns, big check. */
export function SetRow(props: SetRowProps) {
  const { index, completed, isWarmup, rir, weight, reps, muted, showWeight } = props;
  const n = index + 1;
  const canComplete = (reps ?? 0) > 0 && (!showWeight || weight !== null);

  return (
    <li
      className={`flex items-center justify-between gap-1 rounded-btn ${
        completed ? 'bg-success-soft' : ''
      }`}
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
      {showWeight ? (
        <NumberStepper
          label={`Set ${n} weight`}
          value={weight}
          step={props.weightStep}
          muted={muted}
          onChange={props.onWeight}
        />
      ) : null}
      <NumberStepper
        label={`Set ${n} reps`}
        value={reps}
        step={1}
        muted={muted}
        onChange={props.onReps}
      />
      <button
        type="button"
        onClick={props.onToggle}
        disabled={!completed && !canComplete}
        aria-pressed={completed}
        aria-label={completed ? `Un-complete set ${n}` : `Complete set ${n}`}
        className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-40 ${
          completed
            ? 'border-success bg-success text-on-accent'
            : 'border-border bg-surface text-muted active:bg-accent-soft'
        }`}
      >
        <Check size={22} aria-hidden="true" />
      </button>
    </li>
  );
}
