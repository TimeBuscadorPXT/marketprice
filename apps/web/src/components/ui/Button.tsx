import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

const variantStyles = {
  primary:
    'bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white hover:brightness-110 active:brightness-95',
  secondary:
    'bg-[#1a1a26] text-[#f0f0f5] border border-white/[0.06] hover:bg-[#22222e]',
  danger:
    'bg-[#f87171]/10 text-[#f87171] border border-[#f87171]/20 hover:bg-[#f87171]/20',
  ghost:
    'bg-transparent text-[#f0f0f5]/70 hover:text-[#f0f0f5] hover:bg-white/[0.04]',
} as const;

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2 min-h-[44px]',
  lg: 'px-6 py-2.5 text-base rounded-xl gap-2.5 min-h-[44px]',
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading && <Spinner size={size === 'lg' ? 'md' : 'sm'} />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
