import { describe, it, expect } from 'vitest';
import {
  normalizeTitle,
  cleanTitle,
  extractBrand,
  extractStorage,
} from '../normalizer.service';

// ---------------------------------------------------------------------------
// cleanTitle
// ---------------------------------------------------------------------------

describe('cleanTitle', () => {
  it('lowercases and removes accents', () => {
    expect(cleanTitle('iPhone Pr\u00f3ximo')).toBe('iphone proximo');
  });

  it('removes special characters except spaces and numbers', () => {
    expect(cleanTitle('ip-15/pro*max')).toBe('ip 15 pro max');
  });

  it('removes irrelevant words', () => {
    const result = cleanTitle('vendo iphone 15 preto seminovo urgente');
    expect(result).toBe('iphone 15');
  });

  it('collapses multiple spaces', () => {
    expect(cleanTitle('ip   15   pro')).toBe('ip 15 pro');
  });
});

// ---------------------------------------------------------------------------
// extractBrand
// ---------------------------------------------------------------------------

describe('extractBrand', () => {
  it('detects Apple from "iphone"', () => {
    expect(extractBrand('iphone 15')).toBe('Apple');
  });

  it('detects Apple from "ip"', () => {
    expect(extractBrand('ip 15 pro')).toBe('Apple');
  });

  it('detects Samsung from "galaxy"', () => {
    expect(extractBrand('galaxy s24')).toBe('Samsung');
  });

  it('detects Samsung from S-series pattern', () => {
    expect(extractBrand('s24 ultra')).toBe('Samsung');
  });

  it('detects Samsung from A-series pattern', () => {
    expect(extractBrand('a55 128')).toBe('Samsung');
  });

  it('detects Xiaomi from "redmi"', () => {
    expect(extractBrand('redmi note 13')).toBe('Xiaomi');
  });

  it('detects Xiaomi from "poco"', () => {
    expect(extractBrand('poco x6 pro')).toBe('Xiaomi');
  });

  it('returns null for unknown', () => {
    expect(extractBrand('celular bom')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractStorage
// ---------------------------------------------------------------------------

describe('extractStorage', () => {
  it('extracts "256gb"', () => {
    expect(extractStorage('iphone 15 256gb')).toBe('256GB');
  });

  it('extracts standalone "256"', () => {
    expect(extractStorage('ip 15 pro 256')).toBe('256GB');
  });

  it('extracts "1tb"', () => {
    expect(extractStorage('iphone 15 1tb')).toBe('1TB');
  });

  it('returns null when no storage found', () => {
    expect(extractStorage('iphone 15 pro')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// normalizeTitle - iPhone variations
// ---------------------------------------------------------------------------

describe('normalizeTitle - iPhone', () => {
  it('normalizes "iPhone 15 Pro Max 256GB"', () => {
    const result = normalizeTitle('iPhone 15 Pro Max 256GB');
    expect(result?.canonical).toBe('Apple iPhone 15 Pro Max 256GB');
  });

  it('normalizes "ip 15 pm 256"', () => {
    const result = normalizeTitle('ip 15 pm 256');
    expect(result?.canonical).toBe('Apple iPhone 15 Pro Max 256GB');
  });

  it('normalizes "iphone 15 pro max 256gb preto seminovo"', () => {
    const result = normalizeTitle('iphone 15 pro max 256gb preto seminovo');
    expect(result?.canonical).toBe('Apple iPhone 15 Pro Max 256GB');
  });

  it('normalizes "ifone 15 promax 256"', () => {
    const result = normalizeTitle('ifone 15 promax 256');
    expect(result?.canonical).toBe('Apple iPhone 15 Pro Max 256GB');
  });

  it('normalizes "15 pro max 256gb" (no brand, detect from context)', () => {
    const result = normalizeTitle('15 pro max 256gb');
    expect(result?.canonical).toBe('Apple iPhone 15 Pro Max 256GB');
  });

  it('normalizes "ip 14 pro 128 preto impecavel"', () => {
    const result = normalizeTitle('ip 14 pro 128 preto impecavel');
    expect(result?.canonical).toBe('Apple iPhone 14 Pro 128GB');
  });
});

// ---------------------------------------------------------------------------
// normalizeTitle - Samsung variations
// ---------------------------------------------------------------------------

describe('normalizeTitle - Samsung', () => {
  it('normalizes "Galaxy S24 Ultra 512GB"', () => {
    const result = normalizeTitle('Galaxy S24 Ultra 512GB');
    expect(result?.canonical).toBe('Samsung Galaxy S24 Ultra 512GB');
  });

  it('normalizes "s24 ultra 512"', () => {
    const result = normalizeTitle('s24 ultra 512');
    expect(result?.canonical).toBe('Samsung Galaxy S24 Ultra 512GB');
  });

  it('normalizes "samsung s24u 512gb"', () => {
    const result = normalizeTitle('samsung s24u 512gb');
    expect(result?.canonical).toBe('Samsung Galaxy S24 Ultra 512GB');
  });

  it('normalizes "glx s24 ultra 512"', () => {
    const result = normalizeTitle('glx s24 ultra 512');
    expect(result?.canonical).toBe('Samsung Galaxy S24 Ultra 512GB');
  });

  it('normalizes "galaxy a55 128gb"', () => {
    const result = normalizeTitle('galaxy a55 128gb');
    expect(result?.canonical).toBe('Samsung Galaxy A55 128GB');
  });

  it('normalizes "a55 128"', () => {
    const result = normalizeTitle('a55 128');
    expect(result?.canonical).toBe('Samsung Galaxy A55 128GB');
  });

  it('normalizes "s23 plus 256gb"', () => {
    const result = normalizeTitle('s23 plus 256gb');
    expect(result?.canonical).toBe('Samsung Galaxy S23+ 256GB');
  });
});

// ---------------------------------------------------------------------------
// normalizeTitle - Xiaomi variations
// ---------------------------------------------------------------------------

describe('normalizeTitle - Xiaomi', () => {
  it('normalizes "Poco X6 Pro 256gb"', () => {
    const result = normalizeTitle('Poco X6 Pro 256gb');
    expect(result?.canonical).toBe('Xiaomi Poco X6 Pro 256GB');
  });

  it('normalizes "poco x6 pro 256"', () => {
    const result = normalizeTitle('poco x6 pro 256');
    expect(result?.canonical).toBe('Xiaomi Poco X6 Pro 256GB');
  });

  it('normalizes "redmi note 13 128gb"', () => {
    const result = normalizeTitle('redmi note 13 128gb');
    expect(result?.canonical).toBe('Xiaomi Redmi Note 13 128GB');
  });

  it('normalizes "Xiaomi redmi note 13 128"', () => {
    const result = normalizeTitle('Xiaomi redmi note 13 128');
    expect(result?.canonical).toBe('Xiaomi Redmi Note 13 128GB');
  });
});

// ---------------------------------------------------------------------------
// normalizeTitle - null cases
// ---------------------------------------------------------------------------

describe('normalizeTitle - null cases', () => {
  it('returns null for "celular bom e barato"', () => {
    expect(normalizeTitle('celular bom e barato')).toBeNull();
  });

  it('returns null for "vendo urgente"', () => {
    expect(normalizeTitle('vendo urgente')).toBeNull();
  });

  it('returns null for "capinha iphone"', () => {
    expect(normalizeTitle('capinha iphone')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// normalizeTitle - result structure
// ---------------------------------------------------------------------------

describe('normalizeTitle - result structure', () => {
  it('returns correct category, brand, name, variant, canonical', () => {
    const result = normalizeTitle('iPhone 16 Pro Max 512GB');
    expect(result).toBeTruthy();
    expect(result!.category).toBe('phone');
    expect(result!.brand).toBe('Apple');
    expect(result!.name).toBe('iPhone 16 Pro Max');
    expect(result!.variant).toBe('512GB');
    expect(result!.canonical).toBe('Apple iPhone 16 Pro Max 512GB');
  });
});
