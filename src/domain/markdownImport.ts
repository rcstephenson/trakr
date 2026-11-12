// Parses a markdown program (the workouts/workout_A.md table format) into a Program.
import { parseProgram, type ParseProgramResult } from './programSchema';
import type { Equipment, Exercise, ExerciseKind, LoadType, Program, WorkoutItem } from './types';

export type ParseResult = ParseProgramResult;

const EQUIPMENT_WORDS = ['dumbbell', 'barbell', 'cable', 'machine', 'smith', 'kettlebell'];
const ISOLATION_WORDS = /raise|fly|curl|extension|pressdown|abduction|adduction|kickback/i;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.toLowerCase() === 'db' ? 'Dumbbell' : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

/** "UPPER A" -> "Upper A"; mixed-case names are left alone. */
function workoutName(heading: string): string {
  const trimmed = heading.trim();
  return trimmed === trimmed.toUpperCase() ? titleCase(trimmed.toLowerCase()) : trimmed;
}

function isEquipmentWord(word: string | undefined): boolean {
  return !!word && EQUIPMENT_WORDS.includes(word.toLowerCase());
}

/** Infers catalog metadata from the exercise name. */
export function inferExercise(id: string, name: string): Exercise {
  const lower = name.toLowerCase();
  let equipment: Equipment = 'other';
  let load: LoadType = 'total';
  if (/pull-?up|chin-?up|\bdips?\b/.test(lower)) {
    equipment = 'bodyweight';
    load = 'bodyweight-plus';
  } else if (/leg raise|core|plank|crunch/.test(lower)) {
    equipment = 'bodyweight';
    load = 'none';
  } else if (/dumbbell|\bdb\b/.test(lower)) {
    equipment = 'dumbbell';
    load = 'per-hand';
  } else if (/barbell|squat|deadlift|bench press|hip thrust/.test(lower)) {
    equipment = 'barbell';
  } else if (/cable|pressdown|pulldown|seated row/.test(lower)) {
    equipment = 'cable';
  } else if (/machine|leg curl|leg extension|leg press|calf raise|rear-delt fly/.test(lower)) {
    equipment = 'machine';
  }
  const kind: ExerciseKind = ISOLATION_WORDS.test(lower) ? 'isolation' : 'compound';
  return { id, name, equipment, kind, load, muscles: [] };
}

/**
 * Splits a cell like "Incline Dumbbell or Barbell Press" into full exercise names.
 * " or " always splits; " / " only splits when a side names equipment, so
 * "Core / Leg Raise" stays one exercise while "Dips / Machine Chest Press" splits.
 */
export function splitExerciseNames(cell: string): string[] {
  const name = cell.trim();
  let parts = name.split(/\s+or\s+/i);
  if (parts.length === 1 && / \/ /.test(name)) {
    const slashParts = name.split(/\s+\/\s+/);
    const hasEquipment = slashParts.some((p) => p.split(/\s+/).some((w) => isEquipmentWord(w)));
    if (hasEquipment) parts = slashParts;
  }
  parts = parts.map((p) => p.trim()).filter(Boolean);
  if (parts.length === 2) {
    const a = parts[0].split(/\s+/);
    const b = parts[1].split(/\s+/);
    // "Incline Dumbbell or Barbell Press": both sides vary only in the equipment word.
    if (isEquipmentWord(a[a.length - 1]) && isEquipmentWord(b[0])) {
      return [[...a, ...b.slice(1)].join(' '), [...a.slice(0, -1), ...b].join(' ')];
    }
  }
  return parts;
}

function splitRow(line: string): string[] {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|')) t = t.slice(0, -1);
  return t.split('|').map((c) => c.trim());
}

const isSeparatorRow = (cells: string[]) => cells.every((c) => /^:?-{2,}:?$|^$/.test(c));

function parseReps(text: string): { min: number; max: number } | null {
  const m = /^(\d+)\s*(?:[–—-]\s*(\d+))?$/.exec(text.trim());
  if (!m) return null;
  const min = Number(m[1]);
  return { min, max: m[2] ? Number(m[2]) : min };
}

interface Section {
  heading: string;
  lines: string[];
}

