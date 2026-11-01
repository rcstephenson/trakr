import type { Program, StoredProgram } from '../../domain/types';

/** Strips storage-only fields so the result is the canonical program file format. */
export function toProgram(stored: StoredProgram | Program): Program {
  return {
    schemaVersion: 1,
    id: stored.id,
    name: stored.name,
    description: stored.description,
    schedule: stored.schedule,
    exercises: stored.exercises,
    workouts: stored.workouts,
    notes: stored.notes,
  };
}

/** Downloads the program as `<program-id>.json`. */
export function downloadProgram(stored: StoredProgram | Program): void {
  const blob = new Blob([JSON.stringify(toProgram(stored), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${stored.id}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
