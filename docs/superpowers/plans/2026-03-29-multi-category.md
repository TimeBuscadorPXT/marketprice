# Multi-Category Product Support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform MarketPrice from phone-only to multi-category (phones, consoles, notebooks, motorcycles, cars) with automatic category detection.

**Architecture:** Rename `PhoneModel` to `Product`, add `category` field, rename `storage` to `variant`. Each category has its own normalizer extractor, flag rules, and outlier thresholds defined in a central registry. Frontend gets a category filter that dynamically updates brands/labels.

**Tech Stack:** Prisma (migration), TypeScript, Express, React, Zod

**Spec:** `docs/superpowers/specs/2026-03-29-multi-category-design.md`

---

## File Structure

### New files
- `apps/api/src/config/categories.ts` — Category registry (labels, outlier thresholds, brands, variant labels)
- `apps/api/src/services/normalizers/phone.normalizer.ts` — Phone extraction (moved from normalizer.service.ts)
- `apps/api/src/services/normalizers/console.normalizer.ts` — Console extraction (PS5, Xbox, Switch)
- `apps/api/src/services/normalizers/notebook.normalizer.ts` — Notebook extraction (MacBook, Dell, Lenovo)
- `apps/api/src/services/normalizers/motorcycle.normalizer.ts` — Motorcycle extraction (Honda CG, Yamaha)
- `apps/api/src/services/normalizers/car.normalizer.ts` — Car extraction (Civic, Gol, Onix)
- `apps/api/src/services/normalizers/index.ts` — Multi-category orchestrator (replaces normalizer.service.ts)
- `apps/web/src/services/categories.ts` — Frontend categories API client

### Modified files
- `apps/api/prisma/schema.prisma` — Rename PhoneModel→Product, add category, rename storage→variant
- `apps/api/src/services/listing.service.ts` — Category-aware outliers, model resolution
- `apps/api/src/services/deals.service.ts` — prisma.product queries, category filtering
- `apps/api/src/services/model.service.ts` — prisma.product queries, category filtering
- `apps/api/src/services/price.service.ts` — prisma.product queries
- `apps/api/src/services/flag-detector.service.ts` — Per-category flag rules
- `apps/api/src/services/ai-analyst.service.ts` — prisma.product reference
- `apps/api/src/services/chat.service.ts` — prisma.product reference
- `apps/api/src/validators/deals.validator.ts` — Add category param
- `apps/api/src/validators/model.validator.ts` — Add category param
- `apps/api/src/controllers/model.controller.ts` — Pass category param
- `apps/api/src/routes/models.routes.ts` — Categories endpoint
- `apps/web/src/services/models.ts` — PhoneModel→Product interface
- `apps/web/src/services/deals.ts` — Deal model type update
- `apps/web/src/pages/Deals.tsx` — Category filter, dynamic brands
- `apps/web/src/pages/Dashboard.tsx` — Category filter, dynamic brands
- `apps/web/src/components/shared/ModelSelector.tsx` — Category-aware

---

## Task 1: Category Registry

**Files:**
- Create: `apps/api/src/config/categories.ts`

- [ ] **Step 1: Create category registry**

```typescript
// apps/api/src/config/categories.ts
export interface CategoryConfig {
  id: string;
  label: string;
  outlierMin: number;
  outlierMax: number;
  variantLabel: string;
  brands: string[];
}

export const CATEGORIES: Record<string, CategoryConfig> = {
  phone: {
    id: 'phone',
    label: 'Celulares',
    outlierMin: 200,
    outlierMax: 15000,
    variantLabel: 'Armazenamento',
    brands: ['Apple', 'Samsung', 'Xiaomi', 'Motorola'],
  },
  console: {
    id: 'console',
    label: 'Consoles',
    outlierMin: 200,
    outlierMax: 8000,
    variantLabel: 'Edição',
    brands: ['Sony', 'Microsoft', 'Nintendo'],
  },
  notebook: {
    id: 'notebook',
    label: 'Notebooks',
    outlierMin: 500,
    outlierMax: 20000,
    variantLabel: 'Spec',
    brands: ['Apple', 'Dell', 'Lenovo', 'Acer', 'Asus', 'HP', 'Samsung'],
  },
  motorcycle: {
    id: 'motorcycle',
    label: 'Motos',
    outlierMin: 2000,
    outlierMax: 150000,
    variantLabel: 'Cilindrada',
    brands: ['Honda', 'Yamaha', 'Suzuki', 'BMW', 'Kawasaki'],
  },
  car: {
    id: 'car',
    label: 'Carros',
    outlierMin: 5000,
    outlierMax: 500000,
    variantLabel: 'Ano',
    brands: ['Fiat', 'Volkswagen', 'Chevrolet', 'Honda', 'Toyota', 'Hyundai', 'Jeep', 'Renault', 'Ford', 'Nissan', 'BMW', 'Mercedes'],
  },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES);

export function getCategoryConfig(id: string): CategoryConfig | undefined {
  return CATEGORIES[id];
}

export function getAllCategories(): CategoryConfig[] {
  return Object.values(CATEGORIES);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/config/categories.ts
git commit -m "feat: add multi-category registry config"
```

---

## Task 2: Prisma Schema Migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Update schema — rename PhoneModel to Product**

Replace the PhoneModel block (lines 26-41) in `apps/api/prisma/schema.prisma` with:

```prisma
model Product {
  id       String   @id @default(uuid())
  category String   @default("phone")
  brand    String
  name     String
  variant  String   @default("")
  aliases  String[]

  listings       Listing[]
  suppliers      Supplier[]
  listingHistory ListingHistory[]
  alertRules     AlertRule[]

  @@unique([category, brand, name, variant])
  @@index([category, brand])
  @@map("products")
}
```

