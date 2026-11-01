import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Session } from '../../domain/types';
import { Button, Card } from '../ui';

export function formatElapsed(startedAt: string, now: number): string {
  const total = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export interface NextUpHeroProps {
  workoutName: string;
  exerciseCount: number;
  starting: boolean;
  onStart: () => void;
  onChoose: () => void;
}

export function NextUpHero({
  workoutName,
  exerciseCount,
  starting,
  onStart,
  onChoose,
}: NextUpHeroProps) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Next up</p>
        <h2 className="mt-1 text-2xl font-semibold text-text">{workoutName}</h2>
        <p className="text-sm tabular-nums text-muted">
          {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
        </p>
      </div>
      <Button fullWidth disabled={starting} onClick={onStart}>
        Start
      </Button>
      <Button variant="ghost" fullWidth onClick={onChoose}>
        Choose another workout
      </Button>
    </Card>
  );
}

export function ResumeHero({ session }: { session: Session }) {
  const now = useNow();
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">In progress</p>
        <h2 className="mt-1 text-2xl font-semibold text-text">{session.workoutName}</h2>
        <p className="text-sm tabular-nums text-muted">
          Elapsed {formatElapsed(session.startedAt, now)}
        </p>
      </div>
      <Link
        to={`/session/${session.id}`}
        className="inline-flex min-h-touch w-full items-center justify-center rounded-btn bg-accent px-4 text-sm font-semibold text-on-accent active:opacity-80"
      >
        Resume {session.workoutName}
      </Link>
    </Card>
  );
}
