import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-hairline px-6 py-10 text-center">
      {icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-card border border-hairline bg-raised text-muted">
          {icon}
        </div>
      ) : null}
      <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
      {description ? <p className="max-w-[28ch] text-sm text-muted">{description}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
