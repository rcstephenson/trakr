import { describe, expect, it } from 'vitest';
import { altId, repRangeText, slotOptions } from '../../../src/domain/alternatives';
import type { WorkoutItem } from '../../../src/domain/types';

const item: WorkoutItem = {
  exerciseId: 'lat-pulldown',
  sets: 3,
  repMin: 6,
  repMax: 10,
  notes: 'Full stretch',
  alternatives: [
    'neutral-grip-lat-pulldown',
    { exerciseId: 'pull-up', sets: 4, repMin: 5, repMax: 8 },
    { exerciseId: 'machine-row', notes: '' },
  ],
};

describe('slotOptions', () => {
  it('lists the default first, then each alternative with inherited fields filled in', () => {
    expect(slotOptions(item)).toEqual([
      {
        exerciseId: 'lat-pulldown',
        sets: 3,
        repMin: 6,
        repMax: 10,
        notes: 'Full stretch',
        isDefault: true,
      },
      {
        exerciseId: 'neutral-grip-lat-pulldown',
        sets: 3,
        repMin: 6,
        repMax: 10,
        notes: 'Full stretch',
        isDefault: false,
      },
      {
        exerciseId: 'pull-up',
        sets: 4,
        repMin: 5,
        repMax: 8,
        notes: 'Full stretch',
        isDefault: false,
      },
      // An explicit empty note overrides the default's note.
      { exerciseId: 'machine-row', sets: 3, repMin: 6, repMax: 10, notes: '', isDefault: false },
    ]);
  });

  it('drops alternatives that repeat the default or an earlier alternative', () => {
    const ids = slotOptions({
      ...item,
      alternatives: ['lat-pulldown', 'pull-up', { exerciseId: 'pull-up', sets: 9 }],
    }).map((o) => [o.exerciseId, o.sets]);
    expect(ids).toEqual([
      ['lat-pulldown', 3],
      ['pull-up', 3],
    ]);
  });

  it('has only the default when there are no alternatives', () => {
    expect(slotOptions({ ...item, alternatives: [] })).toHaveLength(1);
  });
});

describe('altId / repRangeText', () => {
  it('reads the id of either form and formats ranges', () => {
    expect(item.alternatives.map(altId)).toEqual([
      'neutral-grip-lat-pulldown',
      'pull-up',
      'machine-row',
    ]);
    expect(repRangeText({ repMin: 6, repMax: 10 })).toBe('6–10');
    expect(repRangeText({ repMin: 8, repMax: 8 })).toBe('8');
  });
});
