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

  // Strategy 1: Direct links to marketplace items
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

  // Strategy 2: Feed items with marketplace links
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

  // Strategy 3: Any anchor that has an href containing /item/ within marketplace context
  if (listings.length === 0) {
    const allLinks = document.querySelectorAll('a[href*="/item/"]');
    for (const link of allLinks) {
      try {
        const href = (link as HTMLAnchorElement).href;
        if (!href.includes('marketplace') && !href.includes('facebook.com')) continue;
        const listing = extractFromLink(link as HTMLAnchorElement);
        if (listing && !seenUrls.has(listing.fbUrl)) {
          seenUrls.add(listing.fbUrl);
          listings.push(listing);
        }
      } catch {
        // skip
      }
    }
  }

  // Diagnostic logging
  if (listings.length === 0) {
    const allAnchors = document.querySelectorAll('a[href]');
    let marketplaceLinks = 0;
    for (const a of allAnchors) {
      if ((a as HTMLAnchorElement).href.includes('marketplace')) marketplaceLinks++;
    }
    console.warn(`[MarketPrice] DIAGNOSTICO: 0 anuncios encontrados. ${allAnchors.length} links na pagina, ${marketplaceLinks} contem "marketplace". URL: ${window.location.href}`);
  } else {
    console.log(`[MarketPrice] extractListings: ${listings.length} anuncios encontrados (${links.length} links diretos)`);
  }

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
