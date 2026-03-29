import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import { analyzeListingText } from './flag-detector.service';

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env automatically

// Simple in-memory cache (5 min TTL)
const cache = new Map<string, { data: unknown; expiry: number }>();
function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiry) { cache.delete(key); return null; }
  return entry.data as T;
}
function setCache(key: string, data: unknown, ttlMs = 300000) {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

// ---- Types ----

interface AIListingAnalysis {
  healthScore: number;
  redFlags: string[];
  greenFlags: string[];
  valueReduction: number;
  summary: string;
  recommendation: 'comprar' | 'avaliar_pessoalmente' | 'evitar';
}

interface DailyInsight {
  emoji: string;
  title: string;
  text: string;
  actionType: 'buy' | 'sell' | 'wait' | 'alert';
  modelName?: string;
  dealId?: string;
}

interface DealVerdict {
  verdict: 'comprar' | 'avaliar' | 'evitar';
  reason: string;
  confidence: number;
}

interface ModelSummaryResult {
  summary: string;
}

// ---- Helpers ----

function buildRegionFilter(region: string) {
  return region.length <= 3
    ? { region: { endsWith: region, mode: 'insensitive' as const } }
    : { region: { contains: region, mode: 'insensitive' as const } };
}

// ---- Function 1: analyzeListingWithAI ----

interface ListingData {
  title: string;
  description?: string | null;
  price: number;
  region: string;
  condition?: string | null;
  daysOnMarket?: number | null;
  sellerName?: string | null;
  photoCount?: number | null;
}

export async function analyzeListingWithAI(
  listing: ListingData,
  avgPrice: number,
  medianPrice: number
): Promise<AIListingAnalysis | null> {
  try {
    const keywordAnalysis = analyzeListingText(listing.title, listing.description);

    const prompt = `Analise este anúncio de celular do Facebook Marketplace e retorne APENAS um JSON válido (sem markdown, sem código).

Anúncio:
- Título: ${listing.title}
- Descrição: ${listing.description ?? 'Sem descrição'}
- Preço: R$${listing.price}
- Região: ${listing.region}
- Condição: ${listing.condition ?? 'Não informada'}
- Dias no mercado: ${listing.daysOnMarket ?? 'Desconhecido'}
- Fotos: ${listing.photoCount ?? 0}
- Vendedor: ${listing.sellerName ?? 'Desconhecido'}

Contexto de mercado:
- Preço médio: R$${avgPrice.toFixed(2)}
- Preço mediana: R$${medianPrice.toFixed(2)}
- Análise por palavras-chave: ${keywordAnalysis.summary}

Retorne o JSON:
{
  "healthScore": (0-100),
  "redFlags": ["lista de problemas encontrados"],
  "greenFlags": ["lista de pontos positivos"],
  "valueReduction": (0-50, percentual de redução),
  "summary": "resumo em 1 frase PT-BR",
  "recommendation": "comprar" | "avaliar_pessoalmente" | "evitar"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content.find((c) => c.type === 'text')?.text;
    if (!text) return null;

    const parsed = JSON.parse(text) as AIListingAnalysis;
    return parsed;
  } catch (err) {
    console.error('[AI Analyst] analyzeListingWithAI error:', err);
    return null;
  }
}

// ---- Function 2: generateDailyInsights ----

export async function generateDailyInsights(
  userId: string,
  region: string
): Promise<DailyInsight[]> {
  const cacheKey = `insights:${userId}:${region}`;
  const cached = getCached<DailyInsight[]>(cacheKey);
  if (cached) return cached;

  const regionFilter = buildRegionFilter(region);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Fetch recent listings
  const recentListings = await prisma.listing.findMany({
    where: {
      userId,
      ...regionFilter,
      capturedAt: { gte: thirtyDaysAgo },
      isOutlier: false,
    },
    select: {
      id: true,
      title: true,
      price: true,
      daysOnMarket: true,
      flagLevel: true,
      healthScore: true,
      isActive: true,
      model: { select: { brand: true, name: true, variant: true } },
    },
    orderBy: { capturedAt: 'desc' },
    take: 50,
  });

  if (recentListings.length < 3) {
    const fallback: DailyInsight[] = [{
      emoji: '🔍',
      title: 'Precisamos de mais dados',
      text: 'Navegue mais pelo Marketplace e capture anúncios para receber insights personalizados sobre o mercado da sua região.',
      actionType: 'alert',
    }];
    setCache(cacheKey, fallback);
    return fallback;
  }

  // Aggregate stats
  const prices = recentListings.map((l) => Number(l.price));
  const avgPrice = prices.reduce((s, p) => s + p, 0) / prices.length;
  const activeCount = recentListings.filter((l) => l.isActive).length;
  const dangerCount = recentListings.filter((l) => l.flagLevel === 'danger').length;
  const cleanCount = recentListings.filter((l) => l.flagLevel === 'clean' || !l.flagLevel).length;

  // Find best deals (lowest price, clean flags)
  const cleanListings = recentListings
    .filter((l) => l.flagLevel !== 'danger' && l.isActive)
    .sort((a, b) => Number(a.price) - Number(b.price));

  const bestDeals = cleanListings.slice(0, 3);

  // Velocity data
  const daysValues = recentListings
    .filter((l) => l.daysOnMarket != null)
    .map((l) => l.daysOnMarket!);
  const avgDays = daysValues.length > 0
    ? Math.round(daysValues.reduce((s, d) => s + d, 0) / daysValues.length)
    : null;

  const contextText = `Dados do mercado (região: ${region}, últimos 30 dias):
- ${recentListings.length} anúncios capturados, ${activeCount} ativos
- Preço médio: R$${avgPrice.toFixed(0)}
- ${dangerCount} com red flags, ${cleanCount} limpos
- Tempo médio no mercado: ${avgDays !== null ? avgDays + ' dias' : 'sem dados'}
- Melhores preços limpos: ${bestDeals.map((d) => `${d.model.brand} ${d.model.name} ${d.model.variant} por R$${Number(d.price)}`).join(', ') || 'N/A'}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: "Você é o Analista de Mercado do MarketPrice. Fale em PT-BR, linguagem simples como WhatsApp. Use emojis. Seja direto: 'compre', 'não compre', 'venda agora', 'espere'. Sempre justifique com dados reais.",
      messages: [{
        role: 'user',
        content: `Com base nestes dados, gere de 2 a 4 insights práticos. Retorne APENAS um JSON válido (sem markdown):
[
  {
    "emoji": "emoji relevante",
    "title": "título curto",
    "text": "texto do insight com dados reais",
    "actionType": "buy" | "sell" | "wait" | "alert",
    "modelName": "nome do modelo se aplicável ou null"
  }
]

${contextText}`,
      }],
    });

    const text = response.content.find((c) => c.type === 'text')?.text;
    if (!text) throw new Error('Empty AI response');

    const insights = JSON.parse(text) as DailyInsight[];
    setCache(cacheKey, insights);
    return insights;
  } catch (err) {
    console.error('[AI Analyst] generateDailyInsights error:', err);
    // Fallback with static insights from data
    const fallback: DailyInsight[] = [{
      emoji: '📊',
      title: 'Resumo do mercado',
      text: `${recentListings.length} anúncios na região ${region}. Preço médio: R$${avgPrice.toFixed(0)}. ${dangerCount} com alertas graves.`,
      actionType: 'alert',
    }];
    setCache(cacheKey, fallback);
    return fallback;
  }
}

