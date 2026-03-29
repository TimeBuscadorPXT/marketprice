import { prisma } from '../lib/prisma';
import { DealsQuery } from '../validators/deals.validator';

function buildRegionFilter(region: string) {
  return region.length <= 3
    ? { region: { endsWith: region, mode: 'insensitive' as const } }
    : { region: { contains: region, mode: 'insensitive' as const } };
}

interface DealResult {
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
  photoUrls: string[];
  description: string | null;
  daysOnMarket: number | null;
  capturedAt: string;
  sellerName: string | null;
  sellerProfileUrl: string | null;
  sellerJoinDate: string | null;
  sellerLocation: string | null;
  condition: string | null;
  photoCount: number | null;
  isDeepCaptured: boolean;
  healthScore: number | null;
  flagLevel: string | null;
  redFlags: string[];
  greenFlags: string[];
  aiRecommendation: string | null;
  retailPrice: number | null;
  retailDiscount: number | null;
  retailVerdict: string | null;
  retailUrl: string | null;
}

interface DealsResponse {
  deals: DealResult[];
  summary: {
    total: number;
    hot: number;
    warm: number;
    moderate: number;
    avgDiscount: number;
    bestDeal: DealResult | null;
  };
}

function calculateScore(params: {
  discountPercent: number;
  liquidityScore: string;
  daysOnMarket: number | null;
  listingCount: number;
  hasDescription: boolean;
  photoCount: number;
  isDeepCaptured: boolean;
}): number {
  let score = 0;

  // Discount vs average (40 points max)
  if (params.discountPercent >= 30) score += 40;
  else if (params.discountPercent >= 20) score += 25;
  else if (params.discountPercent >= 15) score += 18;
  else if (params.discountPercent >= 10) score += 10;
  else if (params.discountPercent >= 5) score += 5;

  // Liquidity (20 points max)
  if (params.liquidityScore === 'alta') score += 20;
  else if (params.liquidityScore === 'média') score += 12;
  else score += 5;

  // Time on market - newer = better (15 points max)
  if (params.daysOnMarket !== null) {
    if (params.daysOnMarket <= 1) score += 15;
    else if (params.daysOnMarket <= 3) score += 12;
    else if (params.daysOnMarket <= 7) score += 8;
    else score += 3;
  }

  // Data volume - more listings = more reliable (10 points max)
  if (params.listingCount >= 50) score += 10;
  else if (params.listingCount >= 20) score += 7;
  else if (params.listingCount >= 10) score += 4;
  else score += 1;

  // Listing quality (15 points max)
  if (params.isDeepCaptured) score += 6;
  if (params.hasDescription) score += 4;
  if (params.photoCount >= 5) score += 5;
  else if (params.photoCount >= 3) score += 3;
  else if (params.photoCount >= 1) score += 1;

  return Math.min(100, Math.max(0, score));
}

function getHeat(score: number): 'hot' | 'warm' | 'moderate' {
  if (score >= 75) return 'hot';
  if (score >= 50) return 'warm';
  return 'moderate';
}

function classifyDealType(params: {
  discountPercent: number;
  daysOnMarket: number | null;
  listingCount: number;
}): { type: string; reason: string } {
  if (params.daysOnMarket !== null && params.daysOnMarket <= 1 && params.discountPercent >= 10) {
    return { type: 'recem_publicado', reason: 'Publicado recentemente com preço abaixo da média' };
  }
  if (params.discountPercent >= 25) {
    return { type: 'liquidacao', reason: `Preço ${params.discountPercent.toFixed(0)}% abaixo da média — possível liquidação` };
  }
  if (params.discountPercent >= 10) {
    return { type: 'compra_revenda', reason: `${params.discountPercent.toFixed(0)}% abaixo da média — boa margem para revenda` };
  }
  return { type: 'compra_revenda', reason: `Preço ${params.discountPercent.toFixed(0)}% abaixo da média do mercado` };
}

