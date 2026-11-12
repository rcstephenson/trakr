import 'fake-indexeddb/auto';
import { fireEvent, render, screen } from '@testing-library/react';
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
    const s = await sessions.start('5day-upperlower-rev2', 'upper-a');
    await sessions.finish(s.id);
    renderToday();
    expect(await screen.findByRole('heading', { name: 'Lower A' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Upper A/ })).toHaveAttribute(
      'href',
      `/history/session/${s.id}`,
    );
  });

  it('shows Resume with an active session', async () => {
    await sessions.start('5day-upperlower-rev2', 'upper-a');
    renderToday();
    expect(await screen.findByRole('link', { name: 'Resume Upper A' })).toBeInTheDocument();
  });

  it('lets the user pick any workout and a past day, marking the next one', async () => {
    renderToday();
    expect(await screen.findByRole('radio', { name: /Upper A/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Upper A/ })).toHaveTextContent('NEXT');
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Start Upper A' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Lower B/ }));
    expect(screen.getByRole('heading', { name: 'Lower B' })).toBeInTheDocument();

    const picker = screen.getByLabelText('Pick a date') as HTMLInputElement;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    fireEvent.change(picker, { target: { value: yesterdayKey } });
    expect(screen.getByRole('button', { name: /^Log Lower B · / })).toBeInTheDocument();
    fireEvent.change(picker, { target: { value: picker.max } });
    expect(screen.getByRole('button', { name: 'Start Lower B' })).toBeInTheDocument();
  });

  it('hides the selector while a session is active and offers Discard', async () => {
    await sessions.start('5day-upperlower-rev2', 'upper-a');
    renderToday();
    expect(await screen.findByRole('button', { name: 'Discard workout' })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByText(/Finish or discard the workout in progress/)).toBeInTheDocument();
  });
});
