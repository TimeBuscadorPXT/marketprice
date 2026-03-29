import { prisma } from '../lib/prisma';
import { scrapeRetailPrices, getLowestRetailPrice } from './retail-scraper.service';
import { NotFoundError } from '../lib/errors';

export interface RetailPriceComparison {
  retailPrice: number | null;
  retailUrl: string | null;
  marketplace: string;
  discount: number | null;
  verdict: 'hot' | 'good' | 'tight' | 'bad' | null;
  verdictLabel: string | null;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function classifyDiscount(discountPct: number): {
  verdict: 'hot' | 'good' | 'tight' | 'bad';
  verdictLabel: string;
} {
  if (discountPct >= 40) {
    return { verdict: 'hot', verdictLabel: 'Oportunidade quente' };
  } else if (discountPct >= 25) {
    return { verdict: 'good', verdictLabel: 'Boa oportunidade' };
  } else if (discountPct >= 15) {
    return { verdict: 'tight', verdictLabel: 'Margem apertada' };
  } else {
    return { verdict: 'bad', verdictLabel: 'Não compensa — próximo do novo' };
  }
}

async function getCachedRetailPrice(modelId: string) {
  const cutoff = new Date(Date.now() - CACHE_TTL_MS);

  return prisma.retailPrice.findFirst({
    where: {
      modelId,
      isActive: true,
      fetchedAt: { gte: cutoff },
    },
    orderBy: { price: 'asc' },
  });
}

export async function getRetailComparison(
  modelId: string,
  usedPrice: number
): Promise<RetailPriceComparison> {
  // Try cache first
  const cached = await getCachedRetailPrice(modelId);

  if (cached) {
    const retailPriceNum = Number(cached.price);
    const discountPct =
      retailPriceNum > 0
        ? Math.round(((retailPriceNum - usedPrice) / retailPriceNum) * 10000) / 100
        : null;

    if (discountPct === null) {
      return {
        retailPrice: retailPriceNum,
        retailUrl: cached.url,
        marketplace: cached.marketplace,
        discount: null,
        verdict: null,
        verdictLabel: null,
      };
    }

    const { verdict, verdictLabel } = classifyDiscount(discountPct);
    return {
      retailPrice: retailPriceNum,
      retailUrl: cached.url,
      marketplace: cached.marketplace,
      discount: discountPct,
      verdict,
      verdictLabel,
    };
  }

  // Cache miss — scrape
  const product = await prisma.product.findUnique({
    where: { id: modelId },
    select: { brand: true, name: true, variant: true, category: true },
  });

  if (!product) {
    throw new NotFoundError('Modelo', modelId);
  }

  const scraped = await scrapeRetailPrices(
    product.brand,
    product.name,
    product.variant,
    product.category
  );

  const lowest = getLowestRetailPrice(scraped);

  if (!lowest) {
    return {
      retailPrice: null,
      retailUrl: null,
      marketplace: 'mercadolivre',
      discount: null,
      verdict: null,
      verdictLabel: null,
    };
  }

  // Persist to cache
  await prisma.retailPrice.create({
    data: {
      modelId,
      marketplace: lowest.marketplace,
      price: lowest.price,
      url: lowest.url,
      condition: 'novo',
      sellerType: 'terceiro',
    },
  });

  const discountPct =
    lowest.price > 0
      ? Math.round(((lowest.price - usedPrice) / lowest.price) * 10000) / 100
      : null;

  if (discountPct === null) {
    return {
      retailPrice: lowest.price,
      retailUrl: lowest.url,
      marketplace: lowest.marketplace,
      discount: null,
      verdict: null,
      verdictLabel: null,
    };
  }

  const { verdict, verdictLabel } = classifyDiscount(discountPct);
  return {
    retailPrice: lowest.price,
    retailUrl: lowest.url,
    marketplace: lowest.marketplace,
    discount: discountPct,
    verdict,
    verdictLabel,
  };
}

export async function getRetailPricesForModel(modelId: string) {
  const prices = await prisma.retailPrice.findMany({
    where: { modelId, isActive: true },
    orderBy: { fetchedAt: 'desc' },
  });

  return prices.map((p) => ({
    id: p.id,
    marketplace: p.marketplace,
    price: Number(p.price),
    condition: p.condition,
    sellerType: p.sellerType,
    url: p.url,
    fetchedAt: p.fetchedAt,
  }));
}

export async function refreshRetailPrice(modelId: string): Promise<RetailPriceComparison> {
  const product = await prisma.product.findUnique({
    where: { id: modelId },
    select: { brand: true, name: true, variant: true, category: true },
  });

  if (!product) {
    throw new NotFoundError('Modelo', modelId);
  }

  // Mark all existing active prices as inactive
  await prisma.retailPrice.updateMany({
    where: { modelId, isActive: true },
    data: { isActive: false },
  });

  const scraped = await scrapeRetailPrices(
    product.brand,
    product.name,
    product.variant,
    product.category
  );

  const lowest = getLowestRetailPrice(scraped);

  if (!lowest) {
    return {
      retailPrice: null,
      retailUrl: null,
      marketplace: 'mercadolivre',
      discount: null,
      verdict: null,
      verdictLabel: null,
    };
  }

  await prisma.retailPrice.create({
    data: {
      modelId,
      marketplace: lowest.marketplace,
      price: lowest.price,
      url: lowest.url,
      condition: 'novo',
      sellerType: 'terceiro',
    },
  });

  return {
    retailPrice: lowest.price,
    retailUrl: lowest.url,
    marketplace: lowest.marketplace,
    discount: null,
    verdict: null,
    verdictLabel: null,
  };
}
