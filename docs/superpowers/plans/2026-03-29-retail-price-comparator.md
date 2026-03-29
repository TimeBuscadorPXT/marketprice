# Retail Price Comparator (Seminovo vs Novo) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add retail price comparison (new/sealed prices from Mercado Livre) to MarketPrice so resellers can see if a used listing is actually a good deal compared to buying new.

**Architecture:** Scrape Mercado Livre search results for new/sealed prices per product model. Store in `RetailPrice` table. Expose via API. Display comparison in Deals modal, Analysis page, and Calculator. Factor retail distance into deal scoring.

**Tech Stack:** Prisma (new model), node-fetch (scraping), Cheerio (HTML parsing), React, Recharts

**Spec:** Notion page `332f28bd865e81868490fefcdbb7c1ae`

---

## File Structure

### New files
- `apps/api/src/services/retail-scraper.service.ts` — Scrapes Mercado Livre for new product prices
- `apps/api/src/services/retail-price.service.ts` — Business logic: fetch/compare retail vs used prices
- `apps/api/src/controllers/retail-price.controller.ts` — HTTP handlers
- `apps/api/src/routes/retail-prices.routes.ts` — Route definitions
- `apps/api/src/validators/retail-price.validator.ts` — Zod schemas
- `apps/web/src/services/retail-prices.ts` — Frontend API client
- `apps/web/src/components/shared/RetailComparison.tsx` — Reusable comparison UI component

### Modified files
- `apps/api/prisma/schema.prisma` — Add RetailPrice model
- `apps/api/src/app.ts` — Register retail-prices routes
- `apps/api/src/services/deals.service.ts` — Add retail price to DealResult, update scoring
- `apps/web/src/services/deals.ts` — Add retail fields to Deal interface
- `apps/web/src/pages/Deals.tsx` — Show retail comparison in DealDetailModal
- `apps/web/src/pages/Analysis.tsx` — Add retail comparison section
- `apps/web/src/pages/Calculator.tsx` — Show retail price reference

---

## Task 1: Database — RetailPrice Model

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add RetailPrice model to schema**

Add after the Product model (after line 42) in `apps/api/prisma/schema.prisma`:

```prisma
model RetailPrice {
  id          String   @id @default(uuid())
  modelId     String   @map("model_id")
  marketplace String
  price       Decimal  @db.Decimal(10, 2)
  condition   String   @default("novo")
  sellerType  String   @default("terceiro") @map("seller_type")
  url         String?
  fetchedAt   DateTime @default(now()) @map("fetched_at")
  isActive    Boolean  @default(true) @map("is_active")

  model Product @relation(fields: [modelId], references: [id])

  @@index([modelId, marketplace])
  @@index([fetchedAt])
  @@map("retail_prices")
}
```

Also add the relation to the Product model:

```prisma
model Product {
  // ... existing fields ...
  retailPrices   RetailPrice[]
  // ... existing relations ...
}
```

- [ ] **Step 2: Push schema and regenerate**

```bash
cd apps/api
npx prisma db push
npx prisma generate
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat: add RetailPrice model for new/sealed price tracking"
```

---

## Task 2: Mercado Livre Scraper Service

**Files:**
- Create: `apps/api/src/services/retail-scraper.service.ts`

- [ ] **Step 1: Create the scraper service**

