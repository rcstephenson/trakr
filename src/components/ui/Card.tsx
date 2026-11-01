import type { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `raised` lifts the card one step (white on Paper, lighter graphite on Graphite). */
  tone?: 'surface' | 'raised';
}

export function Card({ tone = 'surface', className = '', ...rest }: CardProps) {
  return (
    <div
      className={`rounded-card border border-hairline p-4 ${
        tone === 'raised' ? 'bg-raised' : 'bg-surface'
      } ${className}`}
      {...rest}
    />
  );
}
