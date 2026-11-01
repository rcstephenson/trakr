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

describe('Session screen', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    await ensureSeeded();
  });

  it('logs a set by typing values then tapping the check, and auto-fills the next row', async () => {
    const s = await sessions.start('v-taper-upper-lower', 'upper-a');
    const card = await renderSession(s.id);
    fireEvent.change(within(card).getByLabelText('Set 1 weight'), { target: { value: '100' } });
    fireEvent.change(within(card).getByLabelText('Set 1 reps'), { target: { value: '8' } });
    const check = within(card).getByRole('button', { name: 'Complete set 1' });
    await waitFor(() => expect(check).toBeEnabled());
    fireEvent.click(check);
    await waitFor(() =>
      expect(within(card).getByRole('button', { name: 'Un-complete set 1' })).toBeInTheDocument(),
    );
    expect(within(card).getByLabelText('Set 2 weight')).toHaveValue('100');
    expect(within(card).getByLabelText('Set 2 reps')).toHaveValue('8');
    expect((await setsRepo.listBySession(s.id))[0]).toMatchObject({ weight: 100, reps: 8 });
  });
});
