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
  return (await screen.findAllByTestId('exercise-card'))[0];
}

function type(card: HTMLElement, label: string, value: string) {
  const input = within(card).getByLabelText(label);
  fireEvent.change(input, { target: { value } });
  return input;
}

describe('Session screen', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    await ensureSeeded();
  });

  it('logs a set by typing weight x reps and pressing Enter, and carries it to the next row', async () => {
    const s = await sessions.start('v-taper-upper-lower', 'upper-a');
    const card = await renderSession(s.id);
    expect(within(card).getByLabelText('Set 1 entry')).toHaveAttribute(
      'placeholder',
      'weight x reps',
    );
    const input = type(card, 'Set 1 entry', '100x8');
    expect(await within(card).findByText('100 lb × 8')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(within(card).getByRole('button', { name: 'Un-log set 1' })).toBeInTheDocument(),
    );
    expect(within(card).getByLabelText('Set 1 entry')).toHaveValue('100 x 8');
    expect(within(card).getByLabelText('Set 2 entry')).toHaveValue('100 x 8');
    expect(within(card).getByLabelText('Set 2 entry')).toHaveFocus();
    expect((await setsRepo.listBySession(s.id))[0]).toMatchObject({
      weight: 100,
      reps: 8,
      unit: 'lb',
    });
  });

  it('shows a hint for invalid text and does not log', async () => {
    const s = await sessions.start('v-taper-upper-lower', 'upper-a');
    const card = await renderSession(s.id);
    const input = type(card, 'Set 1 entry', 'abc');
    expect(await within(card).findByTestId('set-feedback')).toHaveTextContent('weight x reps');
    expect(within(card).getByRole('button', { name: 'Log set 1' })).toBeDisabled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await setsRepo.listBySession(s.id)).toHaveLength(0);
  });

  it('editing a logged row and pressing Enter updates the stored set in place; the check un-logs', async () => {
    const s = await sessions.start('v-taper-upper-lower', 'upper-a');
    const card = await renderSession(s.id);
    fireEvent.keyDown(type(card, 'Set 1 entry', '100 x 8'), { key: 'Enter' });
    await waitFor(() =>
      expect(within(card).getByRole('button', { name: 'Un-log set 1' })).toBeVisible(),
    );
    const [first] = await setsRepo.listBySession(s.id);

    fireEvent.keyDown(type(card, 'Set 1 entry', '105 x 7'), { key: 'Enter' });
    await waitFor(async () =>
      expect((await setsRepo.listBySession(s.id))[0]).toMatchObject({ weight: 105, reps: 7 }),
    );
    expect((await setsRepo.listBySession(s.id))[0].id).toBe(first.id);

    fireEvent.click(await within(card).findByRole('button', { name: 'Un-log set 1' }));
    await waitFor(async () => expect(await setsRepo.listBySession(s.id)).toHaveLength(0));
  });

  it('has no timer UI', async () => {
    const s = await sessions.start('v-taper-upper-lower', 'upper-a');
    await renderSession(s.id);
    expect(screen.queryByLabelText(/elapsed/i)).toBeNull();
    expect(screen.queryByText(/rest/i)).toBeNull();
  });
});
