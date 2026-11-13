import 'fake-indexeddb/auto';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Session from '../../../src/routes/Session';
import { db } from '../../../src/db/schema';
import { ensureSeeded } from '../../../src/db/seed';
import * as sessions from '../../../src/db/repositories/sessions';
import * as setsRepo from '../../../src/db/repositories/sets';

async function renderSession(id: string) {
  render(
    <MemoryRouter initialEntries={[`/session/${id}`]}>
      <Routes>
        <Route path="/session/:id" element={<Session />} />
      </Routes>
    </MemoryRouter>,
  );
  return (await screen.findAllByTestId('exercise-row'))[0];
}

/** The row's exercise name: the selected option when the name is a swap dropdown. */
function rowName(row: HTMLElement): string {
  const select = row.querySelector('h3 select');
  if (select instanceof HTMLSelectElement) return select.selectedOptions[0].textContent!;
  return row.querySelector('h3')!.textContent!.replace(/^\d+/, '');
}

function enter(row: HTMLElement, name: string, weight: string, reps: string) {
  fireEvent.change(within(row).getByLabelText(`${name} weight`), { target: { value: weight } });
  const repsInput = within(row).getByLabelText(`${name} reps`);
  fireEvent.change(repsInput, { target: { value: reps } });
  return repsInput;
}

