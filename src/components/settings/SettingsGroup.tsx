import type { ReactNode } from 'react';
import { SectionLabel } from '../ui';

/** Indexed micro-label above a hairline-ruled ledger of rows. */
export function SettingsGroup({
  title,
  index,
  children,
}: {
  title: string;
  index?: number;
  children: ReactNode;
}) {
  return (
    <section className="px-gutter" aria-label={title}>
      <SectionLabel index={index} className="mb-2">
        {title}
      </SectionLabel>
      <div className="divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface">
        {children}
      </div>
    </section>
  );
}

export function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-touch items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        {description ? <div className="text-xs text-muted">{description}</div> : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex divide-x divide-hairline overflow-hidden rounded-btn border border-hairline bg-bg"
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={`min-h-touch min-w-[56px] px-3 font-mono text-xs font-medium uppercase tracking-micro transition-colors ${
              selected ? 'bg-primary text-on-primary' : 'text-muted'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
