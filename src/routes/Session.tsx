import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { ExerciseCard } from '../components/session/ExerciseCard';
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
  const [busy, setBusy] = useState(false);

  const active = session?.status === 'active';
  useWakeLock(active);

  // Scroll the next incomplete card into view when the current one is completed.
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
    if (prev === undefined || firstIncomplete === undefined || firstIncomplete === null) return;
    if (prev === firstIncomplete) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document
      .querySelector(`[data-testid="exercise-card"][data-slot="${firstIncomplete}"]`)
      ?.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }, [firstIncomplete]);

  if (session === undefined || sets === undefined || settings === undefined || !catalog) {
    return (
      <>
        <PageHeader title="Session" />
        <p className="px-gutter text-sm text-muted">Loading session…</p>
      </>
    );
  }
  if (session === null) {
    return (
      <>
        <PageHeader title="Session" />
        <EmptyState
          title="Session not found"
          description="It may have been deleted."
          action={
            <Link to="/" className="text-sm font-semibold text-accent">
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
            className="text-sm font-semibold text-accent"
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
    await sessionsRepo.discard(id);
    navigate('/');
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex min-h-touch items-center gap-2 border-b border-border bg-bg px-gutter py-2">
        <Link
          to="/"
          aria-label="Back to Today"
          className="-ml-2 inline-flex h-12 w-10 shrink-0 items-center justify-center text-muted"
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-text">{session.workoutName}</h1>
        </div>
        <Button
          onClick={() => {
            setDurationMs(Date.now() - Date.parse(session.startedAt));
            setFinishOpen(true);
          }}
        >
          Finish
        </Button>
      </header>

      <ul className="flex flex-col gap-3 px-gutter pt-3">
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
        onDiscard={() => void discard()}
      />
    </>
  );
}