Also update all relation references in the file. In the `Listing` model, change:
```prisma
  model   PhoneModel       @relation(fields: [modelId], references: [id])
```
to:
```prisma
  model   Product          @relation(fields: [modelId], references: [id])
```

Same for `ListingHistory`, `Supplier`, and `AlertRule` — replace `PhoneModel` with `Product` in relation declarations.

- [ ] **Step 2: Create and apply migration**

```bash
cd apps/api
npx prisma migrate dev --name rename-phonemodel-to-product
```

This will:
1. Rename table `phone_models` → `products`
2. Rename column `storage` → `variant`
3. Add column `category` with default `'phone'`
4. Update constraints

If the auto-migration can't handle the rename, create a manual migration SQL:

```sql
ALTER TABLE "phone_models" RENAME TO "products";
ALTER TABLE "products" RENAME COLUMN "storage" TO "variant";
ALTER TABLE "products" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'phone';
ALTER TABLE "products" DROP CONSTRAINT "phone_models_brand_name_storage_key";
ALTER TABLE "products" ADD CONSTRAINT "products_category_brand_name_variant_key" UNIQUE ("category", "brand", "name", "variant");
DROP INDEX IF EXISTS "phone_models_brand_idx";
CREATE INDEX "products_category_brand_idx" ON "products"("category", "brand");
```

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit 2>&1 | head -5
```

Expected: Errors about `prisma.phoneModel` not existing (this is correct — we fix in next tasks).

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat: migrate PhoneModel to Product with category field"
```

---

## Task 3: Update All Backend Services — prisma.phoneModel → prisma.product

**Files:**
- Modify: `apps/api/src/services/model.service.ts`
- Modify: `apps/api/src/services/listing.service.ts`
- Modify: `apps/api/src/services/deals.service.ts`
- Modify: `apps/api/src/services/price.service.ts`
- Modify: `apps/api/src/services/ai-analyst.service.ts`
- Modify: `apps/api/src/services/chat.service.ts`

- [ ] **Step 1: Update model.service.ts**

Replace all `prisma.phoneModel` with `prisma.product`. Replace `storage` with `variant` in select/orderBy.

In `listModels` (line 4), add `category` parameter:

```typescript
export async function listModels(brand?: string, category?: string) {
  const where: Record<string, unknown> = {};
  if (brand) where.brand = { equals: brand, mode: 'insensitive' };
  if (category) where.category = category;

  const models = await prisma.product.findMany({
    where,
    orderBy: [{ brand: 'asc' }, { name: 'asc' }, { variant: 'asc' }],
    select: {
      id: true,
      category: true,
      brand: true,
      name: true,
      variant: true,
      aliases: true,
      _count: { select: { listings: true } },
    },
  });

  return models;
}
```

In `getModelById` (line 23), update to use `prisma.product` and add `category` + `variant` to select.

- [ ] **Step 2: Update listing.service.ts**

Replace `prisma.phoneModel` with `prisma.product` in `resolveModelIdFromTitle`.

Update the query to include `category`:

```typescript
const model = await prisma.product.findFirst({
  where: {
    category: normalized.category,
    brand: { equals: normalized.brand, mode: 'insensitive' },
    name: { equals: normalized.name, mode: 'insensitive' },
    variant: { equals: normalized.variant, mode: 'insensitive' },
  },
  select: { id: true },
});

if (model) return model.id;

const created = await prisma.product.create({
  data: {
    category: normalized.category,
    brand: normalized.brand,
    name: normalized.name,
    variant: normalized.variant,
  },
  select: { id: true },
});
```

Replace hardcoded outlier constants with category-aware check:

```typescript
import { getCategoryConfig } from '../config/categories';

// Replace OUTLIER_MIN/MAX usage with:
function isOutlier(price: number, category: string): boolean {
  const config = getCategoryConfig(category);
  if (!config) return price < 200 || price > 15000;
  return price < config.outlierMin || price > config.outlierMax;
}
```

- [ ] **Step 3: Update deals.service.ts**

Replace `prisma.phoneModel.findMany` (line 132) with `prisma.product.findMany`.

Add `category` to the query `where` clause and to DealResult interface.

In the `select` block, replace `storage` with `variant`.

In the model object inside `allDeals.push`, add `category`:

```typescript
model: { id: model.id, category: model.category, brand: model.brand, name: model.name, variant: model.variant },
```

Update the `DealsQuery` type to include `category`.

- [ ] **Step 4: Update price.service.ts**

Replace `prisma.phoneModel` (line 131) with `prisma.product`. Replace `storage` with `variant` in select fields.

- [ ] **Step 5: Update ai-analyst.service.ts**

Replace `prisma.phoneModel` (line 367) with `prisma.product`.

- [ ] **Step 6: Update chat.service.ts**

Replace `prisma.phoneModel` (line 24) with `prisma.product`.

- [ ] **Step 7: Verify typecheck**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```

Expected: Errors related to normalizer return type (fixed in next task).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/services/
git commit -m "feat: update all services from phoneModel to product"
```

---

## Task 4: Multi-Category Normalizer

**Files:**
- Create: `apps/api/src/services/normalizers/index.ts`
- Create: `apps/api/src/services/normalizers/phone.normalizer.ts`
- Create: `apps/api/src/services/normalizers/console.normalizer.ts`
- Create: `apps/api/src/services/normalizers/notebook.normalizer.ts`
- Create: `apps/api/src/services/normalizers/motorcycle.normalizer.ts`
- Create: `apps/api/src/services/normalizers/car.normalizer.ts`
- Modify: `apps/api/src/services/normalizer.service.ts`

- [ ] **Step 1: Update NormalizeResult to include category**

In `apps/api/src/services/normalizer.service.ts`, update the interface:

