# Multi-Category Product Support

**Date:** 2026-03-29
**Status:** Approved
**Scope:** Transform MarketPrice from a phone-only reseller tool into a generic multi-category product reseller platform.

---

## Categories

| Category | ID | Model Composition | Outlier Min (R$) | Outlier Max (R$) |
|---|---|---|---|---|
| Celulares | `phone` | Brand + Name + Storage | 200 | 15,000 |
| Consoles | `console` | Brand + Name + Edition | 200 | 8,000 |
| Notebooks | `notebook` | Brand + Name + Spec | 500 | 20,000 |
| Motos | `motorcycle` | Brand + Model + Engine | 2,000 | 150,000 |
| Carros | `car` | Brand + Model + Year | 5,000 | 500,000 |

---

## 1. Database Schema

### Rename PhoneModel to Product

```prisma
model Product {
  id       String   @id @default(uuid())
  category String   // "phone", "console", "notebook", "motorcycle", "car"
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

**`variant` field** replaces `storage`. Meaning per category:
- phone: "256GB", "128GB"
- console: "Digital", "Disco", ""
- car: "2018", "2020"
- motorcycle: "160cc", "250cc"
- notebook: "M2", "i5 12th"

### Migration strategy

1. Rename table `phone_models` to `products`
2. Rename column `storage` to `variant`
3. Add column `category` with default `'phone'` (all existing records are phones)
4. Update unique constraint from `(brand, name, storage)` to `(category, brand, name, variant)`
5. Update all foreign key references: `modelId` stays as-is (points to Product.id)

### All referencing tables stay the same

- `Listing.modelId` -> `Product.id` (no rename needed, FK target changes)
- `ListingHistory.modelId` -> `Product.id`
- `Supplier.modelId` -> `Product.id`
- `AlertRule.modelId` -> `Product.id`

The Prisma field names in these tables stay `modelId` to minimize churn. Only the relation target changes from `PhoneModel` to `Product`.

---

## 2. Category Registry

A central config that defines per-category behavior. Lives in `apps/api/src/config/categories.ts`.

```typescript
interface CategoryConfig {
  id: string;
  label: string;           // PT-BR display name
  outlierMin: number;
  outlierMax: number;
  variantLabel: string;    // "Armazenamento", "Edição", "Ano", "Cilindrada", "Spec"
  brands: string[];        // Known brands for this category
}

