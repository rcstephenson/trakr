import type { ReactNode } from 'react';

export const inputClass =
  'min-h-touch w-full rounded-btn border border-hairline-strong bg-raised px-3 text-base text-ink placeholder:text-muted';
/** Numeric / date / time inputs: mono tabular. */
export const numInputClass = `num ${inputClass}`;

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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="micro">
        {label}
      </label>
      {children}
    </div>
  );
}
