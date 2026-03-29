# Expandir Captura de Dados + Indicadores Inteligentes — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capturar mais dados dos anúncios do Facebook Marketplace (descrição, vendedor, fotos, tempo de publicação, frete, status) e transformá-los em indicadores de velocidade de venda, saúde do mercado e insights para revendedores leigos.

**Architecture:** 5 camadas sequenciais — (1) Prisma schema expansion com nova tabela ListingHistory, (2) Chrome extension scraper com 7 novos campos extraídos do DOM, (3) API com 3 novos endpoints analytics + upsert logic no listing service, (4) Dashboard/Analysis com seções de velocidade de venda, qualidade de anúncios e concorrência, (5) Tooltips explicativos para leigos em todo o frontend.

**Tech Stack:** Prisma 6 + PostgreSQL, Express/Zod, Chrome Extension (content script + MutationObserver), React + React Query + Recharts + Tailwind CSS.

**Regras:** NÃO use Supabase MCP. NÃO rode o servidor. Apenas modifique código e confirme build.

---

## File Structure

### Prisma / Database
- Modify: `apps/api/prisma/schema.prisma` — add fields to Listing, add ListingHistory model

### API — Validators
- Modify: `apps/api/src/validators/listing.validator.ts` — accept new fields in createListingsSchema
- Create: `apps/api/src/validators/analytics.validator.ts` — schemas for velocity, sellers, market-health

### API — Services
- Modify: `apps/api/src/services/listing.service.ts` — upsert logic (firstSeenAt/lastSeenAt), disappearance tracking
- Create: `apps/api/src/services/analytics.service.ts` — velocity, sellers, market-health calculations
- Modify: `apps/api/src/services/price.service.ts` — add minPrice/maxPrice to getPriceSummary

### API — Controllers
- Modify: `apps/api/src/controllers/listing.controller.ts` — no changes needed (already passes req.body)
- Create: `apps/api/src/controllers/analytics.controller.ts` — 3 handlers

### API — Routes
- Create: `apps/api/src/routes/analytics.routes.ts` — mount 3 GET endpoints
- Modify: `apps/api/src/app.ts` — register analytics routes

### Chrome Extension
- Modify: `apps/extension/src/services/scraper.ts` — add 7 new field extractors + parseDateText

### Web — Services
- Modify: `apps/web/src/services/prices.ts` — add minPrice/maxPrice to PriceSummary
- Create: `apps/web/src/services/analytics.ts` — fetch velocity, sellers, market-health

### Web — Components
- Create: `apps/web/src/components/shared/MarketInsight.tsx` — smart tips component
- Create: `apps/web/src/components/shared/VelocityCard.tsx` — selling speed display
- Create: `apps/web/src/components/shared/MarketHealthCard.tsx` — supply/demand display

### Web — Pages
- Modify: `apps/web/src/pages/Dashboard.tsx` — add "Visão de Mercado" section
- Modify: `apps/web/src/pages/Analysis.tsx` — add velocity, quality, competition sections
- Modify: `apps/web/src/pages/Calculator.tsx` — add suggested price + estimated sell time

---

## Task 1: Expand Prisma Schema

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add new fields to Listing model and create ListingHistory model**

```prisma
model Listing {
  id            String    @id @default(uuid())
  userId        String    @map("user_id")
  modelId       String    @map("model_id")
  title         String
  price         Decimal   @db.Decimal(10, 2)
  region        String
  publishedAt   DateTime? @map("published_at")
  fbUrl         String    @map("fb_url")
  condition     String?
  imageUrl      String?   @map("image_url")
  capturedAt    DateTime  @default(now()) @map("captured_at")
  isOutlier     Boolean   @default(false) @map("is_outlier")
  description   String?
  sellerName    String?   @map("seller_name")
  photoCount    Int?      @map("photo_count")
  publishedText String?   @map("published_text")
  daysOnMarket  Int?      @map("days_on_market")
  hasShipping   Boolean?  @default(false) @map("has_shipping")
  status        String?   @default("active")
  firstSeenAt   DateTime  @default(now()) @map("first_seen_at")
  lastSeenAt    DateTime  @default(now()) @map("last_seen_at")
  isActive      Boolean   @default(true) @map("is_active")

  user    User             @relation(fields: [userId], references: [id])
  model   PhoneModel       @relation(fields: [modelId], references: [id])
  history ListingHistory[]

  @@index([modelId, region])
  @@index([capturedAt])
  @@index([userId])
  @@index([isActive, modelId, region])
  @@map("listings")
}

model ListingHistory {
  id         String   @id @default(uuid())
  listingId  String   @map("listing_id")
  fbUrl      String   @map("fb_url")
  modelId    String?  @map("model_id")
  price      Decimal  @db.Decimal(10, 2)
  region     String
  status     String
  oldPrice   Decimal? @db.Decimal(10, 2) @map("old_price")
  recordedAt DateTime @default(now()) @map("recorded_at")

  listing Listing     @relation(fields: [listingId], references: [id])
  model   PhoneModel? @relation(fields: [modelId], references: [id])

  @@index([modelId, region])
  @@index([recordedAt])
  @@map("listing_history")
}
```

Also add the reverse relation to PhoneModel:

```prisma
model PhoneModel {
  id      String   @id @default(uuid())
  brand   String
  name    String
  storage String
  aliases String[]

  listings       Listing[]
  suppliers      Supplier[]
  listingHistory ListingHistory[]

  @@unique([brand, name, storage])
  @@index([brand])
  @@map("phone_models")
}
```

