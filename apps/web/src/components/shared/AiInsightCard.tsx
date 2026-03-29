import { Card } from '@/components/ui/Card';

interface AiInsightCardProps {
  emoji: string;
  title: string;
  text: string;
  actionLabel?: string;
  actionUrl?: string;
  onAction?: () => void;
}

export function AiInsightCard({ emoji, title, text, actionLabel, onAction }: AiInsightCardProps) {
  return (
    <Card className="flex gap-4">
      <span className="text-2xl shrink-0">{emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#f0f0f5]">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-[#f0f0f5]/60">{text}</p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="mt-2 text-xs font-medium text-[#22c55e] hover:underline"
          >
            {actionLabel} →
          </button>
        )}
      </div>
    </Card>
  );
}
