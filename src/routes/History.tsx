import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ActivityGrid } from '../components/history/ActivityGrid';
import { ActivityRow, SessionRow } from '../components/history/FeedRows';
import { buildFeed, type FeedFilter } from '../components/history/feed';
import { Button, Chip, EmptyState, Mono, PageHeader, SectionLabel } from '../components/ui';
import { filterSessionsByProgram, programIdsOf, programLabel } from '../domain/programHistory';
import { useActivities } from '../hooks/useActivities';
import { usePrograms } from '../hooks/usePrograms';
import { useSessions } from '../hooks/useSessions';
import { useSettings } from '../hooks/useSettings';

const COMPLETED = { status: 'completed' } as const;

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'workouts', label: 'Workouts' },
  { id: 'activities', label: 'Activities' },
];

export default function History() {
  const sessions = useSessions(COMPLETED);
  const activities = useActivities();
  const settings = useSettings();
  const [filter, setFilter] = useState<FeedFilter>('all');

  const programs = usePrograms();
  // null = all programs. Activities belong to no program, so they are hidden while one is picked.
  const [programId, setProgramId] = useState<string | null>(null);

  const programIds = useMemo(() => programIdsOf(sessions ?? []), [sessions]);
  const multiProgram = programIds.length > 1;
  const shownSessions = useMemo(
    () => (sessions ? filterSessionsByProgram(sessions, programId) : []),
    [sessions, programId],
  );
  const groups = useMemo(
    () =>
      sessions && activities
        ? buildFeed(shownSessions, programId === null ? activities : [], filter)
        : [],
    [sessions, activities, shownSessions, programId, filter],
  );

  if (!sessions || !activities || !settings || !programs) {
    return <PageHeader title="History" />;
  }

  const empty = sessions.length === 0 && activities.length === 0;

  return (
    <>
      <PageHeader title="History" />
      {empty ? (
        <div className="px-gutter pb-6">
          <EmptyState
            title="Nothing logged yet"
            description="Your finished workouts and activities will show up here."
            action={
              <Link to="/">
                <Button>Start your first workout</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-gutter pb-6">
          <ActivityGrid today={new Date()} sessions={sessions} activities={activities} />
          <div className="flex gap-1.5" role="group" aria-label="Filter history">
            {FILTERS.map((f) => (
              <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
              </Chip>
            ))}
          </div>
          {multiProgram ? (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by program">
              <Chip selected={programId === null} onClick={() => setProgramId(null)}>
                All programs
              </Chip>
              {programIds.map((id) => (
                <Chip key={id} selected={programId === id} onClick={() => setProgramId(id)}>
                  {programLabel(programs, id)}
                </Chip>
              ))}
            </div>
          ) : null}
          {groups.length === 0 ? (
            <p className="micro py-8 text-center">Nothing to show for this filter.</p>
          ) : (
            groups.map((g, gi) => (
              <section key={g.key} aria-label={g.label}>
                <SectionLabel
                  index={gi + 1}
                  action={<Mono>{String(g.items.length).padStart(2, '0')}</Mono>}
                >
                  {g.label}
                </SectionLabel>
                <ul className="mt-2 divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface">
                  {g.items.map((item) => (
                    <li key={item.key}>
                      {item.kind === 'session' ? (
                        <SessionRow
                          session={item.session}
                          unit={settings.unit}
                          programName={
                            multiProgram
                              ? programLabel(programs, item.session.programId)
                              : undefined
                          }
                        />
                      ) : (
                        <ActivityRow activity={item.activity} />
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      )}
    </>
  );
}