describe('Session screen (one entry per exercise)', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    await ensureSeeded();
  });

  it('shows one weight and one reps field per exercise and none of the old actions', async () => {
    const s = await sessions.start('5day-upperlower-rev2', 'upper-a');
    const row = await renderSession(s.id);
    const rows = screen.getAllByTestId('exercise-row');
    expect(rows).toHaveLength(s.targets.length);
    expect(within(row).getAllByRole('textbox')).toHaveLength(2);
    expect(screen.queryByText(/add set/i)).toBeNull();
    expect(screen.queryByText(/swap exercise/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /note/i })).toBeNull();
    expect(screen.queryByText(/options/i)).toBeNull();
  });

  it('uses text inputs with numeric keyboards', async () => {
    const s = await sessions.start('5day-upperlower-rev2', 'upper-a');
    const row = await renderSession(s.id);
    const [weight, reps] = within(row).getAllByRole('textbox');
    expect(weight).toHaveAttribute('inputmode', 'decimal');
    expect(weight).toHaveAttribute('enterkeyhint', 'next');
    expect(reps).toHaveAttribute('inputmode', 'numeric');
    expect(reps).toHaveAttribute('enterkeyhint', 'done');
  });

  it('Enter in weight moves to reps; Enter in reps writes N identical sets and moves to the next exercise', async () => {
    const s = await sessions.start('5day-upperlower-rev2', 'upper-a');
    const row = await renderSession(s.id);
    const target = s.targets[0];
    const name = rowName(row);
    const weight = within(row).getByLabelText(`${name} weight`);
    fireEvent.change(weight, { target: { value: '100' } });
    fireEvent.keyDown(weight, { key: 'Enter' });
    expect(within(row).getByLabelText(`${name} reps`)).toHaveFocus();

    const reps = enter(row, name, '100', '8');
    expect(await within(row).findByText('100 lb × 8')).toBeInTheDocument();
    fireEvent.keyDown(reps, { key: 'Enter' });
    await waitFor(() =>
      expect(within(row).getByRole('button', { name: `Un-log ${name}` })).toBeInTheDocument(),
    );
    const stored = await setsRepo.listBySession(s.id);
    expect(stored).toHaveLength(target.sets);
    expect(stored.every((x) => x.weight === 100 && x.reps === 8 && !x.isWarmup)).toBe(true);
    expect(stored.map((x) => x.setIndex)).toEqual(stored.map((_, i) => i));
    const nextRow = screen.getAllByTestId('exercise-row')[1];
    expect(within(nextRow).getAllByRole('textbox')[0]).toHaveFocus();
  });

  it('shows a hint for invalid text and does not log', async () => {
    const s = await sessions.start('5day-upperlower-rev2', 'upper-a');
    const row = await renderSession(s.id);
    const name = rowName(row);
    const reps = enter(row, name, 'abc', '8');
    expect(await within(row).findByTestId('entry-caption')).toHaveTextContent('weight');
    expect(within(row).getByRole('button', { name: `Log ${name}` })).toBeDisabled();
    fireEvent.keyDown(reps, { key: 'Enter' });
    expect(await setsRepo.listBySession(s.id)).toHaveLength(0);
  });

  it('editing a logged entry rewrites all its sets; the tick un-logs them all', async () => {
    const s = await sessions.start('5day-upperlower-rev2', 'upper-a');
    const row = await renderSession(s.id);
    const name = rowName(row);
    fireEvent.keyDown(enter(row, name, '100', '8'), { key: 'Enter' });
    await waitFor(async () =>
      expect(await setsRepo.listBySession(s.id)).toHaveLength(s.targets[0].sets),
    );

    fireEvent.keyDown(enter(row, name, '105', '7'), { key: 'Enter' });
    await waitFor(async () => {
      const stored = await setsRepo.listBySession(s.id);
      expect(stored).toHaveLength(s.targets[0].sets);
      expect(stored.every((x) => x.weight === 105 && x.reps === 7)).toBe(true);
    });

    fireEvent.click(await within(row).findByRole('button', { name: `Un-log ${name}` }));
    await waitFor(async () => expect(await setsRepo.listBySession(s.id)).toHaveLength(0));
  });

  it('treats a legacy slot with differing sets as logged, showing the first working set', async () => {
    const s = await sessions.start('5day-upperlower-rev2', 'upper-a');
    const t = s.targets[0];
    await setsRepo.add({
      sessionId: s.id,
      exerciseId: t.exerciseId,
      slotIndex: 0,
      setIndex: 0,
      weight: 90,
      unit: 'lb',
      reps: 10,
    });
    await setsRepo.add({
      sessionId: s.id,
      exerciseId: t.exerciseId,
      slotIndex: 0,
      setIndex: 1,
      weight: 95,
      unit: 'lb',
      reps: 8,
    });
    const row = await renderSession(s.id);
    const [weight, reps] = within(row).getAllByRole('textbox');
    await waitFor(() => expect(weight).toHaveValue('90'));
    expect(reps).toHaveValue('10');
    expect(within(row).getByRole('button', { name: /^Un-log/ })).toBeInTheDocument();
  });

  it('x in weight + Enter records a skip (no sets) and moves to the next exercise', async () => {
    const s = await sessions.start('5day-upperlower-rev2', 'upper-a');
    const row = await renderSession(s.id);
    const name = rowName(row);
    const weight = within(row).getByLabelText(`${name} weight`);
    fireEvent.change(weight, { target: { value: 'x' } });
    expect(within(row).getByTestId('entry-caption')).toHaveTextContent('skip');
    fireEvent.keyDown(weight, { key: 'Enter' });

    await waitFor(async () => expect((await sessions.get(s.id))?.skippedSlots).toEqual([0]));
    expect(await setsRepo.listBySession(s.id)).toHaveLength(0);
    expect(await within(row).findByRole('button', { name: `Un-skip ${name}` })).toBeInTheDocument();
    expect(row).toHaveAttribute('data-skipped', 'true');
    expect(within(row).getByTestId('entry-caption')).toHaveTextContent('skipped');
    const nextRow = screen.getAllByTestId('exercise-row')[1];
    expect(within(nextRow).getAllByRole('textbox')[0]).toHaveFocus();
    expect(screen.getByLabelText(/^1 of \d+ exercises logged$/)).toBeInTheDocument();
  });

  it('blank fields + the button skip; logging values afterwards clears the skip', async () => {
    const s = await sessions.start('5day-upperlower-rev2', 'upper-a');
    const row = await renderSession(s.id);
    const name = rowName(row);
    enter(row, name, '', '');
    fireEvent.click(within(row).getByRole('button', { name: `Skip ${name}` }));
    await waitFor(async () => expect((await sessions.get(s.id))?.skippedSlots).toEqual([0]));

    fireEvent.keyDown(enter(row, name, '100', '8'), { key: 'Enter' });
    await waitFor(async () =>
      expect(await setsRepo.listBySession(s.id)).toHaveLength(s.targets[0].sets),
    );
    expect((await sessions.get(s.id))?.skippedSlots).toEqual([]);
    expect(await within(row).findByRole('button', { name: `Un-log ${name}` })).toBeInTheDocument();
  });

  it('the skipped mark un-skips', async () => {
    const s = await sessions.start('5day-upperlower-rev2', 'upper-a');
    await sessions.skipSlot(s.id, 0, s.targets[0].exerciseId);
    const row = await renderSession(s.id);
    const name = rowName(row);
    fireEvent.click(await within(row).findByRole('button', { name: `Un-skip ${name}` }));
    await waitFor(async () => expect((await sessions.get(s.id))?.skippedSlots).toEqual([]));
  });

  it('skipping a logged exercise deletes its sets', async () => {
    const s = await sessions.start('5day-upperlower-rev2', 'upper-a');
    const t = s.targets[0];
    await setsRepo.replaceExerciseSets({
      sessionId: s.id,
      slotIndex: 0,
      exerciseId: t.exerciseId,
      count: t.sets,
      weight: 100,
      unit: 'lb',
      reps: 8,
    });
    await sessions.skipSlot(s.id, 0, t.exerciseId);
    expect(await setsRepo.listBySession(s.id)).toHaveLength(0);
    expect((await sessions.get(s.id))?.skippedSlots).toEqual([0]);
  });

  it('finish records every exercise without sets as skipped', async () => {
    const s = await sessions.start('5day-upperlower-rev2', 'upper-a');
    const t = s.targets[1];
    await setsRepo.replaceExerciseSets({
      sessionId: s.id,
      slotIndex: 1,
      exerciseId: t.exerciseId,
      count: t.sets,
      weight: 100,
      unit: 'lb',
      reps: 8,
    });
    const done = await sessions.finish(s.id);
    const expected = s.targets.map((x) => x.slotIndex).filter((i) => i !== 1);
    expect(done.status).toBe('completed');
    expect(done.skippedSlots).toEqual(expected);
    expect((await sessions.get(s.id))?.skippedSlots).toEqual(expected);
  });

  it("swaps an exercise for a program alternative, taking the alternative's sets and reps", async () => {
    // Give Bench Press's alternative its own prescription.
    const program = (await db.programs.get('5day-upperlower-rev2'))!;
    const upperA = program.workouts.find((w) => w.id === 'upper-a')!;
    upperA.items[0] = {
      ...upperA.items[0],
      alternatives: [{ exerciseId: 'dumbbell-bench-press', sets: 4, repMin: 8, repMax: 12 }],
    };
    await db.programs.put(program);

    const s = await sessions.start('5day-upperlower-rev2', 'upper-a');
    const row = await renderSession(s.id);
    const select = within(row).getByRole('combobox', { name: /switch to an alternative/ });
    expect(select).toHaveValue('barbell-bench-press');
    // Rows without alternatives (Bicep Curl) keep a plain name.
    const curl = screen.getAllByTestId('exercise-row')[6];
    expect(within(curl).queryByRole('combobox')).toBeNull();

    fireEvent.change(select, { target: { value: 'dumbbell-bench-press' } });
    await waitFor(async () =>
      expect((await sessions.get(s.id))?.targets[0]).toMatchObject({
        exerciseId: 'dumbbell-bench-press',
        sets: 4,
        repMin: 8,
        repMax: 12,
      }),
    );
    const swapped = (await screen.findAllByTestId('exercise-row'))[0];
    expect(swapped).toHaveTextContent('4 × 8–12');
    expect(within(swapped).getByLabelText('Dumbbell Bench Press weight')).toBeInTheDocument();

    // Back to the default restores its prescription.
    fireEvent.change(within(swapped).getByRole('combobox'), {
      target: { value: 'barbell-bench-press' },
    });
    await waitFor(async () =>
      expect((await sessions.get(s.id))?.targets[0]).toMatchObject({
        exerciseId: 'barbell-bench-press',
        sets: s.targets[0].sets,
        repMin: s.targets[0].repMin,
        repMax: s.targets[0].repMax,
      }),
    );
  });

  it('marks primary lifts (in blue) and keeps the mark after a swap', async () => {
    const s = await sessions.start('5day-upperlower-rev2', 'upper-a');
    const program = (await db.programs.get('5day-upperlower-rev2'))!;
    const items = program.workouts.find((w) => w.id === 'upper-a')!.items;
    await renderSession(s.id);
    const rows = screen.getAllByTestId('exercise-row');
    rows.forEach((row, i) => {
      const primary = items[i].primary === true;
      expect(row).toHaveAttribute('data-primary', String(primary));
      if (primary) {
        expect(row.querySelector('h3')!.className).toContain('text-lift');
        expect(row.querySelector('h3')).toHaveTextContent('(primary lift)');
      } else {
        expect(row.querySelector('h3')!.className).not.toContain('text-lift');
      }
    });
    expect(rows.filter((r) => r.dataset.primary === 'true').length).toBeGreaterThan(0);

    // Bench Press (primary) swapped for its alternative is still the primary slot.
    fireEvent.change(within(rows[0]).getByRole('combobox'), {
      target: { value: 'dumbbell-bench-press' },
    });
    await waitFor(async () =>
      expect((await sessions.get(s.id))?.targets[0].exerciseId).toBe('dumbbell-bench-press'),
    );
    expect((await screen.findAllByTestId('exercise-row'))[0]).toHaveAttribute(
      'data-primary',
      'true',
    );
  });

  it('logs a completion exercise (Plank) with a single done mark', async () => {
    const s = await sessions.start('5day-upperlower-rev2', 'lower-b');
    await renderSession(s.id);
    const slot = s.targets.length - 1;
    const row = () => screen.getAllByTestId('exercise-row')[slot];
    fireEvent.change(within(row()).getByRole('combobox'), { target: { value: 'plank' } });
    await waitFor(() => expect(row()).toHaveTextContent('Complete'));
    fireEvent.click(within(row()).getByRole('button', { name: 'Mark Plank done' }));
    await waitFor(async () => {
      const logged = (await db.sets.where('sessionId').equals(s.id).toArray()).filter(
        (x) => x.slotIndex === slot,
      );
      expect(logged).toHaveLength(1);
      expect(logged[0]).toMatchObject({ exerciseId: 'plank', weight: 0, reps: 1 });
    });
    fireEvent.click(await within(row()).findByRole('button', { name: 'Un-mark Plank done' }));
    await waitFor(async () =>
      expect(
        (await db.sets.where('sessionId').equals(s.id).toArray()).filter((x) => x.slotIndex === slot),
      ).toHaveLength(0),
    );
  });

  it('locks the exercise dropdown once the exercise is logged', async () => {
    const s = await sessions.start('5day-upperlower-rev2', 'upper-a');
    const t = s.targets[0];
    await setsRepo.replaceExerciseSets({
      sessionId: s.id,
      slotIndex: 0,
      exerciseId: t.exerciseId,
      count: t.sets,
      weight: 100,
      unit: 'lb',
      reps: 8,
    });
    const row = await renderSession(s.id);
    expect(within(row).getByRole('combobox')).toBeDisabled();
  });

  it('has no timer UI', async () => {
    const s = await sessions.start('5day-upperlower-rev2', 'upper-a');
    await renderSession(s.id);
    expect(screen.queryByLabelText(/elapsed/i)).toBeNull();
    expect(screen.queryByText(/rest/i)).toBeNull();
  });
});
