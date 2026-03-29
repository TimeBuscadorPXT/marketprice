import { prisma } from '../lib/prisma';
import { CreateListingsInput, ListListingsQuery } from '../validators/listing.validator';
import { DeepUpdateInput } from '../validators/deep-update.validator';
import { normalizeTitle } from './normalizer.service';
import { analyzeListingText } from './flag-detector.service';
import { getCategoryConfig } from '../config/categories';

const DISAPPEAR_THRESHOLD_HOURS = 48;

function isOutlier(price: number, category: string): boolean {
  const config = getCategoryConfig(category);
  if (!config) return price < 200 || price > 15000;
  return price < config.outlierMin || price > config.outlierMax;
}

type ExtendedNormalizeResult = ReturnType<typeof normalizeTitle> & {
  variant?: string;
  category?: string;
};

async function resolveModelIdFromTitle(title: string): Promise<string | null> {
  const normalized = normalizeTitle(title) as ExtendedNormalizeResult;
  if (!normalized) return null;

  // Try exact match first
  const model = await prisma.product.findFirst({
    where: {
      brand: { equals: normalized.brand, mode: 'insensitive' },
      name: { equals: normalized.name, mode: 'insensitive' },
      variant: { equals: normalized.variant ?? normalized.storage ?? '', mode: 'insensitive' },
    },
    select: { id: true },
  });

  if (model) return model.id;

  // Auto-create model if normalizer identified it confidently
  const created = await prisma.product.create({
    data: {
      brand: normalized.brand,
      name: normalized.name,
      variant: normalized.variant ?? normalized.storage ?? '',
      category: normalized.category ?? 'phone',
    },
    select: { id: true },
  });

  console.log(`[Normalizer] Modelo criado automaticamente: ${normalized.canonical}`);
  return created.id;
}

export async function createListings(userId: string, input: CreateListingsInput) {
  const { modelId: inputModelId, listings } = input;

  const fbUrls = listings.map((l) => l.fbUrl);
  const existingListings = await prisma.listing.findMany({
    where: { fbUrl: { in: fbUrls }, userId },
    select: { id: true, fbUrl: true, price: true },
  });
  const existingMap = new Map(existingListings.map((l) => [l.fbUrl, l]));

  let duplicates = 0;
  let outliers = 0;
  let saved = 0;
  let updated = 0;
  let unmatched = 0;

  for (const listing of listings) {
    const existing = existingMap.get(listing.fbUrl);

    // Resolve modelId
    let resolvedModelId = inputModelId ?? null;
    if (!resolvedModelId) {
      resolvedModelId = await resolveModelIdFromTitle(listing.title);
    }
    if (!resolvedModelId) {
      unmatched++;
      continue;
    }

    const outlierFlag = isOutlier(listing.price, 'phone');
    if (outlierFlag) outliers++;

    if (existing) {
      // Update: refresh lastSeenAt, mark active
      const updateData: Record<string, unknown> = {
        lastSeenAt: new Date(),
        isActive: true,
      };

      // Track price changes
      const oldPrice = Number(existing.price);
      if (Math.abs(oldPrice - listing.price) > 1) {
        updateData.price = listing.price;
        await prisma.listingHistory.create({
          data: {
            listingId: existing.id,
            fbUrl: listing.fbUrl,
            modelId: resolvedModelId,
            price: listing.price,
            region: listing.region,
            status: 'price_changed',
            oldPrice: oldPrice,
          },
        });
      }

      await prisma.listing.update({
        where: { id: existing.id },
        data: updateData,
      });
      updated++;
    } else {
      // Create new
      const createdListing = await prisma.listing.create({
        data: {
          userId,
          modelId: resolvedModelId,
          title: listing.title,
          price: listing.price,
          region: listing.region,
          publishedAt: listing.publishedAt ? new Date(listing.publishedAt) : null,
          fbUrl: listing.fbUrl,
          condition: listing.condition ?? null,
          imageUrl: listing.imageUrl ?? null,
          isOutlier: outlierFlag,
          description: listing.description ?? null,
          sellerName: listing.sellerName ?? null,
          photoCount: listing.photoCount ?? null,
          publishedText: listing.publishedText ?? null,
          daysOnMarket: listing.daysOnMarket ?? null,
          hasShipping: listing.hasShipping ?? false,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          isActive: true,
        },
      });

      // Run flag detector
      const flags = analyzeListingText(listing.title, listing.description);
      await prisma.listing.update({
        where: { id: createdListing.id },
        data: {
          healthScore: flags.healthScore,
          redFlags: flags.redFlags,
          greenFlags: flags.greenFlags,
          flagLevel: flags.flagLevel,
          valueReduction: flags.valueReduction,
        },
      });

      saved++;
    }
  }

  // Mark disappeared listings (not seen in 48h)
  const threshold = new Date(Date.now() - DISAPPEAR_THRESHOLD_HOURS * 60 * 60 * 1000);
  const disappeared = await prisma.listing.findMany({
    where: {
      userId,
      isActive: true,
      lastSeenAt: { lt: threshold },
    },
    select: { id: true, fbUrl: true, modelId: true, price: true, region: true },
  });

  if (disappeared.length > 0) {
    await prisma.listing.updateMany({
      where: { id: { in: disappeared.map((d) => d.id) } },
      data: { isActive: false, status: 'sold' },
    });

    await prisma.listingHistory.createMany({
      data: disappeared.map((d) => ({
        listingId: d.id,
        fbUrl: d.fbUrl,
        modelId: d.modelId,
        price: d.price,
        region: d.region,
        status: 'disappeared',
      })),
    });
  }

  return {
    total: listings.length,
    saved,
    updated,
    duplicates,
    outliers,
    unmatched,
    disappeared: disappeared.length,
  };
}

