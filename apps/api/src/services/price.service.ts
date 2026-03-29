import { prisma } from '../lib/prisma';
import { PriceQuery, PriceSummaryQuery } from '../validators/price.validator';

function median(sorted: number[]): number {
  const len = sorted.length;
  if (len === 0) return 0;
  const mid = Math.floor(len / 2);
  if (len % 2 !== 0) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower]!;
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (index - lower);
}

interface PriceListing {
  price: { toString(): string };
  capturedAt: Date;
}

interface ModelWithListings {
  id: string;
  brand: string;
  name: string;
  variant: string;
  listings: Array<{ price: { toString(): string } }>;
}

export async function getPriceAnalysis(query: PriceQuery) {
  const { modelId, region, days } = query;
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Use contains for partial region match
  const regionFilter = region.length <= 3
    ? { region: { endsWith: region, mode: 'insensitive' as const } }
    : { region: { contains: region, mode: 'insensitive' as const } };

  const listings: PriceListing[] = await prisma.listing.findMany({
    where: {
      modelId,
      ...regionFilter,
      isOutlier: false,
      capturedAt: { gte: since },
    },
    select: { price: true, capturedAt: true },
    orderBy: { capturedAt: 'asc' },
  });

  if (listings.length === 0) {
    return {
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      percentile25: 0,
      percentile75: 0,
      count: 0,
      trend: 0,
      priceHistory: [],
    };
  }

  const prices = listings.map((l: PriceListing) => Number(l.price)).sort((a: number, b: number) => a - b);
  const count = prices.length;
  const sum = prices.reduce((acc: number, p: number) => acc + p, 0);
  const average = Math.round((sum / count) * 100) / 100;

  // Trend: compare 7d avg vs full period avg
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentPrices = listings
    .filter((l: PriceListing) => l.capturedAt >= sevenDaysAgo)
    .map((l: PriceListing) => Number(l.price));

  const recentAvg = recentPrices.length > 0
    ? recentPrices.reduce((a: number, b: number) => a + b, 0) / recentPrices.length
    : average;

  const trend = average > 0
    ? Math.round(((recentAvg - average) / average) * 10000) / 100
    : 0;

  // Group by day for history
  const dailyMap = new Map<string, { sum: number; count: number }>();
  for (const listing of listings) {
    const dateKey = listing.capturedAt.toISOString().slice(0, 10);
    const entry = dailyMap.get(dateKey) ?? { sum: 0, count: 0 };
    entry.sum += Number(listing.price);
    entry.count++;
    dailyMap.set(dateKey, entry);
  }

  const priceHistory = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      avgPrice: Math.round((data.sum / data.count) * 100) / 100,
      count: data.count,
    }));

  return {
    average,
    median: Math.round(median(prices) * 100) / 100,
    min: prices[0],
    max: prices[count - 1],
    percentile25: Math.round(percentile(prices, 25) * 100) / 100,
    percentile75: Math.round(percentile(prices, 75) * 100) / 100,
    count,
    trend,
    priceHistory,
  };
}

export async function getPriceSummary(query: PriceSummaryQuery) {
  const { region, brand } = query;

  const modelFilter = brand ? { brand: { equals: brand, mode: 'insensitive' as const } } : {};

  // Use contains for partial region match (e.g. "SC" matches "Caçador, SC")
  const regionFilter = region.length <= 3
    ? { region: { endsWith: region, mode: 'insensitive' as const } }
    : { region: { contains: region, mode: 'insensitive' as const } };

  const models: ModelWithListings[] = await prisma.product.findMany({
    where: modelFilter,
    select: {
      id: true,
      brand: true,
      name: true,
      variant: true,
      listings: {
        where: {
          ...regionFilter,
          isOutlier: false,
          capturedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: { price: true },
      },
    },
    orderBy: [{ brand: 'asc' }, { name: 'asc' }],
  });

  return models
    .filter((m: ModelWithListings) => m.listings.length > 0)
    .map((m: ModelWithListings) => {
      const prices = m.listings.map((l: { price: { toString(): string } }) => Number(l.price)).sort((a, b) => a - b);
      const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
      return {
        modelId: m.id,
        brand: m.brand,
        name: m.name,
        variant: m.variant,
        averagePrice: Math.round(avg * 100) / 100,
        minPrice: prices[0],
        maxPrice: prices[prices.length - 1],
        count: prices.length,
      };
    });
}

/** List unique regions (states) that have listings */
export async function getAvailableRegions(userId: string): Promise<string[]> {
  const regions = await prisma.listing.groupBy({
    by: ['region'],
    where: { userId },
    _count: true,
    orderBy: { _count: { region: 'desc' } },
  });

  // Extract state codes (last 2 chars after ", ") and deduplicate
  const stateSet = new Set<string>();
  const cityList: string[] = [];

  for (const r of regions) {
    const region = r.region;
    // Skip entries that look like titles (not real locations)
    if (region.toLowerCase().includes('iphone') || region.toLowerCase().includes('vendo') ||
        region.toLowerCase().includes('troco') || region.toLowerCase().includes('top ') ||
        region.toLowerCase().includes('pro max') || region.toLowerCase().includes('pra sair')) {
      continue;
    }
    const stateMatch = region.match(/,\s*([A-Z]{2})$/);
    if (stateMatch && stateMatch[1]) {
      stateSet.add(stateMatch[1]);
    }
    cityList.push(region);
  }

  // Return states first, then top cities
  const states = Array.from(stateSet).sort();
  return [...states, ...cityList.slice(0, 20)];
}

/** Helper used by other services to get market average for a model+region */
export async function getMarketAverage(modelId: string, region: string): Promise<number> {
  const result = await getPriceAnalysis({ modelId, region, days: 30 });
  return result.average;
}
