// Lint-style checks for program files beyond what the Zod schema enforces. Pure, and written with
// type-only imports so `scripts/program-check.mjs` can load it directly with Node.
import type { Program } from './types';

export interface NamedProgram {
  /** Display name of the source, usually the file name. */
  file: string;
  program: Program;
}

const STOP_WORDS = new Set(['the', 'a', 'an', 'with', 'and', 'of']);

/** Lowercase word tokens of a name, minus filler words, with a trailing plural "s" removed. */
export function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOP_WORDS.has(t))
    .map((t) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t));
}

/** Token overlap in 0..1 (Jaccard). 1 means the same words in any order. */
export function nameSimilarity(a: string, b: string): number {
  const ta = new Set(nameTokens(a));
  const tb = new Set(nameTokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return shared / (ta.size + tb.size - shared);
}

export interface Lookalike {
  /** Exercise id in the checked program that no other program uses. */
  id: string;
  name: string;
  /** Existing exercise with a similar name, and where it comes from. */
  similarId: string;
  similarName: string;
  file: string;
}

/** Names at least this similar are flagged as probably the same movement. */
export const SIMILARITY_THRESHOLD = 0.5;

/**
 * Exercises whose id appears in no other program but whose name resembles an exercise that does.
 * Those are likely accidental new ids that would split one movement's progress in two.
 */
export function findLookalikes(program: Program, others: ReadonlyArray<NamedProgram>): Lookalike[] {
  const known = new Map<string, { name: string; file: string }>();
  for (const o of others) {
    for (const ex of o.program.exercises) {
      if (!known.has(ex.id)) known.set(ex.id, { name: ex.name, file: o.file });
    }
  }
  const out: Lookalike[] = [];
  for (const ex of program.exercises) {
    if (known.has(ex.id)) continue;
    let best: { id: string; name: string; file: string; score: number } | null = null;
    for (const [id, k] of known) {
      const score = nameSimilarity(ex.name, k.name);
      if (score >= SIMILARITY_THRESHOLD && (best === null || score > best.score)) {
        best = { id, name: k.name, file: k.file, score };
      }
    }
    if (best) {
      out.push({
        id: ex.id,
        name: ex.name,
        similarId: best.id,
        similarName: best.name,
        file: best.file,
      });
    }
  }
  return out;
}

/** Human-readable warnings for a program file. Empty when it looks fine. */
export function programWarnings(program: Program, others: ReadonlyArray<NamedProgram>): string[] {
  const warnings: string[] = [];

  for (const o of others) {
    if (o.program.id === program.id) {
      warnings.push(
        `program id "${program.id}" is also used by ${o.file}: importing both would make one replace the other. A new routine needs a new, unique id.`,
      );
    }
  }

  for (const l of findLookalikes(program, others)) {
    warnings.push(
      `exercise "${l.id}" (${l.name}) is new, but ${l.file} has "${l.similarId}" (${l.similarName}). If it is the same movement, reuse that id so progress carries across programs.`,
    );
  }

  const used = new Set<string>();
  for (const w of program.workouts) {
    for (const item of w.items) {
      used.add(item.exerciseId);
      item.alternatives.forEach((a) => used.add(typeof a === 'string' ? a : a.exerciseId));
    }
  }
  for (const ex of program.exercises) {
    if (!used.has(ex.id)) warnings.push(`exercise "${ex.id}" is defined but no workout uses it.`);
  }

  const scheduled = new Set(program.schedule);
  for (const w of program.workouts) {
    if (!scheduled.has(w.id)) {
      warnings.push(`workout "${w.id}" is not in the schedule, so it is never suggested as next.`);
    }
  }

  return warnings;
}
