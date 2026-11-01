// Zod schemas for the canonical program file format (SPEC 4.1) and parseProgram().
import { z } from 'zod';
import type { Program } from './types';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slug = z.string().regex(SLUG, 'must be a lowercase slug like "barbell-bench-press"');
const nonEmpty = z.string().min(1, 'must not be empty');
const positiveInt = z.number().int('must be a whole number');

export const ExerciseSchema = z.object({
  id: slug,
  name: nonEmpty,
  equipment: z.enum(['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'other']),
  kind: z.enum(['compound', 'isolation']),
  load: z.enum(['total', 'per-hand', 'bodyweight-plus', 'none']),
  muscles: z.array(nonEmpty),
  custom: z.boolean().optional(),
});

export const WorkoutItemSchema = z
  .object({
    exerciseId: slug,
    sets: positiveInt.min(1, 'must be at least 1'),
    repMin: positiveInt.min(1, 'must be at least 1'),
    repMax: positiveInt.min(1, 'must be at least 1'),
    notes: z.string(),
    alternatives: z.array(slug),
  })
  .superRefine((item, ctx) => {
    if (item.repMin > item.repMax) {
      ctx.addIssue({
        code: 'custom',
        path: ['repMin'],
        message: `repMin (${item.repMin}) must not be greater than repMax (${item.repMax})`,
      });
    }
  });

export const WorkoutTemplateSchema = z.object({
  id: slug,
  name: nonEmpty,
  items: z.array(WorkoutItemSchema),
});

export const ProgramSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: slug,
    name: nonEmpty,
    description: z.string().optional(),
    schedule: z.array(slug),
    restSeconds: z.object({
      compound: z.number().positive('must be greater than 0'),
      isolation: z.number().positive('must be greater than 0'),
    }),
    exercises: z.array(ExerciseSchema),
    workouts: z.array(WorkoutTemplateSchema),
    notes: z.string().optional(),
  })
  .superRefine((program, ctx) => {
    const fail = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });

    const exerciseIds = new Set<string>();
    program.exercises.forEach((ex, i) => {
      if (exerciseIds.has(ex.id)) fail(['exercises', i, 'id'], `duplicate exercise id "${ex.id}"`);
      exerciseIds.add(ex.id);
    });

    const workoutIds = new Set<string>();
    program.workouts.forEach((w, i) => {
      if (w.id === 'rest') fail(['workouts', i, 'id'], '"rest" is reserved for rest days');
      if (workoutIds.has(w.id)) fail(['workouts', i, 'id'], `duplicate workout id "${w.id}"`);
      workoutIds.add(w.id);
      w.items.forEach((item, j) => {
        if (!exerciseIds.has(item.exerciseId)) {
          fail(
            ['workouts', i, 'items', j, 'exerciseId'],
            `unknown exercise "${item.exerciseId}" (not in the exercises list)`,
          );
        }
        item.alternatives.forEach((alt, k) => {
          if (!exerciseIds.has(alt)) {
            fail(
              ['workouts', i, 'items', j, 'alternatives', k],
              `unknown exercise "${alt}" (not in the exercises list)`,
            );
          }
        });
      });
    });

    program.schedule.forEach((entry, i) => {
      if (entry !== 'rest' && !workoutIds.has(entry)) {
        fail(['schedule', i], `unknown workout "${entry}" (use "rest" for a rest day)`);
      }
    });
  });

// Compile-time check: the inferred schema type must be assignable to `Program`.
type InferredProgram = z.infer<typeof ProgramSchema>;
const _assignableToProgram = (p: InferredProgram): Program => p;
void _assignableToProgram;

export type ParseProgramResult = { ok: true; program: Program } | { ok: false; errors: string[] };

function formatPath(path: PropertyKey[]): string {
  let out = '';
  for (const part of path) {
    if (typeof part === 'number') out += `[${part}]`;
    else out += out ? `.${String(part)}` : String(part);
  }
  return out || 'program';
}

function describeIssue(issue: z.core.$ZodIssue): string {
  if (issue.code === 'invalid_type') {
    const received = /received (\w+)/.exec(issue.message)?.[1];
    if (received === 'undefined') return 'is missing';
    const article = /^[aeiou]/.test(issue.expected) ? 'an' : 'a';
    return `expected ${article} ${issue.expected}`;
  }
  if (issue.code === 'invalid_value') {
    const options = issue.values.map((v) => `"${String(v)}"`).join(', ');
    return `must be one of ${options}`;
  }
  return issue.message;
}

export function parseProgram(input: unknown): ParseProgramResult {
  const result = ProgramSchema.safeParse(input);
  if (result.success) return { ok: true, program: result.data };
  const errors = result.error.issues.map(
    (issue) => `${formatPath(issue.path)}: ${describeIssue(issue)}`,
  );
  return { ok: false, errors };
}
