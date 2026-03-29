import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Hash,
  ArrowUpDown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getPriceAnalysis, type PriceAnalysis as PriceAnalysisType } from '@/services/prices';
import { getVelocity, getSellers, getMarketHealth, getListingQuality, type VelocityData, type SellersResponse, type MarketHealthData, type ListingQualityData } from '@/services/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDateShort, cn } from '@/lib/utils';
import { ModelSelector } from '@/components/shared/ModelSelector';
import { ListingDetailModal } from '@/components/shared/ListingDetailModal';
import { TrendIndicator } from '@/components/shared/TrendIndicator';
import { MarketInsight } from '@/components/shared/MarketInsight';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { HelpTip } from '@/components/ui/HelpTip';
import { getModelSummary, type ModelSummary } from '@/services/ai';
import api from '@/services/api';

const PERIODS = [
  { label: '7d', value: 7 },
  { label: '15d', value: 15 },
  { label: '30d', value: 30 },
  { label: '60d', value: 60 },
  { label: '90d', value: 90 },
] as const;

interface Listing {
  id: string;
  title: string;
  price: number;
  region: string;
  capturedAt: string;
  fbUrl: string;
  condition: string | null;
  imageUrl: string | null;
  isOutlier: boolean;
  isDeepCaptured?: boolean;
  fullDescription?: string | null;
  photoUrls?: string[];
  sellerName?: string | null;
  sellerProfileUrl?: string | null;
  sellerJoinDate?: string | null;
  sellerLocation?: string | null;
  model: { id: string; brand: string; name: string; variant: string };
  healthScore?: number | null;
  flagLevel?: string | null;
  redFlags?: string[];
  greenFlags?: string[];
}

