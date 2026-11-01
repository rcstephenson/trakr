import { describe, expect, it } from 'vitest';
import { activityIcon, formatDuration, hasDistance, pace } from '../../../src/domain/activity';

describe('pace', () => {
  it('formats 5 km in 28 min as 5:36 /km', () => {
    expect(pace(28, 5, 'km')).toBe('5:36 /km');
  });
  it('supports miles', () => {
    expect(pace(30, 3, 'mi')).toBe('10:00 /mi');
  });
  it('returns null for zero or missing values', () => {
    expect(pace(28, 0, 'km')).toBeNull();
    expect(pace(0, 5, 'km')).toBeNull();
    expect(pace(undefined, 5, 'km')).toBeNull();
    expect(pace(28, undefined, 'km')).toBeNull();
    expect(pace(28, -1, 'km')).toBeNull();
    expect(pace(Number.NaN, 5, 'km')).toBeNull();
  });
  it('handles sub-minute pace and long durations', () => {
    expect(pace(0.5, 1, 'km')).toBe('0:30 /km');
    expect(pace(90, 10, 'km')).toBe('9:00 /km');
  });
  it('carries rounded seconds into the minute', () => {
    expect(pace(5.9999, 1, 'km')).toBe('6:00 /km');
  });
});

describe('formatDuration', () => {
  it('formats zero and negatives as 0m', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(-5)).toBe('0m');
  });
  it('formats under a minute', () => {
    expect(formatDuration(0.4)).toBe('<1m');
  });
  it('formats under an hour', () => {
    expect(formatDuration(1)).toBe('1m');
    expect(formatDuration(28)).toBe('28m');
    expect(formatDuration(59)).toBe('59m');
  });
  it('formats an hour and over with padded minutes', () => {
    expect(formatDuration(60)).toBe('1h 00m');
    expect(formatDuration(65)).toBe('1h 05m');
    expect(formatDuration(135)).toBe('2h 15m');
  });
  it('rounds to whole minutes', () => {
    expect(formatDuration(59.6)).toBe('1h 00m');
  });
});

describe('activity helpers', () => {
  it('maps every type to an icon', () => {
    expect(activityIcon('run')).toBe('footprints');
    expect(activityIcon('other')).toBe('activity');
  });
  it('shows distance only for run/cycle/swim/walk', () => {
    expect(hasDistance('run')).toBe(true);
    expect(hasDistance('walk')).toBe(true);
    expect(hasDistance('class')).toBe(false);
    expect(hasDistance('climb')).toBe(false);
  });
});
