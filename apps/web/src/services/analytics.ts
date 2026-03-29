import api from './api';

export interface VelocityData {
  avgDaysOnMarket: number;
  medianDaysOnMarket: number;
  disappearedCount: number;
  avgPriceDisappeared: number;
  avgPriceActive: number;
  liquidityScore: 'alta' | 'média' | 'baixa';
  suggestedSellingPrice: number;
}

export interface SellerData {
  name: string;
  listingCount: number;
  avgPrice: number;
  models: string[];
}

export interface SellersResponse {
  sellers: SellerData[];
}

export interface MarketHealthData {
  totalActive: number;
  newLast24h: number;
  newLast7d: number;
  disappearedLast7d: number;
  priceDirection: 'subindo' | 'caindo' | 'estável';
  supplyDemandScore: 'muita oferta' | 'equilíbrio' | 'pouca oferta';
  confidenceLevel: 'alta' | 'média' | 'baixa';
}

export async function getVelocity(modelId: string, region: string, days = 30): Promise<VelocityData> {
  const { data } = await api.get('/analytics/velocity', { params: { modelId, region, days } });
  return data.data;
}

export async function getSellers(region: string): Promise<SellersResponse> {
  const { data } = await api.get('/analytics/sellers', { params: { region } });
  return data.data;
}

export async function getMarketHealth(modelId: string, region: string): Promise<MarketHealthData> {
  const { data } = await api.get('/analytics/market-health', { params: { modelId, region } });
  return data.data;
}

export interface ConditionBreakdown {
  condition: string;
  count: number;
  percent: number;
}

export interface ListingQualityData {
  total: number;
  avgPhotos: number;
  withDescriptionPercent: number;
  conditionBreakdown: ConditionBreakdown[];
}

export async function getListingQuality(modelId: string, region: string, days = 30): Promise<ListingQualityData> {
  const { data } = await api.get('/analytics/listing-quality', { params: { modelId, region, days } });
  return data.data;
}
