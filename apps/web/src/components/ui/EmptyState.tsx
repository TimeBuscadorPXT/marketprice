import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action, actionLabel, onAction, className, children }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="mb-4 rounded-xl bg-white/[0.04] p-4">
        <Icon className="h-8 w-8 text-[#f0f0f5]/30" />
      </div>
      <h3 className="text-lg font-semibold text-[#f0f0f5]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-[#f0f0f5]/50">{description}</p>
      )}
      {(action ?? (actionLabel && onAction)) && (
        <Button variant="primary" size="sm" className="mt-4" onClick={action?.onClick ?? onAction}>
          {action?.label ?? actionLabel}
        </Button>
      )}
      {children}
    </div>
  );
}
