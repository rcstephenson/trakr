import { useEffect, useState } from 'react';
import { hasDistance, pace } from '../../domain/activity';
import type { Activity, ActivityType, DistanceUnit, Unit } from '../../domain/types';
import { toDateKey } from '../../lib/dates';
import { Button, Card, Chip, ConfirmDialog, SectionLabel } from '../ui';
import { IntensityDots } from './IntensityDots';
import { TypeChips } from './TypeChips';
import { Field, inputClass, numInputClass } from './fields';

export type ActivityInput = Omit<Activity, 'id'>;

export interface ActivityFormBodyProps {
  /** Existing activity when editing; omitted when creating. */
  initial?: Activity;
  /** Weight unit from settings; picks the default distance unit (kg -> km, lb -> mi). */
  weightUnit: Unit;
  onSave: (input: ActivityInput) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  /** Cancel pressed: the parent decides whether to confirm (it owns the back arrow too). */
  onCancel: () => void;
  /** Reports whether the user has changed anything since the form opened. */
  onDirtyChange?: (dirty: boolean) => void;
}

interface Values {
  type: ActivityType;
  title: string;
  date: string;
  time: string;
  hours: string;
  minutes: string;
  distance: string;
  units: Partial<Record<ActivityType, DistanceUnit>>;
  intensity: number | undefined;
  notes: string;
}

function initialValues(initial: Activity | undefined, start: Date): Values {
  return {
    type: initial?.type ?? 'run',
    title: initial?.title ?? '',
    date: toDateKey(start),
    time: timeKey(start),
    hours: initial?.durationMin ? String(Math.floor(initial.durationMin / 60)) : '',
    minutes: initial?.durationMin !== undefined ? String(Math.round(initial.durationMin % 60)) : '',
    distance: initial?.distance !== undefined ? String(initial.distance) : '',
    units: initial?.distanceUnit ? { [initial.type]: initial.distanceUnit } : {},
    intensity: initial?.intensity,
    notes: initial?.notes ?? '',
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const timeKey = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function parseNumber(text: string): number | undefined {
  const n = Number.parseFloat(text.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function ActivityFormBody({
  initial,
  weightUnit,
  onSave,
  onDelete,
  onCancel,
  onDirtyChange,
}: ActivityFormBodyProps) {
  const defaultUnit: DistanceUnit = weightUnit === 'kg' ? 'km' : 'mi';
  const [start] = useState(() => new Date(initial?.startedAt ?? Date.now()));
  // What the form holds before the user touches it; "dirty" means anything differs.
  const [baseline] = useState(() => initialValues(initial, start));

  const [type, setType] = useState<ActivityType>(baseline.type);
  const [title, setTitle] = useState(baseline.title);
  const [date, setDate] = useState(baseline.date);
  const [time, setTime] = useState(baseline.time);
  const [hours, setHours] = useState(baseline.hours);
  const [minutes, setMinutes] = useState(baseline.minutes);
  const [distance, setDistance] = useState(baseline.distance);
  // Last chosen unit per activity type; lives in the form only.
  const [units, setUnits] = useState<Partial<Record<ActivityType, DistanceUnit>>>(baseline.units);
  const [intensity, setIntensity] = useState<number | undefined>(baseline.intensity);
  const [notes, setNotes] = useState(baseline.notes);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const dirty =
    JSON.stringify({
      type,
      title,
      date,
      time,
      hours,
      minutes,
      distance,
      units,
      intensity,
      notes,
    }) !== JSON.stringify(baseline);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const clearForm = () => {
    const blank = baseline;
    setType(blank.type);
    setTitle(blank.title);
    setDate(blank.date);
    setTime(blank.time);
    setHours(blank.hours);
    setMinutes(blank.minutes);
    setDistance(blank.distance);
    setUnits(blank.units);
    setIntensity(blank.intensity);
    setNotes(blank.notes);
    setClearOpen(false);
  };

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
      <SectionLabel index={1} className="-mb-2">
        Type
      </SectionLabel>
      <TypeChips value={type} onChange={setType} />

      <SectionLabel index={2} className="-mb-2">
        When
      </SectionLabel>
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
            className={numInputClass}
          />
        </Field>
        <Field label="Time" htmlFor="activity-time">
          <input
            id="activity-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={numInputClass}
          />
        </Field>
      </div>

      <SectionLabel index={3} className="-mb-2">
        Effort
      </SectionLabel>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Hours" htmlFor="activity-hours">
          <input
            id="activity-hours"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={hours}
            onChange={(e) => setHours(e.target.value.replace(/\D/g, ''))}
            className={numInputClass}
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
            className={numInputClass}
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
                className={numInputClass}
              />
              <div role="group" aria-label="Distance unit" className="flex gap-1.5">
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
            <Card tone="raised" className="flex items-center justify-between !py-3">
              <span className="micro">Pace</span>
              <span className="num text-base font-semibold text-ink" data-testid="pace">
                {paceText}
              </span>
            </Card>
          ) : null}
        </div>
      ) : null}

      <Field label="Intensity">
        <IntensityDots value={intensity} onChange={setIntensity} />
      </Field>

      <SectionLabel index={4} className="-mb-2">
        Notes
      </SectionLabel>
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
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          {onDelete ? null : (
            <Button
              variant="secondary"
              disabled={busy || !dirty}
              onClick={() => setClearOpen(true)}
            >
              Clear
            </Button>
          )}
        </div>
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
      <ConfirmDialog
        open={clearOpen}
        title="Clear the form?"
        message="Everything you entered will be reset."
        confirmLabel="Clear"
        cancelLabel="Keep editing"
        destructive
        onConfirm={clearForm}
        onCancel={() => setClearOpen(false)}
      />
    </form>
  );
}
