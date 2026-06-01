'use client';
import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Toggle({ checked, onChange, disabled, className }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-edge-strong',
        checked ? 'bg-ink-2' : 'bg-surface-4',
        disabled && 'opacity-40 pointer-events-none',
        className,
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 transform rounded-full bg-ink-1 shadow transition-transform duration-200',
          checked ? 'translate-x-4.5' : 'translate-x-0.5',
        )}
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  );
}
