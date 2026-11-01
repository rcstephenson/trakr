// Backup export/import (SPEC 4.3) and clear-all-data. Works on all tables in one transaction.
import { z } from 'zod';
import { db } from '../db/schema';
import { ensureSeeded } from '../db/seed';
import { ProgramSchema, ExerciseSchema } from '../domain/programSchema';
import { DEFAULT_SETTINGS, type Backup } from '../domain/types';
import { nowIso, toDateKey } from './dates';

const unit = z.enum(['lb', 'kg']);

const StoredProgramSchema = ProgramSchema.and(
  z.object({ isActive: z.union([z.literal(0), z.literal(1)]), importedAt: z.string() }),
);

const SessionSchema = z.object({
  id: z.string().min(1),
  programId: z.string(),
  workoutId: z.string(),
  workoutName: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  status: z.enum(['active', 'completed', 'discarded']),
  notes: z.string().optional(),
  bodyweight: z.number().optional(),
  targets: z.array(
    z.object({
      slotIndex: z.number(),
      exerciseId: z.string(),
      sets: z.number(),
      repMin: z.number(),
      repMax: z.number(),
      kind: z.enum(['compound', 'isolation']),
    }),
  ),
});

const SetSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string(),
  exerciseId: z.string(),
  slotIndex: z.number(),
  setIndex: z.number(),
  weight: z.number(),
  unit,
  reps: z.number(),
  rir: z.number().optional(),
  isWarmup: z.boolean(),
  completedAt: z.string(),
});

const ActivitySchema = z.object({
  id: z.string().min(1),
  type: z.enum(['run', 'cycle', 'swim', 'climb', 'sport', 'class', 'walk', 'other']),
  title: z.string().optional(),
  startedAt: z.string(),
  durationMin: z.number().optional(),
  distance: z.number().optional(),
  distanceUnit: z.enum(['km', 'mi']).optional(),
  intensity: z.number().optional(),
  notes: z.string().optional(),
});

const SettingsSchema = z.object({
  unit,
  theme: z.enum(['light', 'dark', 'system']),
  rotationPointer: z.string().optional(),
});

export const BackupSchema = z.object({
  app: z.literal('trakr'),
  backupVersion: z.literal(1),
  exportedAt: z.string(),
  programs: z.array(StoredProgramSchema),
  exercises: z.array(ExerciseSchema),
  sessions: z.array(SessionSchema),
  sets: z.array(SetSchema),
  activities: z.array(ActivitySchema),
  settings: SettingsSchema,
});

export type ImportMode = 'replace' | 'merge';

export interface BackupSummary {
  counts: {
    programs: number;
    exercises: number;
    sessions: number;
    sets: number;
    activities: number;
  };
  /** Earliest and latest session/activity start, or null when there are none. */
  dateRange: { from: string; to: string } | null;
  exportedAt: string;
}

export type ParseBackupResult =
  { ok: true; backup: Backup; summary: BackupSummary } | { ok: false; errors: string[] };

/** Builds the SPEC 4.3 backup object from every table. */
export async function exportBackup(): Promise<Backup> {
  return db.transaction(
    'r',
    [db.programs, db.exercises, db.sessions, db.sets, db.activities, db.settings],
    async () => {
      const [programs, exercises, sessions, sets, activities, row] = await Promise.all([
        db.programs.toArray(),
        db.exercises.toArray(),
        db.sessions.toArray(),
        db.sets.toArray(),
        db.activities.toArray(),
        db.settings.get('app'),
      ]);
      const stored: Record<string, unknown> = { ...row };
      delete stored.key;
      const settings = {
        ...DEFAULT_SETTINGS,
        ...stored,
      };
      return {
        app: 'trakr',
        backupVersion: 1,
        exportedAt: nowIso(),
        programs,
        exercises,
        sessions,
        sets,
        activities,
        settings,
      } satisfies Backup;
    },
  );
}

function formatIssuePath(path: PropertyKey[]): string {
  return path
    .map((p) => (typeof p === 'number' ? `[${p}]` : `.${String(p)}`))
    .join('')
    .replace(/^\./, '');
}

