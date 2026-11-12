import { Repeat } from 'lucide-react';
import { SectionLabel } from '../ui';
import { summarizePrograms, type ProgramSummary } from '../../domain/programHistory';
import type { Session, StoredProgram } from '../../domain/types';
import * as programsRepo from '../../db/repositories/programs';

const monthYear = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });

/** "Jan 2026 – Mar 2026", "Jan 2026" (one month), or "No sessions". */
export function dateRangeLabel(firstAt: string | null, lastAt: string | null): string {
  if (!firstAt || !lastAt) return 'No sessions';
  const a = monthYear.format(new Date(firstAt));
  const b = monthYear.format(new Date(lastAt));
  return a === b ? a : `${a} – ${b}`;
}

export function describeSummary(p: ProgramSummary): string {
  const n = `${p.sessionCount} ${p.sessionCount === 1 ? 'session' : 'sessions'}`;
  return `${n} · ${dateRangeLabel(p.firstAt, p.lastAt)}`;
}

/**
 * Every program other than the active one with its session count and date range, so past routines
 * and what was logged under them stay visible. Installed programs can be switched back to.
 */
export function ProgramHistory({
  programs,
  sessions,
  index,
}: {
  programs: StoredProgram[];
  sessions: Session[];
  index?: number;
}) {
  const past = summarizePrograms(programs, sessions).filter((p) => !p.isActive);
  if (past.length === 0) return null;
  return (
    <section aria-label="Past programs" data-testid="past-programs">
      <SectionLabel index={index}>Past programs</SectionLabel>
      <ul className="mt-2 divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface">
        {past.map((p) => (
          <li key={p.id} className="flex min-h-touch items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
              <p className="num truncate text-xs text-muted">{describeSummary(p)}</p>
            </div>
            {p.installed ? (
              <button
                type="button"
                aria-label={`Switch to ${p.name}`}
                onClick={() => void programsRepo.setActive(p.id)}
                className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-btn text-accent active:bg-bg"
              >
                <Repeat size={18} aria-hidden="true" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
