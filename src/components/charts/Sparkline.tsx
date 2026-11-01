export interface SparklineProps {
  values: ReadonlyArray<number>;
  label: string;
  width?: number;
  height?: number;
}

/** Tiny line of top-set weight. Data only: no axes, targets or trend. */
export function Sparkline({ values, label, width = 64, height = 24 }: SparklineProps) {
  const pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const x = (i: number) =>
    values.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (values.length - 1);
  const y = (v: number) =>
    span === 0 ? height / 2 : pad + ((max - v) * (height - pad * 2)) / span;
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values.length - 1;

  return (
    <svg
      role="img"
      aria-label={label}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
    >
      {values.length > 1 ? (
        <polyline
          points={points}
          fill="none"
          stroke="var(--accent-ink)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      <circle
        cx={x(last)}
        cy={y(values[last])}
        r={2.25}
        fill="var(--surface)"
        stroke="var(--accent-ink)"
        strokeWidth={1.5}
      />
    </svg>
  );
}
