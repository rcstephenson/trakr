import { useState } from 'react';
import { hasDistance, pace } from '../../domain/activity';
import type { Activity, ActivityType, DistanceUnit, Unit } from '../../domain/types';
import { toDateKey } from '../../lib/dates';
import { Button, Card, Chip, ConfirmDialog } from '../ui';
import { IntensityDots } from './IntensityDots';
import { TypeChips } from './TypeChips';
import { Field, inputClass } from './fields';

export type ActivityInput = Omit<Activity, 'id'>;

export interface ActivityFormBodyProps {
  /** Existing activity when editing; omitted when creating. */
  initial?: Activity;
  /** Weight unit from settings; picks the default distance unit (kg -> km, lb -> mi). */
  weightUnit: Unit;
  onSave: (input: ActivityInput) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const timeKey = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function parseNumber(text: string): number | undefined {
  const n = Number.parseFloat(text.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function ActivityFormBody({ initial, weightUnit, onSave, onDelete }: ActivityFormBodyProps) {
  const defaultUnit: DistanceUnit = weightUnit === 'kg' ? 'km' : 'mi';
  const [start] = useState(() => new Date(initial?.startedAt ?? Date.now()));

  const [type, setType] = useState<ActivityType>(initial?.type ?? 'run');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(toDateKey(start));
  const [time, setTime] = useState(timeKey(start));
  const [hours, setHours] = useState(
    initial?.durationMin ? String(Math.floor(initial.durationMin / 60)) : '',
  );
  const [minutes, setMinutes] = useState(
    initial?.durationMin !== undefined ? String(Math.round(initial.durationMin % 60)) : '',
  );
  const [distance, setDistance] = useState(
    initial?.distance !== undefined ? String(initial.distance) : '',
  );
  // Last chosen unit per activity type; lives in the form only.
  const [units, setUnits] = useState<Partial<Record<ActivityType, DistanceUnit>>>(
    initial?.distanceUnit ? { [initial.type]: initial.distanceUnit } : {},
  );
  const [intensity, setIntensity] = useState<number | undefined>(initial?.intensity);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const unit = units[type] ?? defaultUnit;
  const showDistance = hasDistance(type);

  const durationMin = (() => {
    const h = parseNumber(hours) ?? 0;
    const m = parseNumber(minutes) ?? 0;
    const total = h * 60 + m;
    return hours === '' && minutes === '' ? undefined : total;
  })();
  const distanceValue = showDistance ? parseNumber(distance) : undefined;
  const paceText = showDistance ? pace(durationMin, distanceValue, unit) : null;

  const handleSave = async () => {
    const startedAt = new Date(`${date}T${time || '00:00'}`);
    if (Number.isNaN(startedAt.getTime())) return;
    const input: ActivityInput = {
      type,
      startedAt: startedAt.toISOString(),
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(durationMin !== undefined ? { durationMin } : {}),
      ...(distanceValue !== undefined ? { distance: distanceValue, distanceUnit: unit } : {}),
      ...(intensity !== undefined ? { intensity } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    setBusy(true);
    try {
      await onSave(input);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    setBusy(true);
    try {
      await onDelete?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-5 px-gutter pb-8"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSave();
      }}
    >
      <TypeChips value={type} onChange={setType} />

      <Field label="Title (optional)" htmlFor="activity-title">
        <input
          id="activity-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" htmlFor="activity-date">
          <input
            id="activity-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Time" htmlFor="activity-time">
          <input
            id="activity-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Hours" htmlFor="activity-hours">
          <input
            id="activity-hours"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={hours}
            onChange={(e) => setHours(e.target.value.replace(/\D/g, ''))}
            className={inputClass}
          />
        </Field>
        <Field label="Minutes" htmlFor="activity-minutes">
          <input
            id="activity-minutes"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))}
            className={inputClass}
          />
        </Field>
      </div>

      {showDistance ? (
        <div className="flex flex-col gap-3">
          <Field label="Distance" htmlFor="activity-distance">
            <div className="flex items-center gap-2">
              <input
                id="activity-distance"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className={inputClass}
              />
              <div role="group" aria-label="Distance unit" className="flex gap-2">
                {(['km', 'mi'] as const).map((u) => (
                  <Chip
                    key={u}
                    selected={unit === u}
                    onClick={() => setUnits((prev) => ({ ...prev, [type]: u }))}
                  >
                    {u}
                  </Chip>
                ))}
              </div>
            </div>
          </Field>
          {paceText ? (
            <Card className="flex items-center justify-between">
              <span className="text-sm text-muted">Pace</span>
              <span className="tabular text-base font-semibold text-text" data-testid="pace">
                {paceText}
              </span>
            </Card>
          ) : null}
        </div>
      ) : null}

      <Field label="Intensity">
        <IntensityDots value={intensity} onChange={setIntensity} />
      </Field>

      <Field label="Notes" htmlFor="activity-notes">
        <textarea
          id="activity-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${inputClass} py-3`}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <Button type="submit" fullWidth disabled={busy}>
          Save
        </Button>
        {onDelete ? (
          <Button variant="danger" fullWidth disabled={busy} onClick={() => setConfirmOpen(true)}>
            Delete
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete activity?"
        message="This permanently removes the activity from your history."
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmOpen(false)}
      />
    </form>
  );
}
