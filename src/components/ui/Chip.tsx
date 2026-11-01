import type { ButtonHTMLAttributes } from 'react';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function Chip({ selected = false, className = '', type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={[
        'inline-flex min-h-touch items-center justify-center rounded-full border px-4',
        'text-sm font-medium transition-colors',
        selected
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-border bg-surface text-muted',
        className,
      ].join(' ')}
      {...rest}
    />
  );
}
