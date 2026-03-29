import api from './api';

export interface PriceAnalysis {
  average: number;
  median: number;
  min: number;
  max: number;
  percentile25: number;
  percentile75: number;
  count: number;
  trend: number;
  priceHistory: Array<{ date: string; avgPrice: number; count: number }>;
}

export interface PriceSummary {
  modelId: string;
  brand: string;
  name: string;
  variant: string;
  averagePrice: number;
  minPrice?: number;
  maxPrice?: number;
  count: number;
}

export async function getPriceAnalysis(modelId: string, region: string, days = 30): Promise<PriceAnalysis> {
  const { data } = await api.get('/prices', { params: { modelId, region, days } });
  return data.data;
}

export async function getPriceSummary(region: string, brand?: string): Promise<PriceSummary[]> {
  const { data } = await api.get('/prices/summary', { params: { region, brand } });
  return data.data;
}

export async function getAvailableRegions(): Promise<string[]> {
  const { data } = await api.get('/prices/regions');
  return data.data;
}
