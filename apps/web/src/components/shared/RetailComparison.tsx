import { ExternalLink, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface RetailComparisonProps {
  usedPrice: number;
  retailPrice: number | null;
  retailDiscount: number | null;
  retailVerdict: string | null;
  retailUrl: string | null;
}

const verdictStyles: Record<string, { bg: string; text: string }> = {
  'Oportunidade quente': { bg: 'bg-orange-500/15', text: 'text-orange-400' },
  'Boa oportunidade': { bg: 'bg-[#22c55e]/15', text: 'text-[#22c55e]' },
  'Margem apertada': { bg: 'bg-[#fbbf24]/15', text: 'text-[#fbbf24]' },
  'Não compensa — próximo do novo': { bg: 'bg-[#f87171]/15', text: 'text-[#f87171]' },
};

export function RetailComparison({ usedPrice, retailPrice, retailDiscount, retailVerdict, retailUrl }: RetailComparisonProps) {
  if (!retailPrice) return null;

  const style = retailVerdict ? verdictStyles[retailVerdict] ?? { bg: 'bg-white/[0.06]', text: 'text-[#f0f0f5]/60' } : { bg: 'bg-white/[0.06]', text: 'text-[#f0f0f5]/60' };
  const saving = retailPrice - usedPrice;

  return (
    <div className="rounded-xl bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center gap-2">
        <ShoppingBag className="h-4 w-4 text-[#60a5fa]" />
        <p className="text-xs font-medium text-[#f0f0f5]/60">Comparação com Novo (Mercado Livre)</p>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#f0f0f5]/40">Preço novo lacrado</p>
          <p className="font-mono text-lg font-bold text-[#f0f0f5]/70">{formatCurrency(retailPrice)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-[#f0f0f5]/40">Economia vs novo</p>
          <p className="font-mono text-lg font-bold text-[#22c55e]">{formatCurrency(saving)}</p>
          {retailDiscount !== null && (
            <span className="font-mono text-xs text-[#f0f0f5]/40">({retailDiscount.toFixed(1).replace('.', ',')}% abaixo)</span>
          )}
        </div>
      </div>
      {retailVerdict && (
        <div className="mt-3 flex items-center justify-between">
          <span className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${style.bg} ${style.text}`}>
            {retailVerdict}
          </span>
          {retailUrl && (
            <a href={retailUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-[#60a5fa] hover:underline"
              onClick={(e) => e.stopPropagation()}>
              <ExternalLink className="h-3 w-3" /> Ver no ML
            </a>
          )}
        </div>
      )}
    </div>
  );
}
