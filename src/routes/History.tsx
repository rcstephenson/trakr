import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ActivityRow, SessionRow } from '../components/history/FeedRows';
import { buildFeed, type FeedFilter } from '../components/history/feed';
import { Button, Chip, EmptyState, Mono, PageHeader, SectionLabel } from '../components/ui';
import { useActivities } from '../hooks/useActivities';
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

  const groups = useMemo(
    () => (sessions && activities ? buildFeed(sessions, activities, filter) : []),
    [sessions, activities, filter],
  );

  if (!sessions || !activities || !settings) {
    return <PageHeader title="History" />;
  }

  const empty = sessions.length === 0 && activities.length === 0;

  return (
    <>
      <PageHeader title="History" />
      {empty ? (
        <EmptyState
          title="Nothing logged yet"
          description="Your finished workouts and activities will show up here."
          action={
            <Link to="/">
              <Button>Start your first workout</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-5 px-gutter pb-6">
          <div className="flex gap-1.5" role="group" aria-label="Filter history">
            {FILTERS.map((f) => (
              <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
              </Chip>
            ))}
          </div>
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
                        <SessionRow session={item.session} unit={settings.unit} />
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
