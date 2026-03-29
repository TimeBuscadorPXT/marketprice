import api from './api';

export interface Deal {
  id: string;
  listingId: string;
  title: string;
  price: number;
  averagePrice: number;
  discount: number;
  score: number;
  heat: 'hot' | 'warm' | 'moderate';
  type: string;
  reason: string;
  model: { id: string; category: string; brand: string; name: string; variant: string };
  region: string;
  fbUrl: string;
  imageUrl: string | null;
  photoUrls?: string[];
  description?: string | null;
  daysOnMarket: number | null;
  capturedAt: string;
  sellerName: string | null;
  sellerProfileUrl?: string | null;
  sellerJoinDate?: string | null;
  sellerLocation?: string | null;
  condition?: string | null;
  photoCount?: number | null;
  isDeepCaptured: boolean;
  healthScore?: number | null;
  flagLevel?: 'clean' | 'warning' | 'danger' | null;
  redFlags?: string[];
  greenFlags?: string[];
  aiRecommendation?: string | null;
}

export interface DealsSummary {
  total: number;
  hot: number;
  warm: number;
  moderate: number;
  avgDiscount: number;
  bestDeal: Deal | null;
}

export interface DealsResponse {
  deals: Deal[];
  summary: DealsSummary;
}

export async function getDeals(
  region: string,
  options?: { category?: string; brand?: string; minScore?: number; heat?: string; type?: string; limit?: number }
): Promise<DealsResponse> {
  const { data } = await api.get('/deals', {
    params: { region, ...options },
  });
  return data.data;
}
