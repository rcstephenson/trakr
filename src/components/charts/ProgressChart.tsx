import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Unit } from '../../domain/types';
import { formatMetricValue, formatSet, type ChartPoint, type Metric } from './chartData';

export interface ProgressChartProps {
  points: ReadonlyArray<ChartPoint>;
  metric: Metric;
  metricLabel: string;
  unit: Unit;
}

const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const fullFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const tick = {
  fill: 'var(--muted)',
  fontSize: 11,
  fontFamily: '"Geist Mono Variable", ui-monospace, monospace',
};

interface TipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: ChartPoint }>;
  metric: Metric;
  unit: Unit;
}

function InspectTooltip({ active, payload, metric, unit }: TipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="num max-w-[220px] rounded-btn border border-ink bg-raised p-2.5 text-xs">
      <p className="micro">{fullFmt.format(point.t)}</p>
      <p className="mt-0.5 text-base font-semibold text-ink">
        {formatMetricValue(metric, point, unit)}
      </p>
      <p className="mt-1 border-t border-hairline pt-1 text-muted">
        {point.sets.map((s) => formatSet(s, unit)).join(', ')}
      </p>
    </div>
  );
}

/** Line chart of one metric over time. Tap or drag a point to inspect it. */
export function ProgressChart({ points, metric, metricLabel, unit }: ProgressChartProps) {
  const data = points as ChartPoint[];
  return (
    <div
      role="img"
      aria-label={`${metricLabel} chart, ${points.length} ${points.length === 1 ? 'session' : 'sessions'}`}
      data-testid="progress-chart"
      data-points={points.length}
      className="h-60 w-full select-none"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--hairline)" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            padding={{ left: 8, right: 8 }}
            tickFormatter={(t: number) => dayFmt.format(t)}
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: 'var(--hairline)' }}
            minTickGap={24}
          />
          <YAxis
            width={44}
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => String(Math.round(v))}
            tick={tick}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ stroke: 'var(--ink)', strokeWidth: 1, strokeDasharray: '2 3' }}
            content={(p) => (
              <InspectTooltip
                active={p.active}
                payload={p.payload as unknown as TipProps['payload']}
                metric={metric}
                unit={unit}
              />
            )}
          />
          <Line
            type="linear"
            dataKey="value"
            stroke="var(--accent-ink)"
            strokeWidth={1.5}
            dot={{ r: 3, fill: 'var(--raised)', stroke: 'var(--accent-ink)', strokeWidth: 1.5 }}
            activeDot={{
              r: 5,
              fill: 'var(--accent)',
              stroke: 'var(--accent-ink)',
              strokeWidth: 1.5,
            }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