// ---- Function 3: evaluateDeal ----

export async function evaluateDeal(
  dealId: string,
  userId: string
): Promise<DealVerdict> {
  // dealId format is "deal-{listingId}"
  const listingId = dealId.startsWith('deal-') ? dealId.slice(5) : dealId;

  const listing = await prisma.listing.findFirst({
    where: { id: listingId, userId },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      region: true,
      condition: true,
      daysOnMarket: true,
      sellerName: true,
      photoCount: true,
      healthScore: true,
      redFlags: true,
      greenFlags: true,
      flagLevel: true,
      model: { select: { id: true, brand: true, name: true, variant: true } },
    },
  });

  if (!listing) {
    return { verdict: 'evitar', reason: 'Anúncio não encontrado.', confidence: 0 };
  }

  // Get market prices for context
  const regionFilter = buildRegionFilter(listing.region);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const modelListings = await prisma.listing.findMany({
    where: {
      modelId: listing.model.id,
      ...regionFilter,
      isOutlier: false,
      capturedAt: { gte: thirtyDaysAgo },
    },
    select: { price: true },
  });

  const prices = modelListings.map((l) => Number(l.price)).sort((a, b) => a - b);
  const avgPrice = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : Number(listing.price);
  const medianPrice = prices.length > 0
    ? (prices.length % 2 !== 0
      ? prices[Math.floor(prices.length / 2)]!
      : (prices[Math.floor(prices.length / 2) - 1]! + prices[Math.floor(prices.length / 2)]!) / 2)
    : Number(listing.price);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Avalie este deal de celular e retorne APENAS JSON (sem markdown):

