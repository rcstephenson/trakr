import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Today from '../../../src/routes/Today';
import { db } from '../../../src/db/schema';
import { ensureSeeded } from '../../../src/db/seed';
import * as sessions from '../../../src/db/repositories/sessions';

function renderToday() {
  return render(
    <MemoryRouter>
      <Today />
    </MemoryRouter>,
  );
}

describe('Today', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    await ensureSeeded();
  });

  it('shows Upper A on a fresh install', async () => {
    renderToday();
    expect(await screen.findByRole('heading', { name: 'Upper A' })).toBeInTheDocument();
  });

  it('shows Lower A after a completed Upper A', async () => {
    const s = await sessions.start('v-taper-upper-lower', 'upper-a');
    await sessions.finish(s.id);
    renderToday();
    expect(await screen.findByRole('heading', { name: 'Lower A' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Upper A/ })).toHaveAttribute(
      'href',
      `/history/session/${s.id}`,
    );
  });

  it('shows Resume with an active session', async () => {
    await sessions.start('v-taper-upper-lower', 'upper-a');
    renderToday();
    expect(await screen.findByRole('link', { name: 'Resume Upper A' })).toBeInTheDocument();
  });
});
