// Runtime side of the optional Dexie Cloud sync (config lives in ./cloud). Every function is a
// no-op when cloud is not configured.
import { db } from '../db/schema';
import { ensureSeeded, ensureSingleActiveProgram } from '../db/seed';
import { CLOUD_ENABLED } from './cloud';

export type SyncDisplay = 'synced' | 'syncing' | 'offline' | 'error';

/** The slice of the addon's SyncState we read. */
export interface SyncStateLike {
  phase: string;
  status?: string;
}

/** Collapses the addon's phase/status pair into the four states the UI shows. */
export function deriveSyncDisplay(state: SyncStateLike, online: boolean): SyncDisplay {
  if (state.phase === 'error' || state.status === 'error') return 'error';
  if (!online || state.phase === 'offline' || state.status === 'offline') return 'offline';
  if (state.phase === 'in-sync') return 'synced';
  return 'syncing';
}

/** Opens the addon's built-in login dialog (email, then one-time code). */
export async function signIn(): Promise<void> {
  if (!CLOUD_ENABLED) return;
  await db.cloud.login();
}

/**
 * Signs out. The addon empties every local table on logout (the synced copy stays in the cloud),
 * and asks its own confirmation first when there are changes that were never uploaded. Afterwards
 * we reinstall the bundled program and default settings so the app is usable signed out.
 * Resolves false when the user cancelled the addon's unsynced-changes prompt.
 */
export async function signOut(): Promise<boolean> {
  if (!CLOUD_ENABLED) return true;
  try {
    await db.cloud.logout();
  } catch {
    return false;
  }
  await ensureSeeded();
  return true;
}

/**
 * Runs once at startup when cloud is configured. After every sync, repairs the one thing two
 * devices can legitimately disagree on (see ensureSingleActiveProgram).
 */
export function startCloudSync(): void {
  if (!CLOUD_ENABLED) return;
  db.cloud.events.syncComplete.subscribe(() => {
    void ensureSingleActiveProgram();
  });
}
