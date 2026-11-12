import 'fake-indexeddb/auto';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import History from '../../../src/routes/History';
import Program from '../../../src/routes/Program';
import Today from '../../../src/routes/Today';
import { DEFAULT_PROGRAM } from '../../../src/db/bundled';
import type { Program as ProgramDef } from '../../../src/domain/types';
import other from '../../fixtures/workout_A.program.json';
import { db } from '../../../src/db/schema';
import { ensureSeeded } from '../../../src/db/seed';
import * as programs from '../../../src/db/repositories/programs';
import * as sessions from '../../../src/db/repositories/sessions';
import { buildChartPoints } from '../../../src/components/charts/chartData';
import * as history from '../../../src/db/repositories/history';
import * as setsRepo from '../../../src/db/repositories/sets';

// The bundled program is the only built-in, so the second program is the frozen 4-day fixture.
const OTHER = other as unknown as ProgramDef;
const CURRENT = DEFAULT_PROGRAM.id;
const ARCHIVED = OTHER.id;

function page(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

async function done(programId: string, workoutId: string, daysAgo: number) {
  const startedAt = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  const s = await sessions.start(programId, workoutId, { startedAt });
  await setsRepo.add({
    sessionId: s.id,
    exerciseId: 'barbell-bench-press',
    slotIndex: 0,
    setIndex: 0,
    weight: 100 + daysAgo,
    unit: 'lb',
    reps: 8,
    isWarmup: false,
  });
  return sessions.finish(s.id);
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  await ensureSeeded();
});

describe('importing a second program', () => {
  it('keeps the first program and its sessions, and can switch both ways', async () => {
    const s = await done(CURRENT, 'upper-a', 3);
    await programs.save(OTHER, { activate: true });

    expect((await programs.list()).map((p) => p.id).sort()).toEqual([CURRENT, ARCHIVED]);
    expect((await programs.getActive())?.id).toBe(ARCHIVED);
    expect((await sessions.get(s.id))?.programId).toBe(CURRENT);

    await programs.setActive(CURRENT);
    expect((await programs.getActive())?.id).toBe(CURRENT);
  });

  it('removing a program never deletes its sessions or sets', async () => {
    const s = await done(CURRENT, 'upper-a', 3);
    await programs.save(OTHER, { activate: true });
    await programs.remove(CURRENT);
    expect(await sessions.get(s.id)).not.toBeNull();
    expect((await history.forExercise('barbell-bench-press')).length).toBe(1);
  });
});

describe('Today rotation is scoped to the active program', () => {
  it('starts the new program at its first workout, then resumes the old one on switch back', async () => {
    await done(CURRENT, 'upper-a', 2);
    const first = page(<Today />);
    expect(await screen.findByRole('heading', { name: 'Lower A' })).toBeInTheDocument();
    first.unmount();

    await programs.save(OTHER, { activate: true });
    const second = page(<Today />);
    // Same workout ids in both programs: the 5-day upper-a must not advance the archived program.
    expect(await screen.findByRole('heading', { name: 'Upper A' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Upper A/ })).toHaveTextContent('NEXT');
    second.unmount();

    await programs.setActive(CURRENT);
    page(<Today />);
    expect(await screen.findByRole('heading', { name: 'Lower A' })).toBeInTheDocument();
  });
});

describe('History across programs', () => {
  it('shows a single program without labels or filters', async () => {
    await done(CURRENT, 'upper-a', 2);
    page(<History />);
    await screen.findByTestId('feed-session');
    expect(screen.queryByTestId('session-program')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Filter by program' })).not.toBeInTheDocument();
  });

  it('labels each session with its program and filters by program, including a removed one', async () => {
    await done(CURRENT, 'upper-a', 2);
    await programs.save(OTHER);
    await done(ARCHIVED, 'upper-a', 20);
    await programs.remove(ARCHIVED); // sessions outlive the program: fallback label
    page(<History />);

    await screen.findAllByTestId('feed-session');
    const names = screen.getAllByTestId('session-program').map((e) => e.textContent);
    expect(names).toEqual([
      DEFAULT_PROGRAM.name,
      `${ARCHIVED} (removed)`,
    ]);

    const filter = screen.getByRole('group', { name: 'Filter by program' });
    fireEvent.click(within(filter).getByRole('button', { name: `${ARCHIVED} (removed)` }));
    expect(screen.getAllByTestId('feed-session')).toHaveLength(1);
    fireEvent.click(within(filter).getByRole('button', { name: 'All programs' }));
    expect(screen.getAllByTestId('feed-session')).toHaveLength(2);
  });
});

describe('Program screen history', () => {
  it('lists past programs with session count and date range, and switches back', async () => {
    await programs.save(OTHER);
    await done(ARCHIVED, 'upper-a', 40);
    await done(ARCHIVED, 'lower-a', 38);
    page(<Program />);

    const past = await screen.findByTestId('past-programs');
    expect(within(past).getByText(/Upper\/Lower \(4-day\)/)).toBeInTheDocument();
    expect(within(past).getByText(/2 sessions/)).toBeInTheDocument();

    fireEvent.click(within(past).getByRole('button', { name: /^Switch to Upper\/Lower \(4-day\)/ }));
    expect((await screen.findAllByText(/Active program/))[0]).toBeInTheDocument();
    expect((await programs.getActive())?.id).toBe(ARCHIVED);
  });

  it('offers the built-in program when it is not installed yet, then adds and activates it', async () => {
    await programs.save(OTHER, { activate: true });
    await programs.remove(CURRENT);
    page(<Program />);
    fireEvent.click(await screen.findByRole('button', { name: 'Import program' }));
    const builtIns = await screen.findByTestId('builtin-programs');
    await waitFor(() => expect(within(builtIns).getAllByRole('listitem')).toHaveLength(1));
    fireEvent.click(within(builtIns).getByRole('button', { name: `Add ${DEFAULT_PROGRAM.name}` }));
    await screen.findByRole('button', { name: 'Switch program' });
    expect((await programs.getActive())?.id).toBe(CURRENT);
    expect(await programs.list()).toHaveLength(2);
  });

  it('hides the built-in section when the only bundled program is already installed', async () => {
    page(<Program />);
    fireEvent.click(await screen.findByRole('button', { name: 'Import program' }));
    await screen.findByRole('dialog');
    expect(screen.queryByTestId('builtin-programs')).not.toBeInTheDocument();
  });
});
describe('exercise progress across programs', () => {
  it('carries one exercise history across programs, each point tagged with its program', async () => {
    await programs.save(OTHER);
    await done(ARCHIVED, 'upper-a', 30);
    await done(CURRENT, 'upper-a', 3);
    const perf = await history.forExercise('barbell-bench-press');
    const points = buildChartPoints(perf, 'topWeight', 'lb');
    expect(points.map((p) => p.programId)).toEqual([ARCHIVED, CURRENT]);
  });
});
