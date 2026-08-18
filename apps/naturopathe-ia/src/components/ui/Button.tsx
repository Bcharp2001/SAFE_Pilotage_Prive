'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-contrast hover:bg-accent-hover border border-transparent shadow-sm disabled:bg-line-strong disabled:text-subtle disabled:shadow-none',
  secondary:
    'bg-surface text-ink border border-line hover:border-line-strong hover:bg-sunken disabled:text-subtle',
  ghost: 'bg-transparent text-muted border border-transparent hover:bg-sunken hover:text-ink',
  danger:
    'bg-transparent text-caution border border-transparent hover:bg-caution-soft disabled:text-subtle',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className = '', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
});