export async function getDeals(query: DealsQuery): Promise<DealsResponse> {
  const { region, brand, minScore, heat: heatFilter, type: typeFilter, limit } = query;
  const regionFilter = buildRegionFilter(region);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const modelFilter: Record<string, unknown> = {};
  if (brand) modelFilter.brand = { equals: brand, mode: 'insensitive' as const };
  if ((query as Record<string, unknown>).category) modelFilter.category = (query as Record<string, unknown>).category;

  const models = await prisma.product.findMany({
    where: modelFilter,
    select: {
      id: true,
      category: true,
      brand: true,
      name: true,
      variant: true,
      listings: {
        where: {
          ...regionFilter,
          isOutlier: false,
          isActive: true,
          capturedAt: { gte: thirtyDaysAgo },
        },
        select: {
          id: true,
          title: true,
          price: true,
          region: true,
          fbUrl: true,
          imageUrl: true,
          photoUrls: true,
          condition: true,
          daysOnMarket: true,
          capturedAt: true,
          sellerName: true,
          sellerProfileUrl: true,
          sellerJoinDate: true,
          sellerLocation: true,
          isDeepCaptured: true,
          description: true,
          fullDescription: true,
          photoCount: true,
          healthScore: true,
          redFlags: true,
          greenFlags: true,
          flagLevel: true,
          valueReduction: true,
          aiAnalysis: true,
          aiRecommendation: true,
        },
        orderBy: { capturedAt: 'desc' },
      },
    },
  });

  const allDeals: DealResult[] = [];

  for (const model of models) {
    if (model.listings.length < 3) continue;

    const prices = model.listings.map(l => Number(l.price)).sort((a, b) => a - b);
    const average = prices.reduce((s, p) => s + p, 0) / prices.length;
    if (average <= 0) continue;

    // Simple liquidity estimate based on listing count
    let liquidityScore = 'baixa';
    if (model.listings.length >= 20) liquidityScore = 'alta';
    else if (model.listings.length >= 8) liquidityScore = 'média';

    for (const listing of model.listings) {
      // Skip danger-flagged listings entirely
      if (listing.flagLevel === 'danger') continue;

      const price = Number(listing.price);
      const discountPercent = ((average - price) / average) * 100;

      // Only consider listings with at least 5% discount
      if (discountPercent < 5) continue;

      const { type, reason } = classifyDealType({
        discountPercent,
        daysOnMarket: listing.daysOnMarket,
        listingCount: model.listings.length,
      });

      let score = calculateScore({
        discountPercent,
        liquidityScore,
        daysOnMarket: listing.daysOnMarket,
        listingCount: model.listings.length,
        hasDescription: !!(listing.description || listing.fullDescription),
        photoCount: listing.photoCount ?? 0,
        isDeepCaptured: listing.isDeepCaptured,
      });

      // Reduce score for warning-flagged listings
      if (listing.flagLevel === 'warning') {
        score = Math.max(0, score - 20);
      }

      const heat = getHeat(score);

      // Apply filters
      if (score < minScore) continue;
      if (heatFilter !== 'all' && heat !== heatFilter) continue;
      if (typeFilter !== 'all' && type !== typeFilter) continue;

      allDeals.push({
        id: `deal-${listing.id}`,
        listingId: listing.id,
        title: listing.title,
        price,
        averagePrice: Math.round(average * 100) / 100,
        discount: Math.round(discountPercent * 10) / 10,
        score,
        heat,
        type,
        reason,
        model: { id: model.id, category: model.category, brand: model.brand, name: model.name, variant: model.variant },
        region: listing.region,
        fbUrl: listing.fbUrl,
        imageUrl: listing.imageUrl,
        photoUrls: listing.photoUrls,
        description: listing.fullDescription || listing.description,
        daysOnMarket: listing.daysOnMarket,
        capturedAt: listing.capturedAt.toISOString(),
        sellerName: listing.sellerName,
        sellerProfileUrl: listing.sellerProfileUrl,
        sellerJoinDate: listing.sellerJoinDate,
        sellerLocation: listing.sellerLocation,
        condition: listing.condition,
        photoCount: listing.photoCount,
        isDeepCaptured: listing.isDeepCaptured,
        healthScore: listing.healthScore,
        flagLevel: listing.flagLevel,
        redFlags: listing.redFlags,
        greenFlags: listing.greenFlags,
        aiRecommendation: listing.aiRecommendation,
        retailPrice: null,
        retailDiscount: null,
        retailVerdict: null,
        retailUrl: null,
      });
    }
  }

  // Enrich with retail prices
  const modelIds = [...new Set(allDeals.map(d => d.model.id))];
  if (modelIds.length > 0) {
    const retailPrices = await prisma.retailPrice.findMany({
      where: {
        modelId: { in: modelIds },
        isActive: true,
        fetchedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { price: 'asc' },
      distinct: ['modelId'],
    });
    const retailMap = new Map(retailPrices.map(rp => [rp.modelId, rp]));

    for (const deal of allDeals) {
      const rp = retailMap.get(deal.model.id);
      if (rp) {
        const rpPrice = Number(rp.price);
        const discPct = ((rpPrice - deal.price) / rpPrice) * 100;
        deal.retailPrice = rpPrice;
        deal.retailDiscount = Math.round(discPct * 10) / 10;
        deal.retailUrl = rp.url;
        if (discPct >= 40) deal.retailVerdict = 'Oportunidade quente';
        else if (discPct >= 25) deal.retailVerdict = 'Boa oportunidade';
        else if (discPct >= 15) deal.retailVerdict = 'Margem apertada';
        else deal.retailVerdict = 'Não compensa — próximo do novo';
      }
    }
  }

  // Sort by score descending
  allDeals.sort((a, b) => b.score - a.score);

  const deals = allDeals.slice(0, limit);
  const hot = allDeals.filter(d => d.heat === 'hot').length;
  const warm = allDeals.filter(d => d.heat === 'warm').length;
  const moderate = allDeals.filter(d => d.heat === 'moderate').length;
  const avgDiscount = allDeals.length > 0
    ? Math.round(allDeals.reduce((s, d) => s + d.discount, 0) / allDeals.length * 10) / 10
    : 0;

  return {
    deals,
    summary: {
      total: allDeals.length,
      hot,
      warm,
      moderate,
      avgDiscount,
      bestDeal: allDeals[0] ?? null,
    },
  };
}
