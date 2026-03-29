import api from './api';

export interface RetailPriceComparison {
  retailPrice: number | null;
  retailUrl: string | null;
  marketplace: string;
  discount: number | null;
  verdict: 'hot' | 'good' | 'tight' | 'bad' | null;
  verdictLabel: string | null;
}

export interface RetailPriceRecord {
  id: string;
  modelId: string;
  marketplace: string;
  price: number;
  condition: string;
  sellerType: string;
  url: string | null;
  fetchedAt: string;
}

export async function getRetailComparison(modelId: string, usedPrice: number): Promise<RetailPriceComparison> {
  const { data } = await api.get('/retail-prices/compare', { params: { modelId, usedPrice } });
  return data.data;
}

export async function getRetailPrices(modelId: string): Promise<RetailPriceRecord[]> {
  const { data } = await api.get('/retail-prices', { params: { modelId } });
  return data.data;
}
