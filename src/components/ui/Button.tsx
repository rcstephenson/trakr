import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent',
  secondary: 'border border-border bg-surface text-text',
  ghost: 'bg-transparent text-accent',
  danger: 'bg-danger text-on-accent',
};

export function Button({
  variant = 'primary',
  fullWidth,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-btn px-4',
        'text-sm font-semibold transition-opacity active:opacity-80 disabled:opacity-40',
        variants[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    />
  );
}