```typescript
export interface NormalizeResult {
  category: string;
  brand: string;
  name: string;
  variant: string;
  canonical: string;
}
```

Replace all `storage` references in this file with `variant`.

- [ ] **Step 2: Extract phone normalizer**

Move phone-specific logic (KNOWN_MODELS for phones, extractIPhoneModel, extractSamsungModel, extractXiaomiModel, extractMotorolaModel) to `apps/api/src/services/normalizers/phone.normalizer.ts`.

Export a single function:

```typescript
import { NormalizeResult } from '../normalizer.service';

export function extractPhone(cleaned: string): NormalizeResult | null {
  // All existing phone extraction logic
  // Set category: 'phone' in all return values
  // Replace 'storage' with 'variant' in returns
}
```

- [ ] **Step 3: Create console normalizer**

```typescript
// apps/api/src/services/normalizers/console.normalizer.ts
import { NormalizeResult } from '../normalizer.service';

interface KnownConsole {
  brand: string;
  name: string;
  editions: string[];
}

const KNOWN_CONSOLES: KnownConsole[] = [
  { brand: 'Sony', name: 'PS4', editions: ['', 'Slim', 'Pro'] },
  { brand: 'Sony', name: 'PS4', editions: ['', 'Slim', 'Pro'] },
  { brand: 'Sony', name: 'PS5', editions: ['', 'Slim', 'Pro', 'Digital', 'Slim Digital'] },
  { brand: 'Microsoft', name: 'Xbox One', editions: ['', 'S', 'X'] },
  { brand: 'Microsoft', name: 'Xbox Series S', editions: [''] },
  { brand: 'Microsoft', name: 'Xbox Series X', editions: [''] },
  { brand: 'Nintendo', name: 'Switch', editions: ['', 'Lite', 'OLED'] },
];

const PS_ALIASES = /\b(?:ps\s*([45])|playstation\s*([45])|play\s*([45]))\b/;
const XBOX_ALIASES = /\b(?:xbox)\b/;
const NINTENDO_ALIASES = /\b(?:nintendo|switch)\b/;

function extractEdition(cleaned: string): string {
  if (/\bslim\s+digital\b|\bdigital\s+slim\b/.test(cleaned)) return 'Slim Digital';
  if (/\bdigital\b|\bsem leitor\b|\bmidia digital\b/.test(cleaned)) return 'Digital';
  if (/\bslim\b/.test(cleaned)) return 'Slim';
  if (/\bpro\b/.test(cleaned)) return 'Pro';
  if (/\blite\b/.test(cleaned)) return 'Lite';
  if (/\boled\b/.test(cleaned)) return 'OLED';
  if (/\bseries\s*x\b/.test(cleaned)) return '';
  if (/\bseries\s*s\b/.test(cleaned)) return '';
  if (/\bone\s*x\b/.test(cleaned)) return 'X';
  if (/\bone\s*s\b/.test(cleaned)) return 'S';
  return '';
}

export function extractConsole(cleaned: string): NormalizeResult | null {
  // PlayStation
  const psMatch = cleaned.match(PS_ALIASES);
  if (psMatch) {
    const gen = psMatch[1] || psMatch[2] || psMatch[3];
    const edition = extractEdition(cleaned);
    const name = `PS${gen}`;
    const known = KNOWN_CONSOLES.find(c => c.brand === 'Sony' && c.name === name && c.editions.includes(edition));
    if (known) {
      const fullName = edition ? `${name} ${edition}` : name;
      return { category: 'console', brand: 'Sony', name: fullName, variant: '', canonical: `Sony ${fullName}` };
    }
  }

  // Xbox
  if (XBOX_ALIASES.test(cleaned)) {
    if (/\bseries\s*x\b/.test(cleaned)) {
      return { category: 'console', brand: 'Microsoft', name: 'Xbox Series X', variant: '', canonical: 'Microsoft Xbox Series X' };
    }
    if (/\bseries\s*s\b/.test(cleaned)) {
      return { category: 'console', brand: 'Microsoft', name: 'Xbox Series S', variant: '', canonical: 'Microsoft Xbox Series S' };
    }
    if (/\bone\b/.test(cleaned)) {
      const edition = extractEdition(cleaned);
      const name = edition ? `Xbox One ${edition}` : 'Xbox One';
      return { category: 'console', brand: 'Microsoft', name, variant: '', canonical: `Microsoft ${name}` };
    }
  }

  // Nintendo Switch
  if (NINTENDO_ALIASES.test(cleaned)) {
    if (/\bswitch\b/.test(cleaned) || /\bnintendo\b/.test(cleaned)) {
      const edition = extractEdition(cleaned);
      const name = edition ? `Switch ${edition}` : 'Switch';
      return { category: 'console', brand: 'Nintendo', name, variant: '', canonical: `Nintendo ${name}` };
    }
  }

  return null;
}
```

- [ ] **Step 4: Create notebook normalizer**

