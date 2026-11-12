// Shared domain types. Mirrors SPEC §4.1-§4.3. Types only, no logic (except DEFAULT_SETTINGS).

export type Unit = 'lb' | 'kg';
export type DistanceUnit = 'km' | 'mi';
export type Equipment = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'other';
export type ExerciseKind = 'compound' | 'isolation';
export type LoadType = 'total' | 'per-hand' | 'bodyweight-plus' | 'none';
export type ThemePreference = 'light' | 'dark' | 'system';

/** Catalog exercise (SPEC §4.1). Shared identity across workouts and programs. */
export interface Exercise {
  id: string;
  name: string;
  equipment: Equipment;
  kind: ExerciseKind;
  load: LoadType;
  muscles: string[];
  /** True for user-created exercises (§4.2). */
  custom?: boolean;
}

/** One row of a workout template. */
export interface WorkoutItem {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  notes: string;
  /** Exercise ids that may be swapped into this slot. */
  alternatives: string[];
  /** A primary lift of the workout (shown in bold on the Program screen). */
  primary?: boolean;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  items: WorkoutItem[];
}

/** Canonical program file format (`programs/*.json`). */
export interface Program {
  schemaVersion: 1;
  id: string;
  name: string;
  description?: string;
  /** Workout template ids in weekly order; `rest` marks a rest day. */
  schedule: string[];
  exercises: Exercise[];
  workouts: WorkoutTemplate[];
  /** Markdown, display only. */
  notes?: string;
}

/** Program as stored in the `programs` table. */
export interface StoredProgram extends Program {
  isActive: 0 | 1;
  importedAt: string;
}

export type SessionStatus = 'active' | 'completed' | 'discarded';

/** Template target snapshotted at session start (§4.2). */
export interface SessionTarget {
  slotIndex: number;
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  kind: ExerciseKind;
}

export interface Session {
  id: string;
  programId: string;
  workoutId: string;
  /** Snapshot of the workout name at start. */
  workoutName: string;
  startedAt: string;
  finishedAt?: string;
  status: SessionStatus;
  notes?: string;
  bodyweight?: number;
  targets: SessionTarget[];
  /**
   * Slot indexes recorded as skipped (a null log: no sets). Set by entering `x` or a blank entry,
   * and for every still-unlogged slot when the session is finished. A slot that has sets is never
   * treated as skipped, even if it is listed here.
   */
  skippedSlots?: number[];
}

export interface SetEntry {
  id: string;
  sessionId: string;
  /** Actual exercise used (may be a swapped-in alternative). */
  exerciseId: string;
  /** Position of the slot in the workout. */
  slotIndex: number;
  setIndex: number;
  weight: number;
  unit: Unit;
  reps: number;
  /** Reps in reserve. */
  rir?: number;
  isWarmup: boolean;
  completedAt: string;
}

export type ActivityType =
  'run' | 'cycle' | 'swim' | 'climb' | 'tennis' | 'sport' | 'class' | 'walk' | 'other';

export interface Activity {
  id: string;
  type: ActivityType;
  title?: string;
  startedAt: string;
  durationMin?: number;
  distance?: number;
  distanceUnit?: DistanceUnit;
  /** 1-5 */
  intensity?: number;
  notes?: string;
}

export interface Settings {
  unit: Unit;
  theme: ThemePreference;
  rotationPointer?: string;
}

export const DEFAULT_SETTINGS: Settings = {
  unit: 'lb',
  theme: 'system',
};

/** `trakr-backup-YYYY-MM-DD.json` (SPEC §4.3). */
export interface Backup {
  app: 'trakr';
  backupVersion: 1;
  exportedAt: string;
  programs: StoredProgram[];
  exercises: Exercise[];
  sessions: Session[];
  sets: SetEntry[];
  activities: Activity[];
  settings: Settings;
}
