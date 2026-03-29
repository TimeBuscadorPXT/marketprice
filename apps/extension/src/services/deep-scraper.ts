export interface DeepListingData {
  fbUrl: string;
  fullDescription: string | null;
  photoUrls: string[];
  sellerProfileUrl: string | null;
  sellerJoinDate: string | null;
  sellerLocation: string | null;
  listedCategory: string | null;
  condition: string | null;
  hasShipping: boolean;
  viewCount: number | null;
  savedCount: number | null;
}

function warn(msg: string, data?: unknown): void {
  console.warn(`[MarketPrice:DEEP] WARN: ${msg}`, data ?? '');
}

export function extractDeepListingData(): DeepListingData | null {
  try {
    const url = window.location.href;
    if (!url.includes('/marketplace/item/')) return null;

    const fbUrl = url.split('?')[0] ?? url;

    let fullDescription: string | null = null;
    try {
      fullDescription = extractFullDescription();
    } catch (err) {
      warn('Falha ao extrair descricao', err);
    }

    let photoUrls: string[] = [];
    try {
      photoUrls = extractAllPhotos();
    } catch (err) {
      warn('Falha ao extrair fotos', err);
    }

    let sellerDetails = { profileUrl: null as string | null, joinDate: null as string | null, location: null as string | null };
    try {
      sellerDetails = extractSellerDetails();
    } catch (err) {
      warn('Falha ao extrair dados do vendedor', err);
    }

    let listedCategory: string | null = null;
    try {
      listedCategory = extractCategory();
    } catch (err) {
      warn('Falha ao extrair categoria', err);
    }

    let condition: string | null = null;
    try {
      condition = extractConditionDetail();
    } catch (err) {
      warn('Falha ao extrair condicao', err);
    }

    let hasShipping = false;
    try {
      hasShipping = extractShippingInfo();
    } catch (err) {
      warn('Falha ao extrair info de envio', err);
    }

    let viewCount: number | null = null;
    try {
      viewCount = extractViewCount();
    } catch (err) {
      warn('Falha ao extrair contagem de views', err);
    }

    let savedCount: number | null = null;
    try {
      savedCount = extractSavedCount();
    } catch (err) {
      warn('Falha ao extrair contagem de salvos', err);
    }

    return {
      fbUrl,
      fullDescription,
      photoUrls,
      sellerProfileUrl: sellerDetails.profileUrl,
      sellerJoinDate: sellerDetails.joinDate,
      sellerLocation: sellerDetails.location,
      listedCategory,
      condition,
      hasShipping,
      viewCount,
      savedCount,
    };
  } catch (err) {
    warn('Erro geral na captura profunda', err);
    return null;
  }
}

function extractFullDescription(): string | null {
  // Strategy 1: data-testid
  try {
    const descEl = document.querySelector('[data-testid="marketplace_listing_description"]');
    if (descEl) {
      const text = descEl.textContent?.trim() ?? '';
      if (text.length > 10) return cleanDescription(text);
    }
  } catch {
    warn('Strategy data-testid falhou para descricao');
  }

  // Strategy 2: aria-label containing description
  try {
    const ariaEls = document.querySelectorAll('[aria-label*="description"], [aria-label*="descri"]');
    for (const el of ariaEls) {
      const text = el.textContent?.trim() ?? '';
      if (text.length > 20 && text.length < 2000) return cleanDescription(text);
    }
  } catch {
    warn('Strategy aria-label falhou para descricao');
  }

  // Strategy 3: Find the description section by looking for the "Detalhes" heading
  // FB Marketplace item pages have a section with condition + seller description
  try {
    const descSection = findDescriptionSection();
    if (descSection) return cleanDescription(descSection);
  } catch {
    warn('Strategy section falhou para descricao');
  }

  // Strategy 4: Find text blocks that look like a product description (contain phone keywords)
  try {
    const mainContent = document.querySelector('[role="main"]') ?? document.body;
    const spans = mainContent.querySelectorAll('span');
    let best = '';

    for (const span of spans) {
      if (span.children.length > 2) continue;
      const text = span.textContent?.trim() ?? '';
      if (text.length < 20 || text.length > 1500) continue;
      // Must not look like UI text, prices, or other listings
      if (/^R\$/.test(text)) continue;
      if (/^(Marketplace|Enviar|Salvar|Compartilhar|Patrocinado)/i.test(text)) continue;
      // Prefer text with phone-related keywords
      if (/\b(bateria|tela|câmera|face\s*id|gb|iphone|samsung|galaxy|xiaomi|estado|funciona|original|caixa|carregador|garantia|troca|parcelo)\b/i.test(text)) {
        if (text.length > best.length) best = text;
      }
    }

    if (best.length > 20) return cleanDescription(best);
  } catch {
    warn('Strategy keyword falhou para descricao');
  }

  warn('Nenhuma estrategia encontrou descricao');
  return null;
}

