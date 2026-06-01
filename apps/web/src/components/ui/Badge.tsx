import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'outline' | 'premium';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-surface-3 text-ink-2',
  outline: 'border border-edge text-ink-3',
  premium: 'bg-surface-3 text-ink-1 border border-edge-strong',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-medium tracking-wide uppercase',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
