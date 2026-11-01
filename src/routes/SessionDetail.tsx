import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { freeNotes, groupSets, withEmptySlots } from '../components/history/detail';
import { ExerciseSets } from '../components/history/ExerciseSets';
import { formatVolume, sessionMinutes, sessionTotals } from '../components/history/feed';
import { usePrSetIds } from '../components/history/usePrSetIds';
import { readSlotNotes } from '../components/session/prefill';
import { useExerciseCatalog } from '../components/session/hooks';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  SectionLabel,
} from '../components/ui';
import * as sessionsRepo from '../db/repositories/sessions';
import { formatDuration } from '../domain/activity';
import { useSession } from '../hooks/useSession';
import { useSessionSets } from '../hooks/useSessionSets';
import { useSettings } from '../hooks/useSettings';

function BackLink() {
  return (
    <Link
      to="/history"
      className="ml-gutter mt-2 inline-flex min-h-touch items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-micro text-accent"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      History
    </Link>
  );
}

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = useSession(id);
  const sets = useSessionSets(id);
  const settings = useSettings();
  const catalog = useExerciseCatalog();
  const prIds = usePrSetIds(session, sets, settings?.unit ?? 'lb');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (session === null) {
    return (
      <>
        <BackLink />
        <EmptyState
          title="Session not found"
          description="It may have been deleted."
          action={
            <Link to="/history">
              <Button>Back to History</Button>
            </Link>
          }
        />
      </>
    );
  }
  if (!session || !sets || !settings || !catalog) {
    return (
      <>
        <BackLink />
        <PageHeader title="Session" />
      </>
    );
  }

  const exercises = new Map(catalog.map((e) => [e.id, e]));
  const groups = groupSets(sets);
  const shownGroups = editing ? withEmptySlots(groups, session.targets) : groups;
  const slotNotes = readSlotNotes(session.notes);
  const noteShown = new Set<number>();
  const minutes = sessionMinutes(session);
  const totals = sessionTotals(sets, settings.unit);
  const date = new Date(session.startedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const subtitle = [date, minutes !== null ? formatDuration(minutes) : null]
    .filter(Boolean)
    .join(' · ');
  const orphanNotes = Object.entries(slotNotes)
    .filter(([slot]) => !groups.some((g) => g.slotIndex === Number(slot)))
    .map(([slot, text]) => `Exercise ${Number(slot) + 1}: ${text}`);
  const notes = [...freeNotes(session.notes), ...orphanNotes];

  async function remove() {
    if (!id) return;
    await sessionsRepo.remove(id);
    navigate('/history', { replace: true });
  }

  return (
    <>
      <BackLink />
      <PageHeader
        title={session.workoutName}
        subtitle={subtitle}
        action={
          <Button variant={editing ? 'primary' : 'secondary'} onClick={() => setEditing((e) => !e)}>
            {editing ? 'Done' : 'Edit'}
          </Button>
        }
      />
      <div className="flex flex-col gap-3 px-gutter pb-8">
        <p className="num flex items-center gap-2 text-xs text-ink" data-testid="detail-totals">
          <span aria-hidden="true" className="h-2 w-2 rounded-[2px] bg-accent" />
          {totals.setCount} {totals.setCount === 1 ? 'set' : 'sets'}
          {totals.volume > 0 ? ` · ${formatVolume(totals.volume, settings.unit)} volume` : ''}
        </p>

        {groups.length === 0 ? (
          <Card>
            <p className="micro">No sets were logged in this session.</p>
          </Card>
        ) : null}

        {shownGroups.map((g) => {
          const showNote = !noteShown.has(g.slotIndex);
          noteShown.add(g.slotIndex);
          return (
            <ExerciseSets
              key={g.key}
              sessionId={session.id}
              group={g}
              exercise={exercises.get(g.exerciseId)}
              settings={settings}
              note={showNote ? slotNotes[g.slotIndex] : undefined}
              editing={editing}
              prSetIds={prIds ?? new Set()}
            />
          );
        })}

        {notes.length > 0 ? (
          <Card>
            <SectionLabel className="mb-2">Notes</SectionLabel>
            {notes.map((n, i) => (
              <p key={i} className="text-sm text-ink">
                {n}
              </p>
            ))}
          </Card>
        ) : null}

        <Button variant="danger" fullWidth onClick={() => setConfirmDelete(true)}>
          Delete session
        </Button>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this session?"
        message="The session and all of its sets will be removed. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
