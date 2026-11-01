import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'border border-primary bg-primary text-on-primary',
  secondary: 'border border-hairline bg-raised text-ink',
  ghost: 'border border-transparent bg-transparent text-accent',
  danger: 'border border-danger bg-raised text-danger',
};

/** Class string shared with links styled as buttons. */
export function buttonClass(variant: ButtonVariant = 'primary', fullWidth = false): string {
  return [
    'inline-flex min-h-touch min-w-touch select-none items-center justify-center gap-2 rounded-btn px-4',
    'text-sm font-semibold tracking-tight transition-[opacity,transform] active:translate-y-px active:opacity-80',
    'disabled:opacity-40',
    variants[variant],
    fullWidth ? 'w-full' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function Button({
  variant = 'primary',
  fullWidth,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={`${buttonClass(variant, fullWidth)} ${className}`} {...rest} />
  );
}
