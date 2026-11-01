import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="flex min-h-touch items-center justify-between gap-3 px-gutter pb-2 pt-5">
      <div className="min-w-0">
        {subtitle ? <p className="micro mb-0.5 truncate">{subtitle}</p> : null}
        <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{title}</h1>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
