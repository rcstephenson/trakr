import { describe, expect, it } from 'vitest';
import { convert, formatWeight, toUnit } from '../../../src/domain/units';

describe('convert', () => {
  it('converts lb to kg and back', () => {
    expect(convert(100, 'lb', 'kg')).toBeCloseTo(45.359, 3);
    expect(convert(100, 'kg', 'lb')).toBeCloseTo(220.462, 3);
  });
  it('is identity for the same unit', () => {
    expect(convert(37.5, 'kg', 'kg')).toBe(37.5);
  });
  it('round-trips within rounding', () => {
    for (const lb of [2.5, 45, 135, 225, 315]) {
      expect(convert(convert(lb, 'lb', 'kg'), 'kg', 'lb')).toBeCloseTo(lb, 9);
    }
  });
});

describe('toUnit', () => {
  it('converts weight and unit without mutating', () => {
    const set = { weight: 100, unit: 'lb' as const, reps: 5 };
    const out = toUnit(set, 'kg');
    expect(out.unit).toBe('kg');
    expect(out.weight).toBeCloseTo(45.359, 3);
    expect(out.reps).toBe(5);
    expect(set.unit).toBe('lb');
  });
  it('returns the set unchanged when already in the unit', () => {
    const set = { weight: 100, unit: 'lb' as const };
    expect(toUnit(set, 'lb')).toBe(set);
  });
});

describe('formatWeight', () => {
  it('plain', () => {
    expect(formatWeight(135, 'lb', 'lb')).toBe('135 lb');
    expect(formatWeight(60, 'kg', 'kg')).toBe('60 kg');
  });
  it('keeps fractional entries in the same unit', () => {
    expect(formatWeight(2.5, 'lb', 'lb')).toBe('2.5 lb');
    expect(formatWeight(22.25, 'kg', 'kg')).toBe('22.25 kg');
  });
  it('rounds converted values to 1 lb / 0.5 kg', () => {
    expect(formatWeight(135, 'lb', 'kg')).toBe('61 kg'); // 61.23 -> 61.0
    expect(formatWeight(100, 'lb', 'kg')).toBe('45.5 kg'); // 45.36 -> 45.5
    expect(formatWeight(60, 'kg', 'lb')).toBe('132 lb'); // 132.28
  });
  it('per hand', () => {
    expect(formatWeight(30, 'lb', 'lb', { perHand: true })).toBe('30 lb ea');
    expect(formatWeight(30, 'lb', 'kg', { perHand: true })).toBe('13.5 kg ea');
  });
  it('bodyweight plus', () => {
    expect(formatWeight(25, 'lb', 'lb', { bodyweightPlus: true })).toBe('BW + 25 lb');
    expect(formatWeight(0, 'lb', 'lb', { bodyweightPlus: true })).toBe('BW');
    expect(formatWeight(55, 'lb', 'kg', { bodyweightPlus: true })).toBe('BW + 25 kg');
  });
});