- [ ] **Step 2: Generate Prisma Client**

Run: `cd apps/api && npx prisma generate`
Expected: `✔ Generated Prisma Client`

NÃO rode `db push` — o usuário fará isso manualmente.

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/generated/
git commit -m "feat(schema): add listing tracking fields and ListingHistory table"
```

---

## Task 2: Update Listing Validator to Accept New Fields

**Files:**
- Modify: `apps/api/src/validators/listing.validator.ts`

- [ ] **Step 1: Add new optional fields to listingItemSchema**

Replace the full file content:

```typescript
import { z } from 'zod';

const listingItemSchema = z.object({
  title: z.string({ error: 'Título é obrigatório' }).min(1, 'Título é obrigatório'),
  price: z.number({ error: 'Preço é obrigatório' }).positive('Preço deve ser positivo'),
  region: z.string({ error: 'Região é obrigatória' }).min(1, 'Região é obrigatória'),
  publishedAt: z.string().datetime().optional(),
  fbUrl: z.string({ error: 'URL do Facebook é obrigatória' }).url('URL inválida'),
  condition: z.string().optional(),
  imageUrl: z.string().url('URL da imagem inválida').optional(),
  description: z.string().optional(),
  sellerName: z.string().optional(),
  photoCount: z.number().int().min(0).optional(),
  publishedText: z.string().optional(),
  daysOnMarket: z.number().int().min(0).optional(),
  hasShipping: z.boolean().optional(),
});

export const createListingsSchema = z.object({
  modelId: z.string().uuid('ID do modelo inválido').optional(),
  listings: z
    .array(listingItemSchema, { error: 'Lista de anúncios é obrigatória' })
    .min(1, 'Envie pelo menos 1 anúncio'),
});

export const listListingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  modelId: z.string().uuid('ID do modelo inválido').optional(),
  region: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreateListingsInput = z.infer<typeof createListingsSchema>;
export type ListListingsQuery = z.infer<typeof listListingsQuerySchema>;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/validators/listing.validator.ts
git commit -m "feat(validator): accept new listing fields (description, seller, photos, etc)"
```

---

## Task 3: Update Listing Service with Upsert Logic

**Files:**
- Modify: `apps/api/src/services/listing.service.ts`

- [ ] **Step 1: Rewrite createListings with upsert + disappearance tracking**

Replace the full file:

```typescript
import { prisma } from '../lib/prisma';
import { CreateListingsInput, ListListingsQuery } from '../validators/listing.validator';
import { normalizeTitle } from './normalizer.service';

const OUTLIER_MIN = 200;
const OUTLIER_MAX = 15000;
const DISAPPEAR_THRESHOLD_HOURS = 48;

