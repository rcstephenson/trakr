import { describe, expect, it } from 'vitest';
import {
  formatRepsText,
  formatWeightText,
  isSkipEntry,
  parseWeightReps,
} from '../../../src/domain/setEntry';
import type { LoadType, Unit } from '../../../src/domain/types';

const p = (w: string, r: string, load: LoadType = 'total', unit: Unit = 'lb') =>
  parseWeightReps(w, r, { load, unit });
const ok = (weight: number, reps: number, unit: Unit = 'lb') => ({
  ok: true,
  weight,
  reps,
  unit,
});

describe('parseWeightReps: weight', () => {
  it('accepts whole numbers and decimals', () => {
    expect(p('135', '8')).toEqual(ok(135, 8));
    expect(p('62.5', '10')).toEqual(ok(62.5, 10));
    expect(p('.5', '10')).toEqual(ok(0.5, 10));
    expect(p('  135  ', ' 8 ')).toEqual(ok(135, 8));
  });

  it('accepts an explicit zero for a loaded exercise', () => {
    expect(p('0', '8')).toEqual(ok(0, 8));
  });

  it('converts a lb/kg suffix to the display unit', () => {
    expect(p('100kg', '5')).toEqual(ok(220, 5));
    expect(p('100 kg', '5', 'total', 'kg')).toEqual(ok(100, 5, 'kg'));
    expect(p('225lb', '5', 'total', 'kg')).toEqual(ok(102, 5, 'kg'));
    expect(p('135 lbs', '5')).toEqual(ok(135, 5));
  });

  it.each(['', '  ', 'abc', '135x', '1,5', '-5', '--', '135 8', '10001', '+25', 'bw'])(
    'rejects %j for load total',
    (w) => {
      const r = p(w, '8');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.field).toBe('weight');
    },
  );

  it('rejects a + prefix and bw for per-hand', () => {
    expect(p('+25', '8', 'per-hand').ok).toBe(false);
    expect(p('bw', '8', 'per-hand').ok).toBe(false);
    expect(p('30', '8', 'per-hand')).toEqual(ok(30, 8));
  });
});

describe('parseWeightReps: bodyweight-plus', () => {
  it('reads +25 and plain 25 as added load', () => {
    expect(p('+25', '8', 'bodyweight-plus')).toEqual(ok(25, 8));
    expect(p('25', '8', 'bodyweight-plus')).toEqual(ok(25, 8));
    expect(p('+ 12.5', '8', 'bodyweight-plus')).toEqual(ok(12.5, 8));
    expect(p('bw+25', '8', 'bodyweight-plus')).toEqual(ok(25, 8));
    expect(p('+25kg', '8', 'bodyweight-plus')).toEqual(ok(55, 8));
  });

  it('reads bw, empty and 0 as bodyweight', () => {
    expect(p('bw', '12', 'bodyweight-plus')).toEqual(ok(0, 12));
    expect(p('BW', '12', 'bodyweight-plus')).toEqual(ok(0, 12));
    expect(p('', '12', 'bodyweight-plus')).toEqual(ok(0, 12));
    expect(p('0', '12', 'bodyweight-plus')).toEqual(ok(0, 12));
  });

  it('rejects nonsense', () => {
    const r = p('x', '12', 'bodyweight-plus');
    expect(r).toMatchObject({ ok: false, field: 'weight', hint: '+25, or bw' });
  });
});

describe('parseWeightReps: load none', () => {
  it('ignores the weight and needs only reps', () => {
    expect(p('', '12', 'none')).toEqual(ok(0, 12));
    expect(p('whatever', '12', 'none')).toEqual(ok(0, 12));
  });
});

describe('parseWeightReps: reps', () => {
  it('accepts whole numbers from 1 to 999', () => {
    expect(p('135', '1')).toEqual(ok(135, 1));
    expect(p('135', '999')).toEqual(ok(135, 999));
  });

  it.each(['', ' ', '0', '00', '1000', '8.5', '-3', 'ab', '8 reps', '1e2'])(
    'rejects reps %j',
    (r) => {
      const res = p('135', r);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.field).toBe('reps');
    },
  );

  it('reports weight before reps when both are bad', () => {
    const r = p('', '');
    expect(r).toMatchObject({ ok: false, field: 'weight' });
  });
});

describe('isSkipEntry', () => {
  it('treats x in either field (any case, padded) as a skip', () => {
    expect(isSkipEntry('x', '', 'total')).toBe(true);
    expect(isSkipEntry(' X ', '8', 'total')).toBe(true);
    expect(isSkipEntry('135', 'x', 'total')).toBe(true);
    expect(isSkipEntry('', 'x', 'none')).toBe(true);
  });

  it('treats every shown field blank as a skip', () => {
    expect(isSkipEntry('', '', 'total')).toBe(true);
    expect(isSkipEntry('  ', ' ', 'per-hand')).toBe(true);
    expect(isSkipEntry('', '', 'bodyweight-plus')).toBe(true);
    // Load none has no weight field, so only reps counts.
    expect(isSkipEntry('135', '', 'none')).toBe(true);
  });

  it('is not a skip when anything real is entered', () => {
    expect(isSkipEntry('135', '', 'total')).toBe(false);
    expect(isSkipEntry('', '8', 'total')).toBe(false);
    expect(isSkipEntry('135', '8', 'total')).toBe(false);
    expect(isSkipEntry('bw', '', 'bodyweight-plus')).toBe(false);
    expect(isSkipEntry('xx', '', 'total')).toBe(false);
  });
});

describe('formatters', () => {
  it('formats weight text canonically', () => {
    expect(formatWeightText(135)).toBe('135');
    expect(formatWeightText(62.5, 'total')).toBe('62.5');
    expect(formatWeightText(100.004, 'total')).toBe('100');
    expect(formatWeightText(0, 'bodyweight-plus')).toBe('bw');
    expect(formatWeightText(25, 'bodyweight-plus')).toBe('+25');
    expect(formatWeightText(0, 'none')).toBe('');
  });

  it('formats reps as a plain integer', () => {
    expect(formatRepsText(8)).toBe('8');
  });

  it('round-trips through the parser', () => {
    for (const load of ['total', 'per-hand', 'bodyweight-plus', 'none'] as LoadType[]) {
      const weight = load === 'none' ? 0 : 62.5;
      const r = p(formatWeightText(weight, load), formatRepsText(9), load);
      expect(r).toEqual(ok(weight, 9));
    }
  });
});