```typescript
// apps/api/src/services/retail-scraper.service.ts

interface ScrapedRetailPrice {
  title: string;
  price: number;
  url: string;
  sellerType: 'oficial' | 'terceiro';
  condition: 'novo' | 'recondicionado';
}

const ML_BASE_URL = 'https://lista.mercadolivre.com.br';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function buildSearchUrl(query: string): string {
  const encoded = encodeURIComponent(query);
  // Filter: new items only, sort by price ascending
  return `${ML_BASE_URL}/${encoded}_Filt_ITEM_CONDITION_2230284_OrderId_PRICE_NoIndex_True`;
}

function buildSearchQuery(brand: string, name: string, variant: string, category: string): string {
  if (category === 'phone') {
    return `${brand} ${name} ${variant} novo lacrado`;
  }
  if (category === 'console') {
    return `${name} novo lacrado`;
  }
  if (category === 'notebook') {
    return `${brand} ${name} ${variant} novo`;
  }
  if (category === 'car' || category === 'motorcycle') {
    // Cars/motos don't have "new sealed" on ML — skip
    return '';
  }
  return `${brand} ${name} ${variant} novo`;
}

function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) || num <= 0 ? null : num;
}

export async function scrapeRetailPrices(
  brand: string,
  name: string,
  variant: string,
  category: string,
): Promise<ScrapedRetailPrice[]> {
  const query = buildSearchQuery(brand, name, variant, category);
  if (!query) return [];

  const url = buildSearchUrl(query);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`[RetailScraper] ML returned ${response.status} for: ${query}`);
      return [];
    }

    const html = await response.text();
    return parseMLResults(html);
  } catch (err) {
    console.warn(`[RetailScraper] Error scraping ML for: ${query}`, err);
    return [];
  }
}

function parseMLResults(html: string): ScrapedRetailPrice[] {
  const results: ScrapedRetailPrice[] = [];

  // ML renders search results in <li> elements with class "ui-search-layout__item"
  // Each item has price in a class containing "price-tag-fraction" and link in an <a> tag
  // We use regex parsing to avoid cheerio dependency

  // Extract individual result blocks
  const itemRegex = /<li[^>]*class="[^"]*ui-search-layout__item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(html)) !== null) {
    const block = itemMatch[1];
    if (!block) continue;

    // Extract price
    const priceMatch = block.match(/class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([^<]+)</);
    if (!priceMatch || !priceMatch[1]) continue;

    const price = parsePrice(priceMatch[1]);
    if (!price || price < 50) continue;

    // Check for cents
    let cents = 0;
    const centsMatch = block.match(/class="[^"]*andes-money-amount__cents[^"]*"[^>]*>(\d+)</);
    if (centsMatch && centsMatch[1]) {
      cents = parseInt(centsMatch[1], 10) / 100;
    }

    const finalPrice = price + cents;

    // Extract URL
    const urlMatch = block.match(/href="(https:\/\/[^"]*mercadolivre[^"]*item[^"]*)"/);
    const itemUrl = urlMatch?.[1] ?? '';

    // Check if official store
    const isOficial = /official-store|loja oficial|full/i.test(block);

    // Check condition — skip if "usado" or "recondicionado" in the block
    if (/usado|seminovo|recondicionado|refurbished/i.test(block)) continue;

    results.push({
      title: '', // Not needed for storage
      price: finalPrice,
      url: itemUrl,
      sellerType: isOficial ? 'oficial' : 'terceiro',
      condition: 'novo',
    });

    // Limit to first 10 results
    if (results.length >= 10) break;
  }

  return results;
}

export function getLowestRetailPrice(prices: ScrapedRetailPrice[]): ScrapedRetailPrice | null {
  if (prices.length === 0) return null;
  return prices.reduce((min, p) => p.price < min.price ? p : min, prices[0]!);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/services/retail-scraper.service.ts
git commit -m "feat: Mercado Livre scraper for retail prices"
```

---

## Task 3: Retail Price Business Logic Service

**Files:**
- Create: `apps/api/src/services/retail-price.service.ts`

- [ ] **Step 1: Create the retail price service**

