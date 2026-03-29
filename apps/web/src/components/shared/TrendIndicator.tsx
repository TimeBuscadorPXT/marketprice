import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/utils';

const sizeStyles = {
  sm: 'text-xs gap-0.5',
  md: 'text-sm gap-1',
} as const;

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
} as const;

interface TrendIndicatorProps {
  value: number;
  size?: keyof typeof sizeStyles;
  className?: string;
}

export function TrendIndicator({ value, size = 'md', className }: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium',
        sizeStyles[size],
        isPositive && 'text-[#22c55e]',
        isNegative && 'text-[#f87171]',
        !isPositive && !isNegative && 'text-[#f0f0f5]/40',
        className,
      )}
    >
      <Icon className={iconSizes[size]} />
      {formatPercent(value)}
    </span>
  );
}
