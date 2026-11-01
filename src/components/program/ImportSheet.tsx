import { useId, useState } from 'react';
import { Button, Sheet } from '../ui';
import { markdownImport } from '../../domain/markdownImport';
import { parseProgram } from '../../domain/programSchema';
import type { Program } from '../../domain/types';
import * as programsRepo from '../../db/repositories/programs';

type Preview =
  | { kind: 'ok'; fileName: string; program: Program }
  | { kind: 'error'; fileName: string; errors: string[] };

/** Parses the text of an imported file by extension. Exported for tests. */
export function parseImportText(fileName: string, text: string): Preview {
  if (/\.(md|markdown)$/i.test(fileName)) {
    const r = markdownImport(text);
    return r.ok
      ? { kind: 'ok', fileName, program: r.program }
      : { kind: 'error', fileName, errors: r.errors };
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    const detail = e instanceof Error ? ` (${e.message})` : '';
    return { kind: 'error', fileName, errors: [`This file is not valid JSON${detail}.`] };
  }
  const r = parseProgram(data);
  return r.ok
    ? { kind: 'ok', fileName, program: r.program }
    : { kind: 'error', fileName, errors: r.errors };
}

export function ImportSheet({
  open,
  onClose,
  existingIds,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  existingIds: string[];
  onSaved: () => void;
}) {
  const inputId = useId();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [activate, setActivate] = useState(true);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setPreview(null);
    setActivate(true);
    onClose();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setPreview(parseImportText(file.name, await file.text()));
  };

  const save = async () => {
    if (preview?.kind !== 'ok') return;
    setSaving(true);
    try {
      await programsRepo.save(preview.program, { activate });
      onSaved();
      close();
    } finally {
      setSaving(false);
    }
  };

  const program = preview?.kind === 'ok' ? preview.program : null;
  const exerciseCount = program?.workouts.reduce((n, w) => n + w.items.length, 0) ?? 0;

  return (
    <Sheet open={open} onClose={close} title="Import program">
      <p className="mb-3 text-sm text-muted">
        Choose a program <code>.json</code> file, or a <code>.md</code> file with workout tables.
        You can review it before it is saved.
      </p>
      <label htmlFor={inputId} className="micro mb-1 block">
        Program file
      </label>
      <input
        id={inputId}
        type="file"
        accept=".json,.md,.markdown,application/json,text/markdown"
        onChange={(e) => void onFile(e.target.files?.[0])}
        className="num mb-4 block w-full rounded-btn border border-dashed border-hairline bg-bg p-3 text-xs text-ink file:mr-3 file:rounded-btn file:border file:border-hairline file:bg-raised file:px-3 file:py-2 file:font-mono file:text-xs file:uppercase file:text-ink"
      />

      {preview?.kind === 'error' ? (
        <div role="alert" className="mb-4 rounded-btn border border-danger p-3">
          <p className="mb-1 text-sm font-semibold text-danger">
            {preview.fileName} could not be imported. Nothing was saved.
          </p>
          <ul className="list-disc pl-5 text-sm text-ink">
            {preview.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {program ? (
        <div className="mb-4" data-testid="import-preview">
          <h3 className="text-base font-semibold tracking-tight text-ink">{program.name}</h3>
          <p className="num mb-2 text-xs text-muted">
            {program.workouts.length} workouts · {exerciseCount} exercise slots ·{' '}
            {program.exercises.length} exercises
          </p>
          <ul className="num mb-2 divide-y divide-hairline border-y border-hairline text-xs text-ink [&>li]:py-1.5">
            {program.workouts.map((w) => (
              <li key={w.id}>
                {w.name}: {w.items.length} exercises
              </li>
            ))}
          </ul>
          {existingIds.includes(program.id) ? (
            <p className="mb-2 text-sm text-muted">
              A program with the id “{program.id}” already exists and will be replaced.
            </p>
          ) : null}
          <label className="flex min-h-touch items-center gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={activate}
              onChange={(e) => setActivate(e.target.checked)}
              className="h-5 w-5"
            />
            Make active
          </label>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {program ? (
          <Button fullWidth onClick={() => void save()} disabled={saving}>
            Save program
          </Button>
        ) : null}
        <Button variant="secondary" fullWidth onClick={close}>
          Cancel
        </Button>
      </div>
    </Sheet>
  );
}