```typescript
// apps/api/src/services/retail-price.service.ts
import { prisma } from '../lib/prisma';
import { scrapeRetailPrices, getLowestRetailPrice } from './retail-scraper.service';

const CACHE_HOURS = 24; // Only re-scrape once per day per model

export interface RetailPriceComparison {
  retailPrice: number | null;
  retailUrl: string | null;
  marketplace: string;
  discount: number | null; // % below retail
  verdict: 'hot' | 'good' | 'tight' | 'bad' | null;
  verdictLabel: string | null;
}

function classifyDiscount(discountPercent: number): { verdict: RetailPriceComparison['verdict']; label: string } {
  if (discountPercent >= 40) return { verdict: 'hot', label: 'Oportunidade quente' };
  if (discountPercent >= 25) return { verdict: 'good', label: 'Boa oportunidade' };
  if (discountPercent >= 15) return { verdict: 'tight', label: 'Margem apertada' };
  return { verdict: 'bad', label: 'Não compensa — próximo do novo' };
}

export async function getRetailComparison(
  modelId: string,
  usedPrice: number,
): Promise<RetailPriceComparison> {
  const empty: RetailPriceComparison = {
    retailPrice: null, retailUrl: null, marketplace: 'mercado_livre',
    discount: null, verdict: null, verdictLabel: null,
  };

  // Check cache first
  const cached = await prisma.retailPrice.findFirst({
    where: {
      modelId,
      isActive: true,
      fetchedAt: { gte: new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000) },
    },
    orderBy: { price: 'asc' },
  });

  if (cached) {
    const retailPrice = Number(cached.price);
    const discountPercent = ((retailPrice - usedPrice) / retailPrice) * 100;
    const { verdict, label } = classifyDiscount(discountPercent);
    return {
      retailPrice,
      retailUrl: cached.url,
      marketplace: cached.marketplace,
      discount: Math.round(discountPercent * 10) / 10,
      verdict,
      verdictLabel: label,
    };
  }

  // No cache — scrape
  const model = await prisma.product.findUnique({
    where: { id: modelId },
    select: { brand: true, name: true, variant: true, category: true },
  });

  if (!model) return empty;

  const scraped = await scrapeRetailPrices(model.brand, model.name, model.variant, model.category);
  const lowest = getLowestRetailPrice(scraped);

  if (!lowest) return empty;

  // Save to DB
  await prisma.retailPrice.create({
    data: {
      modelId,
      marketplace: 'mercado_livre',
      price: lowest.price,
      condition: lowest.condition,
      sellerType: lowest.sellerType,
      url: lowest.url || null,
    },
  });

  const discountPercent = ((lowest.price - usedPrice) / lowest.price) * 100;
  const { verdict, label } = classifyDiscount(discountPercent);

  return {
    retailPrice: lowest.price,
    retailUrl: lowest.url || null,
    marketplace: 'mercado_livre',
    discount: Math.round(discountPercent * 10) / 10,
    verdict,
    verdictLabel: label,
  };
}

export async function getRetailPricesForModel(modelId: string) {
  return prisma.retailPrice.findMany({
    where: { modelId, isActive: true },
    orderBy: { fetchedAt: 'desc' },
    take: 10,
  });
}

export async function refreshRetailPrice(modelId: string): Promise<boolean> {
  const model = await prisma.product.findUnique({
    where: { id: modelId },
    select: { brand: true, name: true, variant: true, category: true },
  });

  if (!model) return false;

  // Mark old prices as inactive
  await prisma.retailPrice.updateMany({
    where: { modelId },
    data: { isActive: false },
  });

  const scraped = await scrapeRetailPrices(model.brand, model.name, model.variant, model.category);

  if (scraped.length === 0) return false;

  await prisma.retailPrice.createMany({
    data: scraped.map((s) => ({
      modelId,
      marketplace: 'mercado_livre',
      price: s.price,
      condition: s.condition,
      sellerType: s.sellerType,
      url: s.url || null,
    })),
  });

  return true;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/services/retail-price.service.ts
git commit -m "feat: retail price comparison service with caching"
```

---

## Task 4: API — Validator, Controller, Routes

**Files:**
- Create: `apps/api/src/validators/retail-price.validator.ts`
- Create: `apps/api/src/controllers/retail-price.controller.ts`
- Create: `apps/api/src/routes/retail-prices.routes.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Create validator**

```typescript
// apps/api/src/validators/retail-price.validator.ts
import { z } from 'zod';

export const retailPriceQuerySchema = z.object({
  modelId: z.string().uuid('ID do modelo inválido'),
});

export const retailCompareSchema = z.object({
  modelId: z.string().uuid('ID do modelo inválido'),
  usedPrice: z.coerce.number().positive('Preço deve ser positivo'),
});

export const retailRefreshSchema = z.object({
  modelId: z.string().uuid('ID do modelo inválido'),
});

