export type SegmentState = 'on' | 'done' | 'current' | 'off' | 'rest';

export interface SegmentedBarProps {
  /** Explicit per-segment states, e.g. the 7-day cycle. Wins over value/total. */
  states?: SegmentState[];
  /** Simple progress: `value` of `total` segments are `on`. */
  value?: number;
  total?: number;
  /** Accessible description, e.g. "3 of 4 sets logged". */
  label: string;
  className?: string;
}

const SEGMENT: Record<SegmentState, string> = {
  // Lime fill with an accent-ink outline: crisp on Paper, seamless on Graphite.
  on: 'h-2 border-accent bg-accent',
  current: 'h-3 border-accent bg-accent',
  done: 'h-2 border-ink bg-ink',
  off: 'h-2 border-hairline bg-transparent',
  rest: 'h-2 border-hairline bg-hairline',
};

/** Thin segmented progress bar (sets logged, workouts per week, the 7-day schedule). */
export function SegmentedBar({
  states,
  value = 0,
  total = 0,
  label,
  className = '',
}: SegmentedBarProps) {
  const items: SegmentState[] =
    states ?? Array.from({ length: total }, (_, i) => (i < value ? 'on' : 'off'));
  return (
    <div role="img" aria-label={label} className={`flex items-end gap-1 ${className}`}>
      {items.map((s, i) => (
        <span key={i} className={`flex-1 rounded-[2px] border ${SEGMENT[s]}`} />
      ))}
    </div>
  );
}
