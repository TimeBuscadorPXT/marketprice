import { useQuery } from '@tanstack/react-query';
import { getVelocity, getMarketHealth, type VelocityData, type MarketHealthData } from '@/services/analytics';
import { formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

interface MarketInsightProps {
  modelId: string;
  modelName: string;
  region: string;
}

function buildInsights(
  velocity: VelocityData | undefined,
  health: MarketHealthData | undefined,
  modelName: string,
  region: string,
): Array<{ emoji: string; text: string; type: 'positive' | 'warning' | 'info' }> {
  const insights: Array<{ emoji: string; text: string; type: 'positive' | 'warning' | 'info' }> = [];

  if (velocity) {
    if (velocity.liquidityScore === 'alta') {
      insights.push({
        emoji: '\uD83D\uDD25',
        text: `O ${modelName} está vendendo rápido — em média ${velocity.avgDaysOnMarket} dias na sua região.${velocity.suggestedSellingPrice > 0 ? ` Preço bom para vender: ${formatCurrency(velocity.suggestedSellingPrice)}` : ''}`,
        type: 'positive',
      });
    } else if (velocity.liquidityScore === 'baixa') {
      insights.push({
        emoji: '\uD83D\uDC0C',
        text: `O ${modelName} está demorando para vender (média de ${velocity.avgDaysOnMarket} dias). Considere ajustar o preço.`,
        type: 'warning',
      });
    } else {
      insights.push({
        emoji: '\uD83D\uDCCA',
        text: `O ${modelName} tem velocidade de venda normal na sua região.${velocity.suggestedSellingPrice > 0 ? ` Preço sugerido: ${formatCurrency(velocity.suggestedSellingPrice)}` : ''}`,
        type: 'info',
      });
    }

    if (velocity.avgPriceDisappeared > 0 && velocity.avgPriceActive > 0) {
      const diff = velocity.avgPriceActive - velocity.avgPriceDisappeared;
      if (diff > 100) {
        insights.push({
          emoji: '\uD83D\uDCA1',
          text: `Os an\u00fancios que vendem pedem ${formatCurrency(velocity.avgPriceDisappeared)}, mas a m\u00e9dia ativa \u00e9 ${formatCurrency(velocity.avgPriceActive)}. Quem baixa o pre\u00e7o vende mais r\u00e1pido.`,
          type: 'info',
        });
      }
    }
  }

  if (health) {
    if (health.supplyDemandScore === 'pouca oferta') {
      insights.push({
        emoji: '\uD83D\uDD25',
        text: `Poucos ${modelName} dispon\u00edveis em ${region}. Boa oportunidade \u2014 menos concorr\u00eancia!`,
        type: 'positive',
      });
    } else if (health.supplyDemandScore === 'muita oferta') {
      insights.push({
        emoji: '\u26A0\uFE0F',
        text: `Muitos vendedores oferecendo ${modelName} em ${region}. Mercado competitivo \u2014 destaque seu an\u00fancio com boas fotos e pre\u00e7o justo.`,
        type: 'warning',
      });
    }

    if (health.priceDirection === 'caindo') {
      insights.push({
        emoji: '\uD83D\uDCC9',
        text: `Pre\u00e7os do ${modelName} est\u00e3o caindo. Bom momento para comprar estoque!`,
        type: 'positive',
      });
    } else if (health.priceDirection === 'subindo') {
      insights.push({
        emoji: '\uD83D\uDCC8',
        text: `Pre\u00e7os do ${modelName} est\u00e3o subindo. Se tem estoque, \u00e9 hora de vender!`,
        type: 'info',
      });
    }
  }

  return insights;
}

const typeStyles = {
  positive: 'border-[#22c55e]/20 bg-[#22c55e]/5',
  warning: 'border-[#fbbf24]/20 bg-[#fbbf24]/5',
  info: 'border-[#60a5fa]/20 bg-[#60a5fa]/5',
};

export function MarketInsight({ modelId, modelName, region }: MarketInsightProps) {
  const { data: velocity } = useQuery({
    queryKey: ['velocity', modelId, region],
    queryFn: () => getVelocity(modelId, region),
    enabled: !!modelId && !!region,
  });

  const { data: health } = useQuery({
    queryKey: ['market-health', modelId, region],
    queryFn: () => getMarketHealth(modelId, region),
    enabled: !!modelId && !!region,
  });

  const insights = buildInsights(velocity, health, modelName, region);

  if (!velocity && !health) return null;

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-[#f0f0f5]/70">
        Dicas do Mercado
      </h3>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={`rounded-lg border px-4 py-3 text-sm text-[#f0f0f5]/80 ${typeStyles[insight.type]}`}
          >
            <span className="mr-2">{insight.emoji}</span>
            {insight.text}
          </div>
        ))}
      </div>
    </Card>
  );
}
