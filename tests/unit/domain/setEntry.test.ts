import { describe, expect, it } from 'vitest';
import { formatSetEntry, parseSetEntry } from '../../../src/domain/setEntry';
import type { LoadType, Unit } from '../../../src/domain/types';

const p = (text: string, load: LoadType = 'total', unit: Unit = 'lb') =>
  parseSetEntry(text, { load, unit });
const ok = (weight: number, reps: number, unit: Unit = 'lb') => ({
  ok: true,
  weight,
  reps,
  unit,
});

describe('parseSetEntry: separators', () => {
  it.each([
    '135 x 8',
    '135x8',
    '135X8',
    '135 X 8',
    '135×8',
    '135 × 8',
    '135*8',
    '135 * 8',
    '135 8',
    '  135   8  ',
    '135 x8',
    '135x 8',
  ])('accepts %j', (text) => {
    expect(p(text)).toEqual(ok(135, 8));
  });

  it('does not treat a plain number as weight and reps', () => {
    expect(p('1358').ok).toBe(false);
  });
});

describe('parseSetEntry: numbers', () => {
  it('accepts decimals', () => {
    expect(p('62.5x10')).toEqual(ok(62.5, 10));
    expect(p('.5 x 10')).toEqual(ok(0.5, 10));
  });
  it('accepts zero weight', () => {
    expect(p('0 x 5')).toEqual(ok(0, 5));
  });
  it('rejects fractional, zero and negative reps', () => {
    expect(p('135 x 8.5').ok).toBe(false);
    expect(p('135 x 0').ok).toBe(false);
    expect(p('135 x -3').ok).toBe(false);
  });
  it('rejects negative weight', () => {
    expect(p('-135 x 8').ok).toBe(false);
  });
  it('rejects absurd values', () => {
    expect(p('135 x 5000').ok).toBe(false);
    expect(p('99999 x 5').ok).toBe(false);
  });
});

describe('parseSetEntry: unit suffix', () => {
  it('keeps a matching suffix as is', () => {
    expect(p('100lb x 5', 'total', 'lb')).toEqual(ok(100, 5, 'lb'));
    expect(p('100 lbs x 5', 'total', 'lb')).toEqual(ok(100, 5, 'lb'));
    expect(p('60 KG x 5', 'total', 'kg')).toEqual(ok(60, 5, 'kg'));
  });
  it('converts kg to lb for display', () => {
    expect(p('100kg x 5', 'total', 'lb')).toEqual(ok(220, 5, 'lb'));
  });
  it('converts lb to kg for display (nearest 0.5)', () => {
    expect(p('135 lb x 5', 'total', 'kg')).toEqual(ok(61, 5, 'kg'));
  });
  it('accepts a suffix with whitespace separator', () => {
    expect(p('100kg 5', 'total', 'lb')).toEqual(ok(220, 5, 'lb'));
  });
  it('rejects unknown units', () => {
    expect(p('100st x 5').ok).toBe(false);
  });
});

describe('parseSetEntry: bodyweight-plus', () => {
  it('reads +25 x 8 and 25 x 8 as added weight', () => {
    expect(p('+25 x 8', 'bodyweight-plus')).toEqual(ok(25, 8));
    expect(p('25 x 8', 'bodyweight-plus')).toEqual(ok(25, 8));
    expect(p('+25x8', 'bodyweight-plus')).toEqual(ok(25, 8));
  });
  it('reads bw x 12, 0 x 12 and 12 as bodyweight', () => {
    expect(p('bw x 12', 'bodyweight-plus')).toEqual(ok(0, 12));
    expect(p('BW12', 'bodyweight-plus').ok).toBe(false);
    expect(p('bw 12', 'bodyweight-plus')).toEqual(ok(0, 12));
    expect(p('0 x 12', 'bodyweight-plus')).toEqual(ok(0, 12));
    expect(p('12', 'bodyweight-plus')).toEqual(ok(0, 12));
  });
  it('reads bw + 25 x 8', () => {
    expect(p('bw+25 x 8', 'bodyweight-plus')).toEqual(ok(25, 8));
  });
  it('converts added weight with a suffix', () => {
    expect(p('+10kg x 8', 'bodyweight-plus', 'lb')).toEqual(ok(22, 8, 'lb'));
  });
});

describe('parseSetEntry: load none', () => {
  it('takes reps only', () => {
    expect(p('12', 'none')).toEqual(ok(0, 12));
  });
  it('tolerates an explicit zero or bw load', () => {
    expect(p('0 x 12', 'none')).toEqual(ok(0, 12));
    expect(p('bw x 12', 'none')).toEqual(ok(0, 12));
  });
  it('rejects a real weight rather than dropping it', () => {
    const r = p('25 x 12', 'none');
    expect(r.ok).toBe(false);
  });
  it('rejects 0 reps', () => {
    expect(p('0', 'none').ok).toBe(false);
  });
});

describe('parseSetEntry: per-hand', () => {
  it('needs weight x reps', () => {
    expect(p('30 x 10', 'per-hand')).toEqual(ok(30, 10));
    expect(p('10', 'per-hand').ok).toBe(false);
  });
});

describe('parseSetEntry: invalid input', () => {
  const cases = [
    '',
    '   ',
    'abc',
    'x',
    '135x',
    'x8',
    '135 x x 8',
    '135 x 8 x 3',
    '1 2 3',
    '135,8',
    '8 reps',
    'bw x 12',
    '+25 x 8',
    '135 lb',
    '135',
  ];
  it.each(cases)('rejects %j for total load with a hint', (text) => {
    const r = p(text);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.hint).toContain('weight x reps');
  });
  it('gives load-specific hints', () => {
    const none = p('abc', 'none');
    const bw = p('abc', 'bodyweight-plus');
    expect(none.ok || none.hint).toMatch(/reps/);
    expect(bw.ok || bw.hint).toMatch(/bw/);
  });
  it('never guesses: no partial parse', () => {
    expect(p('135 x 8abc').ok).toBe(false);
    expect(p('abc 135 x 8').ok).toBe(false);
  });
});

describe('formatSetEntry', () => {
  it('formats canonically', () => {
    expect(formatSetEntry(135, 8)).toBe('135 x 8');
    expect(formatSetEntry(62.5, 10)).toBe('62.5 x 10');
    expect(formatSetEntry(0, 12)).toBe('0 x 12');
  });
  it('trims float noise', () => {
    expect(formatSetEntry(0.1 + 0.2, 5)).toBe('0.3 x 5');
  });
  it('is reps only for load none', () => {
    expect(formatSetEntry(0, 12, 'none')).toBe('12');
  });
  it('shows bw for unweighted bodyweight-plus', () => {
    expect(formatSetEntry(0, 12, 'bodyweight-plus')).toBe('bw x 12');
    expect(formatSetEntry(25, 8, 'bodyweight-plus')).toBe('25 x 8');
  });
  it('round-trips through the parser', () => {
    const loads: LoadType[] = ['total', 'per-hand', 'bodyweight-plus', 'none'];
    for (const load of loads) {
      for (const [w, r] of [
        [0, 12],
        [135, 8],
        [62.5, 10],
      ] as const) {
        if (load === 'none' && w !== 0) continue;
        if (load !== 'none' && load !== 'bodyweight-plus' && w === 0) continue;
        expect(p(formatSetEntry(w, r, load), load)).toEqual(ok(w, r));
      }
    }
  });
});
