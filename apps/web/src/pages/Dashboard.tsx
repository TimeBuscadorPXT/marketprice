import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Zap, Target, Activity, Flame } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/contexts/AuthContext';
import { getPriceSummary, getAvailableRegions, type PriceSummary } from '@/services/prices';
import { getCategories, type CategoryConfig } from '@/services/categories';
import { getVelocity, getMarketHealth, type VelocityData, type MarketHealthData } from '@/services/analytics';
import { getDeals, type Deal } from '@/services/deals';
import { getAiInsights, type AiInsight } from '@/services/ai';
import { formatCurrency } from '@/lib/utils';
import { PriceCard } from '@/components/shared/PriceCard';
import { AiInsightCard } from '@/components/shared/AiInsightCard';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { HelpTip } from '@/components/ui/HelpTip';

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [category, setCategory] = useState('phone');
  const [brand, setBrand] = useState('');
  const [region, setRegion] = useState('');

  const { data: regions } = useQuery<string[]>({
    queryKey: ['regions'],
    queryFn: getAvailableRegions,
  });

  const { data: categories } = useQuery<CategoryConfig[]>({
    queryKey: ['categories'],
    queryFn: getCategories,
  });
  const currentCategory = categories?.find(c => c.id === category);
  const categoryBrands = currentCategory?.brands ?? [];

  // Auto-select: user's region first, then first available region
  const effectiveRegion =
    region ||
    (user?.region && regions?.includes(user.region) ? user.region : '') ||
    (regions && regions.length > 0 ? regions[0] : '');

  const { data: summaries, isLoading, isError } = useQuery<PriceSummary[]>({
    queryKey: ['price-summary', effectiveRegion, brand],
    queryFn: () => getPriceSummary(effectiveRegion, brand || undefined),
    enabled: !!effectiveRegion,
  });

  // Fetch velocity for the top model (most listings)
  const topModel = summaries && summaries.length > 0
    ? summaries.reduce((a, b) => (a.count > b.count ? a : b))
    : null;

  const { data: velocity } = useQuery<VelocityData>({
    queryKey: ['velocity-dashboard', topModel?.modelId, effectiveRegion],
    queryFn: () => getVelocity(topModel!.modelId, effectiveRegion),
    enabled: !!topModel && !!effectiveRegion,
  });

  const { data: marketHealth } = useQuery<MarketHealthData>({
    queryKey: ['market-health-dashboard', topModel?.modelId, effectiveRegion],
    queryFn: () => getMarketHealth(topModel!.modelId, effectiveRegion),
    enabled: !!topModel && !!effectiveRegion,
  });

  const { data: dealsData } = useQuery({
    queryKey: ['deals-preview', effectiveRegion],
    queryFn: () => getDeals(effectiveRegion, { heat: 'hot', limit: 3 }),
    enabled: !!effectiveRegion,
  });

  const { data: aiInsights } = useQuery<AiInsight[]>({
    queryKey: ['ai-insights', effectiveRegion],
    queryFn: () => getAiInsights(effectiveRegion),
    enabled: !!effectiveRegion,
    staleTime: 300000, // 5 min cache
  });

  return (
    <div className="space-y-6">
      {/* AI Insights */}
      {aiInsights && aiInsights.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#f0f0f5]/50 uppercase tracking-wider">
            <span>🧠</span> O que a IA viu hoje
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {aiInsights.slice(0, 5).map((insight, i) => (
              <AiInsightCard
                key={i}
                emoji={insight.emoji}
                title={insight.title}
                text={insight.text}
                actionLabel={insight.actionType === 'buy' ? 'Ver oportunidades' : insight.actionType === 'sell' ? 'Ver analise' : undefined}
                onAction={insight.actionType === 'buy' ? () => navigate('/') : insight.actionType === 'sell' ? () => navigate('/analise') : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Select
            label="Categoria"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setBrand(''); }}
          >
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex-1">
          <Select
            label="Marca"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          >
            <option value="">Todas as marcas</option>
            {categoryBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex-1">
          <Select
            label="Região"
            value={region || effectiveRegion}
            onChange={(e) => setRegion(e.target.value)}
          >
            {regions?.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            {(!regions || regions.length === 0) && (
              <option value="">Carregando regiões...</option>
            )}
          </Select>
        </div>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="mb-2 h-8 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </Card>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <EmptyState
          icon={LayoutDashboard}
          title="Erro ao carregar dados"
          description="Não foi possível carregar os preços. Tente novamente."
        />
      )}

      {/* Empty */}
      {!isLoading && !isError && summaries && summaries.length === 0 && (
        <EmptyState
          icon={LayoutDashboard}
          title="Nenhum dado encontrado"
          description="Comece a coletar dados! Abra o Facebook Marketplace com a extensão ativa e navegue pelos anúncios. Os preços serão capturados automaticamente."
        />
      )}

      {/* Price cards grid */}
      {!isLoading && summaries && summaries.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaries.map((summary) => (
            <PriceCard
              key={summary.modelId}
              brand={summary.brand}
              modelName={`${summary.name} ${summary.variant}`}
              averagePrice={summary.averagePrice}
              minPrice={summary.minPrice}
              maxPrice={summary.maxPrice}
              count={summary.count}
              trend={0}
              onClick={() =>
                navigate(`/analise?modelId=${summary.modelId}&region=${effectiveRegion}`)
              }
            />
          ))}
        </div>
      )}

      {/* Market Vision */}
      {topModel && (velocity || marketHealth) && (
        <div>
          <h2 className="mb-4 text-sm font-semibold text-[#f0f0f5]/50 uppercase tracking-wider">
            Vis\u00e3o de Mercado
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {velocity && (
            <Card>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#22c55e]/10">
                  <Zap className="h-5 w-5 text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#f0f0f5]/50">
                    Liquidez <HelpTip text="Quão rápido esse modelo vende. Alta = vende em poucos dias. Baixa = demora semanas." />
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-bold text-[#f0f0f5]">
                    {velocity.avgDaysOnMarket} dias
                  </p>
                  <p className="text-xs text-[#f0f0f5]/40">
                    {velocity.liquidityScore === 'alta' ? 'Vende rápido' : velocity.liquidityScore === 'média' ? 'Velocidade normal' : 'Demora para vender'}
                  </p>
                </div>
              </div>
            </Card>
            )}

            {velocity && (
            <Card>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#60a5fa]/10">
                  <Target className="h-5 w-5 text-[#60a5fa]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#f0f0f5]/50">
                    Preço que Vende <HelpTip text="Preço médio dos anúncios que desapareceram (provavelmente vendidos). É o preço REAL, não o que as pessoas pedem." />
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-bold text-[#22c55e]">
                    {velocity.suggestedSellingPrice > 0 ? formatCurrency(velocity.suggestedSellingPrice) : '—'}
                  </p>
                  <p className="text-xs text-[#f0f0f5]/40">
                    {velocity.disappearedCount} vendidos recentemente
                  </p>
                </div>
              </div>
            </Card>
            )}

            {marketHealth && (
            <Card>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fbbf24]/10">
                  <Activity className="h-5 w-5 text-[#fbbf24]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#f0f0f5]/50">
                    Saúde do Mercado
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-[#f0f0f5] capitalize">
                    {marketHealth.supplyDemandScore}
                  </p>
                  <p className="text-xs text-[#f0f0f5]/40">
                    {marketHealth.totalActive} ativos · {marketHealth.newLast7d} novos esta semana
                  </p>
                </div>
              </div>
            </Card>
            )}
          </div>
        </div>
      )}

      {/* Top Deals Preview */}
      {dealsData && dealsData.deals.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#f0f0f5]/50 uppercase tracking-wider">
              {'\u{1F525}'} Top Oportunidades
            </h2>
            <button
              onClick={() => navigate('/')}
              className="text-xs font-medium text-[#22c55e] hover:underline"
            >
              Ver todas →
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {dealsData.deals.slice(0, 3).map((deal: Deal) => (
              <Card key={deal.id} hover className="cursor-pointer" onClick={() => navigate(`/analise?modelId=${deal.model.id}&region=${effectiveRegion}`)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="mb-1 inline-block rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#f0f0f5]/40">
                      {deal.model.brand}
                    </span>
                    <h3 className="text-sm font-medium text-[#f0f0f5]/80">
                      {deal.model.name} {deal.model.variant}
                    </h3>
                    <p className="mt-1 font-mono text-xl font-bold text-[#22c55e]">
                      {formatCurrency(deal.price)}
                    </p>
                    <p className="text-xs text-[#f0f0f5]/40 line-through">
                      {formatCurrency(deal.averagePrice)}
                    </p>
                  </div>
                  <Badge variant="success">-{deal.discount.toFixed(0)}%</Badge>
                </div>
                <p className="mt-2 text-xs text-[#f0f0f5]/50">{deal.reason}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
