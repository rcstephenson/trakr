import { useRef, useState } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { Button, ConfirmDialog, Sheet } from '../ui';
import {
  clearAllData,
  exportBackupFile,
  importBackup,
  parseBackup,
  type BackupSummary,
  type ImportMode,
} from '../../lib/backup';
import { SettingsGroup, SettingsRow } from './SettingsGroup';

interface Pending {
  json: unknown;
  summary: BackupSummary;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function DataSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [clearStep, setClearStep] = useState<0 | 1 | 2>(0);
  const [typed, setTyped] = useState('');

  const onExport = async () => {
    setBusy(true);
    try {
      const result = await exportBackupFile();
      if (result !== 'cancelled') {
        setStatus({
          kind: 'ok',
          text: result === 'shared' ? 'Backup shared.' : 'Backup downloaded.',
        });
      }
    } catch (err) {
      setStatus({ kind: 'error', text: `Export failed: ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setStatus(null);
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      setStatus({ kind: 'error', text: 'That file is not valid JSON.' });
      return;
    }
    const parsed = parseBackup(json);
    if (!parsed.ok) {
      setStatus({ kind: 'error', text: `Not a valid Trakr backup. ${parsed.errors[0]}` });
      return;
    }
    setPending({ json, summary: parsed.summary });
  };

  const runImport = async (mode: ImportMode) => {
    if (!pending) return;
    setBusy(true);
    try {
      await importBackup(pending.json, mode);
      setStatus({
        kind: 'ok',
        text: mode === 'replace' ? 'Backup restored.' : 'Backup merged into your data.',
      });
      setPending(null);
    } catch (err) {
      setStatus({ kind: 'error', text: `Import failed: ${(err as Error).message}` });
      setPending(null);
    } finally {
      setBusy(false);
    }
  };

  const closeClear = () => {
    setClearStep(0);
    setTyped('');
  };

  const runClear = async () => {
    setBusy(true);
    try {
      await clearAllData();
      setStatus({ kind: 'ok', text: 'All data cleared.' });
    } catch (err) {
      setStatus({ kind: 'error', text: `Clear failed: ${(err as Error).message}` });
    } finally {
      setBusy(false);
      closeClear();
    }
  };

  const s = pending?.summary;

  return (
    <>
      <SettingsGroup title="Data">
        <SettingsRow label="Export backup" description="Save all your data as a JSON file">
          <Button variant="secondary" disabled={busy} onClick={() => void onExport()}>
            <Download size={18} aria-hidden="true" />
            Export
          </Button>
        </SettingsRow>
        <SettingsRow label="Import backup" description="Restore from a Trakr backup file">
          <Button variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Upload size={18} aria-hidden="true" />
            Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            aria-label="Backup file"
            data-testid="backup-file-input"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </SettingsRow>
        <SettingsRow label="Clear all data" description="Deletes everything on this device">
          <Button variant="danger" disabled={busy} onClick={() => setClearStep(1)}>
            <Trash2 size={18} aria-hidden="true" />
            Clear
          </Button>
        </SettingsRow>
      </SettingsGroup>

      {status ? (
        <p
          role={status.kind === 'error' ? 'alert' : 'status'}
          className={`px-gutter text-sm ${status.kind === 'error' ? 'text-danger' : 'text-muted'}`}
        >
          {status.text}
        </p>
      ) : null}

      <Sheet open={pending !== null} onClose={() => setPending(null)} title="Import backup">
        {s ? (
          <>
            <dl className="mb-4 grid grid-cols-[1fr_auto] gap-y-1 text-sm">
              {(
                [
                  ['Programs', s.counts.programs],
                  ['Exercises', s.counts.exercises],
                  ['Sessions', s.counts.sessions],
                  ['Sets', s.counts.sets],
                  ['Activities', s.counts.activities],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd className="tabular text-right text-text">{v}</dd>
                </div>
              ))}
              <dt className="text-muted">Date range</dt>
              <dd className="text-right text-text">
                {s.dateRange ? `${fmtDate(s.dateRange.from)} – ${fmtDate(s.dateRange.to)}` : 'None'}
              </dd>
            </dl>
            <p className="mb-4 text-sm text-muted">
              Merge adds and updates records by id and keeps your current settings. Replace deletes
              everything on this device first.
            </p>
            <div className="flex flex-col gap-2">
              <Button fullWidth disabled={busy} onClick={() => void runImport('merge')}>
                Merge into existing data
              </Button>
              <Button
                variant="danger"
                fullWidth
                disabled={busy}
                onClick={() => void runImport('replace')}
              >
                Replace all data
              </Button>
              <Button variant="secondary" fullWidth onClick={() => setPending(null)}>
                Cancel
              </Button>
            </div>
          </>
        ) : null}
      </Sheet>

      <ConfirmDialog
        open={clearStep === 1}
        title="Clear all data?"
        message="This permanently deletes your sessions, activities, programs and settings from this device. Export a backup first if you want to keep them."
        confirmLabel="Continue"
        destructive
        onConfirm={() => setClearStep(2)}
        onCancel={closeClear}
      />

      <Sheet open={clearStep === 2} onClose={closeClear} title="Type DELETE to confirm">
        <label htmlFor="clear-confirm" className="mb-2 block text-sm text-muted">
          Type DELETE (capital letters) to permanently erase all data.
        </label>
        <input
          id="clear-confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          className="mb-4 min-h-touch w-full rounded-btn border border-border bg-bg px-3 text-base text-text"
        />
        <div className="flex flex-col gap-2">
          <Button
            variant="danger"
            fullWidth
            disabled={typed !== 'DELETE' || busy}
            onClick={() => void runClear()}
          >
            Erase all data
          </Button>
          <Button variant="secondary" fullWidth onClick={closeClear}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </>
  );
}
