import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  Calculator as CalcIcon,
  DollarSign,
  TrendingUp,
  Package,
  Truck,
} from 'lucide-react';
import { getPriceAnalysis } from '@/services/prices';
import { getVelocity, type VelocityData } from '@/services/analytics';
import { getRetailComparison, type RetailPriceComparison } from '@/services/retail-prices';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import { ModelSelector } from '@/components/shared/ModelSelector';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { HelpTip } from '@/components/ui/HelpTip';

interface CalcState {
  modelId: string;
  region: string;
  purchase: number;
  shippingIn: number;
  shippingOut: number;
  packaging: number;
  otherCosts: number;
  sellingPrice: number;
  marketplaceFee: number;
  quantity: number;
}

interface CalcResult {
  totalCost: number;
  netRevenue: number;
  profit: number;
  marginPercent: number;
  roi: number;
  recommendation: string;
  recommendationColor: string;
}

function getRecommendation(margin: number): { label: string; color: string } {
  if (margin >= 30) return { label: 'EXCELENTE NEGÓCIO', color: 'bg-[#22c55e]' };
  if (margin >= 15) return { label: 'BOM NEGÓCIO', color: 'bg-lime-500' };
  if (margin >= 5) return { label: 'MARGEM APERTADA', color: 'bg-[#fbbf24]' };
  if (margin >= 0) return { label: 'NÃO COMPENSA', color: 'bg-orange-500' };
  return { label: 'PREJUÍZO', color: 'bg-[#f87171]' };
}

