import { ProfitCalculateInput } from '../validators/profit.validator';
import { getMarketAverage } from './price.service';
import { ValidationError } from '../lib/errors';

export async function calculateProfit(input: ProfitCalculateInput) {
  let sellingPrice = input.sellingPrice;

  if (!sellingPrice) {
    if (!input.modelId || !input.region) {
      throw new ValidationError(
        'Informe sellingPrice ou modelId + region para usar a media do mercado'
      );
    }
    sellingPrice = await getMarketAverage(input.modelId, input.region);
    if (sellingPrice === 0) {
      throw new ValidationError(
        'Sem dados de mercado suficientes para calcular o preco de venda'
      );
    }
  }

  const totalCost =
    input.purchasePrice +
    input.shippingIn +
    input.shippingOut +
    input.packaging +
    input.otherCosts;

  const feeAmount = (input.marketplaceFee / 100) * sellingPrice;
  const netRevenue = Math.round((sellingPrice - feeAmount) * 100) / 100;
  const profit = Math.round((netRevenue - totalCost) * 100) / 100;
  const marginPercent =
    sellingPrice > 0
      ? Math.round((profit / sellingPrice) * 10000) / 100
      : 0;
  const roi =
    totalCost > 0
      ? Math.round((profit / totalCost) * 10000) / 100
      : 0;

  let recommendation: string;
  if (marginPercent >= 25) {
    recommendation = 'Excelente negocio';
  } else if (marginPercent >= 15) {
    recommendation = 'Bom negocio';
  } else if (marginPercent >= 5) {
    recommendation = 'Negocio razoavel';
  } else if (marginPercent >= 0) {
    recommendation = 'Margem muito baixa - avalie os custos';
  } else {
    recommendation = 'Prejuizo - nao recomendado';
  }

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    sellingPrice,
    netRevenue,
    profit,
    marginPercent,
    roi,
    recommendation,
  };
}
