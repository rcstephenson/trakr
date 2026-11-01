import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import bundled from '../../../programs/v-taper-upper-lower.json';
import { db } from '../../../src/db/schema';
import { ensureSeeded } from '../../../src/db/seed';
import * as history from '../../../src/db/repositories/history';
import * as sessions from '../../../src/db/repositories/sessions';
import {
  buildChartPoints,
  buildHistoryRows,
  computeRecords,
  topSetOf,
} from '../../../src/components/charts/chartData';
import { clearDemoData, generateDemoData, seedDemoData } from '../../../src/dev/demoData';
import { estimate1RM, exerciseSessionMetrics } from '../../../src/domain/stats';
import type { Program } from '../../../src/domain/types';
import { convert } from '../../../src/domain/units';

const program = bundled as unknown as Program;
const NOW = new Date(2026, 5, 15, 12, 0);

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('demo generator', () => {
  it('produces ~6 months at 3-4 sessions per week with small increases', () => {
    const data = generateDemoData(program, NOW);
    const weeks = 182 / 7;
    expect(data.sessions.length).toBeGreaterThan(weeks * 2.8);
    expect(data.sessions.length).toBeLessThan(weeks * 4.1);
    expect(data.activities.length).toBeGreaterThan(0);
    const bench = data.sessions
      .flatMap((s) => s.sets)
      .filter((s) => s.exerciseId === 'barbell-bench-press' && !s.isWarmup);
    expect(bench[bench.length - 1].weight).toBeGreaterThan(bench[0].weight);
  });

  it('is deterministic', () => {
    expect(generateDemoData(program, NOW)).toEqual(generateDemoData(program, NOW));
  });
});

describe('chart data with seeded history', () => {
  it('plotted points equal exerciseSessionMetrics outputs for every metric', async () => {
    await ensureSeeded();
    const result = await seedDemoData();
    expect(result.sessions).toBeGreaterThan(50);

    const exerciseId = 'barbell-bench-press';
    const perf = await history.forExercise(exerciseId);
    expect(perf.length).toBeGreaterThan(10);

    for (const unit of ['lb', 'kg'] as const) {
      const expected = perf.map(({ session, sets }) => {
        const working = sets
          .filter((s) => !s.isWarmup)
          .map((s) => ({
            weight: s.unit === unit ? s.weight : convert(s.weight, s.unit, unit),
            reps: s.reps,
            isWarmup: false,
          }));
        return { id: session.id, m: exerciseSessionMetrics(working) };
      });
      const top = buildChartPoints(perf, 'topWeight', unit);
      const e1 = buildChartPoints(perf, 'e1rm', unit);
      const vol = buildChartPoints(perf, 'volume', unit);
      expect(top.map((p) => [p.sessionId, p.value])).toEqual(
        expected.map((e) => [e.id, e.m.topWeight]),
      );
      expect(vol.map((p) => [p.sessionId, p.value])).toEqual(
        expected.map((e) => [e.id, e.m.volume]),
      );
      expect(e1.map((p) => [p.sessionId, p.value])).toEqual(
        expected.filter((e) => e.m.bestE1RM !== null).map((e) => [e.id, e.m.bestE1RM]),
      );
    }
  });

  it('excludes warm-ups and filters by range', async () => {
    await ensureSeeded();
    await seedDemoData();
    const perf = await history.forExercise('barbell-bench-press');
    const all = buildChartPoints(perf, 'topWeight', 'lb', 'All');
    const month = buildChartPoints(perf, 'topWeight', 'lb', '1M');
    const year = buildChartPoints(perf, 'topWeight', 'lb', '1Y');
    expect(month.length).toBeLessThan(all.length);
    expect(month.length).toBeGreaterThan(0);
    expect(year.length).toBe(all.length);
    const cutoff = Date.now() - 30 * 86_400_000;
    expect(month.every((p) => p.t >= cutoff)).toBe(true);
    for (const p of all) expect(p.sets.length).toBeGreaterThan(0);
  });

  it('records match the stats helpers', async () => {
    await ensureSeeded();
    await seedDemoData();
    const perf = await history.forExercise('barbell-bench-press');
    const rec = computeRecords(perf, 'lb');
    const working = perf.flatMap((p) => p.sets.filter((s) => !s.isWarmup));
    expect(rec.heaviest?.value).toBe(Math.max(...working.map((s) => s.weight)));
    expect(rec.bestE1RM?.value).toBeCloseTo(
      Math.max(...working.map((s) => estimate1RM(s.weight, s.reps) ?? 0)),
      6,
    );
    const rows = buildHistoryRows(perf, 'lb');
    expect(rows[0].startedAt >= rows[rows.length - 1].startedAt).toBe(true);
    expect(topSetOf(perf[0].sets)?.weight).toBeGreaterThan(0);
  });

  it('returns nothing for an exercise without history', async () => {
    await ensureSeeded();
    expect(buildChartPoints([], 'topWeight', 'lb')).toEqual([]);
    expect(computeRecords([], 'lb')).toEqual({ heaviest: null, bestE1RM: null });
  });

  it('clearDemoData removes only demo rows', async () => {
    await ensureSeeded();
    await seedDemoData();
    const own = await sessions.start(program.id, 'upper-a');
    await sessions.finish(own.id);
    const removed = await clearDemoData();
    expect(removed.sessions).toBeGreaterThan(50);
    const left = await sessions.list();
    expect(left.map((s) => s.id)).toEqual([own.id]);
    expect(await db.sets.count()).toBe(0);
  });
});