function findDescriptionSection(): string | null {
  // Look for headings like "Detalhes", "Descrição", "Description"
  const headings = document.querySelectorAll('span, h2, h3, div');
  for (const heading of headings) {
    const text = heading.textContent?.trim() ?? '';
    if (!/^(Detalhes|Descri[çc][ãa]o|Description|Sobre este item)$/i.test(text)) continue;

    // Found a heading — get the next sibling content or parent section
    let section = heading.parentElement;
    for (let i = 0; i < 3 && section; i++) {
      const sectionText = section.textContent?.trim() ?? '';
      // The section should be longer than just the heading but not the entire page
      if (sectionText.length > text.length + 10 && sectionText.length < 2000) {
        // Remove the heading itself and common UI elements
        const cleaned = sectionText
          .replace(/^(Detalhes|Descri[çc][ãa]o|Description|Sobre este item)\s*/i, '')
          .replace(/\s*(Condi[çc][ãa]o|Condition)\s*/i, '\n')
          .trim();
        if (cleaned.length > 10) return cleaned;
      }
      section = section.parentElement;
    }
  }
  return null;
}

function cleanDescription(raw: string): string {
  return raw
    // Remove FB UI text that commonly leaks in
    .replace(/Envie uma mensagem ao vendedor.*?Enviar/gs, '')
    .replace(/Olá, esse item ainda está disponível\?/g, '')
    .replace(/Enviar mensagem/g, '')
    .replace(/Salvar/g, '')
    .replace(/Compartilhar/g, '')
    .replace(/Patrocinado\s*.*/g, '')
    .replace(/Sele[çc][õo]es de hoje.*/gs, '')
    .replace(/A localiza[çc][ãa]o [ée] aproximada/gi, '')
    .replace(/Informa[çc][õo]es do vendedor.*/gs, '')
    .replace(/Detalhes do vendedor.*/gs, '')
    .replace(/Entrou no Facebook.*/g, '')
    // Remove "suggested listings" that leak in (price patterns from other listings)
    .replace(/R\$[\d.,]+[A-Z].*$/gs, '')
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractAllPhotos(): string[] {
  const urls = new Set<string>();

  // Find the listing photo gallery — typically the main image area at the top of the listing page.
  // We scope all searches to this container to avoid picking up profile pics, sidebar ads, etc.
  const galleryContainer = findGalleryContainer();

  if (galleryContainer) {
    // Strategy 1: Images inside the gallery container
    try {
      const imgs = galleryContainer.querySelectorAll('img');
      for (const img of imgs) {
        addListingPhoto(img, urls);
      }
    } catch {
      warn('Strategy gallery imgs falhou para fotos');
    }

    // Strategy 2: background-image inside gallery
    try {
      const elsWithBg = galleryContainer.querySelectorAll('[style*="background-image"]');
      for (const el of elsWithBg) {
        const style = el.getAttribute('style') ?? '';
        const match = style.match(/background-image:\s*url\(["']?([^"')]+)["']?\)/i);
        if (match && match[1] && isValidPhotoUrl(match[1])) {
          urls.add(match[1]);
        }
      }
    } catch {
      warn('Strategy gallery background-image falhou para fotos');
    }

    // Strategy 3: data-src / srcset inside gallery
    try {
      const allImgs = galleryContainer.querySelectorAll('img[data-src], img[srcset]');
      for (const img of allImgs) {
        const dataSrc = img.getAttribute('data-src');
        if (dataSrc && isValidPhotoUrl(dataSrc)) urls.add(dataSrc);
        const srcset = img.getAttribute('srcset');
        if (srcset) {
          const srcsetUrls = srcset.split(',').map((s) => s.trim().split(/\s+/)[0] ?? '');
          for (const u of srcsetUrls) {
            if (isValidPhotoUrl(u)) urls.add(u);
          }
        }
      }
    } catch {
      warn('Strategy gallery data-src falhou para fotos');
    }
  }

  // Fallback: if gallery detection failed, use scoped search with stricter size filter
  if (urls.size === 0) {
    try {
      const mainContent = document.querySelector('[role="main"]') ?? document.body;
      const imgs = mainContent.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]');
      for (const img of imgs) {
        addListingPhoto(img as HTMLImageElement, urls);
      }
    } catch {
      warn('Strategy fallback falhou para fotos');
    }
  }

  if (urls.size === 0) {
    warn('Nenhuma foto encontrada');
  }

  return Array.from(urls);
}