export default function Calculator() {
  useDocumentTitle('Calculadora de Lucro');
  const { user } = useAuth();

  const [state, setState] = useState<CalcState>({
    modelId: '',
    region: user?.region ?? '',
    purchase: 0,
    shippingIn: 0,
    shippingOut: 0,
    packaging: 0,
    otherCosts: 0,
    sellingPrice: 0,
    marketplaceFee: 10,
    quantity: 1,
  });

  function update<K extends keyof CalcState>(key: K, value: CalcState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  // Fetch market average when model+region change
  const { data: analysis } = useQuery({
    queryKey: ['price-analysis-calc', state.modelId, state.region],
    queryFn: () => getPriceAnalysis(state.modelId, state.region, 30),
    enabled: !!state.modelId && !!state.region,
  });

  const { data: velocity } = useQuery<VelocityData>({
    queryKey: ['velocity-calc', state.modelId, state.region],
    queryFn: () => getVelocity(state.modelId, state.region),
    enabled: !!state.modelId && !!state.region,
  });

  const { data: retailData } = useQuery<RetailPriceComparison>({
    queryKey: ['retail-calc', state.modelId, state.sellingPrice],
    queryFn: () => getRetailComparison(state.modelId, state.sellingPrice),
    enabled: !!state.modelId && state.sellingPrice > 0,
  });

  // Auto-fill selling price from suggested price or market average
  useEffect(() => {
    if (state.sellingPrice === 0) {
      const suggested = velocity?.suggestedSellingPrice;
      if (suggested && suggested > 0) {
        setState((prev) => ({ ...prev, sellingPrice: Math.round(suggested) }));
      } else if (analysis?.average) {
        setState((prev) => ({ ...prev, sellingPrice: Math.round(analysis.average) }));
      }
    }
  }, [analysis?.average, velocity?.suggestedSellingPrice]);

  // Calculate results in real time
  const result = useMemo<CalcResult | null>(() => {
    const { purchase, shippingIn, shippingOut, packaging, otherCosts, sellingPrice, marketplaceFee } = state;

    if (purchase <= 0 || sellingPrice <= 0) return null;

    const totalCost = purchase + shippingIn + packaging + otherCosts;
    const feeAmount = sellingPrice * (marketplaceFee / 100);
    const netRevenue = sellingPrice - shippingOut - feeAmount;
    const profit = netRevenue - totalCost;
    const marginPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    const rec = getRecommendation(marginPercent);

    return {
      totalCost,
      netRevenue,
      profit,
      marginPercent,
      roi,
      recommendation: rec.label,
      recommendationColor: rec.color,
    };
  }, [state]);

  const quantity = Math.max(1, state.quantity);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Form - Left side */}
      <div className="w-full space-y-6 lg:w-2/5">
        {/* Model & Region */}
        <Card>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#f0f0f5]/70">
            <Package className="h-4 w-4" />
            Modelo
          </h3>
          <div className="space-y-4">
            <ModelSelector
              value={state.modelId}
              onChange={(v) => update('modelId', v)}
            />
            <Input
              label="Região"
              value={state.region}
              onChange={(e) => update('region', e.target.value)}
              placeholder="Ex: SP"
            />
            {analysis && (
              <p className="text-xs text-[#f0f0f5]/40">
                M\u00e9dia de mercado: <span className="font-mono text-[#22c55e]">{formatCurrency(analysis.average)}</span>
              </p>
            )}
            {velocity && (
              <div className="space-y-1">
                {velocity.suggestedSellingPrice > 0 && (
                  <p className="text-xs text-[#f0f0f5]/40">
                    Pre\u00e7o que vende:{' '}
                    <span className="font-mono text-[#22c55e]">
                      {formatCurrency(velocity.suggestedSellingPrice)}
                    </span>
                    {' '}<HelpTip text="Pre\u00e7o m\u00e9dio dos an\u00fancios que desapareceram (provavelmente vendidos). \u00c9 o pre\u00e7o REAL de venda." />
                  </p>
                )}
                <p className="text-xs text-[#f0f0f5]/40">
                  Tempo estimado para vender:{' '}
                  <span className="font-mono text-[#60a5fa]">
                    ~{velocity.avgDaysOnMarket} dias
                  </span>
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Purchase */}
        <Card>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#f0f0f5]/70">
            <DollarSign className="h-4 w-4" />
            Compra
          </h3>
          <CurrencyInput
            label="Preço de Compra"
            value={state.purchase}
            onChange={(v) => update('purchase', v)}
          />
        </Card>

        {/* Costs */}
        <Card>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#f0f0f5]/70">
            <Truck className="h-4 w-4" />
            Custos
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <CurrencyInput
              label="Frete (entrada)"
              value={state.shippingIn}
              onChange={(v) => update('shippingIn', v)}
            />
            <CurrencyInput
              label="Frete (saída)"
              value={state.shippingOut}
              onChange={(v) => update('shippingOut', v)}
            />
            <CurrencyInput
              label="Embalagem"
              value={state.packaging}
              onChange={(v) => update('packaging', v)}
            />
            <CurrencyInput
              label="Outros custos"
              value={state.otherCosts}
              onChange={(v) => update('otherCosts', v)}
            />
          </div>
        </Card>

        {/* Sale */}
        <Card>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#f0f0f5]/70">
            <TrendingUp className="h-4 w-4" />
            Venda
          </h3>
          <div className="space-y-4">
            <CurrencyInput
              label="Preço de Venda"
              value={state.sellingPrice}
              onChange={(v) => update('sellingPrice', v)}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#f0f0f5]/70">
                Taxa Marketplace (%) <HelpTip text="Porcentagem cobrada pela plataforma de venda (ex: Mercado Livre cobra ~13%)." />
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={state.marketplaceFee}
                onChange={(e) => update('marketplaceFee', parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-[#27272a] bg-[#12121a] px-3 py-2 font-mono text-sm text-[#f0f0f5] outline-none transition-colors focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]"
              />
            </div>
          </div>
        </Card>

        {/* Quantity */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]/70">
            Quantidade (simulação em lote)
          </h3>
          <input
            type="number"
            min={1}
            value={state.quantity}
            onChange={(e) => update('quantity', parseInt(e.target.value) || 1)}
            className="w-full rounded-lg border border-[#27272a] bg-[#12121a] px-3 py-2 font-mono text-sm text-[#f0f0f5] outline-none transition-colors focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]"
          />
        </Card>
      </div>

      {/* Results - Right side (sticky) */}
      <div className="w-full lg:w-3/5">
        <div className="lg:sticky lg:top-6">
          {!result ? (
            <Card className="flex flex-col items-center justify-center py-16">
              <CalcIcon className="mb-4 h-12 w-12 text-[#f0f0f5]/20" />
              <p className="text-sm text-[#f0f0f5]/40">
                Preencha o preço de compra e venda para ver os resultados
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Recommendation card */}
              <div
                className={cn(
                  'rounded-xl p-6 text-center text-white',
                  result.recommendationColor,
                )}
              >
                <p className="text-sm font-medium uppercase opacity-80">Recomendação</p>
                <p className="mt-1 text-2xl font-[800] tracking-wide">
                  {result.recommendation}
                </p>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <p className="text-xs font-medium text-[#f0f0f5]/50">Custo Total</p>
                  <p className="mt-1 font-mono text-xl font-bold text-[#f0f0f5]">
                    {formatCurrency(result.totalCost)}
                  </p>
                </Card>
                <Card>
                  <p className="text-xs font-medium text-[#f0f0f5]/50">Preço de Venda</p>
                  <p className="mt-1 font-mono text-xl font-bold text-[#f0f0f5]">
                    {formatCurrency(state.sellingPrice)}
                  </p>
                </Card>
                <Card>
                  <p className="text-xs font-medium text-[#f0f0f5]/50">Receita Líquida <HelpTip text="Quanto você recebe depois de descontar frete e taxas." /></p>
                  <p className="mt-1 font-mono text-xl font-bold text-[#f0f0f5]">
                    {formatCurrency(result.netRevenue)}
                  </p>
                </Card>
                <Card>
                  <p className="text-xs font-medium text-[#f0f0f5]/50">Lucro</p>
                  <p
                    className={cn(
                      'mt-1 font-mono text-xl font-bold',
                      result.profit >= 0 ? 'text-[#22c55e]' : 'text-[#f87171]',
                    )}
                  >
                    {formatCurrency(result.profit)}
                  </p>
                </Card>
                <Card>
                  <p className="text-xs font-medium text-[#f0f0f5]/50">Margem % <HelpTip text="Quanto você lucra em porcentagem. Acima de 15% é considerado bom." /></p>
                  <p
                    className={cn(
                      'mt-1 font-mono text-xl font-bold',
                      result.marginPercent >= 15
                        ? 'text-[#22c55e]'
                        : result.marginPercent >= 0
                          ? 'text-[#fbbf24]'
                          : 'text-[#f87171]',
                    )}
                  >
                    {formatPercent(result.marginPercent)}
                  </p>
                </Card>
                <Card>
                  <p className="text-xs font-medium text-[#f0f0f5]/50">ROI <HelpTip text="Retorno sobre investimento. Quanto voc\u00ea ganha para cada real investido." /></p>
                  <p
                    className={cn(
                      'mt-1 font-mono text-xl font-bold',
                      result.roi >= 15
                        ? 'text-[#22c55e]'
                        : result.roi >= 0
                          ? 'text-[#fbbf24]'
                          : 'text-[#f87171]',
                    )}
                  >
                    {formatPercent(result.roi)}
                  </p>
                </Card>
                {velocity && result && (
                  <Card className="col-span-2">
                    <p className="text-xs font-medium text-[#f0f0f5]/50">
                      Score de Oportunidade <HelpTip text="Combina margem de lucro com velocidade de venda. Quanto maior, melhor o neg\u00f3cio." />
                    </p>
                    <div className="mt-1 flex items-baseline gap-3">
                      <p className={`font-mono text-xl font-bold ${
                        result.marginPercent >= 15 && velocity.liquidityScore !== 'baixa'
                          ? 'text-[#22c55e]'
                          : result.marginPercent >= 5
                            ? 'text-[#fbbf24]'
                            : 'text-[#f87171]'
                      }`}>
                        {result.marginPercent >= 15 && velocity.liquidityScore === 'alta'
                          ? 'Excelente'
                          : result.marginPercent >= 15 && velocity.liquidityScore === 'm\u00e9dia'
                            ? 'Bom'
                            : result.marginPercent >= 5
                              ? 'Regular'
                              : 'Ruim'}
                      </p>
                      <p className="text-xs text-[#f0f0f5]/40">
                        Margem {formatPercent(result.marginPercent)} \u00b7 Vende em ~{velocity.avgDaysOnMarket}d
                      </p>
                    </div>
                  </Card>
                )}
              </div>

              {/* Batch simulation */}
              {quantity > 1 && (
                <Card>
                  <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]/70">
                    Simulação em Lote ({quantity} unidades)
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-[#f0f0f5]/50">Investimento Total</p>
                      <p className="mt-1 font-mono text-lg font-bold text-[#f0f0f5]">
                        {formatCurrency(result.totalCost * quantity)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#f0f0f5]/50">Receita Total</p>
                      <p className="mt-1 font-mono text-lg font-bold text-[#f0f0f5]">
                        {formatCurrency(result.netRevenue * quantity)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#f0f0f5]/50">Lucro Total</p>
                      <p
                        className={cn(
                          'mt-1 font-mono text-lg font-bold',
                          result.profit >= 0 ? 'text-[#22c55e]' : 'text-[#f87171]',
                        )}
                      >
                        {formatCurrency(result.profit * quantity)}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Retail price reference */}
              {retailData?.retailPrice && (
                <Card>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
                      <span className="text-[#f0f0f5]/40">Ref. novo (Mercado Livre):</span>
                      <span className="font-mono text-[#f0f0f5]/60">{formatCurrency(retailData.retailPrice)}</span>
                    </div>
                    {state.sellingPrice > retailData.retailPrice * 0.85 && (
                      <p className="text-xs text-[#fbbf24]">
                        Preço de venda está próximo do novo ({formatCurrency(retailData.retailPrice)} no ML). Compradores podem preferir o novo.
                      </p>
                    )}
                  </div>
                </Card>
              )}

              {/* Cost breakdown */}
              <Card>
                <h3 className="mb-3 text-sm font-semibold text-[#f0f0f5]/70">
                  Detalhamento
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-[#f0f0f5]/60">
                    <span>Preço de compra</span>
                    <span className="font-mono">{formatCurrency(state.purchase)}</span>
                  </div>
                  {state.shippingIn > 0 && (
                    <div className="flex justify-between text-[#f0f0f5]/60">
                      <span>Frete entrada</span>
                      <span className="font-mono">{formatCurrency(state.shippingIn)}</span>
                    </div>
                  )}
                  {state.packaging > 0 && (
                    <div className="flex justify-between text-[#f0f0f5]/60">
                      <span>Embalagem</span>
                      <span className="font-mono">{formatCurrency(state.packaging)}</span>
                    </div>
                  )}
                  {state.otherCosts > 0 && (
                    <div className="flex justify-between text-[#f0f0f5]/60">
                      <span>Outros custos</span>
                      <span className="font-mono">{formatCurrency(state.otherCosts)}</span>
                    </div>
                  )}
                  <div className="border-t border-white/[0.06] pt-2">
                    <div className="flex justify-between font-medium text-[#f0f0f5]">
                      <span>Custo total</span>
                      <span className="font-mono">{formatCurrency(result.totalCost)}</span>
                    </div>
                  </div>
                  <div className="border-t border-white/[0.06] pt-2">
                    <div className="flex justify-between text-[#f0f0f5]/60">
                      <span>Preço de venda</span>
                      <span className="font-mono">{formatCurrency(state.sellingPrice)}</span>
                    </div>
                    {state.shippingOut > 0 && (
                      <div className="flex justify-between text-[#f0f0f5]/60">
                        <span>Frete saída</span>
                        <span className="font-mono text-[#f87171]">
                          -{formatCurrency(state.shippingOut)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#f0f0f5]/60">
                      <span>Taxa marketplace ({state.marketplaceFee}%)</span>
                      <span className="font-mono text-[#f87171]">
                        -{formatCurrency(state.sellingPrice * (state.marketplaceFee / 100))}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-white/[0.06] pt-2">
                    <div className="flex justify-between font-medium text-[#f0f0f5]">
                      <span>Receita líquida</span>
                      <span className="font-mono">{formatCurrency(result.netRevenue)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