Anúncio: ${listing.title}
Descrição: ${listing.description ?? 'Sem descrição'}
Preço: R$${Number(listing.price)}
Modelo: ${listing.model.brand} ${listing.model.name} ${listing.model.variant}
Condição: ${listing.condition ?? 'Não informada'}
Red Flags: ${listing.redFlags.length > 0 ? listing.redFlags.join(', ') : 'Nenhuma'}
Green Flags: ${listing.greenFlags.length > 0 ? listing.greenFlags.join(', ') : 'Nenhuma'}
Health Score: ${listing.healthScore ?? 'N/A'}
Dias no mercado: ${listing.daysOnMarket ?? 'Desconhecido'}
Preço médio mercado: R$${avgPrice.toFixed(2)}
Preço mediana: R$${medianPrice.toFixed(2)}

Retorne:
{
  "verdict": "comprar" | "avaliar" | "evitar",
  "reason": "justificativa em 1-2 frases PT-BR",
  "confidence": (0-100)
}`,
      }],
    });

    const text = response.content.find((c) => c.type === 'text')?.text;
    if (!text) throw new Error('Empty AI response');

    const result = JSON.parse(text) as DealVerdict;

    // Update listing with AI analysis
    await prisma.listing.update({
      where: { id: listing.id },
      data: {
        aiAnalysis: result.reason,
        aiRecommendation: result.verdict,
      },
    });

    return result;
  } catch (err) {
    console.error('[AI Analyst] evaluateDeal error:', err);

    // Fallback to keyword-based
    const flags = analyzeListingText(listing.title, listing.description);
    let verdict: 'comprar' | 'avaliar' | 'evitar' = 'avaliar';
    if (flags.flagLevel === 'danger') verdict = 'evitar';
    else if (flags.flagLevel === 'clean' && Number(listing.price) < avgPrice * 0.9) verdict = 'comprar';

    return {
      verdict,
      reason: flags.summary,
      confidence: 40,
    };
  }
}

// ---- Function 4: generateModelSummary ----

export async function generateModelSummary(
  modelId: string,
  region: string
): Promise<ModelSummaryResult> {
  const cacheKey = `model-summary:${modelId}:${region}`;
  const cached = getCached<ModelSummaryResult>(cacheKey);
  if (cached) return cached;

  const regionFilter = buildRegionFilter(region);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const model = await prisma.product.findUnique({
    where: { id: modelId },
    select: {
      brand: true,
      name: true,
      variant: true,
      listings: {
        where: {
          ...regionFilter,
          isOutlier: false,
          capturedAt: { gte: thirtyDaysAgo },
        },
        select: {
          price: true,
          daysOnMarket: true,
          isActive: true,
          flagLevel: true,
        },
      },
    },
  });

  if (!model || model.listings.length < 2) {
    const result: ModelSummaryResult = {
      summary: 'Dados insuficientes para gerar um resumo deste modelo nesta região.',
    };
    setCache(cacheKey, result);
    return result;
  }

  const prices = model.listings.map((l) => Number(l.price)).sort((a, b) => a - b);
  const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
  const min = prices[0]!;
  const max = prices[prices.length - 1]!;
  const activeCount = model.listings.filter((l) => l.isActive).length;
  const dangerCount = model.listings.filter((l) => l.flagLevel === 'danger').length;
  const daysValues = model.listings.filter((l) => l.daysOnMarket != null).map((l) => l.daysOnMarket!);
  const avgDays = daysValues.length > 0
    ? Math.round(daysValues.reduce((s, d) => s + d, 0) / daysValues.length)
    : null;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Gere um parágrafo resumo em PT-BR sobre este modelo no mercado. Retorne APENAS o texto do parágrafo, sem JSON.

Modelo: ${model.brand} ${model.name} ${model.variant}
Região: ${region}
Anúncios: ${model.listings.length} (${activeCount} ativos)
Preço médio: R$${avg}, mín: R$${min}, máx: R$${max}
Tempo médio no mercado: ${avgDays !== null ? avgDays + ' dias' : 'sem dados'}
Com red flags: ${dangerCount}

Seja direto e prático para quem quer revender.`,
      }],
    });

    const text = response.content.find((c) => c.type === 'text')?.text;
    if (!text) throw new Error('Empty AI response');

    const result: ModelSummaryResult = { summary: text.trim() };
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.error('[AI Analyst] generateModelSummary error:', err);
    const result: ModelSummaryResult = {
      summary: `${model.brand} ${model.name} ${model.variant} na região ${region}: ${model.listings.length} anúncios, preço médio R$${avg} (R$${min}-R$${max}). ${activeCount} ativos${avgDays !== null ? `, vendem em ~${avgDays} dias` : ''}.`,
    };
    setCache(cacheKey, result);
    return result;
  }
}
