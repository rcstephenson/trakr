import { DEFAULT_SETTINGS } from '../domain/types';
import { DEFAULT_PROGRAM } from './bundled';
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

/** Asks the browser not to evict our storage. Failures are ignored. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Not supported or denied: nothing to do.
  }
}
