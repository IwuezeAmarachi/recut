'use client';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-ink-1 text-bg hover:bg-white active:bg-ink-1 disabled:bg-surface-3 disabled:text-ink-3',
  ghost:
    'bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink-1 active:bg-surface-3 disabled:text-ink-3',
  outline:
    'bg-transparent border border-edge text-ink-1 hover:bg-surface-2 active:bg-surface-3 disabled:text-ink-3 disabled:border-edge-subtle',
  danger:
    'bg-transparent text-red-400 hover:bg-red-400/10 active:bg-red-400/20 disabled:text-ink-3',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  md: 'h-8 px-3 text-sm gap-2 rounded-md',
  lg: 'h-9 px-4 text-sm gap-2 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', size = 'md', loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors duration-100 select-none',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-edge-strong',
        'disabled:pointer-events-none',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        children
      )}
    </button>
  ),
);
Button.displayName = 'Button';
