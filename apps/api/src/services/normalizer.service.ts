import { distance } from 'fastest-levenshtein';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NormalizeResult {
  category: string;
  brand: string;
  name: string;
  variant: string;
  canonical: string;
}

interface KnownModel {
  brand: string;
  name: string;
  storageOptions: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IRRELEVANT_WORDS = new Set([
  'vendo', 'troco', 'aceito', 'pix', 'parcelo', 'seminovo', 'usado', 'novo',
  'preto', 'branco', 'azul', 'dourado', 'rosa', 'roxo', 'verde', 'vermelho',
  'prata', 'cinza', 'urgente', 'impecavel', 'perfeito', 'original', 'garantia',
  'nf', 'nota', 'fiscal', 'caixa', 'completo', 'desbloqueado', 'anatel',
]);

const KNOWN_MODELS: KnownModel[] = [
  // Apple iPhone
  { brand: 'Apple', name: 'iPhone 7', storageOptions: ['32GB', '128GB', '256GB'] },
  { brand: 'Apple', name: 'iPhone 7 Plus', storageOptions: ['32GB', '128GB', '256GB'] },
  { brand: 'Apple', name: 'iPhone 8', storageOptions: ['64GB', '128GB', '256GB'] },
  { brand: 'Apple', name: 'iPhone 8 Plus', storageOptions: ['64GB', '128GB', '256GB'] },
  { brand: 'Apple', name: 'iPhone X', storageOptions: ['64GB', '256GB'] },
  { brand: 'Apple', name: 'iPhone XR', storageOptions: ['64GB', '128GB', '256GB'] },
  { brand: 'Apple', name: 'iPhone XS', storageOptions: ['64GB', '256GB', '512GB'] },
  { brand: 'Apple', name: 'iPhone XS Max', storageOptions: ['64GB', '256GB', '512GB'] },
  { brand: 'Apple', name: 'iPhone 11', storageOptions: ['64GB', '128GB', '256GB'] },
  { brand: 'Apple', name: 'iPhone 11 Pro', storageOptions: ['64GB', '256GB', '512GB'] },
  { brand: 'Apple', name: 'iPhone 11 Pro Max', storageOptions: ['64GB', '256GB', '512GB'] },
  { brand: 'Apple', name: 'iPhone 12', storageOptions: ['64GB', '128GB', '256GB'] },
  { brand: 'Apple', name: 'iPhone 12 Mini', storageOptions: ['64GB', '128GB', '256GB'] },
  { brand: 'Apple', name: 'iPhone 12 Pro', storageOptions: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', name: 'iPhone 12 Pro Max', storageOptions: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', name: 'iPhone 13', storageOptions: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', name: 'iPhone 13 Mini', storageOptions: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', name: 'iPhone 13 Pro', storageOptions: ['128GB', '256GB', '512GB', '1TB'] },
  { brand: 'Apple', name: 'iPhone 13 Pro Max', storageOptions: ['128GB', '256GB', '512GB', '1TB'] },
  { brand: 'Apple', name: 'iPhone 14', storageOptions: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', name: 'iPhone 14 Plus', storageOptions: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', name: 'iPhone 14 Pro', storageOptions: ['128GB', '256GB', '512GB', '1TB'] },
  { brand: 'Apple', name: 'iPhone 14 Pro Max', storageOptions: ['128GB', '256GB', '512GB', '1TB'] },
  { brand: 'Apple', name: 'iPhone 15', storageOptions: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', name: 'iPhone 15 Plus', storageOptions: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', name: 'iPhone 15 Pro', storageOptions: ['128GB', '256GB', '512GB', '1TB'] },
  { brand: 'Apple', name: 'iPhone 15 Pro Max', storageOptions: ['256GB', '512GB', '1TB'] },
  { brand: 'Apple', name: 'iPhone 16', storageOptions: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', name: 'iPhone 16 Plus', storageOptions: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', name: 'iPhone 16 Pro', storageOptions: ['128GB', '256GB', '512GB', '1TB'] },
  { brand: 'Apple', name: 'iPhone 16 Pro Max', storageOptions: ['256GB', '512GB', '1TB'] },

  // Samsung Galaxy S
  { brand: 'Samsung', name: 'Galaxy S21', storageOptions: ['128GB', '256GB'] },
  { brand: 'Samsung', name: 'Galaxy S21+', storageOptions: ['128GB', '256GB'] },
  { brand: 'Samsung', name: 'Galaxy S21 Ultra', storageOptions: ['128GB', '256GB', '512GB'] },
  { brand: 'Samsung', name: 'Galaxy S22', storageOptions: ['128GB', '256GB'] },
  { brand: 'Samsung', name: 'Galaxy S22+', storageOptions: ['128GB', '256GB'] },
  { brand: 'Samsung', name: 'Galaxy S22 Ultra', storageOptions: ['128GB', '256GB', '512GB', '1TB'] },
  { brand: 'Samsung', name: 'Galaxy S23', storageOptions: ['128GB', '256GB'] },
  { brand: 'Samsung', name: 'Galaxy S23+', storageOptions: ['256GB', '512GB'] },
  { brand: 'Samsung', name: 'Galaxy S23 Ultra', storageOptions: ['256GB', '512GB', '1TB'] },
  { brand: 'Samsung', name: 'Galaxy S24', storageOptions: ['128GB', '256GB'] },
  { brand: 'Samsung', name: 'Galaxy S24+', storageOptions: ['256GB', '512GB'] },
  { brand: 'Samsung', name: 'Galaxy S24 Ultra', storageOptions: ['256GB', '512GB', '1TB'] },
  { brand: 'Samsung', name: 'Galaxy S25', storageOptions: ['128GB', '256GB'] },
  { brand: 'Samsung', name: 'Galaxy S25+', storageOptions: ['256GB', '512GB'] },
  { brand: 'Samsung', name: 'Galaxy S25 Ultra', storageOptions: ['256GB', '512GB', '1TB'] },

  // Samsung Galaxy A
  { brand: 'Samsung', name: 'Galaxy A14', storageOptions: ['64GB', '128GB'] },
  { brand: 'Samsung', name: 'Galaxy A15', storageOptions: ['128GB', '256GB'] },
  { brand: 'Samsung', name: 'Galaxy A25', storageOptions: ['128GB', '256GB'] },
  { brand: 'Samsung', name: 'Galaxy A34', storageOptions: ['128GB', '256GB'] },
  { brand: 'Samsung', name: 'Galaxy A35', storageOptions: ['128GB', '256GB'] },
  { brand: 'Samsung', name: 'Galaxy A54', storageOptions: ['128GB', '256GB'] },
  { brand: 'Samsung', name: 'Galaxy A55', storageOptions: ['128GB', '256GB'] },

  // Xiaomi - Redmi
  { brand: 'Xiaomi', name: 'Redmi 12', storageOptions: ['128GB', '256GB'] },
  { brand: 'Xiaomi', name: 'Redmi 12C', storageOptions: ['64GB', '128GB', '256GB'] },
  { brand: 'Xiaomi', name: 'Redmi 13', storageOptions: ['128GB', '256GB'] },
  { brand: 'Xiaomi', name: 'Redmi 13C', storageOptions: ['128GB', '256GB'] },
  { brand: 'Xiaomi', name: 'Redmi A3', storageOptions: ['64GB', '128GB'] },
  { brand: 'Xiaomi', name: 'Redmi A5', storageOptions: ['64GB', '128GB'] },
  { brand: 'Xiaomi', name: 'Redmi Note 11', storageOptions: ['64GB', '128GB'] },
  { brand: 'Xiaomi', name: 'Redmi Note 11S', storageOptions: ['64GB', '128GB'] },
  { brand: 'Xiaomi', name: 'Redmi Note 11 Pro', storageOptions: ['128GB', '256GB'] },
  { brand: 'Xiaomi', name: 'Redmi Note 12', storageOptions: ['64GB', '128GB', '256GB'] },
  { brand: 'Xiaomi', name: 'Redmi Note 12S', storageOptions: ['128GB', '256GB'] },
  { brand: 'Xiaomi', name: 'Redmi Note 12 Pro', storageOptions: ['128GB', '256GB'] },
  { brand: 'Xiaomi', name: 'Redmi Note 13', storageOptions: ['128GB', '256GB'] },
  { brand: 'Xiaomi', name: 'Redmi Note 13 Pro', storageOptions: ['128GB', '256GB', '512GB'] },
  { brand: 'Xiaomi', name: 'Redmi Note 13 Pro+', storageOptions: ['256GB', '512GB'] },

  // Xiaomi - Poco
  { brand: 'Xiaomi', name: 'Poco C31', storageOptions: ['32GB', '64GB'] },
  { brand: 'Xiaomi', name: 'Poco C40', storageOptions: ['32GB', '64GB'] },
  { brand: 'Xiaomi', name: 'Poco C55', storageOptions: ['64GB', '128GB'] },
  { brand: 'Xiaomi', name: 'Poco C61', storageOptions: ['64GB', '128GB'] },
  { brand: 'Xiaomi', name: 'Poco C65', storageOptions: ['128GB', '256GB'] },
  { brand: 'Xiaomi', name: 'Poco M5', storageOptions: ['64GB', '128GB'] },
  { brand: 'Xiaomi', name: 'Poco M6 Pro', storageOptions: ['128GB', '256GB'] },
  { brand: 'Xiaomi', name: 'Poco X5', storageOptions: ['128GB', '256GB'] },
  { brand: 'Xiaomi', name: 'Poco X5 Pro', storageOptions: ['128GB', '256GB'] },
  { brand: 'Xiaomi', name: 'Poco X6', storageOptions: ['128GB', '256GB'] },
  { brand: 'Xiaomi', name: 'Poco X6 Pro', storageOptions: ['256GB', '512GB'] },
  { brand: 'Xiaomi', name: 'Poco X7', storageOptions: ['128GB', '256GB'] },
  { brand: 'Xiaomi', name: 'Poco X7 Pro', storageOptions: ['256GB', '512GB'] },
  { brand: 'Xiaomi', name: 'Poco F5', storageOptions: ['256GB', '512GB'] },
  { brand: 'Xiaomi', name: 'Poco F6', storageOptions: ['256GB', '512GB'] },
  { brand: 'Xiaomi', name: 'Mi 13', storageOptions: ['128GB', '256GB', '512GB'] },

  // Motorola
  { brand: 'Motorola', name: 'Moto G24', storageOptions: ['128GB', '256GB'] },
  { brand: 'Motorola', name: 'Moto G34', storageOptions: ['128GB', '256GB'] },
  { brand: 'Motorola', name: 'Moto G54', storageOptions: ['128GB', '256GB'] },
  { brand: 'Motorola', name: 'Moto G84', storageOptions: ['128GB', '256GB'] },
  { brand: 'Motorola', name: 'Moto Edge 40', storageOptions: ['128GB', '256GB'] },
  { brand: 'Motorola', name: 'Moto Edge 40 Pro', storageOptions: ['256GB'] },
  { brand: 'Motorola', name: 'Moto Edge 50', storageOptions: ['256GB'] },
  { brand: 'Motorola', name: 'Moto Edge 50 Pro', storageOptions: ['256GB', '512GB'] },
];

// Pre-compute lowercase canonical names for fuzzy matching (used by layer 3)

// ---------------------------------------------------------------------------
// Layer 1 - Cleaning
// ---------------------------------------------------------------------------

export function cleanTitle(title: string): string {
  let cleaned = title.toLowerCase();

  // Remove accents (NFD normalization strips combining diacritical marks)
  cleaned = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Remove special characters except spaces, numbers, and +
  cleaned = cleaned.replace(/[^a-z0-9\s+]/g, ' ');

  // Collapse multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Remove irrelevant words (whole words only)
  const words = cleaned.split(' ');
  const filtered = words.filter((w) => !IRRELEVANT_WORDS.has(w));
  cleaned = filtered.join(' ').replace(/\s+/g, ' ').trim();

  return cleaned;
}

// ---------------------------------------------------------------------------
// Layer 2 - Regex + Dictionary
// ---------------------------------------------------------------------------

const IPHONE_ALIASES = /\b(?:iphone|ip|iph|ifone|i\s*phone)\b/;
const GALAXY_ALIASES = /\b(?:galaxy|gal|glx|samsung)\b/;
const XIAOMI_ALIASES = /\b(?:xiaomi|mi)\b/;
const REDMI_ALIAS = /\bredmi\b/;
const POCO_ALIAS = /\bpoco\b/;
const MOTO_ALIASES = /\b(?:motorola|moto)\b/;

export function extractBrand(cleaned: string): string | null {
  if (IPHONE_ALIASES.test(cleaned)) return 'Apple';
  if (GALAXY_ALIASES.test(cleaned)) return 'Samsung';
  if (REDMI_ALIAS.test(cleaned)) return 'Xiaomi';
  if (POCO_ALIAS.test(cleaned)) return 'Xiaomi';
  if (XIAOMI_ALIASES.test(cleaned)) return 'Xiaomi';
  if (MOTO_ALIASES.test(cleaned)) return 'Motorola';

  // Samsung S/A series detection (e.g. "s24", "a55")
  if (/\b[sa]\d{2,3}\b/.test(cleaned)) return 'Samsung';

  // Console brands
  if (/\b(?:playstation|ps\s*[45]|play\s*[45])\b/.test(cleaned)) return 'Sony';
  if (/\bxbox\b/.test(cleaned)) return 'Microsoft';
  if (/\b(?:nintendo|switch)\b/.test(cleaned)) return 'Nintendo';

  // Notebook brands
  if (/\bmacbook\b/.test(cleaned)) return 'Apple';
  if (/\bdell\b/.test(cleaned)) return 'Dell';
  if (/\blenovo\b/.test(cleaned)) return 'Lenovo';
  if (/\bacer\b/.test(cleaned)) return 'Acer';
  if (/\basus\b/.test(cleaned)) return 'Asus';
  if (/\b(?:hp|hewlett)\b/.test(cleaned)) return 'HP';

  // Car brands
  if (/\bfiat\b/.test(cleaned)) return 'Fiat';
  if (/\b(?:volkswagen|vw)\b/.test(cleaned)) return 'Volkswagen';
  if (/\bchevrolet\b/.test(cleaned)) return 'Chevrolet';
  if (/\btoyota\b/.test(cleaned)) return 'Toyota';
  if (/\bhyundai\b/.test(cleaned)) return 'Hyundai';
  if (/\bjeep\b/.test(cleaned)) return 'Jeep';
  if (/\brenault\b/.test(cleaned)) return 'Renault';
  if (/\bford\b/.test(cleaned)) return 'Ford';
  if (/\bnissan\b/.test(cleaned)) return 'Nissan';

  // Motorcycle brands (Honda/Yamaha/Suzuki covered separately via moto-specific detection)
  if (/\byamaha\b/.test(cleaned)) return 'Yamaha';
  if (/\bsuzuki\b/.test(cleaned)) return 'Suzuki';

  return null;
}

export function extractVariant(cleaned: string): string | null {
  // Try explicit storage with unit first
  const withUnit = cleaned.match(/\b(\d+)\s*(gb|tb)\b/);
  if (withUnit && withUnit[1] && withUnit[2]) {
    const num = parseInt(withUnit[1], 10);
    const unit = withUnit[2];
    if (unit === 'tb') return `${num}TB`;
    return `${num}GB`;
  }

  // Try standalone common storage numbers
  const standalone = cleaned.match(/\b(64|128|256|512|1024)\b/);
  if (standalone && standalone[1]) {
    const num = parseInt(standalone[1], 10);
    if (num === 1024) return '1TB';
    return `${num}GB`;
  }

  return null;
}

// Backwards-compat alias
export function extractStorage(cleaned: string): string | null {
  return extractVariant(cleaned);
}

function extractIPhoneModel(cleaned: string): NormalizeResult | null {
  // Try X/XR/XS models first
  const xMatch = cleaned.match(/\b(?:iphone\s*)?x\s*(s\s*max|s|r)?\b/i);
  if (xMatch && /iphone|ip|iph|ifone/.test(cleaned)) {
    const xSuffix = (xMatch[1] ?? '').replace(/\s/g, '').toUpperCase();
    let name: string;
    if (xSuffix === 'SMAX') name = 'iPhone XS Max';
    else if (xSuffix === 'S') name = 'iPhone XS';
    else if (xSuffix === 'R') name = 'iPhone XR';
    else name = 'iPhone X';

    const variant = extractVariant(cleaned);
    const knownMatch = KNOWN_MODELS.find((m) => m.brand === 'Apple' && m.name === name);
    if (knownMatch) {
      return { category: 'phone', brand: 'Apple', name, variant: variant ?? '', canonical: variant ? `Apple ${name} ${variant}` : `Apple ${name}` };
    }
  }

  // Extract model number (7-16)
  const modelMatch = cleaned.match(/\b([7-9]|1[0-6])\b/);
  if (!modelMatch) return null;

  const modelNumber = modelMatch[1];

  // Extract suffix
  let suffix = '';
  if (/\b(?:pro\s*max|promax|pm|pro\s*mx)\b/.test(cleaned)) {
    suffix = ' Pro Max';
  } else if (/\bpro\b/.test(cleaned)) {
    suffix = ' Pro';
  } else if (/\b(?:plus|\+|8plus|8\s*plus)\b/.test(cleaned)) {
    suffix = ' Plus';
  } else if (/\bmini\b/.test(cleaned)) {
    suffix = ' Mini';
  }

  const variant = extractVariant(cleaned);
  const name = `iPhone ${modelNumber}${suffix}`;
  const canonical = variant ? `Apple ${name} ${variant}` : `Apple ${name}`;

  const knownMatch = KNOWN_MODELS.find((m) => m.brand === 'Apple' && m.name === name);
  if (!knownMatch) return null;

  return { category: 'phone', brand: 'Apple', name, variant: variant ?? '', canonical };
}

function extractSamsungModel(cleaned: string): NormalizeResult | null {
  // Galaxy S series: "s23", "s24", "s25" — also handle "s24u" (ultra shorthand)
  const sMatch = cleaned.match(/\bs(2[3-5])(?:u)?\b/);
  if (sMatch) {
    const modelNumber = sMatch[1];
    let suffix = '';

    // Check "s24u" shorthand first (the 'u' was consumed by the regex)
    const hasUShorthand = new RegExp(`\\bs${modelNumber}u\\b`).test(cleaned);

    if (hasUShorthand || /\bultra\b|\bult\b/.test(cleaned)) {
      suffix = ' Ultra';
    } else if (/\bplus\b|\b\+\b/.test(cleaned)) {
      suffix = '+';
    }

    const variant = extractVariant(cleaned);
    const name = `Galaxy S${modelNumber}${suffix}`;
    const canonical = variant
      ? `Samsung ${name} ${variant}`
      : `Samsung ${name}`;

    const knownMatch = KNOWN_MODELS.find(
      (m) => m.brand === 'Samsung' && m.name === name
    );
    if (!knownMatch) return null;

    return {
      category: 'phone',
      brand: 'Samsung',
      name,
      variant: variant ?? '',
      canonical,
    };
  }

  // Galaxy A series: "a14", "a15", "a34", "a54", "a55"
  const aMatch = cleaned.match(/\ba(1[45]|3[4]|5[45])\b/);
  if (aMatch) {
    const modelNumber = aMatch[1];
    const variant = extractVariant(cleaned);
    const name = `Galaxy A${modelNumber}`;
    const canonical = variant
      ? `Samsung ${name} ${variant}`
      : `Samsung ${name}`;

    const knownMatch = KNOWN_MODELS.find(
      (m) => m.brand === 'Samsung' && m.name === name
    );
    if (!knownMatch) return null;

    return {
      category: 'phone',
      brand: 'Samsung',
      name,
      variant: variant ?? '',
      canonical,
    };
  }

  return null;
}

function extractXiaomiModel(cleaned: string): NormalizeResult | null {
  // Redmi Note series (must check before plain Redmi)
  const redmiNoteMatch = cleaned.match(/\bredmi\s+not[ei]?\s+(\d+)\s*(s|pro\+?|pro\s*plus)?\b/);
  if (redmiNoteMatch) {
    const modelNumber = redmiNoteMatch[1];
    let suffix = '';
    const rawSuffix = (redmiNoteMatch[2] ?? '').toLowerCase().trim();
    if (rawSuffix === 's') suffix = 'S';
    else if (rawSuffix.includes('pro') && rawSuffix.includes('+') || rawSuffix.includes('plus')) suffix = ' Pro+';
    else if (rawSuffix.includes('pro')) suffix = ' Pro';

    const variant = extractVariant(cleaned);
    const name = `Redmi Note ${modelNumber}${suffix}`;

    const knownMatch = KNOWN_MODELS.find((m) => m.brand === 'Xiaomi' && m.name === name);
    if (knownMatch) {
      return { category: 'phone', brand: 'Xiaomi', name, variant: variant ?? '', canonical: variant ? `Xiaomi ${name} ${variant}` : `Xiaomi ${name}` };
    }
  }

  // Plain Redmi series: "redmi 12", "redmi 13c", "redmi a5"
  const redmiMatch = cleaned.match(/\bredmi\s+([a-z]?)(\d+)\s*([csp])?\b/);
  if (redmiMatch) {
    const prefix = (redmiMatch[1] ?? '').toUpperCase();
    const modelNumber = redmiMatch[2];
    const rawSuffix = (redmiMatch[3] ?? '').toUpperCase();
    const name = prefix ? `Redmi ${prefix}${modelNumber}${rawSuffix}` : `Redmi ${modelNumber}${rawSuffix}`;
    const variant = extractVariant(cleaned);

    const knownMatch = KNOWN_MODELS.find((m) => m.brand === 'Xiaomi' && m.name === name);
    if (knownMatch) {
      return { category: 'phone', brand: 'Xiaomi', name, variant: variant ?? '', canonical: variant ? `Xiaomi ${name} ${variant}` : `Xiaomi ${name}` };
    }
  }

  // Poco series: X, F, C, M
  const pocoMatch = cleaned.match(/\bpoco\s+([xfcm])(\d+)\b/);
  if (pocoMatch && pocoMatch[1] && pocoMatch[2]) {
    const series = pocoMatch[1].toUpperCase();
    const modelNumber = pocoMatch[2];
    let suffix = '';
    if (/\bpro\b/.test(cleaned)) suffix = ' Pro';

    const variant = extractVariant(cleaned);
    const name = `Poco ${series}${modelNumber}${suffix}`;

    const knownMatch = KNOWN_MODELS.find((m) => m.brand === 'Xiaomi' && m.name === name);
    if (knownMatch) {
      return { category: 'phone', brand: 'Xiaomi', name, variant: variant ?? '', canonical: variant ? `Xiaomi ${name} ${variant}` : `Xiaomi ${name}` };
    }
  }

  // Mi series
  const miMatch = cleaned.match(/\bmi\s+(\d+)\b/);
  if (miMatch) {
    const modelNumber = miMatch[1];
    const variant = extractVariant(cleaned);
    const name = `Mi ${modelNumber}`;

    const knownMatch = KNOWN_MODELS.find((m) => m.brand === 'Xiaomi' && m.name === name);
    if (knownMatch) {
      return { category: 'phone', brand: 'Xiaomi', name, variant: variant ?? '', canonical: variant ? `Xiaomi ${name} ${variant}` : `Xiaomi ${name}` };
    }
  }

  return null;
}

function extractMotorolaModel(cleaned: string): NormalizeResult | null {
  // Moto G series: "moto g24", "g54"
  const gMatch = cleaned.match(/\b(?:moto\s+)?g(\d{2})\b/);
  if (gMatch && gMatch[1]) {
    const modelNumber = gMatch[1];
    const variant = extractVariant(cleaned);
    const name = `Moto G${modelNumber}`;

    const knownMatch = KNOWN_MODELS.find((m) => m.brand === 'Motorola' && m.name === name);
    if (knownMatch) {
      return { category: 'phone', brand: 'Motorola', name, variant: variant ?? '', canonical: variant ? `Motorola ${name} ${variant}` : `Motorola ${name}` };
    }
  }

  // Moto Edge series
  const edgeMatch = cleaned.match(/\b(?:moto\s+)?edge\s+(\d+)\s*(pro)?\b/);
  if (edgeMatch && edgeMatch[1]) {
    const modelNumber = edgeMatch[1];
    const suffix = edgeMatch[2] ? ' Pro' : '';
    const variant = extractVariant(cleaned);
    const name = `Moto Edge ${modelNumber}${suffix}`;

    const knownMatch = KNOWN_MODELS.find((m) => m.brand === 'Motorola' && m.name === name);
    if (knownMatch) {
      return { category: 'phone', brand: 'Motorola', name, variant: variant ?? '', canonical: variant ? `Motorola ${name} ${variant}` : `Motorola ${name}` };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Console extractor
// ---------------------------------------------------------------------------

function extractConsoleModel(cleaned: string): NormalizeResult | null {
  // PlayStation detection
  const psMatch = cleaned.match(/\b(?:ps\s*([45])|playstation\s*([45])|play\s*([45]))\b/);
  if (psMatch) {
    const gen = psMatch[1] ?? psMatch[2] ?? psMatch[3] ?? '';
    const name = `PlayStation ${gen}`;

    let edition = '';
    if (/\bdigital\b/.test(cleaned)) edition = ' Digital';
    else if (/\bslim\b/.test(cleaned)) edition = ' Slim';
    else if (/\bpro\b/.test(cleaned)) edition = ' Pro';

    const canonical = `Sony ${name}${edition}`.trim();
    return { category: 'console', brand: 'Sony', name: `${name}${edition}`, variant: '', canonical };
  }

  // Xbox detection
  if (/\bxbox\b/.test(cleaned)) {
    let name = 'Xbox';
    if (/\bseries\s*x\b/.test(cleaned)) name = 'Xbox Series X';
    else if (/\bseries\s*s\b/.test(cleaned)) name = 'Xbox Series S';
    else if (/\bone\s*x\b/.test(cleaned)) name = 'Xbox One X';
    else if (/\bone\s*s\b/.test(cleaned)) name = 'Xbox One S';
    else if (/\bone\b/.test(cleaned)) name = 'Xbox One';

    const canonical = `Microsoft ${name}`;
    return { category: 'console', brand: 'Microsoft', name, variant: '', canonical };
  }

  // Nintendo Switch detection
  if (/\b(?:nintendo|switch)\b/.test(cleaned)) {
    let name = 'Switch';
    if (/\boled\b/.test(cleaned)) name = 'Switch OLED';
    else if (/\blite\b/.test(cleaned)) name = 'Switch Lite';

    const canonical = `Nintendo ${name}`;
    return { category: 'console', brand: 'Nintendo', name, variant: '', canonical };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Notebook extractor
// ---------------------------------------------------------------------------

function extractNotebookModel(cleaned: string): NormalizeResult | null {
  // MacBook detection (no extra keyword needed — very specific brand)
  if (/\bmacbook\b/.test(cleaned)) {
    let name = 'MacBook';
    if (/\bpro\b/.test(cleaned)) name = 'MacBook Pro';
    else if (/\bair\b/.test(cleaned)) name = 'MacBook Air';

    // Extract chip/processor as variant
    let variant = '';
    const chipMatch = cleaned.match(/\b(m[1-4])\b/);
    if (chipMatch && chipMatch[1]) {
      variant = chipMatch[1].toUpperCase();
    }

    const canonical = variant ? `Apple ${name} ${variant}` : `Apple ${name}`;
    return { category: 'notebook', brand: 'Apple', name, variant, canonical };
  }

  // Non-Apple notebooks require a keyword to avoid false positives
  const hasNotebookKeyword = /\b(?:notebook|laptop|gamer)\b/.test(cleaned);
  if (!hasNotebookKeyword) return null;

  // Extract processor variant (common across all brands)
  function extractProcessorVariant(text: string): string {
    const ryzenMatch = text.match(/\bryzen\s*([3579])\b/);
    if (ryzenMatch && ryzenMatch[1]) return `Ryzen ${ryzenMatch[1]}`;
    const intelMatch = text.match(/\bi([3579])\b/);
    if (intelMatch && intelMatch[1]) return `i${intelMatch[1]}`;
    return '';
  }

  const variant = extractProcessorVariant(cleaned);

  if (/\bdell\b/.test(cleaned)) {
    let name = 'Dell Notebook';
    if (/\binspiro[mn]\b/.test(cleaned)) name = 'Dell Inspiron';
    else if (/\bg15\b/.test(cleaned)) name = 'Dell G15';
    else if (/\bxps\b/.test(cleaned)) name = 'Dell XPS';
    const canonical = variant ? `Dell ${name} ${variant}` : `Dell ${name}`;
    return { category: 'notebook', brand: 'Dell', name, variant, canonical };
  }

  if (/\blenovo\b/.test(cleaned)) {
    let name = 'Lenovo Notebook';
    if (/\bideapad\b/.test(cleaned)) name = 'Lenovo IdeaPad';
    else if (/\blegion\b/.test(cleaned)) name = 'Lenovo Legion';
    else if (/\bthinkpad\b/.test(cleaned)) name = 'Lenovo ThinkPad';
    const canonical = variant ? `Lenovo ${name} ${variant}` : `Lenovo ${name}`;
    return { category: 'notebook', brand: 'Lenovo', name, variant, canonical };
  }

  if (/\bacer\b/.test(cleaned)) {
    let name = 'Acer Notebook';
    if (/\bnitro\b/.test(cleaned)) name = 'Acer Nitro';
    else if (/\baspire\b/.test(cleaned)) name = 'Acer Aspire';
    const canonical = variant ? `Acer ${name} ${variant}` : `Acer ${name}`;
    return { category: 'notebook', brand: 'Acer', name, variant, canonical };
  }

  if (/\basus\b/.test(cleaned)) {
    let name = 'Asus Notebook';
    if (/\brog\b/.test(cleaned)) name = 'Asus ROG';
    else if (/\btuf\b/.test(cleaned)) name = 'Asus TUF';
    else if (/\bvivobook\b/.test(cleaned)) name = 'Asus VivoBook';
    const canonical = variant ? `Asus ${name} ${variant}` : `Asus ${name}`;
    return { category: 'notebook', brand: 'Asus', name, variant, canonical };
  }

  if (/\bhp\b/.test(cleaned)) {
    let name = 'HP Notebook';
    if (/\bpavilion\b/.test(cleaned)) name = 'HP Pavilion';
    else if (/\bvictus\b/.test(cleaned)) name = 'HP Victus';
    else if (/\bomen\b/.test(cleaned)) name = 'HP Omen';
    const canonical = variant ? `HP ${name} ${variant}` : `HP ${name}`;
    return { category: 'notebook', brand: 'HP', name, variant, canonical };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Motorcycle extractor
// ---------------------------------------------------------------------------

function extractMotorcycleModel(cleaned: string): NormalizeResult | null {
  // Honda motorcycles
  const hondaMotoPatterns: Array<{ pattern: RegExp; name: string; brand: string }> = [
    { pattern: /\bcg\s*(125|150|160)\b/, name: 'CG', brand: 'Honda' },
    { pattern: /\bcb\s*(300|500)\b/, name: 'CB', brand: 'Honda' },
    { pattern: /\bxre\s*(190|300)\b/, name: 'XRE', brand: 'Honda' },
    { pattern: /\bpop\s*110\b/, name: 'Pop 110', brand: 'Honda' },
    { pattern: /\bbiz\s*125\b/, name: 'Biz 125', brand: 'Honda' },
    { pattern: /\bpcx\s*160\b/, name: 'PCX 160', brand: 'Honda' },
  ];

  for (const { pattern, name, brand } of hondaMotoPatterns) {
    const m = cleaned.match(pattern);
    if (m) {
      // Extract cc from the match
      const ccMatch = m[0].match(/\d+/);
      const variant = ccMatch ? `${ccMatch[0]}cc` : '';
      const fullName = variant ? `${name} ${ccMatch![0]}` : name;
      const canonical = variant ? `${brand} ${fullName} ${variant}` : `${brand} ${fullName}`;
      return { category: 'motorcycle', brand, name: fullName, variant, canonical };
    }
  }

  // Yamaha motorcycles
  const yamahaMotoPatterns: Array<{ pattern: RegExp; name: string }> = [
    { pattern: /\bfactor\s*(125|150)\b/, name: 'Factor' },
    { pattern: /\bfazer\s*(150|250)\b/, name: 'Fazer' },
    { pattern: /\bmt\s*0[379]\b/, name: 'MT' },
    { pattern: /\blander\s*250\b/, name: 'Lander 250' },
    { pattern: /\bcrosser\s*150\b/, name: 'Crosser 150' },
  ];

  for (const { pattern, name } of yamahaMotoPatterns) {
    const m = cleaned.match(pattern);
    if (m) {
      const ccMatch = m[0].match(/\d+/);
      const variant = ccMatch ? `${ccMatch[0]}cc` : '';
      const fullName = variant && !name.includes(ccMatch![0]) ? `${name} ${ccMatch![0]}` : name;
      const canonical = variant ? `Yamaha ${fullName} ${variant}` : `Yamaha ${fullName}`;
      return { category: 'motorcycle', brand: 'Yamaha', name: fullName, variant, canonical };
    }
  }

  // Suzuki motorcycles
  const suzukiMotoPatterns: Array<{ pattern: RegExp; name: string }> = [
    { pattern: /\byes\s*125\b/, name: 'Yes 125' },
    { pattern: /\bintruder\s*125\b/, name: 'Intruder 125' },
    { pattern: /\bv[\s-]?strom\b/, name: 'V-Strom' },
  ];

  for (const { pattern, name } of suzukiMotoPatterns) {
    const m = cleaned.match(pattern);
    if (m) {
      const ccMatch = name.match(/\d+/);
      const variant = ccMatch ? `${ccMatch[0]}cc` : '';
      const canonical = variant ? `Suzuki ${name} ${variant}` : `Suzuki ${name}`;
      return { category: 'motorcycle', brand: 'Suzuki', name, variant, canonical };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Car extractor
// ---------------------------------------------------------------------------

function extractCarModel(cleaned: string): NormalizeResult | null {
  interface CarPattern { pattern: RegExp; name: string; brand: string }

  const carPatterns: CarPattern[] = [
    // Fiat
    { pattern: /\buno\b/, name: 'Uno', brand: 'Fiat' },
    { pattern: /\bmobi\b/, name: 'Mobi', brand: 'Fiat' },
    { pattern: /\bargo\b/, name: 'Argo', brand: 'Fiat' },
    { pattern: /\bcronos\b/, name: 'Cronos', brand: 'Fiat' },
    { pattern: /\btoro\b/, name: 'Toro', brand: 'Fiat' },
    { pattern: /\bestrada\b/, name: 'Strada', brand: 'Fiat' },
    { pattern: /\bpulse\b/, name: 'Pulse', brand: 'Fiat' },
    // VW
    { pattern: /\bgol\b/, name: 'Gol', brand: 'Volkswagen' },
    { pattern: /\bpolo\b/, name: 'Polo', brand: 'Volkswagen' },
    { pattern: /\bvirtus\b/, name: 'Virtus', brand: 'Volkswagen' },
    { pattern: /\bt[\s-]?cross\b/, name: 'T-Cross', brand: 'Volkswagen' },
    { pattern: /\bnivus\b/, name: 'Nivus', brand: 'Volkswagen' },
    { pattern: /\bsaveiro\b/, name: 'Saveiro', brand: 'Volkswagen' },
    // Chevrolet
    { pattern: /\bonix\b/, name: 'Onix', brand: 'Chevrolet' },
    { pattern: /\btracker\b/, name: 'Tracker', brand: 'Chevrolet' },
    { pattern: /\bs10\b/, name: 'S10', brand: 'Chevrolet' },
    { pattern: /\bmontana\b/, name: 'Montana', brand: 'Chevrolet' },
    { pattern: /\bspin\b/, name: 'Spin', brand: 'Chevrolet' },
    // Honda cars (specific, no overlap with motos)
    { pattern: /\bcivic\b/, name: 'Civic', brand: 'Honda' },
    { pattern: /\bcity\b/, name: 'City', brand: 'Honda' },
    { pattern: /\bhr[\s-]?v\b/, name: 'HR-V', brand: 'Honda' },
    { pattern: /\bcr[\s-]?v\b/, name: 'CR-V', brand: 'Honda' },
    { pattern: /\bfit\b/, name: 'Fit', brand: 'Honda' },
    { pattern: /\bwr[\s-]?v\b/, name: 'WR-V', brand: 'Honda' },
    // Toyota
    { pattern: /\bcorolla\s+cross\b/, name: 'Corolla Cross', brand: 'Toyota' },
    { pattern: /\bcorolla\b/, name: 'Corolla', brand: 'Toyota' },
    { pattern: /\byaris\b/, name: 'Yaris', brand: 'Toyota' },
    { pattern: /\bhilux\b/, name: 'Hilux', brand: 'Toyota' },
    { pattern: /\bsw4\b/, name: 'SW4', brand: 'Toyota' },
    // Hyundai
    { pattern: /\bhb20\b/, name: 'HB20', brand: 'Hyundai' },
    { pattern: /\bcreta\b/, name: 'Creta', brand: 'Hyundai' },
    { pattern: /\btucson\b/, name: 'Tucson', brand: 'Hyundai' },
    // Jeep
    { pattern: /\brenegade\b/, name: 'Renegade', brand: 'Jeep' },
    { pattern: /\bcompass\b/, name: 'Compass', brand: 'Jeep' },
    { pattern: /\bcommander\b/, name: 'Commander', brand: 'Jeep' },
    // Renault
    { pattern: /\bkwid\b/, name: 'Kwid', brand: 'Renault' },
    { pattern: /\bsandero\b/, name: 'Sandero', brand: 'Renault' },
    { pattern: /\bduster\b/, name: 'Duster', brand: 'Renault' },
  ];

  for (const { pattern, name, brand } of carPatterns) {
    if (pattern.test(cleaned)) {
      // Extract year as variant
      const yearMatch = cleaned.match(/\b(20[0-2][0-9])\b/);
      const variant = yearMatch ? yearMatch[1]! : '';
      const canonical = variant ? `${brand} ${name} ${variant}` : `${brand} ${name}`;
      return { category: 'car', brand, name, variant, canonical };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Phone-specific regex extract
// ---------------------------------------------------------------------------

function regexExtractPhone(cleaned: string): NormalizeResult | null {
  const brand = extractBrand(cleaned);

  if (brand === 'Apple' || !brand) {
    const iphoneResult = extractIPhoneModel(cleaned);
    if (iphoneResult) return iphoneResult;
  }

  if (brand === 'Samsung' || !brand) {
    const samsungResult = extractSamsungModel(cleaned);
    if (samsungResult) return samsungResult;
  }

  if (brand === 'Xiaomi' || !brand) {
    const xiaomiResult = extractXiaomiModel(cleaned);
    if (xiaomiResult) return xiaomiResult;
  }

  if (brand === 'Motorola' || !brand) {
    const motorolaResult = extractMotorolaModel(cleaned);
    if (motorolaResult) return motorolaResult;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Layer 3 - Fuzzy matching (fallback, phones only)
// ---------------------------------------------------------------------------

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = distance(a, b);
  return ((maxLen - dist) / maxLen) * 100;
}

function fuzzyMatch(cleaned: string): NormalizeResult | null {
  const brand = extractBrand(cleaned);
  const variant = extractVariant(cleaned);

  // Remove storage text from cleaned for better model matching
  let forMatching = cleaned
    .replace(/\b\d+\s*(?:gb|tb)\b/g, '')
    .replace(/\b(?:64|128|256|512|1024)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (forMatching.length < 3) return null;

  let bestScore = 0;
  let bestModel: KnownModel | null = null;

  const candidates = brand
    ? KNOWN_MODELS.filter((m) => m.brand === brand)
    : KNOWN_MODELS;

  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i]!;
    const canonicalLower = `${model.brand} ${model.name}`.toLowerCase();
    const nameOnlyLower = model.name.toLowerCase();

    // Compare against full canonical and name-only
    const scoreFull = similarity(forMatching, canonicalLower);
    const scoreName = similarity(forMatching, nameOnlyLower);
    const score = Math.max(scoreFull, scoreName);

    if (score > bestScore) {
      bestScore = score;
      bestModel = model;
    }
  }

  if (bestScore >= 75 && bestModel) {
    const name = bestModel.name;
    const canonical = variant
      ? `${bestModel.brand} ${name} ${variant}`
      : `${bestModel.brand} ${name}`;

    return {
      category: 'phone',
      brand: bestModel.brand,
      name,
      variant: variant ?? '',
      canonical,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function normalizeTitle(title: string): NormalizeResult | null {
  const cleaned = cleanTitle(title);

  // Too short or too generic
  if (cleaned.length < 3) return null;

  // --- Step 1: Phone detection (most specific — requires phone keywords or number hints) ---
  const hasPhoneKeyword =
    IPHONE_ALIASES.test(cleaned) ||
    GALAXY_ALIASES.test(cleaned) ||
    REDMI_ALIAS.test(cleaned) ||
    POCO_ALIAS.test(cleaned) ||
    MOTO_ALIASES.test(cleaned) ||
    /\b[sa]\d{2,3}\b/.test(cleaned);

  if (hasPhoneKeyword || /\d/.test(cleaned)) {
    const phoneResult = regexExtractPhone(cleaned);
    if (phoneResult) return phoneResult;
  }

  // --- Step 2: Console detection ---
  if (
    /\b(?:ps\s*[45]|playstation|play\s*[45])\b/.test(cleaned) ||
    /\bxbox\b/.test(cleaned) ||
    /\b(?:nintendo|switch)\b/.test(cleaned)
  ) {
    const consoleResult = extractConsoleModel(cleaned);
    if (consoleResult) return consoleResult;
  }

  // --- Step 3: Notebook detection ---
  if (
    /\bmacbook\b/.test(cleaned) ||
    /\b(?:notebook|laptop|gamer)\b/.test(cleaned)
  ) {
    const notebookResult = extractNotebookModel(cleaned);
    if (notebookResult) return notebookResult;
  }

  // --- Step 4: Motorcycle detection ---
  if (
    /\b(?:cg|cb|xre|pop|biz|pcx|factor|fazer|mt|lander|crosser|yes|intruder|vstrom|v[\s-]?strom)\b/.test(cleaned)
  ) {
    const motoResult = extractMotorcycleModel(cleaned);
    if (motoResult) return motoResult;
  }

  // --- Step 5: Car detection ---
  if (
    /\b(?:civic|city|hr[\s-]?v|cr[\s-]?v|fit|wr[\s-]?v|corolla|yaris|hilux|sw4|hb20|creta|tucson|renegade|compass|commander|kwid|sandero|duster|onix|tracker|s10|montana|spin|gol|polo|virtus|t[\s-]?cross|nivus|saveiro|uno|mobi|argo|cronos|toro|estrada|pulse)\b/.test(cleaned)
  ) {
    const carResult = extractCarModel(cleaned);
    if (carResult) return carResult;
  }

  // --- Step 6: Fuzzy fallback (phones only) ---
  if (/\d/.test(cleaned)) {
    const fuzzyResult = fuzzyMatch(cleaned);
    if (fuzzyResult) return fuzzyResult;
  }

  return null;
}
