import { Card } from '../ui';

export function TodaySkeleton() {
  return (
    <div className="flex flex-col gap-3 px-gutter" aria-busy="true" aria-label="Loading">
      <Card className="h-48 animate-pulse bg-border" aria-hidden="true" />
      <Card className="h-20 animate-pulse bg-border" aria-hidden="true" />
      <Card className="h-32 animate-pulse bg-border" aria-hidden="true" />
    </div>
  );
}
