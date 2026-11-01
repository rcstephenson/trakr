import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Sheet,
  Stepper,
} from '../components/ui';
import { applyTheme } from '../lib/theme';

export default function UiDemo() {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark',
  );
  const [weight, setWeight] = useState(135);
  const [reps, setReps] = useState(8);
  const [chip, setChip] = useState('All');
  const [sheet, setSheet] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    applyTheme(next ? 'dark' : 'light');
  };

  return (
    <>
      <PageHeader
        title="UI primitives"
        action={
          <Button variant="secondary" onClick={toggle} aria-pressed={dark}>
            {dark ? 'Dark' : 'Light'}
          </Button>
        }
      />
      <div className="flex flex-col gap-3 px-gutter pb-8">
        <Card>
          <h2 className="mb-3 text-base font-semibold">Button</h2>
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 text-base font-semibold">Stepper</h2>
          <div className="flex flex-col gap-2">
            <Stepper label="Weight" value={weight} step={5} unit="lb" onChange={setWeight} />
            <Stepper label="Reps" value={reps} step={1} min={0} onChange={setReps} />
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 text-base font-semibold">Chip</h2>
          <div className="flex flex-wrap gap-2">
            {['All', 'Workouts', 'Activities'].map((c) => (
              <Chip key={c} selected={chip === c} onClick={() => setChip(c)}>
                {c}
              </Chip>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 text-base font-semibold">Sheet and ConfirmDialog</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setSheet(true)}>
              Open sheet
            </Button>
            <Button variant="danger" onClick={() => setConfirm(true)}>
              Open confirm
            </Button>
          </div>
        </Card>
        <Card>
          <h2 className="text-base font-semibold">EmptyState</h2>
          <EmptyState
            icon={<Dumbbell size={32} aria-hidden="true" />}
            title="Nothing here yet"
            description="Example empty state."
          />
        </Card>
      </div>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Example sheet">
        <p className="mb-4 text-sm text-muted">Press Escape or tap the backdrop to close.</p>
        <Button fullWidth onClick={() => setSheet(false)}>
          Done
        </Button>
      </Sheet>
      <ConfirmDialog
        open={confirm}
        title="Delete item?"
        message="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => setConfirm(false)}
        onCancel={() => setConfirm(false)}
      />
    </>
  );
}
