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
    const s = await sessions.start('v-taper-upper-lower', 'upper-a');
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
    const s = await sessions.start('v-taper-upper-lower', 'upper-a');
    const row = await renderSession(s.id);
    const [weight, reps] = within(row).getAllByRole('textbox');
    expect(weight).toHaveAttribute('inputmode', 'decimal');
    expect(weight).toHaveAttribute('enterkeyhint', 'next');
    expect(reps).toHaveAttribute('inputmode', 'numeric');
    expect(reps).toHaveAttribute('enterkeyhint', 'done');
  });

  it('Enter in weight moves to reps; Enter in reps writes N identical sets and moves to the next exercise', async () => {
    const s = await sessions.start('v-taper-upper-lower', 'upper-a');
    const row = await renderSession(s.id);
    const target = s.targets[0];
    const name = row.querySelector('h3')!.textContent!.replace(/^\d+/, '');
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
    const s = await sessions.start('v-taper-upper-lower', 'upper-a');
    const row = await renderSession(s.id);
    const name = row.querySelector('h3')!.textContent!.replace(/^\d+/, '');
    const reps = enter(row, name, 'abc', '8');
    expect(await within(row).findByTestId('entry-caption')).toHaveTextContent('weight');
    expect(within(row).getByRole('button', { name: `Log ${name}` })).toBeDisabled();
    fireEvent.keyDown(reps, { key: 'Enter' });
    expect(await setsRepo.listBySession(s.id)).toHaveLength(0);
  });

  it('editing a logged entry rewrites all its sets; the tick un-logs them all', async () => {
    const s = await sessions.start('v-taper-upper-lower', 'upper-a');
    const row = await renderSession(s.id);
    const name = row.querySelector('h3')!.textContent!.replace(/^\d+/, '');
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
    const s = await sessions.start('v-taper-upper-lower', 'upper-a');
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

  it('has no timer UI', async () => {
    const s = await sessions.start('v-taper-upper-lower', 'upper-a');
    await renderSession(s.id);
    expect(screen.queryByLabelText(/elapsed/i)).toBeNull();
    expect(screen.queryByText(/rest/i)).toBeNull();
  });
});