function findGalleryContainer(): Element | null {
  // Strategy 1: Carousel with navigation (most common FB Marketplace pattern)
  try {
    const carousels = document.querySelectorAll('[data-testid*="carousel"], [data-testid*="photo"], [data-testid*="image_gallery"]');
    for (const c of carousels) {
      if (c.querySelector('img')) return c;
    }
  } catch { /* continue */ }

  // Strategy 2: Container with role="img" that has large images
  try {
    const imgRoles = document.querySelectorAll('[role="img"]');
    for (const container of imgRoles) {
      const imgs = container.querySelectorAll('img');
      for (const img of imgs) {
        const w = img.naturalWidth || img.width || parseInt(img.getAttribute('width') ?? '0', 10);
        if (w >= 300) return container;
      }
    }
  } catch { /* continue */ }

  // Strategy 3: Find the first large listing image and walk up to its gallery parent
  try {
    const mainContent = document.querySelector('[role="main"]');
    if (mainContent) {
      const imgs = mainContent.querySelectorAll<HTMLImageElement>('img[src*="scontent"], img[src*="fbcdn"]');
      for (const img of imgs) {
        const w = img.naturalWidth || img.width || parseInt(img.getAttribute('width') ?? '0', 10);
        const h = img.naturalHeight || img.height || parseInt(img.getAttribute('height') ?? '0', 10);
        if (w >= 300 || h >= 300) {
          // Walk up a few levels to find the gallery wrapper
          let parent = img.parentElement;
          for (let i = 0; i < 5 && parent; i++) {
            // A gallery container typically contains multiple images or navigation buttons
            const siblingImgs = parent.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]');
            const hasNav = parent.querySelector('[aria-label*="next"], [aria-label*="previous"], [aria-label*="próxim"], [aria-label*="anterior"]');
            if (siblingImgs.length > 1 || hasNav) return parent;
            parent = parent.parentElement;
          }
          // Return immediate parent of the large image if no gallery wrapper found
          return img.parentElement?.parentElement ?? img.parentElement;
        }
      }
    }
  } catch { /* continue */ }

  return null;
}