export function summarizeBackup(backup: Backup): BackupSummary {
  const stamps = [...backup.sessions, ...backup.activities].map((x) => x.startedAt).sort();
  return {
    counts: {
      programs: backup.programs.length,
      exercises: backup.exercises.length,
      sessions: backup.sessions.length,
      sets: backup.sets.length,
      activities: backup.activities.length,
    },
    dateRange: stamps.length ? { from: stamps[0], to: stamps[stamps.length - 1] } : null,
    exportedAt: backup.exportedAt,
  };
}

/** Validates backup JSON (a string or an already-parsed value) without writing anything. */
export function parseBackup(json: unknown): ParseBackupResult {
  let value = json;
  if (typeof json === 'string') {
    try {
      value = JSON.parse(json);
    } catch {
      return { ok: false, errors: ['This file is not valid JSON.'] };
    }
  }
  const result = BackupSchema.safeParse(value);
  if (!result.success) {
    const errors = result.error.issues
      .slice(0, 8)
      .map((i) => `${formatIssuePath(i.path) || 'backup'}: ${i.message}`);
    return { ok: false, errors };
  }
  const backup = result.data as Backup;
  return { ok: true, backup, summary: summarizeBackup(backup) };
}

/**
 * Validates then writes the backup in a single transaction.
 * `replace` clears every table first; `merge` upserts by id and keeps the local settings.
 * Throws an Error listing validation problems if the backup is invalid (nothing is written).
 */
export async function importBackup(json: unknown, mode: ImportMode): Promise<BackupSummary> {
  const parsed = parseBackup(json);
  if (!parsed.ok) throw new Error(parsed.errors.join('\n'));
  const { backup } = parsed;

  await db.transaction(
    'rw',
    [db.programs, db.exercises, db.sessions, db.sets, db.activities, db.settings],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.programs.clear(),
          db.exercises.clear(),
          db.sessions.clear(),
          db.sets.clear(),
          db.activities.clear(),
          db.settings.clear(),
        ]);
        await db.programs.bulkPut(backup.programs);
        await db.settings.put({ key: 'app', ...backup.settings });
      } else {
        // Merge keeps at most one active program: the local choice wins.
        const hasActive = (await db.programs.where('isActive').equals(1).count()) > 0;
        const incoming = [];
        for (const p of backup.programs) {
          const existing = await db.programs.get(p.id);
          incoming.push({
            ...p,
            isActive: existing ? existing.isActive : hasActive ? 0 : p.isActive,
          });
        }
        // If nothing local was active, only the first incoming active program stays active.
        if (!hasActive) {
          let seen = false;
          for (const p of incoming) {
            if (p.isActive === 1) {
              if (seen) p.isActive = 0;
              seen = true;
            }
          }
        }
        await db.programs.bulkPut(incoming);
        if (!(await db.settings.get('app')))
          await db.settings.put({ key: 'app', ...backup.settings });
      }
      await db.exercises.bulkPut(backup.exercises);
      await db.sessions.bulkPut(backup.sessions);
      await db.sets.bulkPut(backup.sets);
      await db.activities.bulkPut(backup.activities);
    },
  );
  return parsed.summary;
}

/** Deletes every table's contents, then reinstalls the bundled program and default settings. */
export async function clearAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [db.programs, db.exercises, db.sessions, db.sets, db.activities, db.settings],
    async () => {
      await Promise.all([
        db.programs.clear(),
        db.exercises.clear(),
        db.sessions.clear(),
        db.sets.clear(),
        db.activities.clear(),
        db.settings.clear(),
      ]);
    },
  );
  await ensureSeeded();
}

export function backupFileName(date: Date = new Date()): string {
  return `trakr-backup-${toDateKey(date)}.json`;
}

export type ExportResult = 'shared' | 'downloaded' | 'cancelled';

/** Exports the backup via the Web Share API when files can be shared, else downloads it. */
export async function exportBackupFile(): Promise<ExportResult> {
  const backup = await exportBackup();
  const name = backupFileName();
  const text = JSON.stringify(backup, null, 2);

  if (typeof File !== 'undefined' && typeof navigator !== 'undefined' && navigator.canShare) {
    const file = new File([text], name, { type: 'application/json' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Trakr backup' });
        return 'shared';
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
        // Fall through to a normal download.
      }
    }
  }

  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
