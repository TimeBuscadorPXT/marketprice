import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

const variantStyles = {
  success: 'bg-[#22c55e]/10 text-[#22c55e]',
  danger: 'bg-[#f87171]/10 text-[#f87171]',
  warning: 'bg-[#fbbf24]/10 text-[#fbbf24]',
  neutral: 'bg-white/[0.06] text-[#f0f0f5]/60',
} as const;

interface BadgeProps {
  variant?: keyof typeof variantStyles;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
