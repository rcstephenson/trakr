import Dexie, { type EntityTable } from 'dexie';
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

  constructor(name = 'trakr') {
    super(name);
    // Never edit a released version in place: add version(2) with an upgrade instead.
    this.version(1).stores({
      programs: 'id, isActive',
      exercises: 'id, name',
      sessions: 'id, startedAt, programId, workoutId, status',
      sets: 'id, sessionId, exerciseId, [exerciseId+completedAt]',
      activities: 'id, startedAt, type',
      settings: 'key',
    });
  }
}

export const db = new TrakrDB();