```typescript
// apps/api/src/services/normalizers/notebook.normalizer.ts
import { NormalizeResult } from '../normalizer.service';

const MACBOOK_ALIAS = /\b(?:macbook|mac\s*book)\b/;
const NOTEBOOK_BRANDS = /\b(?:notebook|laptop)\b/;
const DELL_ALIAS = /\bdell\b/;
const LENOVO_ALIAS = /\blenovo\b/;
const ACER_ALIAS = /\bacer\b/;
const ASUS_ALIAS = /\basus\b/;
const HP_ALIAS = /\bhp\b/;

function extractSpec(cleaned: string): string {
  // Apple chips
  const mMatch = cleaned.match(/\bm([1-4])\b/);
  if (mMatch) return `M${mMatch[1]}`;
  // Intel
  const intelMatch = cleaned.match(/\bi([3579])\b/);
  if (intelMatch) return `i${intelMatch[1]}`;
  // Ryzen
  const ryzenMatch = cleaned.match(/\bryzen\s*([3579])\b/);
  if (ryzenMatch) return `Ryzen ${ryzenMatch[1]}`;
  return '';
}

export function extractNotebook(cleaned: string): NormalizeResult | null {
  const spec = extractSpec(cleaned);

  // MacBook
  if (MACBOOK_ALIAS.test(cleaned)) {
    if (/\bair\b/.test(cleaned)) {
      return { category: 'notebook', brand: 'Apple', name: 'MacBook Air', variant: spec, canonical: `Apple MacBook Air${spec ? ' ' + spec : ''}` };
    }
    if (/\bpro\b/.test(cleaned)) {
      const size = /\b16\b/.test(cleaned) ? '16' : /\b14\b/.test(cleaned) ? '14' : '';
      const name = size ? `MacBook Pro ${size}` : 'MacBook Pro';
      return { category: 'notebook', brand: 'Apple', name, variant: spec, canonical: `Apple ${name}${spec ? ' ' + spec : ''}` };
    }
    return { category: 'notebook', brand: 'Apple', name: 'MacBook', variant: spec, canonical: `Apple MacBook${spec ? ' ' + spec : ''}` };
  }

  // Need "notebook" or "laptop" keyword for non-Apple brands to avoid false positives
  const hasNotebookKeyword = NOTEBOOK_BRANDS.test(cleaned) || /\bgamer\b/.test(cleaned);

  if (DELL_ALIAS.test(cleaned) && hasNotebookKeyword) {
    let name = 'Dell';
    if (/\binspiron\b/.test(cleaned)) name = 'Dell Inspiron';
    else if (/\bvostro\b/.test(cleaned)) name = 'Dell Vostro';
    else if (/\bxps\b/.test(cleaned)) name = 'Dell XPS';
    else if (/\bg15\b/.test(cleaned)) name = 'Dell G15';
    else if (/\blatitude\b/.test(cleaned)) name = 'Dell Latitude';
    return { category: 'notebook', brand: 'Dell', name, variant: spec, canonical: `${name}${spec ? ' ' + spec : ''}` };
  }

  if (LENOVO_ALIAS.test(cleaned) && hasNotebookKeyword) {
    let name = 'Lenovo';
    if (/\bideapad\b/.test(cleaned)) name = 'Lenovo IdeaPad';
    else if (/\bthinkpad\b/.test(cleaned)) name = 'Lenovo ThinkPad';
    else if (/\blegion\b/.test(cleaned)) name = 'Lenovo Legion';
    return { category: 'notebook', brand: 'Lenovo', name, variant: spec, canonical: `${name}${spec ? ' ' + spec : ''}` };
  }

  if (ACER_ALIAS.test(cleaned) && hasNotebookKeyword) {
    let name = 'Acer';
    if (/\bnitro\b/.test(cleaned)) name = 'Acer Nitro';
    else if (/\baspire\b/.test(cleaned)) name = 'Acer Aspire';
    else if (/\bswift\b/.test(cleaned)) name = 'Acer Swift';
    return { category: 'notebook', brand: 'Acer', name, variant: spec, canonical: `${name}${spec ? ' ' + spec : ''}` };
  }

  if (ASUS_ALIAS.test(cleaned) && hasNotebookKeyword) {
    let name = 'Asus';
    if (/\brog\b/.test(cleaned)) name = 'Asus ROG';
    else if (/\btuf\b/.test(cleaned)) name = 'Asus TUF';
    else if (/\bvivobook\b/.test(cleaned)) name = 'Asus VivoBook';
    return { category: 'notebook', brand: 'Asus', name, variant: spec, canonical: `${name}${spec ? ' ' + spec : ''}` };
  }

  if (HP_ALIAS.test(cleaned) && hasNotebookKeyword) {
    let name = 'HP';
    if (/\bpavilion\b/.test(cleaned)) name = 'HP Pavilion';
    else if (/\bvictus\b/.test(cleaned)) name = 'HP Victus';
    else if (/\bomen\b/.test(cleaned)) name = 'HP Omen';
    return { category: 'notebook', brand: 'HP', name, variant: spec, canonical: `${name}${spec ? ' ' + spec : ''}` };
  }

  return null;
}
```

- [ ] **Step 5: Create motorcycle normalizer**

