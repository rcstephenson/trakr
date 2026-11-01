import { describe, expect, it } from 'vitest';
import { adjust, formatRemaining, isDone, remainingMs, start } from '../../../src/domain/restTimer';

describe('restTimer', () => {
  it('stays correct across a simulated 5-minute gap (sleeping phone)', () => {
    const s = start(1_000_000, 600);
    expect(remainingMs(s, 1_000_000)).toBe(600_000);
    // No ticks for 5 minutes, then the next read.
    expect(remainingMs(s, 1_000_000 + 5 * 60_000)).toBe(300_000);
    expect(isDone(s, 1_000_000 + 5 * 60_000)).toBe(false);
  });

  it('clamps remaining and adjust at 0', () => {
    const s = start(0, 10);
    expect(remainingMs(s, 60_000)).toBe(0);
    expect(adjust(s, -15_000).endsAt).toBe(0);
    expect(remainingMs(adjust(s, -15_000), 0)).toBe(0);
    expect(adjust(s, -15_000, 4_000).endsAt).toBe(4_000);
    expect(adjust(s, 15_000).endsAt).toBe(25_000);
  });

  it('detects done at and after the end time', () => {
    const s = start(0, 90);
    expect(isDone(s, 89_999)).toBe(false);
    expect(isDone(s, 90_000)).toBe(true);
    expect(isDone(s, 500_000)).toBe(true);
  });

  it('formats m:ss', () => {
    expect(formatRemaining(90_000)).toBe('1:30');
    expect(formatRemaining(500)).toBe('0:01');
    expect(formatRemaining(0)).toBe('0:00');
  });
});
