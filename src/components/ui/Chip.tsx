import type { ButtonHTMLAttributes } from 'react';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function Chip({
  selected = false,
  className = '',
  type = 'button',
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={[
        'relative inline-flex min-h-touch items-center justify-center rounded-chip border px-4',
        'font-mono text-xs font-medium uppercase tracking-micro transition-colors',
        selected ? 'border-ink bg-raised text-ink' : 'border-hairline bg-surface text-muted',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
      {selected ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-1.5 bottom-0 h-0.5 rounded-full bg-accent"
        />
      ) : null}
    </button>
  );
}