```typescript
// apps/api/src/services/normalizers/motorcycle.normalizer.ts
import { NormalizeResult } from '../normalizer.service';

interface KnownMoto {
  brand: string;
  pattern: RegExp;
  name: string;
}

const KNOWN_MOTOS: KnownMoto[] = [
  // Honda
  { brand: 'Honda', pattern: /\bcg\s*125\b/, name: 'CG 125' },
  { brand: 'Honda', pattern: /\bcg\s*150\b/, name: 'CG 150' },
  { brand: 'Honda', pattern: /\bcg\s*160\b/, name: 'CG 160' },
  { brand: 'Honda', pattern: /\bcb\s*300\b/, name: 'CB 300' },
  { brand: 'Honda', pattern: /\bcb\s*500\b/, name: 'CB 500' },
  { brand: 'Honda', pattern: /\bxre\s*190\b/, name: 'XRE 190' },
  { brand: 'Honda', pattern: /\bxre\s*300\b/, name: 'XRE 300' },
  { brand: 'Honda', pattern: /\bpop\s*110\b/, name: 'Pop 110' },
  { brand: 'Honda', pattern: /\bbiz\s*125\b/, name: 'Biz 125' },
  { brand: 'Honda', pattern: /\bpcx\s*160\b/, name: 'PCX 160' },
  { brand: 'Honda', pattern: /\belite\s*125\b/, name: 'Elite 125' },
  // Yamaha
  { brand: 'Yamaha', pattern: /\bfactor\s*125\b/, name: 'Factor 125' },
  { brand: 'Yamaha', pattern: /\bfactor\s*150\b/, name: 'Factor 150' },
  { brand: 'Yamaha', pattern: /\bfazer\s*150\b/, name: 'Fazer 150' },
  { brand: 'Yamaha', pattern: /\bfazer\s*250\b/, name: 'Fazer 250' },
  { brand: 'Yamaha', pattern: /\bmt[\s-]*03\b/, name: 'MT-03' },
  { brand: 'Yamaha', pattern: /\bmt[\s-]*07\b/, name: 'MT-07' },
  { brand: 'Yamaha', pattern: /\bmt[\s-]*09\b/, name: 'MT-09' },
  { brand: 'Yamaha', pattern: /\blander\s*250\b/, name: 'Lander 250' },
  { brand: 'Yamaha', pattern: /\bcrosser\s*150\b/, name: 'Crosser 150' },
  // Suzuki
  { brand: 'Suzuki', pattern: /\byes\s*125\b/, name: 'Yes 125' },
  { brand: 'Suzuki', pattern: /\bintruder\s*125\b/, name: 'Intruder 125' },
  { brand: 'Suzuki', pattern: /\bv[\s-]*strom\b/, name: 'V-Strom 650' },
];

const MOTO_BRANDS = /\b(?:honda|yamaha|suzuki|kawasaki|bmw|triumph)\b/;
const MOTO_KEYWORDS = /\b(?:moto|motocicleta|cilindrada|cc)\b/;

function extractCC(cleaned: string): string {
  const match = cleaned.match(/\b(\d{2,4})\s*cc\b/);
  if (match) return `${match[1]}cc`;
  return '';
}

export function extractMotorcycle(cleaned: string): NormalizeResult | null {
  // Try known models first
  for (const moto of KNOWN_MOTOS) {
    if (moto.pattern.test(cleaned)) {
      const cc = extractCC(cleaned);
      return {
        category: 'motorcycle',
        brand: moto.brand,
        name: moto.name,
        variant: cc,
        canonical: `${moto.brand} ${moto.name}${cc ? ' ' + cc : ''}`,
      };
    }
  }

  // Generic: brand keyword + moto keyword
  if (MOTO_BRANDS.test(cleaned) && MOTO_KEYWORDS.test(cleaned)) {
    // Don't match here to avoid false positives with cars (Honda Civic vs Honda CG)
    // Only known models should match
  }

  return null;
}
```

- [ ] **Step 6: Create car normalizer**

```typescript
// apps/api/src/services/normalizers/car.normalizer.ts
import { NormalizeResult } from '../normalizer.service';

interface KnownCar {
  brand: string;
  pattern: RegExp;
  name: string;
}

const KNOWN_CARS: KnownCar[] = [
  // Fiat
  { brand: 'Fiat', pattern: /\buno\b/, name: 'Uno' },
  { brand: 'Fiat', pattern: /\bmobi\b/, name: 'Mobi' },
  { brand: 'Fiat', pattern: /\bargo\b/, name: 'Argo' },
  { brand: 'Fiat', pattern: /\bcronos\b/, name: 'Cronos' },
  { brand: 'Fiat', pattern: /\btoro\b/, name: 'Toro' },
  { brand: 'Fiat', pattern: /\bstrada\b/, name: 'Strada' },
  { brand: 'Fiat', pattern: /\bpulse\b/, name: 'Pulse' },
  // Volkswagen
  { brand: 'Volkswagen', pattern: /\bgol\b/, name: 'Gol' },
  { brand: 'Volkswagen', pattern: /\bpolo\b/, name: 'Polo' },
  { brand: 'Volkswagen', pattern: /\bvirtus\b/, name: 'Virtus' },
  { brand: 'Volkswagen', pattern: /\bt[\s-]*cross\b/, name: 'T-Cross' },
  { brand: 'Volkswagen', pattern: /\bnivus\b/, name: 'Nivus' },
  { brand: 'Volkswagen', pattern: /\bsaveiro\b/, name: 'Saveiro' },
  // Chevrolet
  { brand: 'Chevrolet', pattern: /\bonix\b/, name: 'Onix' },
  { brand: 'Chevrolet', pattern: /\btracker\b/, name: 'Tracker' },
  { brand: 'Chevrolet', pattern: /\bs10\b/, name: 'S10' },
  { brand: 'Chevrolet', pattern: /\bmontana\b/, name: 'Montana' },
  { brand: 'Chevrolet', pattern: /\bspin\b/, name: 'Spin' },
  // Honda (cars — no overlap with motorcycle models)
  { brand: 'Honda', pattern: /\bcivic\b/, name: 'Civic' },
  { brand: 'Honda', pattern: /\bcity\b/, name: 'City' },
  { brand: 'Honda', pattern: /\bhr[\s-]*v\b/, name: 'HR-V' },
  { brand: 'Honda', pattern: /\bcr[\s-]*v\b/, name: 'CR-V' },
  { brand: 'Honda', pattern: /\bfit\b/, name: 'Fit' },
  { brand: 'Honda', pattern: /\bwr[\s-]*v\b/, name: 'WR-V' },
  // Toyota
  { brand: 'Toyota', pattern: /\bcorolla(?!\s*cross)\b/, name: 'Corolla' },
  { brand: 'Toyota', pattern: /\bcorolla\s*cross\b/, name: 'Corolla Cross' },
  { brand: 'Toyota', pattern: /\byaris\b/, name: 'Yaris' },
  { brand: 'Toyota', pattern: /\bhilux\b/, name: 'Hilux' },
  { brand: 'Toyota', pattern: /\bsw4\b/, name: 'SW4' },
  // Hyundai
  { brand: 'Hyundai', pattern: /\bhb\s*20\b/, name: 'HB20' },
  { brand: 'Hyundai', pattern: /\bcreta\b/, name: 'Creta' },
  { brand: 'Hyundai', pattern: /\btucson\b/, name: 'Tucson' },
  // Jeep
  { brand: 'Jeep', pattern: /\brenegade\b/, name: 'Renegade' },
  { brand: 'Jeep', pattern: /\bcompass\b/, name: 'Compass' },
  { brand: 'Jeep', pattern: /\bcommander\b/, name: 'Commander' },
  // Renault
  { brand: 'Renault', pattern: /\bkwid\b/, name: 'Kwid' },
  { brand: 'Renault', pattern: /\bsandero\b/, name: 'Sandero' },
  { brand: 'Renault', pattern: /\bduster\b/, name: 'Duster' },
];

function extractYear(cleaned: string): string {
  const match = cleaned.match(/\b(20[0-2]\d|19\d{2})\b/);
  if (match) return match[1]!;
  return '';
}

export function extractCar(cleaned: string): NormalizeResult | null {
  for (const car of KNOWN_CARS) {
    if (car.pattern.test(cleaned)) {
      const year = extractYear(cleaned);
      return {
        category: 'car',
        brand: car.brand,
        name: car.name,
        variant: year,
        canonical: `${car.brand} ${car.name}${year ? ' ' + year : ''}`,
      };
    }
  }

  return null;
}
```

