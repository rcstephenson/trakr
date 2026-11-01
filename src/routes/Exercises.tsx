import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight } from 'lucide-react';
import { exercises as exerciseRepo, history as historyRepo } from '../db/repositories';
import type { Performance } from '../db/repositories/history';
import { Sparkline } from '../components/charts/Sparkline';
import { buildChartPoints, topSetOf } from '../components/charts/chartData';
import { EmptyState, Mono, PageHeader, SectionLabel } from '../components/ui';
import type { Exercise, Unit } from '../domain/types';
import { formatWeight } from '../domain/units';
import { formatRelativeDay } from '../lib/dates';
import { useSettings } from '../hooks/useSettings';

interface Row {
  exercise: Exercise;
  history: Performance[];
  lastAt: string | null;
}

function useRows(): Row[] | undefined {
  return useLiveQuery(async () => {
    const catalog = await exerciseRepo.list();
    // History can reference exercises that are no longer in the catalog; keep them reachable.
    const known = new Set(catalog.map((e) => e.id));
    const missing = (await historyRepo.loggedExerciseIds())
      .filter((id) => !known.has(id))
      .map<Exercise>((id) => ({
        id,
        name: id.replace(/-/g, ' '),
        equipment: 'other',
        kind: 'isolation',
        load: 'total',
        muscles: [],
      }));
    const list = [...catalog, ...missing];
    const rows = await Promise.all(
      list.map(async (exercise) => {
        const history = await historyRepo.forExercise(exercise.id);
        const withWork = history.filter((h) => h.sets.some((s) => !s.isWarmup));
        const last = withWork[withWork.length - 1];
        return { exercise, history: withWork, lastAt: last ? last.session.startedAt : null };
      }),
    );
    return rows;
  }, []);
}

function ExerciseRow({ row, unit }: { row: Row; unit: Unit }) {
  const sparkValues = useMemo(
    () => buildChartPoints(row.history, 'topWeight', unit).map((p) => p.value),
    [row.history, unit],
  );
  const last = row.history[row.history.length - 1];
  const top = last ? topSetOf(last.sets) : null;
  return (
    <li>
      <Link
        to={`/progress/${row.exercise.id}`}
        className="flex min-h-[60px] items-center gap-3 px-3 py-2 active:bg-bg"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{row.exercise.name}</p>
          <Mono className="block truncate text-xs text-muted">
            {row.lastAt ? formatRelativeDay(row.lastAt) : row.exercise.equipment}
            {top ? ` · ${formatWeight(top.weight, top.unit, unit)} × ${top.reps}` : ''}
          </Mono>
        </div>
        {sparkValues.length > 0 ? (
          <Sparkline values={sparkValues} label={`${row.exercise.name} top weight trend`} />
        ) : null}
        <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
      </Link>
    </li>
  );
}

export default function Exercises() {
  const settings = useSettings();
  const rows = useRows();
  const [query, setQuery] = useState('');

  if (!settings || !rows) return <PageHeader title="Progress" />;
  const unit = settings.unit;

  const q = query.trim().toLowerCase();
  const matches = rows.filter((r) => r.exercise.name.toLowerCase().includes(q));
  const logged = matches
    .filter((r) => r.lastAt !== null)
    .sort((a, b) => (b.lastAt as string).localeCompare(a.lastAt as string));
  const notLogged = matches.filter((r) => r.lastAt === null);

  return (
    <>
      <PageHeader title="Progress" />
      <div className="flex flex-col gap-4 px-gutter pb-6">
        <label className="block">
          <span className="sr-only">Search exercises</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises"
            className="min-h-touch w-full rounded-btn border border-hairline bg-raised px-4 text-sm text-ink placeholder:text-muted"
          />
        </label>

        {logged.length > 0 ? (
          <section aria-label="Logged exercises">
            <SectionLabel index={1} action={<Mono>{String(logged.length).padStart(2, '0')}</Mono>}>
              Logged
            </SectionLabel>
            <ul className="mt-2 divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface">
              {logged.map((r) => (
                <ExerciseRow key={r.exercise.id} row={r} unit={unit} />
              ))}
            </ul>
          </section>
        ) : (
          <EmptyState
            title={q ? 'No matching exercises' : 'No history yet'}
            description={
              q ? 'Try a different search.' : 'Finish a workout to see your progress here.'
            }
          />
        )}

        {notLogged.length > 0 ? (
          <details className="group" open={q.length > 0 && logged.length === 0}>
            <summary className="micro flex min-h-touch cursor-pointer items-center">
              Not logged yet ({notLogged.length})
            </summary>
            <ul className="mt-1 divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface">
              {notLogged.map((r) => (
                <ExerciseRow key={r.exercise.id} row={r} unit={unit} />
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </>
  );
}