async function resolveModelIdFromTitle(title: string): Promise<string | null> {
  const normalized = normalizeTitle(title);
  if (!normalized) return null;

  const model = await prisma.phoneModel.findFirst({
    where: {
      brand: { equals: normalized.brand, mode: 'insensitive' },
      name: { equals: normalized.name, mode: 'insensitive' },
      storage: { equals: normalized.storage, mode: 'insensitive' },
    },
    select: { id: true },
  });

  return model?.id ?? null;
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

    const isOutlier = listing.price < OUTLIER_MIN || listing.price > OUTLIER_MAX;
    if (isOutlier) outliers++;

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
      await prisma.listing.create({
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
          isOutlier,
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
        model: { select: { id: true, brand: true, name: true, storage: true } },
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/listing.service.ts
git commit -m "feat(listings): upsert logic with lastSeenAt tracking and disappearance detection"
```

---

## Task 4: Add minPrice/maxPrice to Price Summary

**Files:**
- Modify: `apps/api/src/services/price.service.ts`

- [ ] **Step 1: Update getPriceSummary return to include min/max**

In the `.map()` callback at line ~152, change the return to:

```typescript
    .map((m: ModelWithListings) => {
      const prices = m.listings.map((l: { price: { toString(): string } }) => Number(l.price)).sort((a, b) => a - b);
      const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
      return {
        modelId: m.id,
        brand: m.brand,
        name: m.name,
        storage: m.storage,
        averagePrice: Math.round(avg * 100) / 100,
        minPrice: prices[0],
        maxPrice: prices[prices.length - 1],
        count: prices.length,
      };
    });
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/api && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/price.service.ts
git commit -m "feat(prices): add minPrice/maxPrice to summary endpoint"
```

---

## Task 5: Create Analytics Service

**Files:**
- Create: `apps/api/src/validators/analytics.validator.ts`
- Create: `apps/api/src/services/analytics.service.ts`

- [ ] **Step 1: Create analytics validator**

```typescript
// apps/api/src/validators/analytics.validator.ts
import { z } from 'zod';

export const velocityQuerySchema = z.object({
  modelId: z.string().uuid('ID do modelo inválido'),
  region: z.string().min(1, 'Região é obrigatória'),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const sellersQuerySchema = z.object({
  region: z.string().min(1, 'Região é obrigatória'),
});

export const marketHealthQuerySchema = z.object({
  modelId: z.string().uuid('ID do modelo inválido'),
  region: z.string().min(1, 'Região é obrigatória'),
});

export type VelocityQuery = z.infer<typeof velocityQuerySchema>;
export type SellersQuery = z.infer<typeof sellersQuerySchema>;
export type MarketHealthQuery = z.infer<typeof marketHealthQuerySchema>;
```

- [ ] **Step 2: Create analytics service**

```typescript
// apps/api/src/services/analytics.service.ts
import { prisma } from '../lib/prisma';
import { VelocityQuery, SellersQuery, MarketHealthQuery } from '../validators/analytics.validator';

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
      model: { select: { brand: true, name: true, storage: true } },
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
    entry.models.add(`${listing.model.brand} ${listing.model.name} ${listing.model.storage}`);
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
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/api && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/validators/analytics.validator.ts apps/api/src/services/analytics.service.ts
git commit -m "feat(analytics): add velocity, sellers, and market-health services"
```

---

## Task 6: Create Analytics Controller and Routes

**Files:**
- Create: `apps/api/src/controllers/analytics.controller.ts`
- Create: `apps/api/src/routes/analytics.routes.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Create analytics controller**

```typescript
// apps/api/src/controllers/analytics.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as analyticsService from '../services/analytics.service';

export async function getVelocity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await analyticsService.getVelocity(req.query as never);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getSellers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await analyticsService.getSellers(req.query as never);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getMarketHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await analyticsService.getMarketHealth(req.query as never);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 2: Create analytics routes**

```typescript
// apps/api/src/routes/analytics.routes.ts
import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { velocityQuerySchema, sellersQuerySchema, marketHealthQuerySchema } from '../validators/analytics.validator';
import * as analyticsController from '../controllers/analytics.controller';

const router = Router();

router.get('/velocity', authenticate, validate(velocityQuerySchema, 'query'), analyticsController.getVelocity);
router.get('/sellers', authenticate, validate(sellersQuerySchema, 'query'), analyticsController.getSellers);
router.get('/market-health', authenticate, validate(marketHealthQuerySchema, 'query'), analyticsController.getMarketHealth);

export default router;
```

- [ ] **Step 3: Register analytics routes in app.ts**

Add after the existing route registrations (after line 84 in `apps/api/src/app.ts`):

```typescript
import analyticsRoutes from './routes/analytics.routes';
// ... (with other imports at top)

// Add after line: app.use('/api/profit', profitRoutes);
app.use('/api/analytics', analyticsRoutes);
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd apps/api && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/controllers/analytics.controller.ts apps/api/src/routes/analytics.routes.ts apps/api/src/app.ts
git commit -m "feat(api): add /api/analytics routes (velocity, sellers, market-health)"
```

---

## Task 7: Expand Chrome Extension Scraper

**Files:**
- Modify: `apps/extension/src/services/scraper.ts`

- [ ] **Step 1: Add new fields to ScrapedListing interface and extraction logic**

Replace the full file:

```typescript
import { DEFECTIVE_KEYWORDS } from '../utils/constants';

export interface ScrapedListing {
  title: string;
  price: number;
  region: string;
  fbUrl: string;
  imageUrl?: string;
  condition?: string;
  description?: string;
  sellerName?: string;
  photoCount?: number;
  publishedText?: string;
  daysOnMarket?: number;
  hasShipping?: boolean;
}

export function parsePrice(text: string): number | null {
  const cleaned = text
    .replace(/R\$\s*/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const match = cleaned.match(/(\d+(?:\.\d{1,2})?)/);
  if (!match || !match[1]) return null;

  const value = parseFloat(match[1]);
  return isNaN(value) || value <= 0 ? null : value;
}

export function isDefective(title: string): boolean {
  const lower = title.toLowerCase();
  return DEFECTIVE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export function extractRegion(locationText: string): string {
  return locationText
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(Listado em|Listed in)\s*/i, '');
}

export function parseDateText(text: string): number {
  const lower = text.toLowerCase().trim();
  if (/ontem/.test(lower)) return 1;
  if (/h[áa]\s*(\d+)\s*minuto/i.test(lower)) return 0;
  if (/h[áa]\s*(\d+)\s*hora/i.test(lower)) return 0;

  const daysMatch = lower.match(/h[áa]\s*(\d+)\s*dia/i);
  if (daysMatch) return parseInt(daysMatch[1]!, 10);

  const weeksMatch = lower.match(/h[áa]\s*(\d+)\s*semana/i);
  if (weeksMatch) return parseInt(weeksMatch[1]!, 10) * 7;

  const monthsMatch = lower.match(/h[áa]\s*(\d+)\s*m[eê]s/i);
  if (monthsMatch) return parseInt(monthsMatch[1]!, 10) * 30;

  return 0;
}

export function extractListings(): ScrapedListing[] {
  const listings: ScrapedListing[] = [];
  const seenUrls = new Set<string>();

  // Strategy 1: Links to marketplace items
  const links = document.querySelectorAll('a[href*="/marketplace/item/"]');
  for (const link of links) {
    try {
      const listing = extractFromLink(link as HTMLAnchorElement);
      if (listing && !seenUrls.has(listing.fbUrl)) {
        seenUrls.add(listing.fbUrl);
        listings.push(listing);
      }
    } catch (err) {
      console.warn('[MarketPrice] Error extracting from link:', err);
    }
  }

  // Strategy 2: Broader search
  if (listings.length === 0) {
    const feedItems = document.querySelectorAll('[role="feed"] > div, [role="main"] a[href*="marketplace"]');
    for (const item of feedItems) {
      try {
        const link = item.tagName === 'A'
          ? item as HTMLAnchorElement
          : item.querySelector('a[href*="/marketplace/item/"]') as HTMLAnchorElement | null;
        if (!link) continue;

        const listing = extractFromLink(link);
        if (listing && !seenUrls.has(listing.fbUrl)) {
          seenUrls.add(listing.fbUrl);
          listings.push(listing);
        }
      } catch (err) {
        console.warn('[MarketPrice] Error extracting from feed item:', err);
      }
    }
  }

  console.log(`[MarketPrice] extractListings found ${listings.length} listings from ${links.length} links`);
  return listings;
}

function extractFromLink(linkEl: HTMLAnchorElement): ScrapedListing | null {
  const href = linkEl.href;
  if (!href || !href.includes('/marketplace/item/')) return null;
  const fbUrl = href.split('?')[0] ?? href;

  // Walk up to find the card container
  let card: Element | null = linkEl;
  for (let i = 0; i < 6; i++) {
    if (!card.parentElement) break;
    card = card.parentElement;
    if (card.children.length >= 2 && card.querySelector('img')) break;
  }
  if (!card) return null;

  const price = findPrice(card);
  if (price === null) return null;

  const title = findTitle(card, linkEl);
  if (!title || title.length < 3) return null;

  if (isDefective(title)) return null;

  const region = findRegion(card) ?? 'Desconhecida';

  const img = card.querySelector('img[src*="scontent"], img[src*="fbcdn"]') ?? card.querySelector('img');
  const imageUrl = img?.getAttribute('src') ?? undefined;

  // New fields — all optional, never crash
  const condition = findCondition(card);
  const description = findDescription(card, title);
  const sellerName = findSellerName(card);
  const photoCount = findPhotoCount(card);
  const publishedText = findPublishedText(card);
  const daysOnMarket = publishedText ? parseDateText(publishedText) : undefined;
  const hasShipping = findHasShipping(card);

  return {
    title,
    price,
    region,
    fbUrl,
    imageUrl,
    condition,
    description,
    sellerName,
    photoCount,
    publishedText,
    daysOnMarket,
    hasShipping,
  };
}

function findPrice(container: Element): number | null {
  const allText = container.querySelectorAll('span, div');
  for (const el of allText) {
    const text = el.textContent?.trim() ?? '';
    if (/R\$\s*[\d.,]+/.test(text) && text.length < 30) {
      const price = parsePrice(text);
      if (price !== null && price >= 50 && price <= 50000) return price;
    }
  }

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return /R\$\s*[\d.,]+/.test(node.textContent ?? '')
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const node = walker.nextNode();
  if (node?.textContent) {
    const price = parsePrice(node.textContent);
    if (price !== null && price >= 50 && price <= 50000) return price;
  }

  return null;
}

function findTitle(container: Element, linkEl: HTMLAnchorElement): string | null {
  const ariaLabel = linkEl.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.length > 5 && !ariaLabel.match(/^R\$/)) return ariaLabel;

  const spans = container.querySelectorAll('span');
  const candidates: Array<{ text: string; score: number }> = [];

  for (const span of spans) {
    const text = span.textContent?.trim() ?? '';
    if (text.length < 5 || text.length > 200) continue;
    if (/^R\$/.test(text)) continue;
    if (/^\d+[.,]\d/.test(text)) continue;
    if (text === 'Marketplace') continue;
    if (/^(Novo|Usado)$/.test(text)) continue;
    if (/^\d+\s*km/.test(text)) continue;

    let score = text.length;
    if (/iphone|samsung|galaxy|xiaomi|redmi|poco|gb|pro|max|ultra/i.test(text)) score += 50;
    candidates.push({ text, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.text ?? null;
}

function findRegion(container: Element): string | null {
  const spans = container.querySelectorAll('span');
  for (const span of spans) {
    const text = span.textContent?.trim() ?? '';
    if (text.length < 3 || text.length > 100) continue;
    if (/^R\$/.test(text)) continue;

    if (
      /\b[A-Z]{2}\b/.test(text) && text.includes(',') ||
      /\d+\s*km/i.test(text) ||
      /^[A-Z][a-záéíóúãõ]+/.test(text) && text.length < 50
    ) {
      return extractRegion(text);
    }
  }
  return null;
}

function findCondition(container: Element): string | undefined {
  const spans = container.querySelectorAll('span');
  for (const span of spans) {
    const text = span.textContent?.trim() ?? '';
    if (/^(Novo|Usado|Usado\s*[-–]\s*(bom estado|aceitável|como novo)|Recondicionado)$/i.test(text)) {
      return text;
    }
  }
  // Check aria-labels and badges
  const badges = container.querySelectorAll('[data-testid], [aria-label]');
  for (const badge of badges) {
    const label = badge.getAttribute('aria-label') ?? badge.textContent?.trim() ?? '';
    if (/novo|usado|recondicionado/i.test(label) && label.length < 40) {
      return label;
    }
  }
  return undefined;
}

function findDescription(container: Element, title: string): string | undefined {
  const spans = container.querySelectorAll('span');
  for (const span of spans) {
    const text = span.textContent?.trim() ?? '';
    if (text.length < 20 || text.length > 500) continue;
    if (/^R\$/.test(text)) continue;
    if (text === title) continue;
    // Descriptions are usually longer text blocks after title/price
    if (/\b(estado|funcionando|original|tela|bateria|caixa|carregador|garantia)\b/i.test(text)) {
      return text;
    }
  }
  return undefined;
}

function findSellerName(container: Element): string | undefined {
  // Seller names often appear in links to profiles or small spans
  const profileLinks = container.querySelectorAll('a[href*="/profile"], a[href*="/people/"], a[href*="facebook.com/"]');
  for (const link of profileLinks) {
    if (link.closest('a[href*="/marketplace/item/"]')) continue;
    const text = link.textContent?.trim() ?? '';
    if (text.length >= 2 && text.length <= 60 && !/marketplace|facebook/i.test(text)) {
      return text;
    }
  }
  // Fallback: look for spans that look like names (capitalized, short)
  const spans = container.querySelectorAll('span');
  for (const span of spans) {
    const text = span.textContent?.trim() ?? '';
    if (text.length < 3 || text.length > 40) continue;
    if (/^[A-ZÁÉÍÓÚÃÕ][a-záéíóúãõ]+(\s+[A-ZÁÉÍÓÚÃÕ][a-záéíóúãõ]+)+$/.test(text)) {
      if (!/iphone|samsung|galaxy|xiaomi|pro|max|ultra|gb/i.test(text)) {
        return text;
      }
    }
  }
  return undefined;
}

function findPhotoCount(container: Element): number | undefined {
  // Photo pagination dots
  const dots = container.querySelectorAll('[role="tablist"] [role="tab"], [data-visualcompletion] circle');
  if (dots.length > 1) return dots.length;

  // "1/5" pattern in photo counter
  const spans = container.querySelectorAll('span');
  for (const span of spans) {
    const text = span.textContent?.trim() ?? '';
    const match = text.match(/^(\d+)\s*[/\/]\s*(\d+)$/);
    if (match && match[2]) return parseInt(match[2], 10);
  }

  // Count img tags as fallback
  const imgs = container.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]');
  if (imgs.length > 1) return imgs.length;

  return undefined;
}

function findPublishedText(container: Element): string | undefined {
  const spans = container.querySelectorAll('span');
  for (const span of spans) {
    const text = span.textContent?.trim() ?? '';
    if (/publicado\s+h[áa]|listed\s+/i.test(text) && text.length < 60) {
      return text;
    }
    // Short time patterns: "há 2 dias", "ontem", "há 3 semanas"
    if (/^h[áa]\s+\d+\s+(minuto|hora|dia|semana|m[eê]s)/i.test(text)) {
      return text;
    }
    if (/^ontem$/i.test(text)) return text;
  }
  return undefined;
}

function findHasShipping(container: Element): boolean {
  const fullText = container.textContent?.toLowerCase() ?? '';
  return /envio\s+dispon[ií]vel|entrega\s+dispon[ií]vel|frete\s+gr[áa]tis|shipping/i.test(fullText);
}
```

- [ ] **Step 2: Verify extension builds**

Run: `cd apps/extension && npx webpack --mode production`
Expected: Build completes without errors

- [ ] **Step 3: Commit**

```bash
git add apps/extension/src/services/scraper.ts
git commit -m "feat(extension): extract 7 new fields (description, seller, photos, date, shipping)"
```

---

## Task 8: Create Web Analytics Service

**Files:**
- Create: `apps/web/src/services/analytics.ts`

- [ ] **Step 1: Create analytics API service**

```typescript
// apps/web/src/services/analytics.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/services/analytics.ts
git commit -m "feat(web): add analytics service (velocity, sellers, market-health)"
```

---

## Task 9: Create MarketInsight Component

**Files:**
- Create: `apps/web/src/components/shared/MarketInsight.tsx`

- [ ] **Step 1: Create the smart insights component**

```tsx
// apps/web/src/components/shared/MarketInsight.tsx
import { useQuery } from '@tanstack/react-query';
import { getVelocity, getMarketHealth, type VelocityData, type MarketHealthData } from '@/services/analytics';
import { formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

interface MarketInsightProps {
  modelId: string;
  modelName: string;
  region: string;
}

function buildInsights(
  velocity: VelocityData | undefined,
  health: MarketHealthData | undefined,
  modelName: string,
  region: string,
): Array<{ emoji: string; text: string; type: 'positive' | 'warning' | 'info' }> {
  const insights: Array<{ emoji: string; text: string; type: 'positive' | 'warning' | 'info' }> = [];

  if (velocity) {
    if (velocity.liquidityScore === 'alta') {
      insights.push({
        emoji: '🔥',
        text: `O ${modelName} está vendendo rápido — em média ${velocity.avgDaysOnMarket} dias na sua região.${velocity.suggestedSellingPrice > 0 ? ` Preço bom para vender: ${formatCurrency(velocity.suggestedSellingPrice)}` : ''}`,
        type: 'positive',
      });
    } else if (velocity.liquidityScore === 'baixa') {
      insights.push({
        emoji: '🐌',
        text: `O ${modelName} está demorando para vender (média de ${velocity.avgDaysOnMarket} dias). Considere ajustar o preço.`,
        type: 'warning',
      });
    }

    if (velocity.avgPriceDisappeared > 0 && velocity.avgPriceActive > 0) {
      const diff = velocity.avgPriceActive - velocity.avgPriceDisappeared;
      if (diff > 100) {
        insights.push({
          emoji: '💡',
          text: `Os anúncios que vendem pedem ${formatCurrency(velocity.avgPriceDisappeared)}, mas a média ativa é ${formatCurrency(velocity.avgPriceActive)}. Quem baixa o preço vende mais rápido.`,
          type: 'info',
        });
      }
    }
  }

  if (health) {
    if (health.supplyDemandScore === 'pouca oferta') {
      insights.push({
        emoji: '🔥',
        text: `Poucos ${modelName} disponíveis em ${region}. Boa oportunidade — menos concorrência!`,
        type: 'positive',
      });
    } else if (health.supplyDemandScore === 'muita oferta') {
      insights.push({
        emoji: '⚠️',
        text: `Muitos vendedores oferecendo ${modelName} em ${region}. Mercado competitivo — destaque seu anúncio com boas fotos e preço justo.`,
        type: 'warning',
      });
    }

    if (health.priceDirection === 'caindo') {
      insights.push({
        emoji: '📉',
        text: `Preços do ${modelName} estão caindo. Bom momento para comprar estoque!`,
        type: 'positive',
      });
    } else if (health.priceDirection === 'subindo') {
      insights.push({
        emoji: '📈',
        text: `Preços do ${modelName} estão subindo. Se tem estoque, é hora de vender!`,
        type: 'info',
      });
    }
  }

  return insights;
}

const typeStyles = {
  positive: 'border-[#22c55e]/20 bg-[#22c55e]/5',
  warning: 'border-[#fbbf24]/20 bg-[#fbbf24]/5',
  info: 'border-[#60a5fa]/20 bg-[#60a5fa]/5',
};

export function MarketInsight({ modelId, modelName, region }: MarketInsightProps) {
  const { data: velocity } = useQuery({
    queryKey: ['velocity', modelId, region],
    queryFn: () => getVelocity(modelId, region),
    enabled: !!modelId && !!region,
  });

  const { data: health } = useQuery({
    queryKey: ['market-health', modelId, region],
    queryFn: () => getMarketHealth(modelId, region),
    enabled: !!modelId && !!region,
  });

  const insights = buildInsights(velocity, health, modelName, region);

  if (insights.length === 0) return null;

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-[#f0f0f5]/70">
        Dicas do Mercado
      </h3>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={`rounded-lg border px-4 py-3 text-sm text-[#f0f0f5]/80 ${typeStyles[insight.type]}`}
          >
            <span className="mr-2">{insight.emoji}</span>
            {insight.text}
          </div>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Verify web build**

Run: `cd apps/web && npx vite build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/shared/MarketInsight.tsx
git commit -m "feat(web): add MarketInsight component with smart tips for resellers"
```

---

## Task 10: Add Market Vision Section to Dashboard

**Files:**
- Modify: `apps/web/src/pages/Dashboard.tsx`

- [ ] **Step 1: Add "Visão de Mercado" section below PriceCards**

Add imports at the top of Dashboard.tsx:

```typescript
import { Zap, Target, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getVelocity, getMarketHealth, type VelocityData, type MarketHealthData } from '@/services/analytics';
import { formatCurrency } from '@/lib/utils';
import { HelpTip } from '@/components/ui/HelpTip';
```

Add a new query after the existing summaries query (around line 35):

```typescript
  // Fetch velocity for the top model (most listings)
  const topModel = summaries && summaries.length > 0
    ? summaries.reduce((a, b) => (a.count > b.count ? a : b))
    : null;

  const { data: velocity } = useQuery<VelocityData>({
    queryKey: ['velocity-dashboard', topModel?.modelId, effectiveRegion],
    queryFn: () => getVelocity(topModel!.modelId, effectiveRegion),
    enabled: !!topModel && !!effectiveRegion,
  });

  const { data: marketHealth } = useQuery<MarketHealthData>({
    queryKey: ['market-health-dashboard', topModel?.modelId, effectiveRegion],
    queryFn: () => getMarketHealth(topModel!.modelId, effectiveRegion),
    enabled: !!topModel && !!effectiveRegion,
  });
```

Add this JSX after the PriceCards grid `</div>` (before the OnboardingModal):

```tsx
      {/* Market Vision */}
      {velocity && marketHealth && topModel && (
        <div>
          <h2 className="mb-4 text-sm font-semibold text-[#f0f0f5]/50 uppercase tracking-wider">
            Visão de Mercado
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#22c55e]/10">
                  <Zap className="h-5 w-5 text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#f0f0f5]/50">
                    Liquidez <HelpTip text="Quão rápido esse modelo vende. Alta = vende em poucos dias. Baixa = demora semanas." />
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-bold text-[#f0f0f5]">
                    {velocity.avgDaysOnMarket} dias
                  </p>
                  <p className="text-xs text-[#f0f0f5]/40">
                    {velocity.liquidityScore === 'alta' ? 'Vende rápido' : velocity.liquidityScore === 'média' ? 'Velocidade normal' : 'Demora para vender'}
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#60a5fa]/10">
                  <Target className="h-5 w-5 text-[#60a5fa]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#f0f0f5]/50">
                    Preço que Vende <HelpTip text="Preço médio dos anúncios que desapareceram (provavelmente vendidos). É o preço REAL, não o que as pessoas pedem." />
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-bold text-[#22c55e]">
                    {velocity.suggestedSellingPrice > 0 ? formatCurrency(velocity.suggestedSellingPrice) : '—'}
                  </p>
                  <p className="text-xs text-[#f0f0f5]/40">
                    {velocity.disappearedCount} vendidos recentemente
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fbbf24]/10">
                  <Activity className="h-5 w-5 text-[#fbbf24]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#f0f0f5]/50">
                    Saúde do Mercado
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-[#f0f0f5] capitalize">
                    {marketHealth.supplyDemandScore}
                  </p>
                  <p className="text-xs text-[#f0f0f5]/40">
                    {marketHealth.totalActive} ativos · {marketHealth.newLast7d} novos esta semana
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
```

- [ ] **Step 2: Verify web build**

Run: `cd apps/web && npx vite build`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/Dashboard.tsx
git commit -m "feat(dashboard): add Visão de Mercado section with liquidity, sell price, and health"
```

---

## Task 11: Add Velocity, Quality, and Competition Sections to Analysis Page

**Files:**
- Modify: `apps/web/src/pages/Analysis.tsx`

- [ ] **Step 1: Add analytics imports and queries**

Add to imports:

```typescript
import { getVelocity, getSellers, getMarketHealth, type VelocityData, type SellersResponse, type MarketHealthData } from '@/services/analytics';
import { MarketInsight } from '@/components/shared/MarketInsight';
import { Badge } from '@/components/ui/Badge';
```

Add queries after existing queries (after `listingsData` query, ~line 118):

```typescript
  const { data: velocity } = useQuery<VelocityData>({
    queryKey: ['velocity', modelId, region],
    queryFn: () => getVelocity(modelId, region),
    enabled: canQuery,
  });

  const { data: sellersData } = useQuery<SellersResponse>({
    queryKey: ['sellers', region],
    queryFn: () => getSellers(region),
    enabled: !!region,
  });

  const { data: marketHealth } = useQuery<MarketHealthData>({
    queryKey: ['market-health', modelId, region],
    queryFn: () => getMarketHealth(modelId, region),
    enabled: canQuery,
  });

  // Get model name for MarketInsight
  const selectedModelName = listingsData?.listings?.[0]?.model
    ? `${listingsData.listings[0].model.name} ${listingsData.listings[0].model.storage}`
    : '';
```

- [ ] **Step 2: Add new sections after stats grid, before price history chart**

Insert after the stats grid `</div>` (~line 248) and before the price history chart `<Card>`:

```tsx
          {/* Market Insights */}
          {selectedModelName && (
            <MarketInsight modelId={modelId} modelName={selectedModelName} region={region} />
          )}

          {/* Velocity Section */}
          {velocity && (
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]/70">
                Velocidade de Venda <HelpTip text="Quão rápido esse modelo vende na sua região. Baseado em anúncios que desapareceram." />
              </h3>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-[#f0f0f5]/50">Vende em média em</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#f0f0f5]">
                    {velocity.avgDaysOnMarket} dias
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#f0f0f5]/50">
                    Liquidez <HelpTip text="Alta = vende em poucos dias. Baixa = demora semanas." />
                  </p>
                  <div className="mt-1">
                    <Badge variant={velocity.liquidityScore === 'alta' ? 'success' : velocity.liquidityScore === 'média' ? 'warning' : 'danger'}>
                      {velocity.liquidityScore.charAt(0).toUpperCase() + velocity.liquidityScore.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#f0f0f5]/50">
                    Preço que vende <HelpTip text="Preço médio dos anúncios que desapareceram (provavelmente vendidos). É o preço REAL de venda." />
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold text-[#22c55e]">
                    {velocity.suggestedSellingPrice > 0 ? formatCurrency(velocity.suggestedSellingPrice) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#f0f0f5]/50">Preço pedido (ativos)</p>
                  <p className="mt-1 font-mono text-xl font-bold text-[#f0f0f5]/70">
                    {velocity.avgPriceActive > 0 ? formatCurrency(velocity.avgPriceActive) : '—'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Competition Section */}
          {sellersData && sellersData.sellers.length > 0 && (
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]/70">
                Concorrência na Região
              </h3>
              <p className="mb-3 text-xs text-[#f0f0f5]/40">
                {sellersData.sellers.length} vendedores ativos em {region}
                {sellersData.sellers.length > 15 && ' — mercado muito competitivo'}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left text-xs text-[#f0f0f5]/50">
                      <th className="pb-2 pr-4 font-medium">Vendedor</th>
                      <th className="pb-2 pr-4 font-medium">Anúncios</th>
                      <th className="pb-2 pr-4 font-medium">Preço Médio</th>
                      <th className="hidden pb-2 font-medium sm:table-cell">Modelos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {sellersData.sellers.slice(0, 5).map((seller) => (
                      <tr key={seller.name} className="text-[#f0f0f5]/80">
                        <td className="py-2 pr-4">{seller.name}</td>
                        <td className="py-2 pr-4 font-mono">{seller.listingCount}</td>
                        <td className="py-2 pr-4 font-mono text-[#22c55e]">{formatCurrency(seller.avgPrice)}</td>
                        <td className="hidden py-2 text-xs text-[#f0f0f5]/40 sm:table-cell">
                          {seller.models.slice(0, 3).join(', ')}
                          {seller.models.length > 3 && ` +${seller.models.length - 3}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
```

- [ ] **Step 3: Verify web build**

Run: `cd apps/web && npx vite build`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/Analysis.tsx
git commit -m "feat(analysis): add velocity, competition, and market insight sections"
```

---

## Task 12: Add Suggested Price and Sell Time to Calculator

**Files:**
- Modify: `apps/web/src/pages/Calculator.tsx`

- [ ] **Step 1: Add velocity query and display**

Add import:

```typescript
import { getVelocity, type VelocityData } from '@/services/analytics';
import { useQuery } from '@tanstack/react-query';
```

Note: `useQuery` is already imported — just add the analytics import.

Add velocity query after the existing `analysis` query (~line 78):

```typescript
  const { data: velocity } = useQuery<VelocityData>({
    queryKey: ['velocity-calc', state.modelId, state.region],
    queryFn: () => getVelocity(state.modelId, state.region),
    enabled: !!state.modelId && !!state.region,
  });
```

Update the `useEffect` that auto-fills selling price (~line 82) to prefer suggested price:

```typescript
  useEffect(() => {
    if (state.sellingPrice === 0) {
      const suggested = velocity?.suggestedSellingPrice;
      if (suggested && suggested > 0) {
        setState((prev) => ({ ...prev, sellingPrice: Math.round(suggested) }));
      } else if (analysis?.average) {
        setState((prev) => ({ ...prev, sellingPrice: Math.round(analysis.average) }));
      }
    }
  }, [analysis?.average, velocity?.suggestedSellingPrice]);
```

Add info below the market average text (~line 138, after the `analysis &&` block):

```tsx
            {velocity && (
              <div className="space-y-1">
                {velocity.suggestedSellingPrice > 0 && (
                  <p className="text-xs text-[#f0f0f5]/40">
                    Preço que vende:{' '}
                    <span className="font-mono text-[#22c55e]">
                      {formatCurrency(velocity.suggestedSellingPrice)}
                    </span>
                    {' '}<HelpTip text="Preço médio dos anúncios que desapareceram (provavelmente vendidos). É o preço REAL de venda." />
                  </p>
                )}
                <p className="text-xs text-[#f0f0f5]/40">
                  Tempo estimado para vender:{' '}
                  <span className="font-mono text-[#60a5fa]">
                    ~{velocity.avgDaysOnMarket} dias
                  </span>
                </p>
              </div>
            )}
```

After the ROI card (~line 316), add an opportunity score card:

```tsx
                {velocity && result && (
                  <Card className="col-span-2">
                    <p className="text-xs font-medium text-[#f0f0f5]/50">
                      Score de Oportunidade <HelpTip text="Combina margem de lucro com velocidade de venda. Quanto maior, melhor o negócio." />
                    </p>
                    <div className="mt-1 flex items-baseline gap-3">
                      <p className={`font-mono text-xl font-bold ${
                        result.marginPercent >= 15 && velocity.liquidityScore !== 'baixa'
                          ? 'text-[#22c55e]'
                          : result.marginPercent >= 5
                            ? 'text-[#fbbf24]'
                            : 'text-[#f87171]'
                      }`}>
                        {result.marginPercent >= 15 && velocity.liquidityScore === 'alta'
                          ? 'Excelente'
                          : result.marginPercent >= 15 && velocity.liquidityScore === 'média'
                            ? 'Bom'
                            : result.marginPercent >= 5
                              ? 'Regular'
                              : 'Ruim'}
                      </p>
                      <p className="text-xs text-[#f0f0f5]/40">
                        Margem {formatPercent(result.marginPercent)} · Vende em ~{velocity.avgDaysOnMarket}d
                      </p>
                    </div>
                  </Card>
                )}
```

- [ ] **Step 2: Verify web build**

Run: `cd apps/web && npx vite build`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/Calculator.tsx
git commit -m "feat(calculator): add suggested sell price, estimated sell time, and opportunity score"
```

---

## Task 13: Complete Tooltips for Leigos

**Files:**
- Modify: `apps/web/src/pages/Dashboard.tsx` — already done in Task 10
- Modify: `apps/web/src/pages/Analysis.tsx` — already partially done, verify completeness
- Modify: `apps/web/src/pages/Suppliers.tsx` — add tooltips

- [ ] **Step 1: Add tooltips to Suppliers page**

Add import at top of `apps/web/src/pages/Suppliers.tsx`:

```typescript
import { HelpTip } from '@/components/ui/HelpTip';
```

Replace the summary card labels with tooltip-enriched versions:

- "Margem Média" → `Margem Média <HelpTip text="Quanto você lucra em porcentagem. 15% de margem em R$ 4.000 = R$ 600 de lucro." />`
- "Melhor Margem" → stays as is
- "Pior Margem" → stays as is
- In the table header "Média Mercado" → `Média Mercado <HelpTip text="Soma de todos os preços dividida pelo total. É o preço 'normal' do mercado." />`
- "Recomendação" → `Recomendação <HelpTip text="Baseado na diferença entre preço do fornecedor e a média de mercado. Verde = lucro bom." />`

- [ ] **Step 2: Verify both API and web compile**

Run: `cd apps/api && npx tsc --noEmit && cd ../web && npx vite build`
Expected: Both succeed, 0 errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/Suppliers.tsx
git commit -m "feat(tooltips): add HelpTip tooltips for leigos across Suppliers page"
```

---

## Task 14: Final Build Verification

- [ ] **Step 1: Verify API compiles**

Run: `cd apps/api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Verify web builds**

Run: `cd apps/web && npx vite build`
Expected: Build succeeds

- [ ] **Step 3: Verify extension builds**

Run: `cd apps/extension && npx webpack --mode production`
Expected: Build succeeds

- [ ] **Step 4: Final commit if any remaining changes**

```bash
git add -A
git status
# Only commit if there are changes
git commit -m "chore: final build verification for expanded capture + smart indicators"
```