export type RetailPriceQuery = z.infer<typeof retailPriceQuerySchema>;
export type RetailCompareQuery = z.infer<typeof retailCompareSchema>;
```

- [ ] **Step 2: Create controller**

```typescript
// apps/api/src/controllers/retail-price.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as retailService from '../services/retail-price.service';

export async function getRetailPrices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { modelId } = req.query as { modelId: string };
    const prices = await retailService.getRetailPricesForModel(modelId);
    res.json({ success: true, data: prices });
  } catch (err) {
    next(err);
  }
}

export async function compareRetailPrice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { modelId, usedPrice } = req.query as { modelId: string; usedPrice: string };
    const comparison = await retailService.getRetailComparison(modelId, Number(usedPrice));
    res.json({ success: true, data: comparison });
  } catch (err) {
    next(err);
  }
}

export async function refreshRetailPrice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { modelId } = req.body as { modelId: string };
    const result = await retailService.refreshRetailPrice(modelId);
    res.json({ success: true, data: { refreshed: result } });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 3: Create routes**

```typescript
// apps/api/src/routes/retail-prices.routes.ts
import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { retailPriceQuerySchema, retailCompareSchema, retailRefreshSchema } from '../validators/retail-price.validator';
import * as retailController from '../controllers/retail-price.controller';

const router = Router();

router.get('/', authenticate, validate(retailPriceQuerySchema, 'query'), retailController.getRetailPrices);
router.get('/compare', authenticate, validate(retailCompareSchema, 'query'), retailController.compareRetailPrice);
router.post('/refresh', authenticate, validate(retailRefreshSchema), retailController.refreshRetailPrice);

export default router;
```

- [ ] **Step 4: Register routes in app.ts**

In `apps/api/src/app.ts`, add import and use:

```typescript
import retailPricesRoutes from './routes/retail-prices.routes';
// ...
app.use('/api/retail-prices', retailPricesRoutes);
```

Add after line 94 (`app.use('/api/ai', aiRoutes);`).

- [ ] **Step 5: Verify typecheck**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | grep -v "generated" | grep -v "test" | head -10
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/validators/retail-price.validator.ts apps/api/src/controllers/retail-price.controller.ts apps/api/src/routes/retail-prices.routes.ts apps/api/src/app.ts
git commit -m "feat: retail price API endpoints — compare, list, refresh"
```

---

## Task 5: Integrate Retail Price into Deals

**Files:**
- Modify: `apps/api/src/services/deals.service.ts`
- Modify: `apps/web/src/services/deals.ts`

- [ ] **Step 1: Add retail fields to DealResult interface**

In `apps/api/src/services/deals.service.ts`, add to the DealResult interface (after `aiRecommendation`):

```typescript
  retailPrice: number | null;
  retailDiscount: number | null;
  retailVerdict: string | null;
  retailUrl: string | null;
```

- [ ] **Step 2: Fetch retail prices in getDeals**

In the `getDeals` function, after building `allDeals`, enrich with retail data. Add BEFORE the sort (before `allDeals.sort`):

```typescript
// Enrich with retail prices (batch — one query per model)
const modelIds = [...new Set(allDeals.map(d => d.model.id))];
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
```

In `allDeals.push`, set defaults:

```typescript
retailPrice: null,
retailDiscount: null,
retailVerdict: null,
retailUrl: null,
```

- [ ] **Step 3: Update frontend Deal interface**

In `apps/web/src/services/deals.ts`, add to the Deal interface:

```typescript
  retailPrice?: number | null;
  retailDiscount?: number | null;
  retailVerdict?: string | null;
  retailUrl?: string | null;
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/services/deals.service.ts apps/web/src/services/deals.ts
git commit -m "feat: enrich deals with retail price comparison data"
```

---

## Task 6: Frontend — RetailComparison Component

**Files:**
- Create: `apps/web/src/components/shared/RetailComparison.tsx`
- Create: `apps/web/src/services/retail-prices.ts`

- [ ] **Step 1: Create frontend retail prices service**

```typescript
// apps/web/src/services/retail-prices.ts
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

