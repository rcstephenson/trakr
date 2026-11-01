import type { HTMLAttributes } from 'react';

/** Mono tabular numerals for any value the user logged or sees as data. */
export function Mono({ className = '', ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`num ${className}`} {...rest} />;
}