- [ ] **Step 7: Create normalizer orchestrator**

```typescript
// apps/api/src/services/normalizers/index.ts
import { NormalizeResult, cleanTitle, extractBrand } from '../normalizer.service';
import { extractPhone } from './phone.normalizer';
import { extractConsole } from './console.normalizer';
import { extractNotebook } from './notebook.normalizer';
import { extractMotorcycle } from './motorcycle.normalizer';
import { extractCar } from './car.normalizer';

// Order matters: most specific first to avoid false positives
const EXTRACTORS = [
  extractPhone,       // "iPhone", "Galaxy", "Redmi" are very specific
  extractConsole,     // "PS5", "Xbox", "Switch" are specific
  extractNotebook,    // Requires "notebook"/"laptop" keyword for non-Apple
  extractMotorcycle,  // Known model patterns (CG 160, Fazer 250)
  extractCar,         // Known car model patterns (Civic, Onix)
];

export function normalizeTitle(title: string): NormalizeResult | null {
  const cleaned = cleanTitle(title);
  if (cleaned.length < 3) return null;

  for (const extract of EXTRACTORS) {
    const result = extract(cleaned);
    if (result) return result;
  }

  return null;
}
```

- [ ] **Step 8: Update normalizer.service.ts exports**

Keep `cleanTitle`, `extractBrand`, `extractStorage` (renamed to `extractVariant`) as exports. Remove the old `normalizeTitle` export and re-export from `normalizers/index.ts`.

At the bottom of `normalizer.service.ts`, replace:
```typescript
export function normalizeTitle(title: string): NormalizeResult | null {
```
with:
```typescript
export { normalizeTitle } from './normalizers/index';
```

And keep all the utility functions (`cleanTitle`, `extractBrand`, `extractStorage`) exported for use by sub-normalizers.

- [ ] **Step 9: Verify typecheck**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/services/normalizer.service.ts apps/api/src/services/normalizers/
git commit -m "feat: multi-category normalizer with phone, console, notebook, motorcycle, car extractors"
```

---

## Task 5: Category-Aware Flag Detector

**Files:**
- Modify: `apps/api/src/services/flag-detector.service.ts`

- [ ] **Step 1: Add per-category flag rules**

Add category-specific rules after the existing phone rules:

```typescript
const CONSOLE_RED_FLAGS: FlagRule[] = [
  { keywords: ['drift', 'controle com drift', 'analógico com problema'], label: 'Controle com drift', scoreImpact: -15, valueReduction: 15 },
  { keywords: ['leitor não funciona', 'sem leitor', 'leitor quebrado'], label: 'Leitor de disco com defeito', scoreImpact: -20, valueReduction: 25 },
  { keywords: ['banido', 'ban', 'conta banida'], label: 'Console banido', scoreImpact: -25, valueReduction: 40 },
  { keywords: ['superaquecendo', 'esquentando muito', 'desliga sozinho'], label: 'Superaquecimento', scoreImpact: -20, valueReduction: 25 },
  { keywords: ['hdmi quebrado', 'sem hdmi', 'hdmi com defeito'], label: 'HDMI com defeito', scoreImpact: -20, valueReduction: 30 },
];

const CONSOLE_GREEN_FLAGS: FlagRule[] = [
  { keywords: ['na caixa', 'caixa original'], label: 'Na caixa', scoreImpact: 8, valueReduction: -3 },
  { keywords: ['2 controles', 'dois controles'], label: '2 controles', scoreImpact: 5, valueReduction: -2 },
  { keywords: ['com jogos', 'jogos inclusos'], label: 'Com jogos', scoreImpact: 3, valueReduction: -1 },
  { keywords: ['garantia', 'na garantia'], label: 'Com garantia', scoreImpact: 10, valueReduction: -5 },
];

