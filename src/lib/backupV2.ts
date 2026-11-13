// Compact backup format (backupVersion 2). See docs/backup-format.md.
// encodeBackupV2 turns a full table snapshot into the compact shape, decodeBackupV2 reverses it
// into the same snapshot shape the v1 importer uses, so both versions share one write path.
import { z } from 'zod';
import type {
  Activity,
  Exercise,
  ExerciseKind,
  Session,
  SessionTarget,
  SetEntry,
  Settings,
  StoredProgram,
  Unit,
  WorkoutItem,
} from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';

/** Everything in a backup except the version tag: one array per table plus settings. */
export interface BackupData {
  app: 'trakr';
  exportedAt: string;
  programs: StoredProgram[];
  exercises: Exercise[];
  sessions: Session[];
  sets: SetEntry[];
  activities: Activity[];
  settings: Settings;
}

// ---------------------------------------------------------------------------------------------
// Schema (structure only; semantic rules such as slugs are checked by the shared v1 schema after
// decoding).
// ---------------------------------------------------------------------------------------------

const str = z.string();
const unit = z.enum(['lb', 'kg']);
const kind = z.enum(['compound', 'isolation']);
const timeValue = z.union([z.number(), z.string()]);

const ExerciseV2 = z.object({
  name: str,
  equipment: z.enum(['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'other']),
  kind,
  load: z.enum(['total', 'per-hand', 'bodyweight-plus', 'none', 'completion']).optional(),
  muscles: z.array(str),
  custom: z.boolean().optional(),
});

const InlineExerciseV2 = ExerciseV2.extend({ id: str });

const ItemV2 = z.tuple([
  str,
  str,
  z
    .object({
      notes: str.optional(),
      alt: z
        .array(
          z.union([
            str,
            z.object({
              exerciseId: str,
              sets: z.number().optional(),
              repMin: z.number().optional(),
              repMax: z.number().optional(),
              notes: str.optional(),
            }),
          ]),
        )
        .optional(),
      primary: z.literal(true).optional(),
    })
    .optional(),
]);

const ProgramV2 = z.object({
  name: str,
  desc: str.optional(),
  active: z.literal(1).optional(),
  imported: str,
  schedule: z.array(str),
  exercises: z.array(z.union([str, InlineExerciseV2])),
  workouts: z.array(z.object({ id: str, name: str, items: z.array(ItemV2) })),
  notes: str.optional(),
});

const TargetV2 = z.tuple([
  str,
  str,
  z.object({ kind: kind.optional(), slot: z.number().optional() }).optional(),
]);

const GroupV2 = z.object({
  slot: z.number(),
  ex: str.optional(),
  t: z.union([timeValue, z.array(timeValue)]).optional(),
  sets: z.array(str),
});

const SessionV2 = z.object({
  id: str,
  program: str,
  workout: str,
  name: str.optional(),
  start: str,
  end: timeValue.optional(),
  status: z.enum(['active', 'completed', 'discarded']).optional(),
  notes: str.optional(),
  bw: z.number().optional(),
  skipped: z.array(z.number()).optional(),
  plan: z.array(TargetV2),
  log: z.array(GroupV2).optional(),
});

const ActivityV2 = z.object({
  id: str,
  type: z.enum(['run', 'cycle', 'swim', 'climb', 'tennis', 'sport', 'class', 'walk', 'other']),
  title: str.optional(),
  start: str,
  min: z.number().optional(),
  dist: z.number().optional(),
  unit: z.enum(['km', 'mi']).optional(),
  intensity: z.number().optional(),
  notes: str.optional(),
});

export const BackupV2Schema = z.object({
  app: z.literal('trakr'),
  backupVersion: z.literal(2),
  exportedAt: str,
  settings: z
    .object({
      unit: unit.optional(),
      theme: z.enum(['light', 'dark', 'system']).optional(),
      rotationPointer: str.optional(),
    })
    .optional(),
  exercises: z.record(str, ExerciseV2),
  programs: z.record(str, ProgramV2),
  sessions: z.array(SessionV2),
  activities: z.array(ActivityV2),
});

export type BackupV2 = z.infer<typeof BackupV2Schema>;
type ExerciseV2T = z.infer<typeof ExerciseV2>;

// ---------------------------------------------------------------------------------------------
// Small codecs
// ---------------------------------------------------------------------------------------------

const NUM = String.raw`-?\d+(?:\.\d+)?(?:e[+-]?\d+)?`;
const SET_RE = new RegExp(`^(w)?(${NUM})(lb|kg)?x(${NUM})(?:@(${NUM}))?(?:\\*(\\d+))?$`);
const SPEC_RE = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?$/;

function encodeSpec(sets: number, repMin: number, repMax: number): string {
  return repMin === repMax ? `${sets}x${repMin}` : `${sets}x${repMin}-${repMax}`;
}

function decodeSpec(spec: string): { sets: number; repMin: number; repMax: number } | null {
  const m = SPEC_RE.exec(spec);
  if (!m) return null;
  const repMin = Number(m[2]);
  return { sets: Number(m[1]), repMin, repMax: m[3] === undefined ? repMin : Number(m[3]) };
}

/** Milliseconds after `base` when that round-trips exactly, else the original string. */
function encodeTime(base: string, iso: string): number | string {
  const b = Date.parse(base);
  const t = Date.parse(iso);
  if (Number.isNaN(b) || Number.isNaN(t)) return iso;
  const ms = t - b;
  return new Date(b + ms).toISOString() === iso ? ms : iso;
}

function decodeTime(base: string, value: number | string): string | null {
  if (typeof value === 'string') return value;
  const b = Date.parse(base);
  if (Number.isNaN(b)) return null;
  const d = new Date(b + value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function encodeSetToken(s: SetEntry, defaultUnit: Unit): string {
  return (
    (s.isWarmup ? 'w' : '') +
    String(s.weight) +
    (s.unit !== defaultUnit ? s.unit : '') +
    'x' +
    String(s.reps) +
    (s.rir !== undefined ? `@${s.rir}` : '')
  );
}

function encodeExercise(e: Exercise): ExerciseV2T {
  return {
    name: e.name,
    equipment: e.equipment,
    kind: e.kind,
    ...(e.load !== 'total' ? { load: e.load } : {}),
    muscles: e.muscles,
    ...(e.custom !== undefined ? { custom: e.custom } : {}),
  };
}

function decodeExercise(id: string, e: ExerciseV2T): Exercise {
  return {
    id,
    name: e.name,
    equipment: e.equipment,
    kind: e.kind,
    load: e.load ?? 'total',
    muscles: e.muscles,
    ...(e.custom !== undefined ? { custom: e.custom } : {}),
  };
}

/** Exercise kind lookup shared by encoder and decoder: catalog first, then program definitions. */
function kindLookup(catalog: Exercise[], programs: StoredProgram[]) {
  const map = new Map<string, ExerciseKind>();
  for (const p of programs) for (const e of p.exercises) map.set(e.id, e.kind);
  for (const e of catalog) map.set(e.id, e.kind);
  return (id: string): ExerciseKind => map.get(id) ?? 'compound';
}

// ---------------------------------------------------------------------------------------------
// Encode
// ---------------------------------------------------------------------------------------------

export function encodeBackupV2(data: BackupData): BackupV2 {
  const catalog = new Map(data.exercises.map((e) => [e.id, e]));
  const exercises: BackupV2['exercises'] = {};
  for (const e of data.exercises) exercises[e.id] = encodeExercise(e);

  const programs: BackupV2['programs'] = {};
  for (const p of data.programs) {
    programs[p.id] = {
      name: p.name,
      ...(p.description !== undefined ? { desc: p.description } : {}),
      ...(p.isActive === 1 ? { active: 1 as const } : {}),
      imported: p.importedAt,
      schedule: p.schedule,
      exercises: p.exercises.map((e) => {
        const shared = catalog.get(e.id);
        const enc = encodeExercise(e);
        return shared && JSON.stringify(encodeExercise(shared)) === JSON.stringify(enc)
          ? e.id
          : { id: e.id, ...enc };
      }),
      workouts: p.workouts.map((w) => ({
        id: w.id,
        name: w.name,
        items: w.items.map((it): z.infer<typeof ItemV2> => {
          const extra = {
            ...(it.notes ? { notes: it.notes } : {}),
            ...(it.alternatives.length ? { alt: it.alternatives } : {}),
            ...(it.primary ? { primary: true as const } : {}),
          };
          const spec = encodeSpec(it.sets, it.repMin, it.repMax);
          return Object.keys(extra).length ? [it.exerciseId, spec, extra] : [it.exerciseId, spec];
        }),
      })),
      ...(p.notes !== undefined ? { notes: p.notes } : {}),
    };
  }

  const kindOf = kindLookup(data.exercises, data.programs);
  const setsBySession = new Map<string, SetEntry[]>();
  for (const s of data.sets) {
    const list = setsBySession.get(s.sessionId);
    if (list) list.push(s);
    else setsBySession.set(s.sessionId, [s]);
  }
  const defaultUnit = data.settings.unit;

  const sessions = data.sessions.map((s): z.infer<typeof SessionV2> => {
    const program = data.programs.find((p) => p.id === s.programId);
    const templateName = program?.workouts.find((w) => w.id === s.workoutId)?.name;
    const plan = s.targets.map((t, i): z.infer<typeof TargetV2> => {
      const extra = {
        ...(t.kind !== kindOf(t.exerciseId) ? { kind: t.kind } : {}),
        ...(t.slotIndex !== i ? { slot: t.slotIndex } : {}),
      };
      const spec = encodeSpec(t.sets, t.repMin, t.repMax);
      return Object.keys(extra).length ? [t.exerciseId, spec, extra] : [t.exerciseId, spec];
    });

    const groups = new Map<string, SetEntry[]>();
    for (const set of setsBySession.get(s.id) ?? []) {
      const key = `${set.slotIndex}\u0000${set.exerciseId}`;
      const g = groups.get(key);
      if (g) g.push(set);
      else groups.set(key, [set]);
    }
    const log = [...groups.values()]
      .map((g) => g.sort((a, b) => a.setIndex - b.setIndex))
      .sort((a, b) => a[0].slotIndex - b[0].slotIndex || a[0].setIndex - b[0].setIndex)
      .map((g) => {
        const planned = s.targets.find((t) => t.slotIndex === g[0].slotIndex)?.exerciseId;
        const times = g.map((x) => encodeTime(s.startedAt, x.completedAt));
        const same = times.every((x) => x === times[0]);
        const runs: Array<[string, number]> = [];
        for (const token of g.map((y) => encodeSetToken(y, defaultUnit))) {
          const prev = runs[runs.length - 1];
          if (prev && prev[0] === token) prev[1]++;
          else runs.push([token, 1]);
        }
        const sets = runs.map(([token, n]) => (n > 1 ? `${token}*${n}` : token));
        return {
          slot: g[0].slotIndex,
          ...(planned !== g[0].exerciseId ? { ex: g[0].exerciseId } : {}),
          t: same ? times[0] : times,
          sets,
        };
      });

    return {
      id: s.id,
      program: s.programId,
      workout: s.workoutId,
      ...(templateName !== s.workoutName ? { name: s.workoutName } : {}),
      start: s.startedAt,
      ...(s.finishedAt !== undefined ? { end: encodeTime(s.startedAt, s.finishedAt) } : {}),
      ...(s.status !== 'completed' ? { status: s.status } : {}),
      ...(s.notes !== undefined ? { notes: s.notes } : {}),
      ...(s.bodyweight !== undefined ? { bw: s.bodyweight } : {}),
      ...(s.skippedSlots?.length ? { skipped: s.skippedSlots } : {}),
      plan,
      ...(log.length ? { log } : {}),
    };
  });

  const settings = {
    ...(data.settings.unit !== DEFAULT_SETTINGS.unit ? { unit: data.settings.unit } : {}),
    ...(data.settings.theme !== DEFAULT_SETTINGS.theme ? { theme: data.settings.theme } : {}),
    ...(data.settings.rotationPointer !== undefined
      ? { rotationPointer: data.settings.rotationPointer }
      : {}),
  };

  return {
    app: 'trakr',
    backupVersion: 2,
    exportedAt: data.exportedAt,
    settings,
    exercises,
    programs,
    sessions,
    activities: data.activities.map((a) => ({
      id: a.id,
      type: a.type,
      ...(a.title !== undefined ? { title: a.title } : {}),
      start: a.startedAt,
      ...(a.durationMin !== undefined ? { min: a.durationMin } : {}),
      ...(a.distance !== undefined ? { dist: a.distance } : {}),
      ...(a.distanceUnit !== undefined ? { unit: a.distanceUnit } : {}),
      ...(a.intensity !== undefined ? { intensity: a.intensity } : {}),
      ...(a.notes !== undefined ? { notes: a.notes } : {}),
    })),
  };
}

/** One JSON document: header and settings inline, then one catalog entry / program / session /
 *  activity per line, so the file stays small but diffable and readable. */
export function serializeBackupV2(b: BackupV2): string {
  const j = (v: unknown) => JSON.stringify(v);
  const block = (open: string, close: string, rows: string[]) =>
    rows.length ? `${open}\n${rows.join(',\n')}\n${close}` : `${open}${close}`;
  const record = (r: Record<string, unknown>) =>
    block(
      '{',
      '}',
      Object.entries(r).map(([k, v]) => `${j(k)}:${j(v)}`),
    );
  const list = (a: unknown[]) =>
    block(
      '[',
      ']',
      a.map((v) => j(v)),
    );
  return (
    `{"app":"trakr","backupVersion":2,"exportedAt":${j(b.exportedAt)},"settings":${j(b.settings ?? {})},\n` +
    `"exercises":${record(b.exercises)},\n` +
    `"programs":${record(b.programs)},\n` +
    `"sessions":${list(b.sessions)},\n` +
    `"activities":${list(b.activities)}}\n`
  );
}

// ---------------------------------------------------------------------------------------------
// Decode
// ---------------------------------------------------------------------------------------------

function formatPath(path: PropertyKey[]): string {
  return path
    .map((p) => (typeof p === 'number' ? `[${p}]` : `.${String(p)}`))
    .join('')
    .replace(/^\./, '');
}

export type DecodeResult = { ok: true; data: BackupData } | { ok: false; errors: string[] };

/** Validates a v2 document and expands it into full table rows. */
export function decodeBackupV2(value: unknown): DecodeResult {
  const parsed = BackupV2Schema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues
        .slice(0, 8)
        .map((i) => `${formatPath(i.path) || 'backup'}: ${i.message}`),
    };
  }
  const b = parsed.data;
  const errors: string[] = [];
  const fail = (path: string, message: string) => errors.push(`${path}: ${message}`);

  const catalogEntries = Object.entries(b.exercises);
  const catalog = new Map(catalogEntries.map(([id, e]) => [id, decodeExercise(id, e)]));

  const programs: StoredProgram[] = Object.entries(b.programs).map(([id, p]) => {
    const where = `programs.${id}`;
    const exercises = p.exercises.flatMap((e, i) => {
      if (typeof e !== 'string') return [decodeExercise(e.id, e)];
      const shared = catalog.get(e);
      if (!shared) fail(`${where}.exercises[${i}]`, `unknown exercise "${e}" (not in exercises)`);
      return shared ? [shared] : [];
    });
    return {
      schemaVersion: 1,
      id,
      name: p.name,
      ...(p.desc !== undefined ? { description: p.desc } : {}),
      schedule: p.schedule,
      exercises,
      workouts: p.workouts.map((w, wi) => ({
        id: w.id,
        name: w.name,
        items: w.items.map((it, ii): WorkoutItem => {
          const spec = decodeSpec(it[1]);
          if (!spec)
            fail(`${where}.workouts[${wi}].items[${ii}]`, `bad spec "${it[1]}" (use "3x6-8")`);
          return {
            exerciseId: it[0],
            sets: spec?.sets ?? 0,
            repMin: spec?.repMin ?? 0,
            repMax: spec?.repMax ?? 0,
            notes: it[2]?.notes ?? '',
            alternatives: it[2]?.alt ?? [],
            ...(it[2]?.primary ? { primary: true } : {}),
          };
        }),
      })),
      ...(p.notes !== undefined ? { notes: p.notes } : {}),
      isActive: p.active === 1 ? 1 : 0,
      importedAt: p.imported,
    };
  });

  const exercises = [...catalog.values()];
  const kindOf = kindLookup(exercises, programs);
  const settings: Settings = { ...DEFAULT_SETTINGS, ...(b.settings ?? {}) };
  const sessions: Session[] = [];
  const sets: SetEntry[] = [];

  b.sessions.forEach((s, si) => {
    const where = `sessions[${si}]`;
    const targets: SessionTarget[] = s.plan.map((t, i) => {
      const spec = decodeSpec(t[1]);
      if (!spec) fail(`${where}.plan[${i}]`, `bad spec "${t[1]}" (use "3x6-8")`);
      return {
        slotIndex: t[2]?.slot ?? i,
        exerciseId: t[0],
        sets: spec?.sets ?? 0,
        repMin: spec?.repMin ?? 0,
        repMax: spec?.repMax ?? 0,
        kind: t[2]?.kind ?? kindOf(t[0]),
      };
    });
    let workoutName = s.name;
    if (workoutName === undefined) {
      workoutName = programs
        .find((p) => p.id === s.program)
        ?.workouts.find((w) => w.id === s.workout)?.name;
      if (workoutName === undefined) {
        fail(
          where,
          `name is required because program "${s.program}" has no workout "${s.workout}"`,
        );
        workoutName = s.workout;
      }
    }
    let finishedAt: string | undefined;
    if (s.end !== undefined) {
      const t = decodeTime(s.start, s.end);
      if (t === null) fail(`${where}.end`, 'cannot be resolved against start');
      finishedAt = t ?? undefined;
    }
    sessions.push({
      id: s.id,
      programId: s.program,
      workoutId: s.workout,
      workoutName,
      startedAt: s.start,
      ...(finishedAt !== undefined ? { finishedAt } : {}),
      status: s.status ?? 'completed',
      ...(s.notes !== undefined ? { notes: s.notes } : {}),
      ...(s.bw !== undefined ? { bodyweight: s.bw } : {}),
      targets,
      ...(s.skipped?.length ? { skippedSlots: s.skipped } : {}),
    });

    (s.log ?? []).forEach((g, gi) => {
      const gwhere = `${where}.log[${gi}]`;
      const exerciseId = g.ex ?? targets.find((t) => t.slotIndex === g.slot)?.exerciseId;
      if (exerciseId === undefined) {
        fail(gwhere, `no exercise: slot ${g.slot} is not in plan, so "ex" is required`);
        return;
      }
      const rows: Array<Pick<SetEntry, 'weight' | 'unit' | 'reps' | 'rir' | 'isWarmup'>> = [];
      g.sets.forEach((token, ti) => {
        const m = SET_RE.exec(token);
        if (!m) {
          fail(
            `${gwhere}.sets[${ti}]`,
            `bad set "${token}" (use e.g. "135x8", "w60x10", "100kgx5@2", "135x8*3")`,
          );
          return;
        }
        const row = {
          weight: Number(m[2]),
          unit: (m[3] as Unit | undefined) ?? settings.unit,
          reps: Number(m[4]),
          ...(m[5] !== undefined ? { rir: Number(m[5]) } : {}),
          isWarmup: m[1] === 'w',
        };
        const n = m[6] === undefined ? 1 : Number(m[6]);
        for (let k = 0; k < n; k++) rows.push(row);
      });
      const single = Array.isArray(g.t) ? undefined : g.t;
      const times = Array.isArray(g.t) ? g.t : rows.map(() => single);
      if (times.length !== rows.length) {
        fail(`${gwhere}.t`, `has ${times.length} times for ${rows.length} sets`);
        return;
      }
      rows.forEach((row, i) => {
        const raw = times[i];
        const completedAt = raw === undefined ? s.start : decodeTime(s.start, raw);
        if (completedAt === null) {
          fail(`${gwhere}.t`, 'cannot be resolved against start');
          return;
        }
        sets.push({
          id: `${s.id}.${gi}.${i}`,
          sessionId: s.id,
          exerciseId,
          slotIndex: g.slot,
          setIndex: i,
          ...row,
          completedAt,
        });
      });
    });
  });

  const activities: Activity[] = b.activities.map((a) => ({
    id: a.id,
    type: a.type,
    ...(a.title !== undefined ? { title: a.title } : {}),
    startedAt: a.start,
    ...(a.min !== undefined ? { durationMin: a.min } : {}),
    ...(a.dist !== undefined ? { distance: a.dist } : {}),
    ...(a.unit !== undefined ? { distanceUnit: a.unit } : {}),
    ...(a.intensity !== undefined ? { intensity: a.intensity } : {}),
    ...(a.notes !== undefined ? { notes: a.notes } : {}),
  }));

  if (errors.length) return { ok: false, errors: errors.slice(0, 8) };
  return {
    ok: true,
    data: {
      app: 'trakr',
      exportedAt: b.exportedAt,
      programs,
      exercises,
      sessions,
      sets,
      activities,
      settings,
    },
  };
}
