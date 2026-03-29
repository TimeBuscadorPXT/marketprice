import { prisma } from '../lib/prisma';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInput {
  message: string;
  history: ChatMessage[];
  region: string;
}

async function buildMarketContext(userId: string, region: string): Promise<string> {
  const regionFilter = region.length <= 3
    ? { region: { endsWith: region, mode: 'insensitive' as const } }
    : { region: { contains: region, mode: 'insensitive' as const } };

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Get top models with prices
  const models = await prisma.product.findMany({
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
        select: { price: true, isActive: true, daysOnMarket: true },
      },
    },
    orderBy: [{ brand: 'asc' }, { name: 'asc' }],
  });

  const summaries = models
    .filter(m => m.listings.length >= 2)
    .map(m => {
      const prices = m.listings.map(l => Number(l.price)).sort((a, b) => a - b);
      const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
      const min = prices[0];
      const max = prices[prices.length - 1];
      const active = m.listings.filter(l => l.isActive).length;
      const daysValues = m.listings.filter(l => l.daysOnMarket != null).map(l => l.daysOnMarket!);
      const avgDays = daysValues.length > 0
        ? Math.round(daysValues.reduce((s, d) => s + d, 0) / daysValues.length)
        : null;
      return `${m.brand} ${m.name} ${m.variant}: média R$${avg}, mín R$${min}, máx R$${max}, ${prices.length} anúncios (${active} ativos)${avgDays !== null ? `, vende em ~${avgDays}d` : ''}`;
    })
    .slice(0, 30); // Limit context size

  // Get user's suppliers
  const suppliers = await prisma.supplier.findMany({
    where: { userId },
    select: {
      name: true,
      price: true,
      model: { select: { brand: true, name: true, variant: true } },
    },
    take: 20,
  });

  const supplierInfo = suppliers.length > 0
    ? '\n\nFornecedores do usuário:\n' + suppliers.map(s =>
      `${s.name}: ${s.model.brand} ${s.model.name} ${s.model.variant} por R$${Number(s.price)}`
    ).join('\n')
    : '';

  return `Dados do mercado na região ${region} (últimos 30 dias):\n${summaries.join('\n')}${supplierInfo}`;
}

const SYSTEM_PROMPT = `Você é o Analista de Mercado do MarketPrice, especializado em revenda de celulares seminovos no Brasil.

Seu papel:
- Analisar dados de preços do Facebook Marketplace
- Recomendar modelos para comprar e revender
- Calcular margens de lucro
- Identificar oportunidades e riscos
- Explicar tendências de mercado

Regras:
- Sempre responda em português brasileiro informal (como um amigo que manja de negócios)
- Use valores em R$ (Real)
- Seja direto e prático — o usuário quer ganhar dinheiro
- Quando recomendar compra/venda, justifique com dados
- Se não tiver dados suficientes, diga isso em vez de inventar
- Formate com markdown quando útil (listas, negrito para valores)
- Mantenha respostas concisas (max 3 parágrafos, a não ser que peçam detalhes)`;

export async function chat(userId: string, input: ChatInput): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY não configurada. Adicione no .env do servidor.');
  }

  const context = await buildMarketContext(userId, input.region);

  const messages = [
    ...input.history.slice(-10), // Keep last 10 messages for context
    { role: 'user' as const, content: input.message },
  ];

  // Prepend context to first user message
  if (messages.length > 0) {
    const contextMessage = `[CONTEXTO DO MERCADO]\n${context}\n\n[PERGUNTA DO USUÁRIO]\n${messages[messages.length - 1]!.content}`;
    messages[messages.length - 1] = { ...messages[messages.length - 1]!, content: contextMessage };
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Chat] Claude API error:', response.status, errorText);
    if (response.status === 401) throw new Error('Chave da API Claude inválida.');
    if (response.status === 429) throw new Error('Limite de requisições atingido. Tente novamente em alguns segundos.');
    throw new Error('Erro ao consultar IA. Tente novamente.');
  }

  const data = await response.json() as { content: Array<{ type: string; text: string }> };
  const text = data.content?.find(c => c.type === 'text')?.text;
  if (!text) throw new Error('Resposta vazia da IA.');

  return text;
}
