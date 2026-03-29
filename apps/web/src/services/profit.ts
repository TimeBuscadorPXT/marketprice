import api from './api';

export interface ProfitInput {
  purchasePrice: number;
  sellingPrice?: number;
  modelId?: string;
  region?: string;
  shippingIn?: number;
  shippingOut?: number;
  packaging?: number;
  marketplaceFee?: number;
  otherCosts?: number;
}

export interface ProfitResult {
  totalCost: number;
  sellingPrice: number;
  netRevenue: number;
  profit: number;
  marginPercent: number;
  roi: number;
  recommendation: string;
}

export async function calculateProfit(input: ProfitInput): Promise<ProfitResult> {
  const { data } = await api.post('/profit/calculate', input);
  return data.data;
}
