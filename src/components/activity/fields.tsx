import type { ReactNode } from 'react';

export const inputClass =
  'tabular min-h-touch w-full rounded-btn border border-border bg-surface px-3 text-base text-text';

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
