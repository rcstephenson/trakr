import type { ReactNode } from 'react';

/** iOS-style inset group: optional small heading above a rounded card of rows. */
export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-gutter">
      <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted">{title}</h2>
      <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-card">
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
    <div className="flex min-h-touch items-center justify-between gap-3 px-4 py-2">
      <div className="min-w-0">
        <div className="text-sm text-text">{label}</div>
        {description ? <div className="text-xs text-muted">{description}</div> : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}

export function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-touch min-w-touch items-center justify-center"
    >
      <span
        className={`relative inline-block h-7 w-12 rounded-full transition-colors ${
          checked ? 'bg-accent' : 'bg-border'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-surface shadow-card transition-transform motion-reduce:transition-none ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
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
      className="inline-flex rounded-btn border border-border bg-bg p-0.5"
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
            className={`min-h-touch min-w-[56px] rounded-[10px] px-3 text-sm font-medium transition-colors ${
              selected ? 'bg-accent text-on-accent' : 'text-muted'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