const CATEGORIES: Record<string, CategoryConfig> = {
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
    brands: ['Honda', 'Yamaha', 'Suzuki', 'BMW', 'Kawasaki', 'Triumph'],
  },
  car: {
    id: 'car',
    label: 'Carros',
    outlierMin: 5000,
    outlierMax: 500000,
    variantLabel: 'Ano',
    brands: ['Honda', 'Toyota', 'Fiat', 'Volkswagen', 'Chevrolet', 'Hyundai', 'Jeep', 'Ford', 'Renault', 'Nissan', 'BMW', 'Mercedes'],
  },
};
```

---

## 3. Normalizer (Multi-Category)

### New return type

```typescript
interface NormalizeResult {
  category: string;   // NEW
  brand: string;
  name: string;
  variant: string;    // was "storage"
  canonical: string;
}
```

### Flow

`normalizeTitle(title)` tries each category extractor in priority order:
1. Phone (most specific keywords: "iphone", "galaxy", "redmi", "poco", "moto g")
2. Console ("ps5", "playstation", "xbox", "nintendo", "switch")
3. Notebook ("notebook", "macbook", "laptop", "dell inspiron", "lenovo ideapad")
4. Motorcycle ("honda cg", "yamaha fazer", "cb 300", "ninja", "moto" + cc pattern)
5. Car (automotive brands + model + year pattern)

Each extractor returns `NormalizeResult | null`. First match wins.

### Known models per category

**Consoles:**
- Sony: PS4, PS4 Slim, PS4 Pro, PS5, PS5 Slim, PS5 Pro (editions: Digital, Disco)
- Microsoft: Xbox One, Xbox One S, Xbox One X, Xbox Series S, Xbox Series X
- Nintendo: Switch, Switch Lite, Switch OLED

**Notebooks:**
- Apple: MacBook Air M1, M2, M3; MacBook Pro 14, 16
- Dell: Inspiron, Vostro, Latitude, XPS, G15 (Gamer)
- Lenovo: IdeaPad, ThinkPad, Legion (Gamer)
- Acer: Aspire, Nitro (Gamer), Swift
- Asus: VivoBook, ROG, TUF (Gamer)
- Samsung: Galaxy Book

**Motorcycles:**
- Honda: CG 125, CG 150, CG 160, CB 300, CB 500, XRE 190, XRE 300, Pop 110, Biz 125, PCX 160, Elite 125
- Yamaha: Factor 125, Factor 150, Fazer 150, Fazer 250, MT-03, MT-07, MT-09, Lander 250, Crosser 150
- Suzuki: Yes 125, Intruder 125, V-Strom 650, GSX-S750
- BMW: G 310, F 850 GS, R 1250 GS

**Cars:**
- Fiat: Uno, Mobi, Argo, Cronos, Toro, Strada, Pulse
- Volkswagen: Gol, Polo, Virtus, T-Cross, Nivus, Saveiro
- Chevrolet: Onix, Tracker, S10, Montana, Spin
- Honda: Civic, City, HR-V, CR-V, Fit, WR-V
- Toyota: Corolla, Corolla Cross, Yaris, Hilux, SW4
- Hyundai: HB20, Creta, Tucson, IX35
- Jeep: Renegade, Compass, Commander
- Renault: Kwid, Sandero, Logan, Duster, Captur
- Ford: Ka, EcoSport, Ranger, Territory, Bronco Sport
- Nissan: Kicks, Versa, Frontier, Sentra

### Variant extraction per category

- **phone**: extract GB/TB from title (existing logic)
- **console**: detect "digital", "disco", "sem leitor" → "Digital" or ""
- **notebook**: extract processor/chip ("M2", "i5", "i7", "Ryzen 5")
- **motorcycle**: extract cc ("125", "150", "160", "250", "300", "500") + "cc"
- **car**: extract 4-digit year (2015-2026)

### Brand disambiguation

Some brands overlap categories:
- "Honda" → motorcycle OR car (resolved by model name: "CG" = moto, "Civic" = car)
- "BMW" → motorcycle OR car (resolved by model: "G 310" = moto, "X1" = car)
- "Samsung" → phone OR notebook (resolved by model: "Galaxy S" = phone, "Galaxy Book" = notebook)
- "Apple" → phone OR notebook (resolved by: "iPhone" = phone, "MacBook" = notebook)

Resolution: each extractor checks for model-specific keywords, not just brand.

---

## 4. Flag Detector (Per-Category)

Each category gets its own flag rule set.

### Phone flags (existing, unchanged)
- Red: tela trocada, bateria ruim, Face ID defeito, dano água, bloqueado
- Yellow: tela trocada original, bateria mediana
- Green: garantia, bateria 100%, completo na caixa

### Console flags (new)
- Red: "controle drift", "leitor não funciona", "ban", "banido", "superaquecendo", "não liga", "HDMI quebrado"
- Yellow: "sem controle", "sem cabo", "barulho no cooler"
- Green: "na caixa", "com jogos", "garantia", "2 controles"

### Notebook flags (new)
- Red: "tela quebrada", "não liga", "placa queimada", "teclado não funciona", "dobradiça quebrada"
- Yellow: "bateria viciada", "teclado com tecla faltando", "sem carregador", "risco na tela"
- Green: "na caixa", "garantia", "bateria nova", "SSD"

### Motorcycle flags (new)
- Red: "motor fundido", "batida", "sinistro", "leilão", "documento atrasado", "sem documento"
- Yellow: "pneu careca", "embreagem patinando", "retrovisor quebrado", "escape furado"
- Green: "documentação ok", "revisão em dia", "único dono", "baixa km", "com baú"

### Car flags (new)
- Red: "motor fundido", "batido", "sinistro", "leilão", "enchente", "sem documento", "câmbio com problema"
- Yellow: "ar condicionado não funciona", "vidro trincado", "pintura descascando", "pneu careca"
- Green: "documentação ok", "revisão em dia", "único dono", "baixa km", "IPVA pago", "com manual"

---

## 5. Deals Service Changes

### Category-aware queries

```typescript
// Before
const models = await prisma.phoneModel.findMany({ where: modelFilter });

