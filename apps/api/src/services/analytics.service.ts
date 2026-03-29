import { prisma } from '../lib/prisma';
import { VelocityQuery, SellersQuery, MarketHealthQuery, ListingQualityQuery } from '../validators/analytics.validator';

function median(sorted: number[]): number {
  const len = sorted.length;
  if (len === 0) return 0;
  const mid = Math.floor(len / 2);
  if (len % 2 !== 0) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function buildRegionFilter(region: string) {
  return region.length <= 3
    ? { region: { endsWith: region, mode: 'insensitive' as const } }
    : { region: { contains: region, mode: 'insensitive' as const } };
}

function getLiquidityScore(avgDays: number): string {
  if (avgDays <= 3) return 'alta';
  if (avgDays <= 7) return 'média';
  return 'baixa';
}

export async function getVelocity(query: VelocityQuery) {
  const { modelId, region, days } = query;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const regionFilter = buildRegionFilter(region);

  // Get active listings with daysOnMarket
  const activeListings = await prisma.listing.findMany({
    where: {
      modelId,
      ...regionFilter,
      isOutlier: false,
      capturedAt: { gte: since },
      daysOnMarket: { not: null },
    },
    select: { daysOnMarket: true, price: true, isActive: true },
  });

  // Get disappeared listings (likely sold)
  const disappeared = await prisma.listingHistory.findMany({
    where: {
      modelId,
      ...regionFilter,
      status: 'disappeared',
      recordedAt: { gte: since },
    },
    select: { price: true },
  });

  const daysValues = activeListings
    .map((l) => l.daysOnMarket!)
    .filter((d) => d >= 0)
    .sort((a, b) => a - b);

  const avgDaysOnMarket = daysValues.length > 0
    ? Math.round(daysValues.reduce((a, b) => a + b, 0) / daysValues.length)
    : 0;

  const medianDaysOnMarket = median(daysValues);

  const disappearedPrices = disappeared.map((d) => Number(d.price));
  const avgPriceDisappeared = disappearedPrices.length > 0
    ? Math.round(disappearedPrices.reduce((a, b) => a + b, 0) / disappearedPrices.length * 100) / 100
    : 0;

  const activePrices = activeListings.filter((l) => l.isActive).map((l) => Number(l.price));
  const avgPriceActive = activePrices.length > 0
    ? Math.round(activePrices.reduce((a, b) => a + b, 0) / activePrices.length * 100) / 100
    : 0;

  return {
    avgDaysOnMarket,
    medianDaysOnMarket,
    disappearedCount: disappeared.length,
    avgPriceDisappeared,
    avgPriceActive,
    liquidityScore: getLiquidityScore(avgDaysOnMarket),
    suggestedSellingPrice: avgPriceDisappeared > 0 ? avgPriceDisappeared : avgPriceActive,
  };
}

export async function getSellers(query: SellersQuery) {
  const { region } = query;
  const regionFilter = buildRegionFilter(region);

  const listings = await prisma.listing.findMany({
    where: {
      ...regionFilter,
      isOutlier: false,
      sellerName: { not: null },
      isActive: true,
    },
    select: {
      sellerName: true,
      price: true,
      model: { select: { brand: true, name: true, variant: true } },
    },
  });

  const sellerMap = new Map<string, {
    listingCount: number;
    totalPrice: number;
    models: Set<string>;
  }>();

  for (const listing of listings) {
    const name = listing.sellerName!;
    const entry = sellerMap.get(name) ?? { listingCount: 0, totalPrice: 0, models: new Set() };
    entry.listingCount++;
    entry.totalPrice += Number(listing.price);
    entry.models.add(`${listing.model.brand} ${listing.model.name} ${listing.model.variant}`);
    sellerMap.set(name, entry);
  }

  const sellers = Array.from(sellerMap.entries())
    .map(([name, data]) => ({
      name,
      listingCount: data.listingCount,
      avgPrice: Math.round(data.totalPrice / data.listingCount * 100) / 100,
      models: Array.from(data.models),
    }))
    .sort((a, b) => b.listingCount - a.listingCount)
    .slice(0, 20);

  return { sellers };
}

export async function getMarketHealth(query: MarketHealthQuery) {
  const { modelId, region } = query;
  const regionFilter = buildRegionFilter(region);
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalActive, newLast24h, newLast7d, disappearedLast7d, recentPrices, olderPrices] = await Promise.all([
    prisma.listing.count({
      where: { modelId, ...regionFilter, isActive: true, isOutlier: false },
    }),
    prisma.listing.count({
      where: { modelId, ...regionFilter, isOutlier: false, firstSeenAt: { gte: oneDayAgo } },
    }),
    prisma.listing.count({
      where: { modelId, ...regionFilter, isOutlier: false, firstSeenAt: { gte: sevenDaysAgo } },
    }),
    prisma.listingHistory.count({
      where: { modelId, status: 'disappeared', ...regionFilter, recordedAt: { gte: sevenDaysAgo } },
    }),
    // Recent 7d prices for trend
    prisma.listing.findMany({
      where: { modelId, ...regionFilter, isOutlier: false, capturedAt: { gte: sevenDaysAgo } },
      select: { price: true },
    }),
    // Previous 7d prices for trend comparison
    prisma.listing.findMany({
      where: {
        modelId,
        ...regionFilter,
        isOutlier: false,
        capturedAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), lt: sevenDaysAgo },
      },
      select: { price: true },
    }),
  ]);

  // Price direction
  const recentAvg = recentPrices.length > 0
    ? recentPrices.reduce((s, l) => s + Number(l.price), 0) / recentPrices.length
    : 0;
  const olderAvg = olderPrices.length > 0
    ? olderPrices.reduce((s, l) => s + Number(l.price), 0) / olderPrices.length
    : 0;

  let priceDirection: 'subindo' | 'caindo' | 'estável' = 'estável';
  if (olderAvg > 0) {
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    if (change > 3) priceDirection = 'subindo';
    else if (change < -3) priceDirection = 'caindo';
  }

  // Supply/demand
  let supplyDemandScore: 'muita oferta' | 'equilíbrio' | 'pouca oferta' = 'equilíbrio';
  if (totalActive > 30 && disappearedLast7d < totalActive * 0.3) supplyDemandScore = 'muita oferta';
  else if (totalActive < 10 || disappearedLast7d > totalActive * 0.5) supplyDemandScore = 'pouca oferta';

  // Confidence
  let confidenceLevel: 'alta' | 'média' | 'baixa' = 'baixa';
  if (totalActive >= 50) confidenceLevel = 'alta';
  else if (totalActive >= 20) confidenceLevel = 'média';

  return {
    totalActive,
    newLast24h,
    newLast7d,
    disappearedLast7d,
    priceDirection,
    supplyDemandScore,
    confidenceLevel,
  };
}

