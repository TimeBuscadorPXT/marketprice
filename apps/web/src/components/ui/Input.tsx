import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = error && inputId ? `${inputId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[#f0f0f5]/70">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-describedby={errorId}
          aria-invalid={error ? true : undefined}
          className={cn(
            'w-full rounded-lg border bg-[#12121a] px-3 py-2 text-base sm:text-sm text-[#f0f0f5] placeholder-[#f0f0f5]/30 outline-none transition-colors',
            error
              ? 'border-[#f87171] focus:ring-1 focus:ring-[#f87171]'
              : 'border-[#27272a] focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]',
            className,
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs text-[#f87171]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