// After
const models = await prisma.product.findMany({
  where: { ...modelFilter, category: categoryFilter },
});
```

### Category-aware scoring

The deal scoring algorithm stays the same structure but uses category-specific outlier thresholds from the category registry.

### Liquidity thresholds per category

Different categories have different volumes:
- phone: 20+ listings = alta, 8+ = média
- console: 10+ = alta, 4+ = média
- notebook: 8+ = alta, 3+ = média
- motorcycle: 5+ = alta, 2+ = média
- car: 5+ = alta, 2+ = média

---

## 6. Listing Service Changes

### Category-aware model resolution

```typescript
async function resolveModelIdFromTitle(title: string): Promise<string | null> {
  const normalized = normalizeTitle(title); // Now returns { category, brand, name, variant }
  if (!normalized) return null;

  const model = await prisma.product.findFirst({
    where: {
      category: normalized.category,
      brand: { equals: normalized.brand, mode: 'insensitive' },
      name: { equals: normalized.name, mode: 'insensitive' },
      variant: { equals: normalized.variant, mode: 'insensitive' },
    },
  });

  if (model) return model.id;

  // Auto-create
  const created = await prisma.product.create({
    data: {
      category: normalized.category,
      brand: normalized.brand,
      name: normalized.name,
      variant: normalized.variant,
    },
  });
  return created.id;
}
```

### Category-aware outlier detection

```typescript
import { CATEGORIES } from '../config/categories';

function isOutlier(price: number, category: string): boolean {
  const config = CATEGORIES[category];
  if (!config) return false;
  return price < config.outlierMin || price > config.outlierMax;
}
```

---

## 7. API Changes

### New parameter: `category`

Added to these endpoints:
- `GET /api/deals?category=phone&region=SC`
- `GET /api/prices/regions?category=phone`
- `GET /api/prices/summary?category=phone&region=SC`
- `GET /api/models?category=phone`
- `GET /api/analytics/*?category=phone`

### New endpoint: categories list

- `GET /api/categories` → returns list of available categories with labels and config

If `category` is omitted, defaults to `phone` for backwards compatibility.

---

## 8. Frontend Changes

### Category filter

Top-level filter in the dashboard, above all other filters. Selecting a category:
- Updates the brand dropdown (brands are category-specific)
- Updates the variant label ("Armazenamento" for phones, "Ano" for cars, etc.)
- Refreshes all data queries with the new category parameter
- Persists selection in localStorage

### Type changes

```typescript
// Before
interface PhoneModel { id, brand, name, storage, aliases }

// After
interface Product { id, category, brand, name, variant, aliases }
```

All services, pages, and components update accordingly. `storage` references become `variant`.

### Display formatting

Model display adapts per category:
- phone: "Apple iPhone 15 Pro Max 256GB"
- console: "Sony PS5 Slim Digital"
- car: "Honda Civic 2020"
- motorcycle: "Honda CG 160 160cc"
- notebook: "Apple MacBook Air M2"

---

## 9. Extension/Scraper

### No scraper changes needed

The scraper captures all Marketplace listings regardless of category. Category detection happens in the backend normalizer.

### Defective keywords

Keep current generic keywords. Category-specific flags are handled by the flag detector service, not the scraper.

---

## 10. Migration Plan

### Phase 1: Database + Backend Core
1. Create Prisma migration (rename table, add category column, rename storage to variant)
2. Create category registry config
3. Rebuild normalizer with multi-category support
4. Update listing service (model resolution, outlier detection)
5. Update deals service (category-aware queries)
6. Update flag detector (per-category rules)
7. Update all other services (model, price, supplier, alerts, analytics)
8. Add category parameter to API routes/validators

### Phase 2: Frontend
9. Update TypeScript types (PhoneModel → Product)
10. Add category filter component
11. Update all pages to pass category parameter
12. Update display formatting per category
13. Add categories API call

### Phase 3: Seed Data + Testing
14. Create seed data for all categories
15. Test normalizer with real marketplace titles
16. End-to-end testing

---

## Out of Scope

- Category management UI (admin panel to add/edit categories)
- User-defined categories
- Multi-language support beyond PT-BR
- Category-specific analytics dashboards (all categories share the same analytics views)
- Changes to the Chrome extension scraper logic
