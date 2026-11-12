import { Check } from 'lucide-react';
import { Sheet } from '../ui';
import { summarizePrograms } from '../../domain/programHistory';
import type { Session, StoredProgram } from '../../domain/types';
import * as programsRepo from '../../db/repositories/programs';

export function SwitchSheet({
  open,
  onClose,
  programs,
  sessions = [],
}: {
  open: boolean;
  onClose: () => void;
  programs: StoredProgram[];
  sessions?: Session[];
}) {
  const counts = new Map(summarizePrograms(programs, sessions).map((s) => [s.id, s.sessionCount]));
  return (
    <Sheet open={open} onClose={onClose} title="Switch program">
      <ul className="flex flex-col gap-2">
        {programs.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => {
                void programsRepo.setActive(p.id).then(onClose);
              }}
              className="flex min-h-touch w-full items-center justify-between gap-3 rounded-btn border border-hairline bg-bg px-3 py-2 text-left"
            >
              <span>
                <span className="block text-sm font-medium text-ink">{p.name}</span>
                <span className="micro block">
                  {p.workouts.length} workouts · {counts.get(p.id) ?? 0} sessions
                </span>
              </span>
              {p.isActive ? (
                <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold uppercase tracking-micro text-accent">
                  <Check size={16} aria-hidden="true" />
                  Active
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