export async function getListingQuality(query: ListingQualityQuery) {
  const { modelId, region, days } = query;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const regionFilter = buildRegionFilter(region);

  const listings = await prisma.listing.findMany({
    where: {
      modelId,
      ...regionFilter,
      isOutlier: false,
      capturedAt: { gte: since },
    },
    select: {
      photoCount: true,
      description: true,
      condition: true,
    },
  });

  const total = listings.length;
  if (total === 0) {
    return {
      total: 0,
      avgPhotos: 0,
      withDescriptionPercent: 0,
      conditionBreakdown: [],
    };
  }

  // Average photos
  const withPhotos = listings.filter((l) => l.photoCount != null && l.photoCount > 0);
  const avgPhotos = withPhotos.length > 0
    ? Math.round(withPhotos.reduce((s, l) => s + l.photoCount!, 0) / withPhotos.length * 10) / 10
    : 0;

  // % with description
  const withDescription = listings.filter((l) => l.description != null && l.description.length > 10);
  const withDescriptionPercent = Math.round((withDescription.length / total) * 100);

  // Condition breakdown
  const conditionMap = new Map<string, number>();
  for (const listing of listings) {
    const cond = listing.condition ?? 'Não informado';
    conditionMap.set(cond, (conditionMap.get(cond) ?? 0) + 1);
  }

  const conditionBreakdown = Array.from(conditionMap.entries())
    .map(([condition, count]) => ({
      condition,
      count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    total,
    avgPhotos,
    withDescriptionPercent,
    conditionBreakdown,
  };
}