function addListingPhoto(img: HTMLImageElement, urls: Set<string>): void {
  const src = img.getAttribute('src');
  if (!src || !isValidPhotoUrl(src)) return;

  const width = img.naturalWidth || img.width || parseInt(img.getAttribute('width') ?? '0', 10);
  const height = img.naturalHeight || img.height || parseInt(img.getAttribute('height') ?? '0', 10);

  // Skip small images: profile pics (typically 40-60px), icons, thumbnails
  if (width > 0 && width < 150) return;
  if (height > 0 && height < 150) return;

  // Skip images inside profile links (seller avatars)
  const parentLink = img.closest('a');
  if (parentLink) {
    const href = parentLink.getAttribute('href') ?? '';
    if (href.includes('/profile/') || href.includes('/people/')) return;
  }

  // Skip if alt text suggests it's a profile picture
  const alt = (img.getAttribute('alt') ?? '').toLowerCase();
  if (alt.includes('profile') || alt.includes('perfil') || alt.includes('avatar')) return;

  // Skip if the image is circular (common for profile pics)
  const style = window.getComputedStyle(img);
  if (style.borderRadius === '50%' || style.borderRadius === '9999px') return;

  urls.add(src);
}

function isValidPhotoUrl(url: string): boolean {
  return (url.includes('scontent') || url.includes('fbcdn')) && url.startsWith('http');
}

function extractSellerDetails(): { profileUrl: string | null; joinDate: string | null; location: string | null } {
  let profileUrl: string | null = null;
  let joinDate: string | null = null;
  let location: string | null = null;

  // Profile URL
  try {
    const profileLinks = document.querySelectorAll('a[href*="/profile/"], a[href*="/people/"], a[href*="facebook.com/"]');
    for (const link of profileLinks) {
      const href = (link as HTMLAnchorElement).href;
      if (href.includes('/marketplace/')) continue;
      if (href.includes('/profile/') || href.includes('/people/')) {
        profileUrl = href.split('?')[0] ?? href;
        break;
      }
    }
  } catch {
    warn('Falha ao extrair URL do perfil do vendedor');
  }

  // Join date
  try {
    const allText = document.querySelectorAll('span, div');
    for (const el of allText) {
      const text = el.textContent?.trim() ?? '';
      if (/^(Entrou|Joined)\s+(em\s+)?/i.test(text) && text.length < 60) {
        joinDate = text;
        break;
      }
    }
  } catch {
    warn('Falha ao extrair data de entrada do vendedor');
  }

  // Location
  try {
    const allText = document.querySelectorAll('span, div');
    for (const el of allText) {
      const text = el.textContent?.trim() ?? '';
      // Location patterns: "City, STATE" or "Mora em City"
      if (text.length > 3 && text.length < 80) {
        if (/^(Mora em|Lives in)\s+/i.test(text)) {
          location = text.replace(/^(Mora em|Lives in)\s+/i, '').trim();
          break;
        }
        // City, STATE pattern near seller section
        if (/^[A-ZÁÉÍÓÚÃÕ][a-záéíóúãõ]+,\s*[A-Z]{2}$/.test(text)) {
          location = text;
          break;
        }
      }
    }
  } catch {
    warn('Falha ao extrair localizacao do vendedor');
  }

  return { profileUrl, joinDate, location };
}

function extractCategory(): string | null {
  // Strategy 1: Breadcrumb
  try {
    const breadcrumbs = document.querySelectorAll('nav a, [role="navigation"] a, a[href*="/marketplace/category/"]');
    for (const bc of breadcrumbs) {
      const text = bc.textContent?.trim() ?? '';
      if (text.length > 2 && text.length < 60 && !/^(Marketplace|Home|Inicio)$/i.test(text)) {
        const href = (bc as HTMLAnchorElement).href ?? '';
        if (href.includes('/marketplace/') && href.includes('categ')) {
          return text;
        }
      }
    }
  } catch {
    warn('Strategy breadcrumb falhou para categoria');
  }

  // Strategy 2: Category label
  try {
    const labels = document.querySelectorAll('[data-testid*="category"], [aria-label*="category"], [aria-label*="categoria"]');
    for (const label of labels) {
      const text = label.textContent?.trim() ?? '';
      if (text.length > 2 && text.length < 60) return text;
    }
  } catch {
    warn('Strategy data-testid falhou para categoria');
  }

  // Strategy 3: Text pattern
  try {
    const spans = document.querySelectorAll('span');
    for (const span of spans) {
      const text = span.textContent?.trim() ?? '';
      if (/^(Categoria|Category):\s*/i.test(text)) {
        return text.replace(/^(Categoria|Category):\s*/i, '').trim();
      }
    }
  } catch {
    warn('Strategy text pattern falhou para categoria');
  }

  return null;
}

