import type { Program, Session } from './types';

/** Sessions of one program, or all of them when `programId` is null. Order is preserved. */
export function filterSessionsByProgram<T extends Pick<Session, 'programId'>>(
  sessions: ReadonlyArray<T>,
  programId: string | null,
): T[] {
  return programId === null ? [...sessions] : sessions.filter((s) => s.programId === programId);
}

/** Distinct program ids that have at least one session, in first-seen order. */
export function programIdsOf(sessions: ReadonlyArray<Pick<Session, 'programId'>>): string[] {
  return [...new Set(sessions.map((s) => s.programId))];
}

/**
 * Display name for a program id. A session can outlive its program (never deleted with it), so an
 * unknown id falls back to the id itself, marked as removed.
 */
export function programLabel(
  programs: ReadonlyArray<Pick<Program, 'id' | 'name'>>,
  programId: string,
): string {
  return programs.find((p) => p.id === programId)?.name ?? `${programId} (removed)`;
}

export interface ProgramSummary {
  id: string;
  name: string;
  /** Completed sessions logged under this program. */
  sessionCount: number;
  /** `startedAt` of the earliest / latest completed session, or null with none. */
  firstAt: string | null;
  lastAt: string | null;
  isActive: boolean;
  /** False when only sessions remain (the program definition was removed). */
  installed: boolean;
}

/**
 * One summary per installed program plus one per program id that only survives in sessions.
 * Active program first, then most recently trained.
 */
export function summarizePrograms(
  programs: ReadonlyArray<Pick<Program, 'id' | 'name'> & { isActive?: 0 | 1 }>,
  sessions: ReadonlyArray<Pick<Session, 'programId' | 'startedAt' | 'status'>>,
): ProgramSummary[] {
  const stats = new Map<string, { count: number; first: string; last: string }>();
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const cur = stats.get(s.programId);
    if (!cur) stats.set(s.programId, { count: 1, first: s.startedAt, last: s.startedAt });
    else {
      cur.count += 1;
      if (s.startedAt < cur.first) cur.first = s.startedAt;
      if (s.startedAt > cur.last) cur.last = s.startedAt;
    }
  }
  const summarize = (id: string, name: string, active: boolean, installed: boolean) => {
    const st = stats.get(id);
    return {
      id,
      name,
      sessionCount: st?.count ?? 0,
      firstAt: st?.first ?? null,
      lastAt: st?.last ?? null,
      isActive: active,
      installed,
    };
  };
  const out = programs.map((p) => summarize(p.id, p.name, p.isActive === 1, true));
  const known = new Set(programs.map((p) => p.id));
  for (const id of stats.keys()) {
    if (!known.has(id)) out.push(summarize(id, programLabel([], id), false, false));
  }
  return out.sort(
    (a, b) =>
      Number(b.isActive) - Number(a.isActive) || (b.lastAt ?? '').localeCompare(a.lastAt ?? ''),
  );
}
