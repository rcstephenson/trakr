import type { AlternativeRef, LoadType, WorkoutAlternative, WorkoutItem } from './types';

/** One exercise a workout slot can be done with: the default or a resolved alternative. */
export interface SlotOption {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  notes: string;
  isDefault: boolean;
}

/** The exercise id an alternative refers to. */
export function altId(alt: AlternativeRef): string {
  return typeof alt === 'string' ? alt : alt.exerciseId;
}

/**
 * The slot's default exercise followed by each alternative, with every field an alternative leaves
 * out taken from the default. Duplicate exercise ids keep their first occurrence.
 */
export function slotOptions(item: WorkoutItem): SlotOption[] {
  const options: SlotOption[] = [
    {
      exerciseId: item.exerciseId,
      sets: item.sets,
      repMin: item.repMin,
      repMax: item.repMax,
      notes: item.notes,
      isDefault: true,
    },
  ];
  for (const alt of item.alternatives) {
    const id = altId(alt);
    if (options.some((o) => o.exerciseId === id)) continue;
    const own: Partial<WorkoutAlternative> = typeof alt === 'string' ? {} : alt;
    options.push({
      exerciseId: id,
      sets: own.sets ?? item.sets,
      repMin: own.repMin ?? item.repMin,
      repMax: own.repMax ?? item.repMax,
      notes: own.notes ?? item.notes,
      isDefault: false,
    });
  }
  return options;
}

/** "6–10", or "8" for a fixed rep count. */
export function repRangeText(o: { repMin: number; repMax: number }): string {
  return o.repMin === o.repMax ? `${o.repMin}` : `${o.repMin}–${o.repMax}`;
}

/** "3 × 6–10", or "Complete" for an exercise that is only marked done. */
export function prescriptionText(
  o: { sets: number; repMin: number; repMax: number },
  load: LoadType | undefined,
): string {
  return load === 'completion' ? 'Complete' : `${o.sets} × ${repRangeText(o)}`;
}
