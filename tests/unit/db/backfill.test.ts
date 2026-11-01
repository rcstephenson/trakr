import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../../src/db/schema';
import { ensureSeeded } from '../../../src/db/seed';
import * as sessions from '../../../src/db/repositories/sessions';
import * as sets from '../../../src/db/repositories/sets';
import * as programs from '../../../src/db/repositories/programs';
import { nextWorkoutId } from '../../../src/domain/rotation';
import { buildFeed, sessionMinutes } from '../../../src/components/history/feed';
import { noonIso, toDateKey } from '../../../src/lib/dates';

const PID = 'v-taper-upper-lower';

function daysAgoKey(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateKey(d);
}

async function backfill(workoutId: string, daysAgo: number) {
  const s = await sessions.start(PID, workoutId, { startedAt: noonIso(daysAgoKey(daysAgo))! });
  return sessions.finish(s.id);
}

async function nextId(): Promise<string> {
  const program = (await programs.get(PID))!;
  return nextWorkoutId(program, await sessions.list({ status: 'completed' }));
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  await ensureSeeded();
});

describe('sessions.start with startedAt', () => {
  it('records the given instant instead of now', async () => {
    const startedAt = noonIso(daysAgoKey(3))!;
    const s = await sessions.start(PID, 'lower-b', { startedAt });
    expect(s.startedAt).toBe(startedAt);
    expect(s.status).toBe('active');
    expect(sessions.isBackdated(s)).toBe(true);
  });

  it('defaults to now and is not backdated', async () => {
    const s = await sessions.start(PID, 'upper-a');
    expect(Math.abs(Date.now() - Date.parse(s.startedAt))).toBeLessThan(5000);
    expect(sessions.isBackdated(s)).toBe(false);
  });

  it('still allows only one active session', async () => {
    await sessions.start(PID, 'upper-a', { startedAt: noonIso(daysAgoKey(1))! });
    await expect(sessions.start(PID, 'lower-a')).rejects.toBeInstanceOf(
      sessions.ActiveSessionExistsError,
    );
  });
});

describe('finishing a backdated session', () => {
  it('sets finishedAt = startedAt and shows no duration', async () => {
    const done = await backfill('upper-a', 2);
    expect(done.finishedAt).toBe(done.startedAt);
    expect(sessionMinutes(done)).toBeNull();
  });

  it('a same-day session keeps finishedAt at completion time', async () => {
    const s = await sessions.start(PID, 'upper-a');
    const done = await sessions.finish(s.id);
    expect(Date.parse(done.finishedAt!)).toBeGreaterThanOrEqual(Date.parse(s.startedAt));
  });
});

describe('rotation with backfilled sessions', () => {
  it('a backfill older than the latest session does not change next up', async () => {
    const today = await sessions.start(PID, 'upper-a');
    await sessions.finish(today.id);
    expect(await nextId()).toBe('lower-a');
    // Logging Lower B for three days ago must not make it look newer than Upper A.
    await backfill('lower-b', 3);
    expect(await nextId()).toBe('lower-a');
  });

  it('out-of-order backfills resolve by the chosen day', async () => {
    await backfill('lower-a', 1);
    await backfill('upper-a', 3);
    // Newest by day is Lower A (yesterday) -> Upper B is next.
    expect(await nextId()).toBe('upper-b');
    await backfill('upper-b', 2);
    // Upper B (2 days ago) is still older than Lower A (yesterday).
    expect(await nextId()).toBe('upper-b');
  });

  it('History groups a backfilled session under its own day', async () => {
    const done = await backfill('upper-a', 10);
    const groups = buildFeed([done], [], 'all', new Date());
    expect(groups).toHaveLength(1);
    expect(groups[0]!.items[0]!.at).toBe(done.startedAt);
  });
});

describe('sessionMinutes', () => {
  it('hides durations under one minute', () => {
    expect(
      sessionMinutes({ startedAt: '2025-01-15T10:00:00Z', finishedAt: '2025-01-15T10:00:40Z' }),
    ).toBeNull();
    expect(
      sessionMinutes({ startedAt: '2025-01-15T10:00:00Z', finishedAt: '2025-01-15T10:01:00Z' }),
    ).toBe(1);
  });
});

describe('sessions.remove (discard)', () => {
  it('deletes the session and its sets', async () => {
    const s = await sessions.start(PID, 'upper-a');
    await sets.add({
      sessionId: s.id,
      exerciseId: s.targets[0]!.exerciseId,
      slotIndex: 0,
      setIndex: 0,
      weight: 100,
      unit: 'lb',
      reps: 8,
    });
    await sessions.remove(s.id);
    expect(await sessions.get(s.id)).toBeNull();
    expect(await sets.listBySession(s.id)).toEqual([]);
    expect(await sessions.getActive()).toBeNull();
  });
});
