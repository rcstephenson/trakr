import type { ReactNode } from 'react';

export interface SectionLabelProps {
  /** Position in the page, rendered zero-padded: `1` -> `01`. */
  index?: number | string;
  children: ReactNode;
  /** Optional trailing content (a count, a link), right-aligned after the rule. */
  action?: ReactNode;
  as?: 'h2' | 'h3' | 'p';
  className?: string;
}

/** Indexed mono micro-label with a hairline rule: `01 / THIS WEEK ———— `. */
export function SectionLabel({
  index,
  children,
  action,
  as: Tag = 'h2',
  className = '',
}: SectionLabelProps) {
  const idx = typeof index === 'number' ? String(index).padStart(2, '0') : index;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Tag className="micro m-0 flex shrink-0 items-center gap-1.5 font-medium">
        {idx !== undefined ? (
          <>
            <span className="text-accent">{idx}</span>
            <span aria-hidden="true">/</span>
          </>
        ) : null}
        <span>{children}</span>
      </Tag>
      <span aria-hidden="true" className="h-px flex-1 bg-hairline" />
      {action ? <div className="micro shrink-0">{action}</div> : null}
    </div>
  );
}