interface ListingsResponse {
  listings: Listing[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#1a1a26] px-3 py-2 shadow-xl">
      <p className="text-xs text-[#f0f0f5]/50">{label}</p>
      <p className="font-mono text-sm font-bold text-[#22c55e]">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

export default function Analysis() {
  useDocumentTitle('Análise de Preços');
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [modelId, setModelId] = useState(searchParams.get('modelId') ?? '');
  const [region, setRegion] = useState(searchParams.get('region') ?? user?.region ?? '');
  const [period, setPeriod] = useState(30);
  const [listingPage, setListingPage] = useState(1);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const canQuery = !!modelId && !!region;

  const {
    data: analysis,
    isLoading,
    isError,
  } = useQuery<PriceAnalysisType>({
    queryKey: ['price-analysis', modelId, region, period],
    queryFn: () => getPriceAnalysis(modelId, region, period),
    enabled: canQuery,
  });

  const { data: listingsData, isLoading: listingsLoading } = useQuery<ListingsResponse>({
    queryKey: ['listings', modelId, region, listingPage],
    queryFn: async () => {
      const { data } = await api.get('/listings', {
        params: { modelId, region, page: listingPage, limit: 10 },
      });
      return data.data;
    },
    enabled: canQuery,
  });

  const { data: velocity } = useQuery<VelocityData>({
    queryKey: ['velocity', modelId, region],
    queryFn: () => getVelocity(modelId, region),
    enabled: canQuery,
  });

  const { data: sellersData } = useQuery<SellersResponse>({
    queryKey: ['sellers', region],
    queryFn: () => getSellers(region),
    enabled: !!region,
  });

  const { data: marketHealth } = useQuery<MarketHealthData>({
    queryKey: ['market-health', modelId, region],
    queryFn: () => getMarketHealth(modelId, region),
    enabled: canQuery,
  });

  const { data: quality } = useQuery<ListingQualityData>({
    queryKey: ['listing-quality', modelId, region, period],
    queryFn: () => getListingQuality(modelId, region, period),
    enabled: canQuery,
  });

  const { data: modelSummary } = useQuery<ModelSummary>({
    queryKey: ['model-summary', modelId, region],
    queryFn: () => getModelSummary(modelId, region),
    enabled: canQuery,
    staleTime: 300000,
  });

  // Get model name for MarketInsight
  const selectedModelName = listingsData?.listings?.[0]?.model
    ? `${listingsData.listings[0].model.name} ${listingsData.listings[0].model.variant}`
    : '';

  // Build distribution histogram from priceHistory
  const distributionData = useMemo(() => {
    if (!analysis?.priceHistory?.length) return [];
    const prices = analysis.priceHistory.map((p) => p.avgPrice);
    const min = Math.floor(Math.min(...prices) / 200) * 200;
    const max = Math.ceil(Math.max(...prices) / 200) * 200;
    const buckets: Record<string, number> = {};
    for (let b = min; b < max; b += 200) {
      buckets[`${b}-${b + 200}`] = 0;
    }
    prices.forEach((p) => {
      const bucketStart = Math.floor(p / 200) * 200;
      const key = `${bucketStart}-${bucketStart + 200}`;
      if (buckets[key] !== undefined) {
        buckets[key]++;
      }
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [analysis]);

  const chartData = useMemo(() => {
    if (!analysis?.priceHistory) return [];
    return analysis.priceHistory.map((p) => ({
      date: formatDateShort(p.date),
      price: p.avgPrice,
      count: p.count,
    }));
  }, [analysis]);

  const stats = useMemo(() => {
    if (!analysis) return [];
    return [
      { label: 'Média', value: formatCurrency(analysis.average), trend: analysis.trend, helpTip: 'Preço médio dos anúncios nesta região.' },
      { label: 'Mediana', value: formatCurrency(analysis.median), trend: null, helpTip: 'Valor do meio — metade dos anúncios está acima, metade abaixo.' },
      { label: 'Mínimo', value: formatCurrency(analysis.min), trend: null, helpTip: null },
      { label: 'Máximo', value: formatCurrency(analysis.max), trend: null, helpTip: null },
      {
        label: 'Faixa de Preço',
        value: `${formatCurrency(analysis.percentile25)} – ${formatCurrency(analysis.percentile75)}`,
        trend: null,
        helpTip: 'Onde 50% dos anúncios se concentram. Preços fora disso são incomuns.',
      },
      { label: 'Total de Anúncios', value: analysis.count.toString(), trend: null, helpTip: null },
    ];
  }, [analysis]);

  const listings = listingsData?.listings ?? [];
  const listingsMeta = listingsData?.pagination;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1">
          <ModelSelector value={modelId} onChange={setModelId} label="Modelo" />
        </div>
        <div className="w-full md:w-40">
          <Input
            label="Região"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Ex: SP"
          />
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* Loading state */}
      {isLoading && canQuery && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <Skeleton className="mb-2 h-3 w-1/2" />
                <Skeleton className="mb-1 h-7 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </Card>
            ))}
          </div>
          <Card>
            <Skeleton className="h-72 w-full" />
          </Card>
        </div>
      )}

      {/* Empty / Error */}
      {!canQuery && !isLoading && (
        <EmptyState
          icon={BarChart3}
          title="Selecione um modelo e região"
          description="Escolha um modelo de celular e a região para ver a análise de preços."
        />
      )}

      {isError && (
        <EmptyState
          icon={BarChart3}
          title="Erro ao carregar análise"
          description="Não foi possível carregar os dados. Tente novamente."
        />
      )}

