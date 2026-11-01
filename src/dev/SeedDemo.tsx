import { useState } from 'react';
import { Button, Card, PageHeader } from '../components/ui';
import { clearDemoData, seedDemoData } from './demoData';

export default function SeedDemo() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const run = async (task: () => Promise<string>) => {
    setBusy(true);
    setMessage('');
    try {
      setMessage(await task());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Seed demo" subtitle="Dev only" />
      <div className="flex flex-col gap-4 px-gutter">
        <Card className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Generates about 6 months of completed sessions following the active program, plus a few
            activities. Existing demo data is replaced; your own data is never touched.
          </p>
          <Button
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await seedDemoData();
                return `Created ${r.sessions} sessions, ${r.sets} sets, ${r.activities} activities.`;
              })
            }
          >
            Generate demo data
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await clearDemoData();
                return `Removed ${r.sessions} sessions and ${r.activities} activities.`;
              })
            }
          >
            Clear demo data
          </Button>
          <p role="status" className="min-h-[22px] text-sm text-text">
            {message}
          </p>
        </Card>
      </div>
    </>
  );
}
