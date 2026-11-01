import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { ExerciseCard } from '../components/session/ExerciseCard';
import { DiscardWorkoutDialog } from '../components/session/DiscardWorkoutDialog';
import { FinishSheet } from '../components/session/FinishSheet';
import { useExerciseCatalog, useProgramById } from '../components/session/hooks';
import { NoteSheet } from '../components/session/NoteSheet';
import { readSlotNotes, writeSlotNote } from '../components/session/prefill';
import { SwapSheet } from '../components/session/SwapSheet';
import { Button, EmptyState, PageHeader } from '../components/ui';
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
  const program = useProgramById(session?.programId);

  const [swapSlot, setSwapSlot] = useState<number | null>(null);
  const [noteSlot, setNoteSlot] = useState<number | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  // Recorded once when Finish is opened: a plain stat, not a running clock.
  const [durationMs, setDurationMs] = useState(0);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const active = session?.status === 'active';
  useWakeLock(active);

  // When a card completes: scroll the next incomplete card into view and move focus to its first
  // unlogged row, so a whole workout can be entered without the keyboard closing. When the last
  // card completes, drop focus (the Finish button stays in the sticky header).
  const firstIncomplete =
    session && sets
      ? (session.targets.find(
          (t) =>
            sets.filter((s) => s.slotIndex === t.slotIndex && s.exerciseId === t.exerciseId)
              .length < t.sets,
        )?.slotIndex ?? null)
      : undefined;
  const previousIncomplete = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    const prev = previousIncomplete.current;
    previousIncomplete.current = firstIncomplete;
    if (prev === undefined || firstIncomplete === undefined || prev === firstIncomplete) return;
    if (firstIncomplete === null) {
      const el = document.activeElement;
      if (el instanceof HTMLElement && el !== document.body) el.blur();
      return;
    }
    // Only move forward: un-logging an earlier set must not yank focus around.
    if (prev !== null && firstIncomplete < prev) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const card = document.querySelector(
      `[data-testid="exercise-card"][data-slot="${firstIncomplete}"]`,
    );
    card?.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    const frame = requestAnimationFrame(() => {
      card
        ?.querySelector<HTMLInputElement>('[data-testid="set-row"][data-completed="false"] input')
        ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [firstIncomplete]);

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
  const slotNotes = readSlotNotes(session.notes);
  const swapTarget = session.targets.find((t) => t.slotIndex === noteSlot);
  const swapping = session.targets.find((t) => t.slotIndex === swapSlot);
  const workout = program?.workouts.find((w) => w.id === session.workoutId);

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

      <ul className="flex flex-col gap-3 px-gutter pb-8 pt-3">
        {session.targets.map((target) => (
          <li key={`${target.slotIndex}-${target.exerciseId}`}>
            <ExerciseCard
              session={session}
              target={target}
              exercise={exercises.get(target.exerciseId)}
              sets={sets}
              settings={settings}
              note={slotNotes[target.slotIndex] ?? ''}
              onSwap={() => setSwapSlot(target.slotIndex)}
              onNote={() => setNoteSlot(target.slotIndex)}
            />
          </li>
        ))}
      </ul>

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

      <SwapSheet
        open={swapping !== undefined}
        onClose={() => setSwapSlot(null)}
        currentId={swapping?.exerciseId ?? ''}
        alternativeIds={workout?.items[swapping?.slotIndex ?? -1]?.alternatives ?? []}
        catalog={catalog}
        onPick={(exerciseId) => {
          if (swapping) void sessionsRepo.swapExercise(session.id, swapping.slotIndex, exerciseId);
          setSwapSlot(null);
        }}
      />
      <NoteSheet
        open={swapTarget !== undefined}
        exerciseName={exercises.get(swapTarget?.exerciseId ?? '')?.name ?? 'exercise'}
        value={slotNotes[noteSlot ?? -1] ?? ''}
        onClose={() => setNoteSlot(null)}
        onChange={(text) => {
          if (noteSlot === null) return;
          void sessionsRepo.update(session.id, {
            notes: writeSlotNote(session.notes, noteSlot, text),
          });
        }}
      />
      <FinishSheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        sets={sets}
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
