import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button, EmptyState, PageHeader } from '../components/ui';
import { ExercisePicker } from '../components/program/ExercisePicker';
import { SortableItemCard, type DraftItem } from '../components/program/SortableItemCard';
import { toProgram } from '../components/program/programFiles';
import { useActiveProgram } from '../hooks/useActiveProgram';
import * as programsRepo from '../db/repositories/programs';
import * as exercisesRepo from '../db/repositories/exercises';
import { newId } from '../lib/ids';
import { altId } from '../domain/alternatives';
import type { Exercise, WorkoutItem } from '../domain/types';

type PickerTarget = { mode: 'add' } | { mode: 'alt'; key: string } | null;

export default function WorkoutEditor() {
  const { workoutId } = useParams();
  const navigate = useNavigate();
  const program = useActiveProgram();
  const catalog = useLiveQuery(() => exercisesRepo.list(), []);
  const workout = program?.workouts.find((w) => w.id === workoutId);

  const [draft, setDraft] = useState<DraftItem[] | null>(null);
  const [extras, setExtras] = useState<Exercise[]>([]);
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [undo, setUndo] = useState<{ draft: DraftItem; index: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (workout && loadedFor.current !== workout.id) {
      loadedFor.current = workout.id;
      setDraft(workout.items.map((item) => ({ key: newId(), item })));
    }
  }, [workout]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const allExercises = useMemo(() => {
    const map = new Map<string, Exercise>();
    for (const e of catalog ?? []) map.set(e.id, e);
    for (const e of program?.exercises ?? []) map.set(e.id, e);
    for (const e of extras) map.set(e.id, e);
    return [...map.values()];
  }, [catalog, program, extras]);
  const nameOf = (id: string) => allExercises.find((e) => e.id === id)?.name ?? id;

  if (program === undefined || draft === null) {
    if (program === null || (program && !workout)) return <NotFound />;
    return <PageHeader title="Workout editor" />;
  }
  if (!program || !workout) return <NotFound />;
  const activeProgram = program;

  const update = (key: string, item: WorkoutItem) =>
    setDraft(draft.map((d) => (d.key === key ? { ...d, item } : d)));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = draft.findIndex((d) => d.key === active.id);
    const to = draft.findIndex((d) => d.key === over.id);
    setDraft(arrayMove(draft, from, to));
  };

  const remove = (key: string) => {
    const index = draft.findIndex((d) => d.key === key);
    setUndo({ draft: draft[index], index });
    setDraft(draft.filter((d) => d.key !== key));
  };

  const restore = () => {
    if (!undo) return;
    const next = [...draft];
    next.splice(Math.min(undo.index, next.length), 0, undo.draft);
    setDraft(next);
    setUndo(null);
  };

  const pick = (exercise: Exercise) => {
    if (!allExercises.some((e) => e.id === exercise.id)) setExtras([...extras, exercise]);
    if (picker?.mode === 'add') {
      setDraft([
        ...draft,
        {
          key: newId(),
          item: {
            exerciseId: exercise.id,
            sets: 3,
            repMin: 8,
            repMax: 12,
            notes: '',
            alternatives: [],
          },
        },
      ]);
    } else if (picker?.mode === 'alt') {
      const key = picker.key;
      setDraft(
        draft.map((d) =>
          d.key === key && !d.item.alternatives.some((a) => altId(a) === exercise.id)
            ? { ...d, item: { ...d.item, alternatives: [...d.item.alternatives, exercise.id] } }
            : d,
        ),
      );
    }
    setPicker(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      const base = toProgram(activeProgram);
      const items = draft.map((d) => d.item);
      const used = new Set(items.flatMap((i) => [i.exerciseId, ...i.alternatives.map(altId)]));
      const known = new Set(base.exercises.map((e) => e.id));
      const added = allExercises.filter((e) => used.has(e.id) && !known.has(e.id));
      await programsRepo.save({
        ...base,
        exercises: [...base.exercises, ...added],
        workouts: base.workouts.map((w) => (w.id === workout.id ? { ...w, items } : w)),
      });
      navigate('/program');
    } finally {
      setSaving(false);
    }
  };

  const pickerTarget = picker?.mode === 'alt' ? draft.find((d) => d.key === picker.key) : undefined;

  return (
    <>
      <PageHeader
        title={workout.name}
        subtitle="Edit template · past sessions unchanged"
        action={
          <Link
            to="/program"
            aria-label="Back to program"
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-btn text-ink active:bg-surface"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
        }
      />
      <div className="flex flex-col gap-3 px-gutter pb-32">
        {draft.length === 0 ? (
          <EmptyState title="No exercises" description="Add an exercise to this workout." />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={draft.map((d) => d.key)} strategy={verticalListSortingStrategy}>
              {draft.map((d) => (
                <SortableItemCard
                  key={d.key}
                  draft={d}
                  nameOf={nameOf}
                  onChange={(item) => update(d.key, item)}
                  onRemove={() => remove(d.key)}
                  onAddAlternative={() => setPicker({ mode: 'alt', key: d.key })}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
        <Button variant="secondary" fullWidth onClick={() => setPicker({ mode: 'add' })}>
          <Plus size={18} aria-hidden="true" />
          Add exercise
        </Button>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-app flex-col gap-2 border-t border-hairline bg-surface p-gutter">
        {undo ? (
          <div
            role="status"
            className="num flex min-h-touch items-center justify-between text-xs text-ink"
          >
            <span>Removed {nameOf(undo.draft.item.exerciseId)}</span>
            <Button variant="ghost" onClick={restore}>
              Undo
            </Button>
          </div>
        ) : null}
        <Button fullWidth onClick={() => void save()} disabled={saving}>
          Save workout
        </Button>
      </div>

      <ExercisePicker
        open={picker !== null}
        title={picker?.mode === 'alt' ? 'Add alternative' : 'Add exercise'}
        catalog={allExercises}
        exclude={
          pickerTarget
            ? [pickerTarget.item.exerciseId, ...pickerTarget.item.alternatives.map(altId)]
            : []
        }
        onClose={() => setPicker(null)}
        onPick={pick}
      />
    </>
  );
}

function NotFound() {
  return (
    <>
      <PageHeader title="Workout editor" />
      <EmptyState
        title="Workout not found"
        description="This workout is not in the active program."
        action={
          <Link
            to="/program"
            className="font-mono text-xs font-semibold uppercase tracking-micro text-accent"
          >
            Back to program
          </Link>
        }
      />
    </>
  );
}
