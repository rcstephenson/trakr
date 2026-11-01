import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  EmptyState,
  Mono,
  PageHeader,
  SectionLabel,
  SegmentedBar,
  Sheet,
} from '../components/ui';
import { applyTheme } from '../lib/theme';

const SWATCHES = [
  ['bg', 'bg-bg'],
  ['surface', 'bg-surface'],
  ['raised', 'bg-raised'],
  ['ink', 'bg-ink'],
  ['muted', 'bg-muted'],
  ['hair', 'bg-hairline'],
  ['accent', 'bg-accent'],
  ['accent-ink', 'bg-accent-ink'],
  ['pr', 'bg-pr'],
  ['danger', 'bg-danger'],
] as const;

function Showcase() {
  const [chip, setChip] = useState('All');
  const [sheet, setSheet] = useState(false);
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="flex flex-col gap-5 px-gutter pb-8">
      <section>
        <SectionLabel index={1}>Tokens</SectionLabel>
        <Card className="mt-2">
          <ul className="grid grid-cols-5 gap-2">
            {SWATCHES.map(([name, cls]) => (
              <li key={name} className="flex flex-col items-start gap-1">
                <span className={`h-8 w-full rounded-chip border border-hairline ${cls}`} />
                <span className="micro w-full break-all text-[10px] leading-3">{name}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section>
        <SectionLabel index={2}>Type</SectionLabel>
        <Card className="mt-2 flex flex-col gap-1">
          <p className="text-display font-semibold tracking-tighter">Upper B</p>
          <p className="text-xl font-semibold tracking-tight">Geist 24 / 600</p>
          <p className="text-base">Geist 18, body copy and titles</p>
          <p className="text-sm text-muted">Geist 15 muted, secondary copy</p>
          <p className="micro">Micro label · mono 11</p>
          <p>
            <Mono className="text-base">102.5 × 8 · 12,480 lb</Mono>
          </p>
          <p className="text-pr">
            <Mono>🏆 PR 315 lb</Mono>
          </p>
        </Card>
      </section>

      <section>
        <SectionLabel index={3}>Button</SectionLabel>
        <Card className="mt-2">
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Card>
      </section>

      <section>
        <SectionLabel index={4}>Chip</SectionLabel>
        <Card className="mt-2">
          <div className="flex flex-wrap gap-2">
            {['All', 'Workouts', 'Activities'].map((c) => (
              <Chip key={c} selected={chip === c} onClick={() => setChip(c)}>
                {c}
              </Chip>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <SectionLabel
          index={5}
          action={
            <>
              <Mono className="text-ink">3</Mono>/<Mono>5</Mono> sets
            </>
          }
        >
          Segmented bar
        </SectionLabel>
        <Card className="mt-2 flex flex-col gap-4">
          <SegmentedBar value={3} total={5} label="3 of 5 sets logged" />
          <SegmentedBar
            states={['done', 'done', 'rest', 'current', 'off', 'rest', 'off']}
            label="Seven day schedule"
          />
        </Card>
      </section>

      <section>
        <SectionLabel index={6}>Sheet and confirm</SectionLabel>
        <Card className="mt-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setSheet(true)}>
              Open sheet
            </Button>
            <Button variant="danger" onClick={() => setConfirm(true)}>
              Open confirm
            </Button>
          </div>
        </Card>
      </section>

      <section>
        <SectionLabel index={7}>Empty state</SectionLabel>
        <div className="mt-2">
          <EmptyState
            icon={<Dumbbell size={24} aria-hidden="true" />}
            title="Nothing here yet"
            description="Example empty state."
          />
        </div>
      </section>

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
    </div>
  );
}

export default function UiDemo() {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark',
  );
  const [both, setBoth] = useState(false);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    applyTheme(next ? 'dark' : 'light');
  };

  return (
    <>
      <PageHeader
        title="UI primitives"
        subtitle="Signal / dev"
        action={
          <Button variant="secondary" onClick={toggle} aria-pressed={dark}>
            {dark ? 'Graphite' : 'Paper'}
          </Button>
        }
      />
      <div className="flex gap-2 px-gutter pb-4">
        <Chip selected={both} onClick={() => setBoth((b) => !b)}>
          Compare both themes
        </Chip>
      </div>
      {both ? (
        <>
          {(['light', 'dark'] as const).map((t) => (
            <div key={t} data-theme={t} className="bg-bg pt-4 text-ink">
              <p className="micro px-gutter pb-3">{t === 'light' ? 'Paper' : 'Graphite'}</p>
              <Showcase />
            </div>
          ))}
        </>
      ) : (
        <Showcase />
      )}
    </>
  );
}
