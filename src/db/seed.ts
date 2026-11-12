import { DEFAULT_SETTINGS, type StoredProgram, type WorkoutTemplate } from '../domain/types';
import { BUNDLED_PROGRAMS, DEFAULT_PROGRAM } from './bundled';
import { db } from './schema';
import * as programs from './repositories/programs';

/**
 * Installs the bundled program as active and writes default settings, only when
 * the programs table is empty. Idempotent and safe to call concurrently
 * (e.g. React StrictMode double-invocation). Returns true if it seeded.
 */
export async function ensureSeeded(): Promise<boolean> {
  return db.transaction('rw', db.programs, db.exercises, db.settings, async () => {
    if ((await db.programs.count()) > 0) return false;
    await programs.save(DEFAULT_PROGRAM, { activate: true });
    if (!(await db.settings.get('app'))) await db.settings.put({ key: 'app', ...DEFAULT_SETTINGS });
    return true;
  });
}

/**
 * With cloud sync, two devices can each seed the bundled program (same ids, so rows merge rather
 * than duplicate) while having different active programs. After a sync, keep exactly one active
 * program, deterministically so every device converges on the same choice: a non-bundled program
 * (the user picked it) beats the bundled default, then lowest id.
 */
export async function ensureSingleActiveProgram(): Promise<void> {
  await db.transaction('rw', db.programs, async () => {
    const active = await db.programs.where('isActive').equals(1).toArray();
    if (active.length < 2) return;
    active.sort(
      (a, b) =>
        Number(a.id === DEFAULT_PROGRAM.id) - Number(b.id === DEFAULT_PROGRAM.id) ||
        a.id.localeCompare(b.id),
    );
    for (const p of active.slice(1)) await db.programs.update(p.id, { isActive: 0 });
  });
}

/**
 * Programs that were once bundled but no longer ship. Installs may still hold them (with their
 * logged sessions), so only their display text is neutralised; workouts and data are untouched.
 */
const RETIRED_PROGRAM_TEXT: Record<string, { name: string; description: string }> = {
  'v-taper-upper-lower': {
    name: 'Upper/Lower (4-day)',
    description: 'Earlier 4-day upper/lower split.',
  },
  'upper-lower-5day': {
    name: 'Upper/Lower + Full Body (v1)',
    description: 'Earlier version of the 5-day upper/lower split plus a full-body day.',
  },
};

/** Drops retired branding lines (e.g. an old "Goal: … V-taper …" line) from stored notes. */
function stripRetiredBranding(notes: string | undefined): string | undefined {
  if (notes === undefined) return undefined;
  return notes
    .split('\n')
    .filter((line) => !/v-?taper|hourglass/i.test(line))
    .join('\n')
    .replace(/^\n+/, '');
}

/**
 * Copies primary-lift flags from the bundled workouts onto the stored ones, but only for slots that
 * still hold the same exercise, so a workout the user rearranged in the editor is left as they made it.
 */
function withBundledPrimaryFlags(
  stored: WorkoutTemplate[],
  bundled: WorkoutTemplate[],
): WorkoutTemplate[] {
  return stored.map((w) => {
    const source = bundled.find((b) => b.id === w.id);
    if (!source) return w;
    return {
      ...w,
      items: w.items.map((item, i) => {
        const match = source.items[i];
        if (!match || match.exerciseId !== item.exerciseId) return item;
        const next = { ...item };
        if (match.primary) next.primary = true;
        else delete next.primary;
        return next;
      }),
    };
  });
}

/**
 * App updates don't change the copy of a program already stored on a device. Refreshes the display
 * text (name, description, notes) and primary-lift flags of installed bundled programs from the
 * current app version, and neutralises the text of retired bundled programs. Workouts, exercises and
 * logged data are never changed. Only writes rows that actually differ (avoids needless sync churn).
 */
export async function refreshBundledPrograms(): Promise<void> {
  await db.transaction('rw', db.programs, async () => {
    const stored = await db.programs.toArray();
    for (const p of stored) {
      let next: StoredProgram | null = null;
      const bundled = BUNDLED_PROGRAMS.find((b) => b.id === p.id);
      if (bundled) {
        next = {
          ...p,
          name: bundled.name,
          description: bundled.description,
          notes: bundled.notes,
          workouts: withBundledPrimaryFlags(p.workouts, bundled.workouts),
        };
      } else if (RETIRED_PROGRAM_TEXT[p.id]) {
        next = { ...p, ...RETIRED_PROGRAM_TEXT[p.id], notes: stripRetiredBranding(p.notes) };
      }
      if (next && JSON.stringify(next) !== JSON.stringify(p)) await db.programs.put(next);
    }
  });
}

/** Asks the browser not to evict our storage. Failures are ignored. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Not supported or denied: nothing to do.
  }
}
