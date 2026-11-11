import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { ExerciseRow } from '../components/session/ExerciseRow';
import { DiscardWorkoutDialog } from '../components/session/DiscardWorkoutDialog';
import { FinishSheet } from '../components/session/FinishSheet';
import { useExerciseCatalog } from '../components/session/hooks';
import { Button, Card, EmptyState, PageHeader, SegmentedBar } from '../components/ui';
import * as sessionsRepo from '../db/repositories/sessions';
import { useSession } from '../hooks/useSession';
import { useSessionSets } from '../hooks/useSessionSets';
import { useSettings } from '../hooks/useSettings';
import { useWakeLock } from '../hooks/useWakeLock';

export default function Session() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = useSession(id);
  const sets = useSessionSets(id);
  const settings = useSettings();
  const catalog = useExerciseCatalog();

  const [finishOpen, setFinishOpen] = useState(false);
  // Recorded once when Finish is opened: a plain stat, not a running clock.
  const [durationMs, setDurationMs] = useState(0);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const active = session?.status === 'active';
  useWakeLock(active);

  // After an exercise is logged, move focus to the next exercise's first field (so a whole workout
  // can be entered without the keyboard closing) and scroll it into view. After the last exercise
  // drop focus (the Finish button stays in the sticky header).
  function advance(slotIndex: number) {
    const next = document.querySelector<HTMLElement>(
      `[data-testid="exercise-row"][data-slot="${slotIndex + 1}"]`,
    );
    if (!next) {
      const el = document.activeElement;
      if (el instanceof HTMLElement && el !== document.body) el.blur();
      return;
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    next.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    next.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
  }

  if (session === undefined || sets === undefined || settings === undefined || !catalog) {
    return (
      <>
        <PageHeader title="Session" />
        <p className="px-gutter text-sm text-muted">Loading session…</p>
      </>
    );
  }
  // The session was just discarded; we are on our way back to Today.
  if (session === null && busy) return null;
  if (session === null) {
    return (
      <>
        <PageHeader title="Session" />
        <EmptyState
          title="Session not found"
          description="It may have been deleted."
          action={
            <Link
              to="/"
              className="font-mono text-xs font-semibold uppercase tracking-micro text-accent"
            >
              Back to Today
            </Link>
          }
        />
      </>
    );
  }
  if (session.status !== 'active') {
    return (
      <EmptyState
        title={session.status === 'completed' ? 'Workout finished' : 'Workout discarded'}
        action={
          <Link
            to={session.status === 'completed' ? `/history/session/${session.id}` : '/'}
            className="font-mono text-xs font-semibold uppercase tracking-micro text-accent"
          >
            {session.status === 'completed' ? 'View summary' : 'Back to Today'}
          </Link>
        }
      />
    );
  }

  const exercises = new Map(catalog.map((e) => [e.id, e]));
  const hasSets = (slot: number) => sets.some((x) => x.slotIndex === slot);
  // A skip is an entry too (a null log), so it counts towards the progress bar.
  const loggedCount = session.targets.filter(
    (t) =>
      sets.some((x) => x.slotIndex === t.slotIndex && x.exerciseId === t.exerciseId) ||
      (session.skippedSlots ?? []).includes(t.slotIndex),
  ).length;
  const total = session.targets.length;
  // Every slot without sets is recorded as skipped on Finish.
  const toSkip = session.targets
    .filter((t) => !hasSets(t.slotIndex))
    .map((t) => exercises.get(t.exerciseId)?.name ?? t.exerciseId);

  async function finish() {
    if (!id || busy) return;
    setBusy(true);
    await sessionsRepo.finish(id);
    navigate('/');
  }

  async function discard() {
    if (!id || busy) return;
    setBusy(true);
    setDiscardOpen(false);
    await sessionsRepo.remove(id);
    navigate('/');
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex min-h-touch items-center gap-2 border-b border-hairline bg-surface px-gutter py-2">
        <Link
          to="/"
          aria-label="Back to Today"
          className="-ml-3 inline-flex h-12 w-12 shrink-0 items-center justify-center text-muted"
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="micro flex items-center gap-1.5">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-[1px] bg-accent" />
            Session{' '}
          </p>{' '}
          <h1 className="truncate text-base font-semibold leading-5 tracking-tight text-ink">
            {session.workoutName}{' '}
          </h1>
        </div>
        <Button
          onClick={() => {
            // A backfilled session has no meaningful duration.
            setDurationMs(
              sessionsRepo.isBackdated(session) ? 0 : Date.now() - Date.parse(session.startedAt),
            );
            setFinishOpen(true);
          }}
        >
          Finish
        </Button>
      </header>

      <div className="px-gutter pb-6 pt-3">
        <Card className="!p-0 overflow-hidden" data-testid="exercise-ledger">
          <div className="flex items-baseline justify-between gap-3 px-3 pt-3">
            <p className="micro">
              Exercise · <span className="num text-ink">{loggedCount}</span> / {total} logged
            </p>
            <p className="micro shrink-0">Weight / reps</p>
          </div>
          <SegmentedBar
            className="mx-3 mb-3 mt-2"
            value={loggedCount}
            total={total}
            label={`${loggedCount} of ${total} exercises logged`}
          />
          <ul className="border-t border-hairline">
            {session.targets.map((target) => (
              <ExerciseRow
                key={`${target.slotIndex}-${target.exerciseId}`}
                session={session}
                target={target}
                exercise={exercises.get(target.exerciseId)}
                sets={sets}
                settings={settings}
                onLogged={advance}
              />
            ))}
          </ul>
        </Card>
      </div>

      <div className="px-gutter pb-10">
        <Button
          variant="ghost"
          fullWidth
          className="!text-danger"
          onClick={() => setDiscardOpen(true)}
        >
          Discard workout
        </Button>
      </div>

      <FinishSheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        sets={sets}
        skipped={toSkip}
        exercises={exercises}
        unit={settings.unit}
        durationMs={durationMs}
        busy={busy}
        onFinish={() => void finish()}
        onDiscard={() => {
          setFinishOpen(false);
          setDiscardOpen(true);
        }}
      />
      <DiscardWorkoutDialog
        open={discardOpen}
        setCount={sets.length}
        onConfirm={() => void discard()}
        onCancel={() => setDiscardOpen(false)}
      />
    </>
  );
}
