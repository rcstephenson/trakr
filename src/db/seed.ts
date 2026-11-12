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

/** Asks the browser not to evict our storage. Failures are ignored. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Not supported or denied: nothing to do.
  }
}
