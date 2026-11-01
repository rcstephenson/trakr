import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Repeat, Settings as SettingsIcon, Upload } from 'lucide-react';
import { EmptyState, PageHeader } from '../components/ui';
import { NotesSection, SchedulePills, WorkoutCard } from '../components/program/ProgramOverview';
import { ImportSheet } from '../components/program/ImportSheet';
import { SwitchSheet } from '../components/program/SwitchSheet';
import { downloadProgram } from '../components/program/programFiles';
import { useActiveProgram } from '../hooks/useActiveProgram';
import * as programsRepo from '../db/repositories/programs';

const iconBtn =
  'inline-flex min-h-touch min-w-touch items-center justify-center rounded-btn text-ink active:bg-surface';

export default function Program() {
  const program = useActiveProgram();
  const all = useLiveQuery(() => programsRepo.list(), []);
  const [importing, setImporting] = useState(false);
  const [switching, setSwitching] = useState(false);

  const header = (
    <div className="flex items-center">
      <button
        type="button"
        aria-label="Import program"
        className={iconBtn}
        onClick={() => setImporting(true)}
      >
        <Upload size={20} aria-hidden="true" />
      </button>
      {program ? (
        <button
          type="button"
          aria-label="Export program"
          className={iconBtn}
          onClick={() => downloadProgram(program)}
        >
          <Download size={20} aria-hidden="true" />
        </button>
      ) : null}
      {all && all.length > 1 ? (
        <button
          type="button"
          aria-label="Switch program"
          className={iconBtn}
          onClick={() => setSwitching(true)}
        >
          <Repeat size={20} aria-hidden="true" />
        </button>
      ) : null}
      <Link to="/settings" aria-label="Settings" className={iconBtn}>
        <SettingsIcon size={20} aria-hidden="true" />
      </Link>
    </div>
  );

  return (
    <>
      <PageHeader title="Program" action={header} />
      {program === undefined ? null : program === null ? (
        <EmptyState title="No active program" description="Import a program file to get started." />
      ) : (
        <div className="flex flex-col gap-4 pb-6">
          <div className="px-gutter">
            <p className="micro flex items-center gap-2">
              <span aria-hidden="true" className="h-2 w-2 rounded-[2px] bg-accent" />
              Active program
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">{program.name}</h2>
            {program.description ? (
              <p className="text-sm text-muted">{program.description}</p>
            ) : null}
          </div>
          <SchedulePills program={program} />
          <div className="flex flex-col gap-3 px-gutter">
            {program.workouts.map((w, i) => (
              <WorkoutCard key={w.id} index={i + 1} program={program} workout={w} />
            ))}
            {program.notes ? <NotesSection notes={program.notes} /> : null}
          </div>
        </div>
      )}
      <ImportSheet
        open={importing}
        onClose={() => setImporting(false)}
        existingIds={(all ?? []).map((p) => p.id)}
        onSaved={() => undefined}
      />
      <SwitchSheet open={switching} onClose={() => setSwitching(false)} programs={all ?? []} />
    </>
  );
}