export function markdownImport(md: string): ParseResult {
  const errors: string[] = [];
  const lines = md.replace(/\r\n?/g, '\n').split('\n');

  // Split into a preamble and "## " sections.
  const preamble: string[] = [];
  const sections: Section[] = [];
  for (const line of lines) {
    const h = /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (h) sections.push({ heading: h[1], lines: [] });
    else if (sections.length > 0) sections[sections.length - 1].lines.push(line);
    else preamble.push(line);
  }

  const titleLine = preamble.find((l) => /^#\s+/.test(l));
  const title = titleLine ? titleLine.replace(/^#\s+/, '').trim() : '';
  if (!title) errors.push('The markdown needs a "# Title" line to name the program.');

  const noteBlocks: string[] = [];
  const preambleNotes: string[] = [];
  let schedule: string[] = [];
  let scheduleNames: string[] | null = null;
  for (const line of preamble) {
    if (/^#\s+/.test(line)) continue;
    const layout = /^\W*weekly layout\W*:?\W*(.*)$/i.exec(line.trim());
    if (layout && /weekly layout/i.test(line)) {
      scheduleNames = layout[1]
        .split(/\s*\/\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      continue;
    }
    preambleNotes.push(line);
  }
  noteBlocks.push(preambleNotes.join('\n'));

  const exercises = new Map<string, Exercise>();
  const workouts: Program['workouts'] = [];
  const nameToWorkoutId = new Map<string, string>();

  const ensureExercise = (name: string): string => {
    const id = slugify(name);
    if (!exercises.has(id)) exercises.set(id, inferExercise(id, name));
    return id;
  };

  for (const section of sections) {
    const tableLines = section.lines.filter((l) => l.trim().startsWith('|'));
    const header = tableLines.length > 0 ? splitRow(tableLines[0]).map((c) => c.toLowerCase()) : [];
    const col = (name: string) => header.indexOf(name);
    const isWorkoutTable = col('exercise') >= 0 && col('sets') >= 0 && col('reps') >= 0;

    if (!isWorkoutTable) {
      const body = section.lines.join('\n').trim();
      noteBlocks.push(`## ${section.heading}\n\n${body}`.trim());
      continue;
    }

    const name = workoutName(section.heading);
    const id = slugify(name);
    if (!id) {
      errors.push(`Workout heading "${section.heading}" cannot be turned into an id.`);
      continue;
    }
    nameToWorkoutId.set(name.toLowerCase(), id);
    nameToWorkoutId.set(section.heading.trim().toLowerCase(), id);

    const items: WorkoutItem[] = [];
    for (const row of tableLines.slice(1)) {
      const cells = splitRow(row);
      if (isSeparatorRow(cells)) continue;
      const exCell = cells[col('exercise')] ?? '';
      const rowLabel = `${name}, row ${cells[0] || items.length + 1}`;
      if (!exCell) {
        errors.push(`${rowLabel}: the exercise name is empty.`);
        continue;
      }
      const sets = Number(cells[col('sets')]);
      if (!Number.isInteger(sets) || sets < 1) {
        errors.push(
          `${rowLabel} (${exCell}): sets must be a whole number, got "${cells[col('sets')] ?? ''}".`,
        );
        continue;
      }
      const reps = parseReps(cells[col('reps')] ?? '');
      if (!reps) {
        errors.push(
          `${rowLabel} (${exCell}): could not read reps "${cells[col('reps')] ?? ''}" (use 6–10 or 8).`,
        );
        continue;
      }
      const notes = col('notes') >= 0 ? (cells[col('notes')] ?? '') : '';

      const [first, ...rest] = splitExerciseNames(exCell);
      const exerciseId = ensureExercise(first);
      const alternatives: string[] = [];
      for (const alt of rest) alternatives.push(ensureExercise(alt));
      const swap = /optional swap:\s*(.+)$/i.exec(notes);
      if (swap) {
        for (const raw of swap[1].split(/\s+or\s+/i)) {
          const altName = raw.trim().replace(/[.;]+$/, '');
          if (!altName) continue;
          const altId = slugify(altName);
          if (!exercises.has(altId)) exercises.set(altId, inferExercise(altId, titleCase(altName)));
          alternatives.push(altId);
        }
      }
      items.push({
        exerciseId,
        sets,
        repMin: reps.min,
        repMax: reps.max,
        notes,
        alternatives: alternatives.filter(
          (a, i) => a !== exerciseId && alternatives.indexOf(a) === i,
        ),
      });
    }
    workouts.push({ id, name, items });
  }

  if (workouts.length === 0 && errors.length === 0) {
    errors.push(
      'No workout tables found. Expected "## NAME" headings followed by a "| # | Exercise | Sets | Reps | Notes |" table.',
    );
  }

  if (scheduleNames) {
    schedule = scheduleNames.map((n) => {
      if (n.toLowerCase() === 'rest') return 'rest';
      const id = nameToWorkoutId.get(n.toLowerCase());
      if (!id) errors.push(`Weekly layout mentions "${n}", but no workout has that heading.`);
      return id ?? slugify(n);
    });
  } else if (workouts.length > 0) {
    schedule = workouts.map((w) => w.id);
  }

  if (errors.length > 0) return { ok: false, errors };

  const notes = noteBlocks
    .map((b) =>
      b
        .replace(/^\s*-{3,}\s*$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim(),
    )
    .filter(Boolean)
    .join('\n\n');

  const program: Program = {
    schemaVersion: 1,
    id: slugify(title),
    name: title,
    schedule,
    exercises: [...exercises.values()],
    workouts,
    ...(notes ? { notes } : {}),
  };
  return parseProgram(program);
}