function extractConditionDetail(): string | null {
  // Strategy 1: data-testid
  try {
    const condEl = document.querySelector('[data-testid*="condition"]');
    if (condEl) {
      const text = condEl.textContent?.trim() ?? '';
      if (text.length > 0 && text.length < 60) return text;
    }
  } catch {
    warn('Strategy data-testid falhou para condicao');
  }

  // Strategy 2: aria-label
  try {
    const ariaEls = document.querySelectorAll('[aria-label*="condition"], [aria-label*="condi"]');
    for (const el of ariaEls) {
      const text = el.textContent?.trim() ?? '';
      if (text.length > 0 && text.length < 60) return text;
    }
  } catch {
    warn('Strategy aria-label falhou para condicao');
  }

  // Strategy 3: Text pattern
  try {
    const spans = document.querySelectorAll('span, div');
    for (const span of spans) {
      const text = span.textContent?.trim() ?? '';
      if (/^(Novo|Usado|Recondicionado|Used|New|Refurbished)/i.test(text) && text.length < 60) {
        // More detailed condition text (e.g., "Usado - Bom estado")
        if (text.includes('-') || text.includes('–') || text.length > 4) {
          return text;
        }
      }
      if (/^(Condi[çc][ãa]o|Condition):\s*/i.test(text)) {
        return text.replace(/^(Condi[çc][ãa]o|Condition):\s*/i, '').trim();
      }
    }
  } catch {
    warn('Strategy text pattern falhou para condicao');
  }

  // Strategy 4: Simple condition keywords
  try {
    const spans = document.querySelectorAll('span');
    for (const span of spans) {
      const text = span.textContent?.trim() ?? '';
      if (/^(Novo|Usado|Recondicionado|New|Used|Refurbished)$/i.test(text)) {
        return text;
      }
    }
  } catch {
    warn('Strategy keywords falhou para condicao');
  }

  return null;
}

function extractShippingInfo(): boolean {
  try {
    const fullText = document.body.textContent?.toLowerCase() ?? '';
    if (/envio\s+dispon[ií]vel|entrega\s+dispon[ií]vel|frete\s+gr[áa]tis|shipping\s+available/i.test(fullText)) {
      return true;
    }
  } catch {
    warn('Strategy text falhou para envio');
  }

  // Strategy 2: Shipping icons/badges
  try {
    const shippingEls = document.querySelectorAll('[data-testid*="shipping"], [aria-label*="shipping"], [aria-label*="envio"], [aria-label*="entrega"]');
    if (shippingEls.length > 0) return true;
  } catch {
    warn('Strategy data-testid falhou para envio');
  }

  return false;
}

function extractViewCount(): number | null {
  try {
    const spans = document.querySelectorAll('span, div');
    for (const span of spans) {
      const text = span.textContent?.trim() ?? '';
      // "123 visualizações" or "123 views"
      const match = text.match(/^(\d+[\d.,]*)\s*(visualiza[çc][õo]es|views?)/i);
      if (match && match[1]) {
        return parseInt(match[1].replace(/[.,]/g, ''), 10);
      }
    }
  } catch {
    warn('Falha ao extrair contagem de views');
  }
  return null;
}

function extractSavedCount(): number | null {
  try {
    const spans = document.querySelectorAll('span, div');
    for (const span of spans) {
      const text = span.textContent?.trim() ?? '';
      // "123 pessoas salvaram" or "saved by 123"
      const match = text.match(/(\d+[\d.,]*)\s*(pessoas?\s+salv|saved)/i);
      if (match && match[1]) {
        return parseInt(match[1].replace(/[.,]/g, ''), 10);
      }
    }
  } catch {
    warn('Falha ao extrair contagem de salvos');
  }
  return null;
}