export async function listListings(userId: string, query: ListListingsQuery) {
  const { page, limit, modelId, region, startDate, endDate } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId };

  if (modelId) where.modelId = modelId;
  if (region) where.region = region;
  if (startDate || endDate) {
    const capturedAt: Record<string, Date> = {};
    if (startDate) capturedAt.gte = new Date(startDate);
    if (endDate) capturedAt.lte = new Date(endDate);
    where.capturedAt = capturedAt;
  }

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      skip,
      take: limit,
      orderBy: { capturedAt: 'desc' },
      select: {
        id: true,
        title: true,
        price: true,
        region: true,
        publishedAt: true,
        fbUrl: true,
        condition: true,
        imageUrl: true,
        capturedAt: true,
        isOutlier: true,
        daysOnMarket: true,
        sellerName: true,
        photoCount: true,
        isActive: true,
        model: { select: { id: true, brand: true, name: true, variant: true } },
      },
    }),
    prisma.listing.count({ where }),
  ]);

  return {
    listings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function deepUpdateListing(userId: string, input: DeepUpdateInput) {
  const { fbUrl, fullDescription, photoUrls, sellerProfileUrl, sellerJoinDate, sellerLocation, listedCategory, condition, hasShipping } = input;

  const existing = await prisma.listing.findFirst({
    where: { fbUrl, userId },
    select: { id: true },
  });

  if (!existing) {
    return { updated: false, listingId: null, reason: 'Listing not found' };
  }

  const updateData: Record<string, unknown> = {
    isDeepCaptured: true,
    lastSeenAt: new Date(),
  };

  if (fullDescription != null) updateData.fullDescription = fullDescription;
  if (photoUrls && photoUrls.length > 0) {
    updateData.photoUrls = photoUrls;
    updateData.photoCount = photoUrls.length;
  }
  if (sellerProfileUrl != null) updateData.sellerProfileUrl = sellerProfileUrl;
  if (sellerJoinDate != null) updateData.sellerJoinDate = sellerJoinDate;
  if (sellerLocation != null) updateData.sellerLocation = sellerLocation;
  if (listedCategory != null) updateData.listedCategory = listedCategory;
  if (condition != null) updateData.condition = condition;
  if (hasShipping != null) updateData.hasShipping = hasShipping;

  await prisma.listing.update({
    where: { id: existing.id },
    data: updateData,
  });

  return { updated: true, listingId: existing.id };
}