const VEHICLE_RED_FLAGS: FlagRule[] = [
  { keywords: ['motor fundido', 'motor batendo'], label: 'Motor com problema grave', scoreImpact: -25, valueReduction: 40 },
  { keywords: ['batido', 'batida', 'sinistro', 'sinistrado'], label: 'Veículo batido/sinistrado', scoreImpact: -25, valueReduction: 35 },
  { keywords: ['leilão', 'leilao', 'de leilão'], label: 'Veículo de leilão', scoreImpact: -20, valueReduction: 30 },
  { keywords: ['enchente', 'alagamento', 'entrou água'], label: 'Dano por enchente', scoreImpact: -25, valueReduction: 40 },
  { keywords: ['sem documento', 'documento atrasado', 'sem doc'], label: 'Documentação irregular', scoreImpact: -20, valueReduction: 25 },
  { keywords: ['câmbio com problema', 'cambio com problema', 'marcha dura'], label: 'Câmbio com problema', scoreImpact: -20, valueReduction: 25 },
];

const VEHICLE_GREEN_FLAGS: FlagRule[] = [
  { keywords: ['documentação ok', 'documentacao ok', 'doc ok', 'ipva pago'], label: 'Documentação em dia', scoreImpact: 8, valueReduction: -3 },
  { keywords: ['único dono', 'unico dono', '1 dono'], label: 'Único dono', scoreImpact: 8, valueReduction: -3 },
  { keywords: ['baixa km', 'baixa quilometragem', 'pouco rodado'], label: 'Baixa quilometragem', scoreImpact: 5, valueReduction: -2 },
  { keywords: ['revisão em dia', 'revisao em dia', 'revisões em dia'], label: 'Revisões em dia', scoreImpact: 5, valueReduction: -2 },
];

const NOTEBOOK_RED_FLAGS: FlagRule[] = [
  { keywords: ['tela quebrada', 'display quebrado'], label: 'Tela quebrada', scoreImpact: -20, valueReduction: 25 },
  { keywords: ['não liga', 'nao liga', 'placa queimada'], label: 'Defeito grave', scoreImpact: -25, valueReduction: 40 },
  { keywords: ['teclado não funciona', 'teclado com defeito'], label: 'Teclado com defeito', scoreImpact: -15, valueReduction: 15 },
  { keywords: ['dobradiça quebrada', 'dobradica quebrada'], label: 'Dobradiça quebrada', scoreImpact: -15, valueReduction: 20 },
];

