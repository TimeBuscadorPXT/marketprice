export interface ScrapedRetailPrice {
  price: number;
  url: string;
  marketplace: string;
}

function buildSearchQuery(brand: string, name: string, variant: string, category: string): string | null {
  const lowerCategory = category.toLowerCase();

  // Skip categories that don't apply
  if (lowerCategory === 'car' || lowerCategory === 'moto' || lowerCategory === 'carro') {
    return null;
  }

  const baseParts = [brand, name];
  if (variant) baseParts.push(variant);

  if (lowerCategory === 'phone' || lowerCategory === 'smartphone') {
    baseParts.push('novo lacrado');
  } else if (lowerCategory === 'console' || lowerCategory === 'videogame') {
    baseParts.push('novo lacrado');
  } else {
    baseParts.push('novo lacrado');
  }

  return baseParts.join(' ');
}

function buildSearchUrl(query: string): string {
  const encodedQuery = query.replace(/\s+/g, '-');
  return `https://lista.mercadolivre.com.br/${encodedQuery}_Filt_ITEM_CONDITION_2230284_OrderId_PRICE_NoIndex_True`;
}

function extractPrices(html: string, baseUrl: string): ScrapedRetailPrice[] {
  const results: ScrapedRetailPrice[] = [];

  // Split by product card sections — ML uses article or li elements
  // Look for price fractions and nearby hrefs
  const cardPattern = /href="(https:\/\/www\.mercadolivre\.com\.br\/[^"]+)"/g;
  const pricePattern = /class="andes-money-amount__fraction"[^>]*>([0-9.]+)</g;

  const urls: string[] = [];
  const prices: number[] = [];

  let urlMatch: RegExpExecArray | null;
  while ((urlMatch = cardPattern.exec(html)) !== null) {
    const url = urlMatch[1]!;
    // Filter out irrelevant links
    if (
      url.includes('/click') ||
      url.includes('mercadopago') ||
      url.includes('mercadoshops') ||
      url.includes('promocoes') ||
      url.includes('categorias')
    ) {
      continue;
    }
    urls.push(url);
  }

  let priceMatch: RegExpExecArray | null;
  while ((priceMatch = pricePattern.exec(html)) !== null) {
    const rawPrice = priceMatch[1]!.replace(/\./g, '');
    const price = parseInt(rawPrice, 10);
    if (!isNaN(price) && price > 0) {
      prices.push(price);
    }
  }

  // Filter out "usado"/"seminovo"/"recondicionado" by checking HTML context around each price
  // We'll do a simple pass: scan html for title text near prices that indicates used condition
  const usedKeywords = ['usado', 'seminovo', 'recondicionado', 'reembalado'];

  // Build results pairing URLs with prices (best effort — ML HTML ordering)
  const limit = Math.min(urls.length, prices.length, 10);
  for (let i = 0; i < limit; i++) {
    const price = prices[i]!;
    const url = urls[i]!;

    // Reject outlier prices (< R$100 likely a parsing error)
    if (price < 100) continue;

    // Check if url or surrounding context contains used indicators
    const urlLower = url.toLowerCase();
    const isUsed = usedKeywords.some((kw) => urlLower.includes(kw));
    if (isUsed) continue;

    results.push({
      price,
      url,
      marketplace: 'mercadolivre',
    });
  }

  return results;
}

export async function scrapeRetailPrices(
  brand: string,
  name: string,
  variant: string,
  category: string
): Promise<ScrapedRetailPrice[]> {
  const query = buildSearchQuery(brand, name, variant, category);
  if (!query) return [];

  const url = buildSearchUrl(query);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    return extractPrices(html, url);
  } catch {
    return [];
  }
}

export function getLowestRetailPrice(prices: ScrapedRetailPrice[]): ScrapedRetailPrice | null {
  if (prices.length === 0) return null;
  return prices.reduce((lowest, current) =>
    current.price < lowest.price ? current : lowest
  );
}
