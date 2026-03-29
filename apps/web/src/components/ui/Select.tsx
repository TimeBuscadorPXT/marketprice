import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, id, children, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = error && selectId ? `${selectId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-[#f0f0f5]/70">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-describedby={errorId}
          aria-invalid={error ? true : undefined}
          style={{ backgroundColor: '#1a1a24' }}
          className={cn(
            'w-full appearance-none rounded-lg border px-3 py-2 text-base sm:text-sm text-[#f0f0f5] outline-none transition-colors',
            'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")] bg-[length:16px] bg-[right_8px_center] bg-no-repeat pr-8',
            error
              ? 'border-[#f87171] focus:ring-1 focus:ring-[#f87171]'
              : 'border-white/[0.12] focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p id={errorId} className="text-xs text-[#f87171]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
