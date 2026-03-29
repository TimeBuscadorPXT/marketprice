import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Re-implement the pure math functions from price.service.ts so we can
// unit-test them without importing Prisma.
// These must stay in sync with the source.
// ---------------------------------------------------------------------------

function median(sorted: number[]): number {
  const len = sorted.length;
  if (len === 0) return 0;
  const mid = Math.floor(len / 2);
  if (len % 2 !== 0) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower]!;
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (index - lower);
}

function computeTrend(allPrices: number[], recentPrices: number[]): number {
  const average =
    allPrices.length > 0
      ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length
      : 0;
  const recentAvg =
    recentPrices.length > 0
      ? recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length
      : average;

  return average > 0
    ? Math.round(((recentAvg - average) / average) * 10000) / 100
    : 0;
}

// ---------------------------------------------------------------------------
// median
// ---------------------------------------------------------------------------

describe('median', () => {
  it('returns 0 for empty array', () => {
    expect(median([])).toBe(0);
  });

  it('returns the single element for a one-element array', () => {
    expect(median([5000])).toBe(5000);
  });

  it('returns the middle element for odd-length array', () => {
    expect(median([1000, 2000, 3000])).toBe(2000);
  });

  it('returns the average of two middle elements for even-length array', () => {
    expect(median([1000, 2000, 3000, 4000])).toBe(2500);
  });

  it('works with a large sorted array', () => {
    const sorted = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500];
    expect(median(sorted)).toBe(2500);
  });
});

// ---------------------------------------------------------------------------
// percentile
// ---------------------------------------------------------------------------

describe('percentile', () => {
  it('returns 0 for empty array', () => {
    expect(percentile([], 25)).toBe(0);
    expect(percentile([], 75)).toBe(0);
  });

  it('returns correct p25 for a sorted array', () => {
    // [1000, 2000, 3000, 4000, 5000]
    // index = 0.25 * 4 = 1.0 => sorted[1] = 2000
    const sorted = [1000, 2000, 3000, 4000, 5000];
    expect(percentile(sorted, 25)).toBe(2000);
  });

  it('returns correct p75 for a sorted array', () => {
    // [1000, 2000, 3000, 4000, 5000]
    // index = 0.75 * 4 = 3.0 => sorted[3] = 4000
    const sorted = [1000, 2000, 3000, 4000, 5000];
    expect(percentile(sorted, 75)).toBe(4000);
  });

  it('interpolates between values when index is fractional', () => {
    // [1000, 2000, 3000, 4000]
    // p25: index = 0.25 * 3 = 0.75 => 1000 + (2000-1000)*0.75 = 1750
    const sorted = [1000, 2000, 3000, 4000];
    expect(percentile(sorted, 25)).toBe(1750);
  });

  it('returns min for p0', () => {
    const sorted = [500, 1000, 1500];
    expect(percentile(sorted, 0)).toBe(500);
  });

  it('returns max for p100', () => {
    const sorted = [500, 1000, 1500];
    expect(percentile(sorted, 100)).toBe(1500);
  });

  it('returns the single element regardless of percentile', () => {
    expect(percentile([3000], 25)).toBe(3000);
    expect(percentile([3000], 75)).toBe(3000);
    expect(percentile([3000], 50)).toBe(3000);
  });
});

// ---------------------------------------------------------------------------
// trend
// ---------------------------------------------------------------------------

describe('computeTrend', () => {
  it('returns 0 when all prices are empty', () => {
    expect(computeTrend([], [])).toBe(0);
  });

  it('returns positive trend when recent prices are higher', () => {
    const allPrices = [1000, 1000, 1000, 1200, 1200];
    const recentPrices = [1200, 1200]; // avg = 1200
    // overall avg = 1080, trend = ((1200 - 1080) / 1080) * 100 = 11.11%
    const trend = computeTrend(allPrices, recentPrices);
    expect(trend).toBeGreaterThan(0);
    expect(trend).toBeCloseTo(11.11, 1);
  });

  it('returns negative trend when recent prices are lower', () => {
    const allPrices = [1200, 1200, 1200, 1000, 1000];
    const recentPrices = [1000, 1000]; // avg = 1000
    // overall avg = 1120, trend = ((1000 - 1120) / 1120) * 100 = -10.71%
    const trend = computeTrend(allPrices, recentPrices);
    expect(trend).toBeLessThan(0);
    expect(trend).toBeCloseTo(-10.71, 1);
  });

  it('returns 0 trend when recent matches overall', () => {
    const allPrices = [1000, 1000, 1000];
    const recentPrices = [1000, 1000, 1000];
    expect(computeTrend(allPrices, recentPrices)).toBe(0);
  });

  it('uses overall average when no recent prices exist', () => {
    const allPrices = [1000, 2000, 3000];
    const recentPrices: number[] = [];
    // recentAvg falls back to average, so trend = 0
    expect(computeTrend(allPrices, recentPrices)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Outlier exclusion logic (prices < 200 or > 15000 are outliers)
// ---------------------------------------------------------------------------

describe('outlier filtering', () => {
  const MIN_PRICE = 200;
  const MAX_PRICE = 15000;

  function filterOutliers(prices: number[]): number[] {
    return prices.filter((p) => p >= MIN_PRICE && p <= MAX_PRICE);
  }

  it('excludes prices below 200', () => {
    const prices = [50, 100, 500, 1000];
    const filtered = filterOutliers(prices);
    expect(filtered).toEqual([500, 1000]);
  });

  it('excludes prices above 15000', () => {
    const prices = [5000, 10000, 15000, 20000, 99999];
    const filtered = filterOutliers(prices);
    expect(filtered).toEqual([5000, 10000, 15000]);
  });

  it('keeps all valid prices', () => {
    const prices = [200, 500, 3000, 8000, 15000];
    const filtered = filterOutliers(prices);
    expect(filtered).toEqual([200, 500, 3000, 8000, 15000]);
  });

  it('returns empty array when all prices are outliers', () => {
    const prices = [10, 50, 100, 20000, 30000];
    const filtered = filterOutliers(prices);
    expect(filtered).toEqual([]);
  });

  it('computes correct stats after excluding outliers', () => {
    const rawPrices = [50, 1000, 2000, 3000, 99999];
    const filtered = filterOutliers(rawPrices).sort((a, b) => a - b);

    expect(filtered).toEqual([1000, 2000, 3000]);
    expect(median(filtered)).toBe(2000);
    expect(filtered[0]).toBe(1000);
    expect(filtered[filtered.length - 1]).toBe(3000);
  });
});