const NOTEBOOK_GREEN_FLAGS: FlagRule[] = [
  { keywords: ['na caixa', 'lacrado'], label: 'Na caixa/lacrado', scoreImpact: 10, valueReduction: -5 },
  { keywords: ['garantia', 'na garantia'], label: 'Com garantia', scoreImpact: 10, valueReduction: -5 },
  { keywords: ['bateria nova', 'bateria 100'], label: 'Bateria nova', scoreImpact: 8, valueReduction: -3 },
  { keywords: ['ssd', 'nvme'], label: 'SSD', scoreImpact: 3, valueReduction: -1 },
];
```

- [ ] **Step 2: Update analyzeListingText to accept category**

```typescript
export function analyzeListingText(title: string, description?: string | null, category?: string): FlagAnalysis {
  const text = `${title} ${description ?? ''}`.toLowerCase();
  // ... existing setup code ...

  // Select flag rules based on category
  let redRules = RED_FLAG_RULES;
  let yellowRules = YELLOW_FLAG_RULES;
  let greenRules = GREEN_FLAG_RULES;

  if (category === 'console') {
    redRules = [...RED_FLAG_RULES.filter(r => r.label === 'Defeito grave'), ...CONSOLE_RED_FLAGS];
    yellowRules = [];
    greenRules = CONSOLE_GREEN_FLAGS;
  } else if (category === 'motorcycle' || category === 'car') {
    redRules = VEHICLE_RED_FLAGS;
    yellowRules = [];
    greenRules = VEHICLE_GREEN_FLAGS;
  } else if (category === 'notebook') {
    redRules = NOTEBOOK_RED_FLAGS;
    yellowRules = YELLOW_FLAG_RULES.filter(r => r.label !== 'Bateria com saúde mediana');
    greenRules = NOTEBOOK_GREEN_FLAGS;
  }
  // phone: uses existing rules (default)

  // Rest of function uses redRules/yellowRules/greenRules instead of constants
  // ... (same logic, just with the variable rule sets)
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/flag-detector.service.ts
git commit -m "feat: per-category flag rules for consoles, vehicles, notebooks"
```

---

## Task 6: Update Validators and Controllers

**Files:**
- Modify: `apps/api/src/validators/deals.validator.ts`
- Modify: `apps/api/src/validators/model.validator.ts`
- Modify: `apps/api/src/controllers/model.controller.ts`
- Modify: `apps/api/src/routes/models.routes.ts`

- [ ] **Step 1: Add category to deals validator**

```typescript
// apps/api/src/validators/deals.validator.ts
export const dealsQuerySchema = z.object({
  region: z.string().min(1, 'Região é obrigatória'),
  category: z.string().optional(),
  brand: z.string().optional(),
  minScore: z.coerce.number().min(0).max(100).default(0),
  heat: z.enum(['hot', 'warm', 'moderate', 'all']).default('all'),
  type: z.enum(['compra_revenda', 'arbitragem_regional', 'preco_fornecedor', 'liquidacao', 'recem_publicado', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

- [ ] **Step 2: Add category to model validator**

```typescript
// apps/api/src/validators/model.validator.ts
export const listModelsQuerySchema = z.object({
  brand: z.string().optional(),
  category: z.string().optional(),
});
```

- [ ] **Step 3: Update model controller**

```typescript
export async function listModels(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const brand = req.query.brand as string | undefined;
    const category = req.query.category as string | undefined;
    const models = await modelService.listModels(brand, category);
    res.json({ success: true, data: models });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 4: Add categories endpoint to models routes**

```typescript
import { getAllCategories } from '../config/categories';

// Add before existing routes:
router.get('/categories', (_req, res) => {
  res.json({ success: true, data: getAllCategories() });
});
```

- [ ] **Step 5: Verify typecheck**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | grep -v "generated" | head -10
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/validators/ apps/api/src/controllers/ apps/api/src/routes/
git commit -m "feat: add category parameter to validators, controllers, routes"
```

---

## Task 7: Frontend — Types and Services

**Files:**
- Modify: `apps/web/src/services/models.ts`
- Modify: `apps/web/src/services/deals.ts`
- Create: `apps/web/src/services/categories.ts`

- [ ] **Step 1: Create categories service**

```typescript
// apps/web/src/services/categories.ts
import api from './api';

export interface CategoryConfig {
  id: string;
  label: string;
  outlierMin: number;
  outlierMax: number;
  variantLabel: string;
  brands: string[];
}

export async function getCategories(): Promise<CategoryConfig[]> {
  const { data } = await api.get('/models/categories');
  return data.data;
}
```

- [ ] **Step 2: Update models.ts**

```typescript
export interface Product {
  id: string;
  category: string;
  brand: string;
  name: string;
  variant: string;
  aliases: string[];
  _count: { listings: number };
}

export async function getModels(brand?: string, category?: string): Promise<Product[]> {
  const params: Record<string, string> = {};
  if (brand) params.brand = brand;
  if (category) params.category = category;
  const { data } = await api.get('/models', { params });
  return data.data;
}
```

- [ ] **Step 3: Update deals.ts model field**

In the `Deal` interface, change:
```typescript
model: { id: string; category: string; brand: string; name: string; variant: string };
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/services/
git commit -m "feat: frontend types and services for multi-category"
```

---

## Task 8: Frontend — Category Filter in Deals Page

**Files:**
- Modify: `apps/web/src/pages/Deals.tsx`

- [ ] **Step 1: Add category state and fetch**

Replace the hardcoded `BRANDS` constant with dynamic brands from the categories API:

```typescript
import { getCategories, type CategoryConfig } from '@/services/categories';

// Remove: const BRANDS = ['', 'Apple', 'Samsung', 'Xiaomi'] as const;

// Add state:
const [category, setCategory] = useState('phone');

// Add query:
const { data: categories } = useQuery<CategoryConfig[]>({
  queryKey: ['categories'],
  queryFn: getCategories,
});

const currentCategory = categories?.find(c => c.id === category);
const categoryBrands = currentCategory?.brands ?? [];
```

- [ ] **Step 2: Add category select to filter bar**

Add as the first filter (before Region):

```tsx
<div className="flex-1 min-w-[140px]">
  <Select label="Categoria" value={category} onChange={(e) => { setCategory(e.target.value); setBrand(''); }}>
    {categories?.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
  </Select>
</div>
```

- [ ] **Step 3: Update brand filter to use dynamic brands**

```tsx
<Select label="Marca" value={brand} onChange={(e) => setBrand(e.target.value)}>
  <option value="">Todas</option>
  {categoryBrands.map((b) => <option key={b} value={b}>{b}</option>)}
</Select>
```

- [ ] **Step 4: Pass category to deals query**

```typescript
queryFn: () => getDeals(effectiveRegion, {
  category: category || undefined,
  brand: brand || undefined,
  heat: heat || undefined,
  type: type || undefined,
  minScore: Number(minScore) || undefined,
}),
```

Update `getDeals` in `services/deals.ts` to accept and pass `category`.

- [ ] **Step 5: Update model display in DealCard**

Replace `{deal.model.storage}` references with `{deal.model.variant}`:

```tsx
<h3 className="text-sm font-semibold text-[#f0f0f5]">
  {deal.model.name} {deal.model.variant}
</h3>
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/Deals.tsx apps/web/src/services/deals.ts
git commit -m "feat: category filter in Deals page with dynamic brands"
```

---

## Task 9: Frontend — Category Filter in Dashboard + ModelSelector

**Files:**
- Modify: `apps/web/src/pages/Dashboard.tsx`
- Modify: `apps/web/src/components/shared/ModelSelector.tsx`

- [ ] **Step 1: Update Dashboard with category filter**

Same pattern as Deals: add category state, fetch categories, replace hardcoded BRANDS, pass category to queries.

- [ ] **Step 2: Update ModelSelector**

```typescript
interface ModelSelectorProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  brand?: string;
  category?: string;
  label?: string;
  error?: string;
}

export function ModelSelector({ value, onChange, brand, category, label = 'Modelo', error }: ModelSelectorProps) {
  const { data: models, isLoading } = useQuery<Product[]>({
    queryKey: ['models', brand, category],
    queryFn: () => getModels(brand, category),
  });

  return (
    <Select label={label} value={value} onChange={onChange} error={error}>
      <option value="">Todos os modelos</option>
      {models?.map((model) => (
        <option key={model.id} value={model.id}>
          {model.brand} {model.name} {model.variant}
        </option>
      ))}
    </Select>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/Dashboard.tsx apps/web/src/components/shared/ModelSelector.tsx
git commit -m "feat: category filter in Dashboard and ModelSelector"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Typecheck API**

```bash
cd apps/api && npx tsc --noEmit
```

- [ ] **Step 2: Typecheck Web**

```bash
cd apps/web && npx tsc --noEmit
```

- [ ] **Step 3: Build extension**

```bash
cd apps/extension && npx webpack --mode production
```

- [ ] **Step 4: Start dev server and test**

```bash
cd /Users/jonathanmachado/Documents/Marketprice && npm run dev
```

Test:
1. Open dashboard — verify category filter appears
2. Switch categories — verify brands update
3. Navigate to Marketplace, search "PS5" — verify console listings are captured
4. Check API logs — verify normalizer identifies consoles

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: multi-category support — phones, consoles, notebooks, motorcycles, cars"
```
