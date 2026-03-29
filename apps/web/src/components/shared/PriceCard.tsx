import { type KeyboardEvent } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { HelpTip } from '@/components/ui/HelpTip';

interface PriceCardProps {
  modelName: string;
  brand?: string;
  averagePrice: number;
  minPrice?: number;
  maxPrice?: number;
  count: number;
  trend: number;
  onClick?: () => void;
}

export function PriceCard({
  modelName,
  brand,
  averagePrice,
  minPrice,
  maxPrice,
  count,
  trend,
  onClick,
}: PriceCardProps) {
  const isClickable = !!onClick;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  // Inverted colors: green = price dropping (good to buy), red = price rising
  const trendIsDown = trend < 0;
  const trendIsUp = trend > 0;
  const TrendIcon = trendIsUp ? TrendingUp : trendIsDown ? TrendingDown : Minus;

  return (
    <Card
      hover
      className={isClickable ? 'cursor-pointer' : undefined}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      aria-label={`${modelName}: ${formatCurrency(averagePrice)}, ${count} ${count === 1 ? 'anúncio' : 'anúncios'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {brand && (
            <span className="mb-1 inline-block rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#f0f0f5]/40">
              {brand}
            </span>
          )}
          <h3 className="text-sm font-medium leading-tight text-[#f0f0f5]/80">{modelName}</h3>
          <p className="mt-2 font-mono text-2xl font-bold text-[#f0f0f5]">
            {formatCurrency(averagePrice)}
          </p>
          {minPrice != null && maxPrice != null && (
            <p className="mt-0.5 font-mono text-xs text-[#f0f0f5]/40">
              {formatCurrency(minPrice)} – {formatCurrency(maxPrice)}
            </p>
          )}
          <p className="mt-1.5 text-xs text-[#f0f0f5]/50">
            {count} {count === 1 ? 'anúncio' : 'anúncios'}
          </p>
        </div>
        {trend !== 0 && (
          <div
            className="flex flex-col items-center gap-0.5"
            title={trendIsDown
              ? 'Preço caindo — bom momento para comprar'
              : 'Preço subindo — cuidado ao comprar'}
          >
            <TrendIcon
              className={`h-4 w-4 ${trendIsDown ? 'text-[#22c55e]' : 'text-[#f87171]'}`}
            />
            <span
              className={`text-[10px] font-medium ${trendIsDown ? 'text-[#22c55e]' : 'text-[#f87171]'}`}
            >
              {Math.abs(trend).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
