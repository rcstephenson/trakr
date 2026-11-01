import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { exercises as exerciseRepo } from '../db/repositories';
import { ProgressChart } from '../components/charts/ProgressChart';
import {
  METRICS,
  RANGES,
  buildChartPoints,
  buildHistoryRows,
  computeRecords,
  formatSet,
  formatMetricValue,
  type Metric,
  type RangeKey,
  type RecordSet,
} from '../components/charts/chartData';
import { Card, Chip, EmptyState, PageHeader, SectionLabel } from '../components/ui';
import { formatWeight, roundForDisplay } from '../domain/units';
import type { Unit } from '../domain/types';
import { useExerciseHistory } from '../hooks/useExerciseHistory';
import { useSettings } from '../hooks/useSettings';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const shortFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function RecordCard({
  title,
  record,
  unit,
  exact,
}: {
  title: string;
  record: RecordSet | null;
  unit: Unit;
  exact: boolean;
}) {
  const value = record
    ? formatWeight(
        exact && !record.converted ? record.value : roundForDisplay(record.value, unit),
        unit,
        unit,
      )
    : null;
  return (
    <Card tone="raised" className="flex-1 !p-3">
      <p className="micro flex items-center gap-1.5">
        <Trophy size={14} className="text-pr" aria-hidden />
        {title}
      </p>
      {record ? (
        <>
          <p className="num mt-2 text-xl font-semibold tracking-tight text-ink">{value}</p>
          <p className="num mt-0.5 text-xs text-muted">
            {exact ? `× ${record.reps} · ` : `from ${record.reps} reps · `}
            {dateFmt.format(new Date(record.startedAt))}
          </p>
        </>
      ) : (
        <p className="micro mt-2">No data</p>
      )}
    </Card>
  );
}

export default function ExerciseProgress() {
  const { exerciseId } = useParams();
  const settings = useSettings();
  const history = useExerciseHistory(exerciseId);
  const exercise = useLiveQuery(
    async () => (exerciseId ? ((await exerciseRepo.get(exerciseId)) ?? null) : null),
    [exerciseId],
  );
  const [metric, setMetric] = useState<Metric>('topWeight');
  const [range, setRange] = useState<RangeKey>('3M');

  const unit = settings?.unit ?? 'lb';
  const points = useMemo(
    () => buildChartPoints(history ?? [], metric, unit, range),
    [history, metric, unit, range],
  );
  const records = useMemo(() => computeRecords(history ?? [], unit), [history, unit]);
  const rows = useMemo(() => buildHistoryRows(history ?? [], unit), [history, unit]);

  if (!settings || !history || exercise === undefined) return <PageHeader title="Progress" />;

  const title = exercise?.name ?? (history.length > 0 ? 'Exercise' : 'Exercise not found');
  const back = (
    <Link
      to="/progress"
      className="inline-flex min-h-touch items-center gap-1 px-gutter font-mono text-xs font-medium uppercase tracking-micro text-accent"
    >
      <ChevronLeft size={18} aria-hidden />
      Progress
    </Link>
  );

  if (rows.length === 0) {
    return (
      <>
        {back}
        <PageHeader title={title} />
        <EmptyState
          title="No history yet"
          description={
            exercise
              ? 'Complete a workout with this exercise to see its progress.'
              : 'This exercise does not exist.'
          }
        />
      </>
    );
  }

  const metricLabel = METRICS.find((m) => m.key === metric)?.label ?? '';
  const latest = points[points.length - 1];

  return (
    <>
      {back}
      <PageHeader
        title={title}
        subtitle={`${rows.length} ${rows.length === 1 ? 'session' : 'sessions'} logged`}
      />
      <div className="flex flex-col gap-5 px-gutter pb-6">
        <div
          role="radiogroup"
          aria-label="Metric"
          className="grid grid-cols-3 rounded-btn border border-hairline bg-surface"
        >
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={metric === m.key}
              onClick={() => setMetric(m.key)}
              className={[
                'relative min-h-touch border-l border-hairline font-mono text-xs font-medium uppercase tracking-micro transition-colors first:border-l-0',
                metric === m.key ? 'bg-raised text-ink' : 'text-muted',
              ].join(' ')}
            >
              {m.label}
              {metric === m.key ? (
                <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-0.5 bg-accent-ink" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Range">
          {RANGES.map((r) => (
            <Chip key={r} selected={range === r} onClick={() => setRange(r)}>
              {r}
            </Chip>
          ))}
        </div>

        <Card tone="raised" className="!px-2 !pt-3">
          {points.length > 0 ? (
            <>
              <p className="num px-2 pb-2 text-xs text-muted" data-testid="chart-summary">
                {`${metricLabel} · ${points.length} ${points.length === 1 ? 'session' : 'sessions'}`}
                {latest ? ` · latest ${formatMetricValue(metric, latest, unit)}` : ''}
              </p>
              <ProgressChart
                points={points}
                metric={metric}
                metricLabel={metricLabel}
                unit={unit}
              />
            </>
          ) : (
            <p className="micro px-2 py-10 text-center" data-testid="chart-empty">
              No sessions in this range.
            </p>
          )}
        </Card>

        <div className="flex gap-3">
          <RecordCard title="Heaviest weight" record={records.heaviest} unit={unit} exact />
          <RecordCard title="Best est. 1RM" record={records.bestE1RM} unit={unit} exact={false} />
        </div>

        <section aria-labelledby="past-sessions">
          <SectionLabel index={1} className="pb-2">
            <span id="past-sessions">Past sessions</span>
          </SectionLabel>
          <div className="micro grid grid-cols-[56px_1fr_auto] gap-x-3 px-3 pb-1">
            <span>Date</span>
            <span>Sets</span>
            <span>Volume</span>
          </div>
          <ul className="divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface">
            {rows.map((row) => (
              <li key={row.sessionId}>
                <Link
                  to={`/history/session/${row.sessionId}`}
                  className="num grid min-h-touch grid-cols-[56px_1fr_auto] items-center gap-x-3 px-3 py-2 text-xs active:bg-bg"
                >
                  <span className="text-ink">{shortFmt.format(new Date(row.startedAt))}</span>
                  <span className="text-muted">
                    {row.sets.map((s) => formatSet(s, unit)).join(', ')}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-ink">
                    {formatWeight(roundForDisplay(row.volume, unit), unit, unit)}
                    <ChevronRight size={16} className="text-muted" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
