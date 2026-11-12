import Dexie, { type EntityTable } from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import { CLOUD_URL, UNSYNCED_TABLES } from '../lib/cloud';
import type {
  Activity,
  Exercise,
  Session,
  SetEntry,
  Settings,
  StoredProgram,
} from '../domain/types';

/** The single settings row, keyed by `app` (SPEC §4.2). */
export type StoredSettings = Partial<Settings> & { key: 'app' };

export class TrakrDB extends Dexie {
  programs!: EntityTable<StoredProgram, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  sets!: EntityTable<SetEntry, 'id'>;
  activities!: EntityTable<Activity, 'id'>;
  settings!: EntityTable<StoredSettings, 'key'>;

  constructor(name = 'trakr', cloudUrl: string | null = CLOUD_URL) {
    // The addon is only attached when a database URL is configured; otherwise `db.cloud` does
    // not exist and nothing touches the network.
    super(name, cloudUrl ? { addons: [dexieCloud] } : undefined);
    // Never edit a released version in place: add version(2) with an upgrade instead.
    this.version(1).stores({
      programs: 'id, isActive',
      exercises: 'id, name',
      sessions: 'id, startedAt, programId, workoutId, status',
      sets: 'id, sessionId, exerciseId, [exerciseId+completedAt]',
      activities: 'id, startedAt, type',
      settings: 'key',
    });

    // Dexie Cloud needs no app schema version: the addon adds its own hidden tables and the
    // realmId/owner indexes itself, and keeps existing rows (they are uploaded at first sign-in).
    // Our primary keys are already non-auto strings (ULIDs / program slugs), as sync requires.
    if (cloudUrl) {
      this.cloud.configure({
        databaseUrl: cloudUrl,
        // Local-first: the app works signed out; sign-in is opt-in from Settings.
        requireAuth: false,
        // Keep the existing IndexedDB name 'trakr'. By default the addon renames the database
        // to 'trakr-<dbid>', which would hide the user's existing local data.
        nameSuffix: false,
        unsyncedTables: UNSYNCED_TABLES,
        // Plain page-based sync; no service-worker background sync (keeps the Workbox SW as is).
        tryUseServiceWorker: false,
      });
    }
  }
}

export const db = new TrakrDB();