export async function refreshRetailPrice(modelId: string): Promise<boolean> {
  const { data } = await api.post('/retail-prices/refresh', { modelId });
  return data.data.refreshed;
}
```

- [ ] **Step 2: Create RetailComparison component**

```tsx
// apps/web/src/components/shared/RetailComparison.tsx
import { ExternalLink, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface RetailComparisonProps {
  usedPrice: number;
  retailPrice: number | null;
  retailDiscount: number | null;
  retailVerdict: string | null;
  retailUrl: string | null;
}

const verdictStyles: Record<string, { bg: string; text: string }> = {
  'Oportunidade quente': { bg: 'bg-orange-500/15', text: 'text-orange-400' },
  'Boa oportunidade': { bg: 'bg-[#22c55e]/15', text: 'text-[#22c55e]' },
  'Margem apertada': { bg: 'bg-[#fbbf24]/15', text: 'text-[#fbbf24]' },
  'Não compensa — próximo do novo': { bg: 'bg-[#f87171]/15', text: 'text-[#f87171]' },
};

export function RetailComparison({ usedPrice, retailPrice, retailDiscount, retailVerdict, retailUrl }: RetailComparisonProps) {
  if (!retailPrice) return null;

  const style = retailVerdict ? verdictStyles[retailVerdict] ?? { bg: 'bg-white/[0.06]', text: 'text-[#f0f0f5]/60' } : { bg: 'bg-white/[0.06]', text: 'text-[#f0f0f5]/60' };
  const saving = retailPrice - usedPrice;

  return (
    <div className="rounded-xl bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center gap-2">
        <ShoppingBag className="h-4 w-4 text-[#60a5fa]" />
        <p className="text-xs font-medium text-[#f0f0f5]/60">Comparação com Novo (Mercado Livre)</p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#f0f0f5]/40">Preço novo lacrado</p>
          <p className="font-mono text-lg font-bold text-[#f0f0f5]/70">{formatCurrency(retailPrice)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-[#f0f0f5]/40">Economia vs novo</p>
          <p className="font-mono text-lg font-bold text-[#22c55e]">{formatCurrency(saving)}</p>
          {retailDiscount !== null && (
            <span className="font-mono text-xs text-[#f0f0f5]/40">({retailDiscount.toFixed(1).replace('.', ',')}% abaixo)</span>
          )}
        </div>
      </div>

      {retailVerdict && (
        <div className="mt-3 flex items-center justify-between">
          <span className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${style.bg} ${style.text}`}>
            {retailVerdict}
          </span>
          {retailUrl && (
            <a
              href={retailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-[#60a5fa] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
              Ver no ML
            </a>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/services/retail-prices.ts apps/web/src/components/shared/RetailComparison.tsx
git commit -m "feat: RetailComparison frontend component and service"
```

---

## Task 7: Integrate RetailComparison into Deals Page

**Files:**
- Modify: `apps/web/src/pages/Deals.tsx`

- [ ] **Step 1: Add RetailComparison to DealDetailModal**

Import the component at the top of Deals.tsx:

```typescript
import { RetailComparison } from '@/components/shared/RetailComparison';
```

In the DealDetailModal, add the RetailComparison component AFTER the price block and BEFORE the info grid. Find the closing `</div>` of the price block section and add:

```tsx
{/* Retail Price Comparison */}
<RetailComparison
  usedPrice={deal.price}
  retailPrice={deal.retailPrice ?? null}
  retailDiscount={deal.retailDiscount ?? null}
  retailVerdict={deal.retailVerdict ?? null}
  retailUrl={deal.retailUrl ?? null}
/>
```

- [ ] **Step 2: Add retail badge to DealCard**

In the DealCard component, after the flags section and before the footer buttons, add a small retail indicator:

```tsx
{deal.retailPrice && deal.retailDiscount !== undefined && deal.retailDiscount !== null && (
  <div className="mt-2 flex items-center gap-1.5">
    <ShoppingBag className="h-3 w-3 text-[#60a5fa]" />
    <span className="text-[10px] text-[#f0f0f5]/40">
      Novo: {formatCurrency(deal.retailPrice)} ({deal.retailDiscount.toFixed(0)}% abaixo)
    </span>
    {deal.retailDiscount < 15 && (
      <span className="rounded bg-[#f87171]/10 px-1 py-0.5 text-[9px] font-medium text-[#f87171]">
        Próximo do novo
      </span>
    )}
  </div>
)}
```

Add `ShoppingBag` to the lucide-react import.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/Deals.tsx
git commit -m "feat: show retail price comparison in deal cards and modal"
```

---

## Task 8: Retail Comparison in Analysis Page

**Files:**
- Modify: `apps/web/src/pages/Analysis.tsx`

- [ ] **Step 1: Add retail price section to Analysis page**

Read the Analysis.tsx file first to understand its structure. Then add:

1. Import the retail prices service:
```typescript
import { getRetailComparison, type RetailPriceComparison } from '@/services/retail-prices';
```

2. Add a query for retail comparison (needs modelId and average price from existing data):
```typescript
const { data: retailData } = useQuery<RetailPriceComparison>({
  queryKey: ['retail-comparison', modelId, priceData?.average],
  queryFn: () => getRetailComparison(modelId!, priceData?.average ?? 0),
  enabled: !!modelId && !!priceData?.average,
});
```

3. Add a section in the page layout (after the price stats, before the listings table) showing:

```tsx
{retailData?.retailPrice && (
  <Card>
    <h3 className="mb-3 text-sm font-semibold text-[#f0f0f5]/70">
      Comparação com Varejo (Novo Lacrado)
    </h3>
    <RetailComparison
      usedPrice={priceData?.average ?? 0}
      retailPrice={retailData.retailPrice}
      retailDiscount={retailData.discount}
      retailVerdict={retailData.verdictLabel}
      retailUrl={retailData.retailUrl}
    />
  </Card>
)}
```

Import RetailComparison component.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/Analysis.tsx
git commit -m "feat: retail price comparison section in Analysis page"
```

---

## Task 9: Retail Reference in Calculator

**Files:**
- Modify: `apps/web/src/pages/Calculator.tsx`

- [ ] **Step 1: Add retail price info to Calculator**

Read the Calculator.tsx file first. Then:

1. Import retail service:
```typescript
import { getRetailComparison, type RetailPriceComparison } from '@/services/retail-prices';
```

2. Add query when model is selected:
```typescript
const { data: retailData } = useQuery<RetailPriceComparison>({
  queryKey: ['retail-comparison', state.modelId, state.sellingPrice],
  queryFn: () => getRetailComparison(state.modelId, state.sellingPrice),
  enabled: !!state.modelId && state.sellingPrice > 0,
});
```

3. Add a warning below the selling price input when selling price is close to retail:
```tsx
{retailData?.retailPrice && state.sellingPrice > retailData.retailPrice * 0.85 && (
  <p className="mt-1 text-xs text-[#fbbf24]">
    Preço de venda está a {((1 - state.sellingPrice / retailData.retailPrice) * 100).toFixed(0)}% do novo
    ({formatCurrency(retailData.retailPrice)} no ML). Compradores podem preferir o novo.
  </p>
)}
```

4. Add retail price reference line:
```tsx
{retailData?.retailPrice && (
  <div className="flex items-center justify-between text-xs text-[#f0f0f5]/40">
    <span>Ref. novo (Mercado Livre):</span>
    <span className="font-mono">{formatCurrency(retailData.retailPrice)}</span>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/Calculator.tsx
git commit -m "feat: retail price reference in Calculator page"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Typecheck API**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | grep -v "generated" | grep -v "test" | head -10
```

- [ ] **Step 2: Typecheck Web**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -10
```

- [ ] **Step 3: Build extension**

```bash
cd apps/extension && npx webpack --mode production 2>&1 | tail -3
```

- [ ] **Step 4: Test the scraper manually**

```bash
cd apps/api && npx tsx -e "
  const { scrapeRetailPrices } = require('./src/services/retail-scraper.service');
  scrapeRetailPrices('Apple', 'iPhone 15 Pro Max', '256GB', 'phone').then(r => console.log(JSON.stringify(r.slice(0,3), null, 2)));
"
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: retail price comparator — seminovo vs novo (Mercado Livre)"
```
