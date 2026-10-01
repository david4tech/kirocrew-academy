import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-kiro-600 text-white hover:bg-kiro-500 focus-visible:bg-kiro-500 disabled:bg-kiro-800',
  secondary:
    'bg-bg-panel text-text border border-border-strong hover:border-kiro-400 disabled:opacity-50',
  ghost: 'bg-transparent text-text-muted hover:text-text hover:bg-bg-panel disabled:opacity-50',
  danger: 'bg-danger-bg text-danger border border-danger hover:bg-danger/10 disabled:opacity-50',
};

export function Button({
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    />
  );
}