      {/* Stats grid */}
      {analysis && !isLoading && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <p className="text-xs font-medium text-[#f0f0f5]/50">{stat.label} {stat.helpTip && <HelpTip text={stat.helpTip} />}</p>
                <p className="mt-1 font-mono text-xl font-bold text-[#f0f0f5]">
                  {stat.value}
                </p>
                {stat.trend !== null && (
                  <TrendIndicator value={stat.trend} size="sm" className="mt-1" />
                )}
              </Card>
            ))}
          </div>

          {/* AI Model Summary */}
          {modelSummary && modelSummary.summary && (
            <Card className="border-l-2 border-l-[#22c55e]">
              <div className="flex gap-3">
                <span className="text-lg shrink-0">🧠</span>
                <p className="text-sm leading-relaxed text-[#f0f0f5]/70">{modelSummary.summary}</p>
              </div>
            </Card>
          )}

          {/* Market Insights */}
          {canQuery && (
            <MarketInsight modelId={modelId} modelName={selectedModelName || 'este modelo'} region={region} />
          )}

          {/* Velocity Section */}
          {velocity && (
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]/70">
                Velocidade de Venda <HelpTip text="Qu\u00e3o r\u00e1pido esse modelo vende na sua regi\u00e3o. Baseado em an\u00fancios que desapareceram." />
              </h3>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-[#f0f0f5]/50">Vende em m\u00e9dia em</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#f0f0f5]">
                    {velocity.avgDaysOnMarket} dias
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#f0f0f5]/50">
                    Liquidez <HelpTip text="Alta = vende em poucos dias. Baixa = demora semanas." />
                  </p>
                  <div className="mt-1">
                    <Badge variant={velocity.liquidityScore === 'alta' ? 'success' : velocity.liquidityScore === 'm\u00e9dia' ? 'warning' : 'danger'}>
                      {velocity.liquidityScore.charAt(0).toUpperCase() + velocity.liquidityScore.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#f0f0f5]/50">
                    Pre\u00e7o que vende <HelpTip text="Pre\u00e7o m\u00e9dio dos an\u00fancios que desapareceram (provavelmente vendidos). \u00c9 o pre\u00e7o REAL de venda." />
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold text-[#22c55e]">
                    {velocity.suggestedSellingPrice > 0 ? formatCurrency(velocity.suggestedSellingPrice) : '\u2014'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#f0f0f5]/50">Pre\u00e7o pedido (ativos)</p>
                  <p className="mt-1 font-mono text-xl font-bold text-[#f0f0f5]/70">
                    {velocity.avgPriceActive > 0 ? formatCurrency(velocity.avgPriceActive) : '\u2014'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Listing Quality Section */}
          {quality && (
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]/70">
                Qualidade dos Anúncios <HelpTip text="Analisa fotos, descrições e condição dos anúncios. Anúncios com mais fotos e descrição vendem mais rápido." />
              </h3>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-[#f0f0f5]/50">Média de fotos</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#f0f0f5]">
                    {quality.avgPhotos}
                  </p>
                  <p className="text-xs text-[#f0f0f5]/40">por anúncio</p>
                </div>
                <div>
                  <p className="text-xs text-[#f0f0f5]/50">Com descrição completa</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#f0f0f5]">
                    {quality.withDescriptionPercent}%
                  </p>
                  <p className="text-xs text-[#f0f0f5]/40">de {quality.total} anúncios</p>
                </div>
                <div>
                  <p className="text-xs text-[#f0f0f5]/50">Captura profunda</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#f0f0f5]">
                    {listings.length > 0
                      ? Math.round((listings.filter(l => l.isDeepCaptured).length / listings.length) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-[#f0f0f5]/40">
                    Abra anúncios individualmente para mais detalhes
                  </p>
                </div>
                <div className="col-span-2 lg:col-span-1">
                  <p className="mb-2 text-xs text-[#f0f0f5]/50">Condição dos anúncios</p>
                  <div className="space-y-1.5">
                    {quality.conditionBreakdown.map((item) => (
                      <div key={item.condition} className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-[#22c55e]"
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                        <span className="w-20 text-right text-xs text-[#f0f0f5]/60 truncate" title={item.condition}>
                          {item.condition}
                        </span>
                        <span className="w-10 text-right font-mono text-xs text-[#f0f0f5]/40">
                          {item.percent}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Competition Section */}
          {sellersData && (
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]/70">
                Concorrência na Região
              </h3>
              {sellersData.sellers.length > 0 ? (
                <>
                  <p className="mb-3 text-xs text-[#f0f0f5]/40">
                    {sellersData.sellers.length} vendedores ativos em {region}
                    {sellersData.sellers.length > 15 && ' — mercado muito competitivo'}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-left text-xs text-[#f0f0f5]/50">
                          <th className="pb-2 pr-4 font-medium">Vendedor</th>
                          <th className="pb-2 pr-4 font-medium">Anúncios</th>
                          <th className="pb-2 pr-4 font-medium">Preço Médio</th>
                          <th className="hidden pb-2 font-medium sm:table-cell">Modelos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {sellersData.sellers.slice(0, 5).map((seller) => (
                          <tr key={seller.name} className="text-[#f0f0f5]/80">
                            <td className="py-2 pr-4">{seller.name}</td>
                            <td className="py-2 pr-4 font-mono">{seller.listingCount}</td>
                            <td className="py-2 pr-4 font-mono text-[#22c55e]">{formatCurrency(seller.avgPrice)}</td>
                            <td className="hidden py-2 text-xs text-[#f0f0f5]/40 sm:table-cell">
                              {seller.models.slice(0, 3).join(', ')}
                              {seller.models.length > 3 && ` +${seller.models.length - 3}`}
                            </td>
                      </tr>
                    ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#f0f0f5]/30">
                  Nenhum vendedor identificado ainda. Abra anúncios no Marketplace para capturar nomes de vendedores.
                </p>
              )}
            </Card>
          )}

          {/* Price history chart */}
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]/70">
              Hist\u00f3rico de Pre\u00e7os
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'rgba(240,240,245,0.4)', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(240,240,245,0.4)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `R$${(v / 1000).toFixed(1)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#greenGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Distribution histogram */}
          {distributionData.length > 0 && (
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]/70">
                Distribuição de Preços (faixas de R$200)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.06)"
                    />
                    <XAxis
                      dataKey="range"
                      tick={{ fill: 'rgba(240,240,245,0.4)', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                      tickLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fill: 'rgba(240,240,245,0.4)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a26',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 8,
                        color: '#f0f0f5',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Listings table */}
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]/70">
              Anúncios Encontrados
            </h3>

            {listingsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#f0f0f5]/40">
                Nenhum anúncio encontrado.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-left text-xs text-[#f0f0f5]/50">
                        <th className="pb-3 pr-4 font-medium">Titulo</th>
                        <th className="pb-3 pr-4 font-medium">Saude</th>
                        <th className="pb-3 pr-4 font-medium">Preco</th>
                        <th className="hidden pb-3 pr-4 font-medium md:table-cell">
                          Região
                        </th>
                        <th className="hidden pb-3 pr-4 font-medium sm:table-cell">
                          Data
                        </th>
                        <th className="pb-3 font-medium">Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {listings.map((listing) => (
                        <tr key={listing.id} className="text-[#f0f0f5]/80 cursor-pointer hover:bg-white/[0.02]" onClick={() => setSelectedListing(listing)}>
                          <td className="max-w-[200px] truncate py-3 pr-4">
                            {listing.title}
                            {listing.isDeepCaptured && (
                              <span className="ml-1.5 inline-flex items-center rounded bg-[#22c55e]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#22c55e]" title="Captura profunda — descrição completa e todas as fotos">
                                📸 Completo
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            {listing.flagLevel === 'clean' && <span title="Anuncio limpo" className="text-[#22c55e]">🟢</span>}
                            {listing.flagLevel === 'warning' && <span title={listing.redFlags?.join(', ') || 'Atencao'} className="text-[#fbbf24]">🟡</span>}
                            {listing.flagLevel === 'danger' && <span title={listing.redFlags?.join(', ') || 'Problema'} className="text-[#f87171]">🔴</span>}
                            {!listing.flagLevel && <span className="text-[#f0f0f5]/20">—</span>}
                          </td>
                          <td className="whitespace-nowrap py-3 pr-4 font-mono font-medium text-[#22c55e]">
                            {formatCurrency(Number(listing.price))}
                          </td>
                          <td className="hidden py-3 pr-4 md:table-cell">
                            {listing.region}
                          </td>
                          <td className="hidden whitespace-nowrap py-3 pr-4 sm:table-cell">
                            {formatDateShort(listing.capturedAt)}
                          </td>
                          <td className="py-3">
                            <a
                              href={listing.fbUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#22c55e] hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Ver</span>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {listingsMeta && listingsMeta.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
                    <span className="text-xs text-[#f0f0f5]/40">
                      Página {listingsMeta.page} de {listingsMeta.totalPages} ({listingsMeta.total} resultados)
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={listingsMeta.page <= 1}
                        onClick={() => setListingPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={listingsMeta.page >= listingsMeta.totalPages}
                        onClick={() => setListingPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      )}

      <ListingDetailModal listing={selectedListing} onClose={() => setSelectedListing(null)} />
    </div>
  );
}
