import { ChevronDown } from 'lucide-react';

export interface InlineSelectProps {
  /** Accessible name of the control. */
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Text classes, so the control reads like the text it replaces (e.g. a heading). */
  className?: string;
}

/**
 * Text that opens a picker. The selected option's label is shown as ordinary inline, wrapping text
 * with a chevron; a transparent native select over it opens the platform picker (a wheel or sheet
 * on phones). A visible native select would cut long names off at one line.
 *
 * The select covers the nearest positioned ancestor, which the caller marks `relative` (e.g. a
 * table cell or list row), so even a short name gets a full-size touch target.
 */
export function InlineSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  className = '',
}: InlineSelectProps) {
  const text = options.find((o) => o.value === value)?.label ?? value;
  // Keep the chevron on the same line as the last word.
  const cut = text.lastIndexOf(' ') + 1;
  return (
    <span
      className={`rounded-[2px] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-ink ${className}`}
    >
      <span aria-hidden="true">
        {text.slice(0, cut)}
        <span className="whitespace-nowrap">
          {text.slice(cut)}
          {disabled ? null : (
            <ChevronDown
              size={14}
              className="ml-0.5 inline-block -translate-y-px align-middle text-muted"
            />
          )}
        </span>
      </span>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        // 16px: iOS zooms the page when a control under 16px gets focus, even an invisible one.
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none text-base opacity-0 disabled:cursor-default"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  );
}
