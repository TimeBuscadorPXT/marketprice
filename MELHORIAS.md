TAREFA: Expandir captura de dados da extensão + criar indicadores inteligentes no dashboard

O MarketPrice precisa capturar o MÁXIMO de informações dos anúncios do Facebook Marketplace e transformar esses dados em indicadores úteis para revendedores leigos.

REGRAS: NÃO use Supabase MCP. NÃO rode o servidor. Apenas modifique código e confirme build.

=== PARTE 1: EXPANDIR BANCO DE DADOS ===

No apps/api/prisma/schema.prisma, adicione estes campos à tabela Listing:

model Listing {
  // Campos existentes já estão lá...
  // ADICIONAR estes novos campos:
  description    String?   // Descrição completa do anúncio
  condition      String?   // "Novo", "Usado - bom estado", "Usado - aceitável" (já existe mas garantir)
  sellerName     String?   @map("seller_name")     // Nome do vendedor
  photoCount     Int?      @map("photo_count")     // Quantidade de fotos do anúncio
  publishedText  String?   @map("published_text")  // Texto original "Publicado há 2 dias"
  daysOnMarket   Int?      @map("days_on_market")  // Dias calculados desde publicação
  hasShipping    Boolean?  @default(false) @map("has_shipping")  // Se tem envio disponível
  status         String?   @default("active")      // "active", "pending", "sold"
  firstSeenAt    DateTime  @default(now()) @map("first_seen_at")  // Primeira vez visto
  lastSeenAt     DateTime  @default(now()) @map("last_seen_at")   // Última vez visto
  isActive       Boolean   @default(true) @map("is_active")       // Se ainda está ativo
}

Crie também uma nova tabela para tracking de desaparecimento:

model ListingHistory {
  id         String   @id @default(uuid())
  listingId  String   @map("listing_id")
  fbUrl      String   @map("fb_url")
  modelId    String?  @map("model_id")
  price      Decimal  @db.Decimal(10, 2)
  region     String
  status     String   // "appeared", "disappeared", "price_changed"
  oldPrice   Decimal? @db.Decimal(10, 2) @map("old_price")
  recordedAt DateTime @default(now()) @map("recorded_at")

  listing Listing    @relation(fields: [listingId], references: [id])
  model   PhoneModel? @relation(fields: [modelId], references: [id])

  @@index([modelId, region])
  @@index([recordedAt])
  @@map("listing_history")
}

Rode: npx prisma generate (NÃO rode db push, eu farei isso manualmente)

=== PARTE 2: EXPANDIR EXTENSÃO CHROME ===

No apps/extension/src/services/scraper.ts, expanda extractListings() para capturar:

1. TÍTULO — já captura ✅
2. PREÇO — já captura ✅
3. LOCALIZAÇÃO — já captura ✅
4. LINK — já captura ✅
5. IMAGEM — já captura ✅

6. DESCRIÇÃO — Quando possível, extrair texto de descrição do card. No listing da página de busca, geralmente aparece um trecho. Usar seletores como [data-testid], aria-label, ou texto dentro do card após o preço.

7. CONDIÇÃO — Procurar por textos como "Novo", "Usado", "Usado - bom estado", "Usado - aceitável", "Recondicionado". Geralmente aparece como badge ou texto secundário no card.

8. NOME DO VENDEDOR — Extrair o nome que aparece no card do anúncio. Procurar em spans/links que parecem ser nomes de pessoas.

9. QUANTIDADE DE FOTOS — Contar os indicadores de foto no card (dots de paginação de fotos, ou o número que aparece tipo "1/5").

10. DATA DE PUBLICAÇÃO — Extrair o texto "Publicado há X horas/dias/semanas". Converter para:
    - publishedText: texto original ("Publicado há 2 dias")
    - daysOnMarket: número calculado (2)
    Função parseDateText(text):
    - "há X minutos/horas" → 0 dias
    - "há X dias" → X dias
    - "há X semanas" → X * 7 dias
    - "ontem" → 1 dia
    - "há X meses" → X * 30 dias

11. TEM FRETE — Procurar por "Envio disponível", "Entrega disponível", ícone de caminhão/envio.

12. STATUS — Por padrão "active". Se aparecer "Pendente" ou "Vendido", marcar accordingly.

IMPORTANTE sobre seletores:
- O Facebook muda seletores constantemente
- Use múltiplas estratégias: aria-labels, data-testid, estrutura do DOM, regex
- Se um dado não for encontrado, retorne null (NUNCA crashe)
- Log warning quando não conseguir extrair um campo novo
- Cada campo novo é OPCIONAL — a extensão deve funcionar mesmo se não conseguir capturar nada novo

=== PARTE 3: EXPANDIR API ===

No apps/api, crie/atualize os seguintes endpoints:

1. ATUALIZAR POST /api/listings para aceitar os novos campos:
   Body atualizado: { listings: [{ title, price, region, fbUrl, condition?, imageUrl?, description?, sellerName?, photoCount?, publishedText?, daysOnMarket?, hasShipping? }] }

2. ATUALIZAR o listing.service.ts:
   - Ao receber um listing, verificar se o fbUrl já existe
   - Se já existe: atualizar lastSeenAt e isActive = true
   - Se NÃO existe: criar novo com firstSeenAt = now()
   - Se um listing existente NÃO apareceu no último batch E tem mais de 48h sem ser visto: marcar isActive = false e criar registro em ListingHistory com status "disappeared"

3. NOVO ENDPOINT — GET /api/analytics/velocity (auth):
   Query: modelId, region, days
   Retorna: {
     avgDaysOnMarket: número médio de dias que anúncios ficam ativos,
     medianDaysOnMarket: mediana,
     disappearedCount: quantos sumiram (provavelmente vendidos),
     avgPriceDisappeared: preço médio dos que sumiram (indica preço que vende),
     avgPriceActive: preço médio dos que ainda estão ativos,
     liquidityScore: "alta" (vende em <3 dias), "média" (3-7 dias), "baixa" (>7 dias),
     suggestedSellingPrice: preço médio dos anúncios que desapareceram (= preço que realmente vende)
   }

4. NOVO ENDPOINT — GET /api/analytics/sellers (auth):
   Query: region
   Retorna os vendedores mais frequentes (possíveis concorrentes ou lojistas):
   { sellers: [{ name, listingCount, avgPrice, models: [...] }] }

5. NOVO ENDPOINT — GET /api/analytics/market-health (auth):
   Query: modelId, region
   Retorna: {
     totalActive: total de anúncios ativos,
     newLast24h: novos nas últimas 24h,
     newLast7d: novos nos últimos 7 dias,
     disappearedLast7d: sumiram nos últimos 7 dias,
     priceDirection: "subindo" | "caindo" | "estável",
     supplyDemandScore: "muita oferta" | "equilíbrio" | "pouca oferta",
     bestTimeToSell: baseado em quando os preços estão mais altos,
     bestTimeToBuy: baseado em quando os preços estão mais baixos,
     confidenceLevel: "alta" (>50 anúncios), "média" (20-50), "baixa" (<20)
   }

=== PARTE 4: NOVOS INDICADORES NO DASHBOARD ===

No apps/web, crie novos componentes e telas:

1. DASHBOARD HOME — Adicionar nova seção "Visão de Mercado" abaixo dos PriceCards:
   - Card "Liquidez": mostra quais modelos vendem mais rápido na região (ícone de raio)
   - Card "Preço que Vende": preço médio dos anúncios que desapareceram (= preço real de venda)
   - Card "Saúde do Mercado": se tem muita ou pouca oferta

2. TELA DE ANÁLISE — Adicionar novas seções:
   
   a) Seção "Velocidade de Venda":
      - Indicador grande: "Vende em média em X dias"
      - Score de liquidez com badge colorido (Alta/Média/Baixa)
      - "Preço que vende de verdade": R$ X.XXX (preço médio dos desaparecidos)
      - Comparação visual: "Preço pedido vs Preço que vende"
   
   b) Seção "Qualidade dos Anúncios":
      - Média de fotos por anúncio
      - % com descrição completa
      - % por condição (Novo, Usado bom, Usado aceitável)
   
   c) Seção "Concorrência":
      - "X vendedores ativos na sua região"
      - Top 5 vendedores mais frequentes (possíveis lojistas)
      - Alerta: "Muito vendedor = mercado competitivo"

3. CALCULADORA — Adicionar campo automático:
   - "Preço sugerido de venda" baseado no preço que realmente vende (não a média de pedido)
   - "Tempo estimado para vender" baseado na liquidez
   - "Score de oportunidade": combinação de margem + liquidez

4. COMPONENTE <MarketInsight />:
   Crie um componente que mostra "dicas do mercado" em linguagem simples:
   - "💡 O iPhone 16 Pro Max 256GB está vendendo em média em 2 dias na sua região. Preço bom para vender: R$ 5.200"
   - "⚠️ Muitos vendedores oferecendo Galaxy S24 Ultra. Considere abaixar o preço para vender mais rápido."
   - "🔥 Poucos iPhones 15 Pro Max disponíveis em SC. Boa oportunidade — os últimos venderam por R$ 3.900"
   
   Cada insight deve:
   - Usar emoji relevante
   - Linguagem simples (como se falasse com amigo no WhatsApp)
   - Ter ação clara (comprar, vender, esperar)
   - Ser baseado em dados reais

=== PARTE 5: TOOLTIPS PARA LEIGOS ===

Adicione tooltips explicativos (componente HelpTip) em TODOS os termos técnicos:

- "Preço médio" → "Soma de todos os preços dividida pelo total. É o preço 'normal' do mercado."
- "Mediana" → "O preço do meio. Metade dos anúncios pede mais, metade pede menos. Menos afetado por preços absurdos."
- "Tendência" → "Compara o preço desta semana com o mês passado. Verde = está caindo (bom pra comprar). Vermelho = está subindo."
- "Outlier" → "Anúncio com preço muito fora do normal (absurdo ou defeituoso). Removemos eles dos cálculos."
- "Faixa de preço" → "Onde 50% dos anúncios se concentram. Se a faixa é R$ 4.000-4.500, a maioria pede nessa faixa."
- "Liquidez" → "Quão rápido esse modelo vende. Alta = vende em poucos dias. Baixa = demora semanas."
- "Margem" → "Quanto você lucra em porcentagem. 15% de margem em R$ 4.000 = R$ 600 de lucro."
- "ROI" → "Retorno sobre o investimento. Quanto cada real investido te retorna."
- "Preço que vende" → "Preço médio dos anúncios que desapareceram (provavelmente vendidos). É o preço REAL de venda, não o que as pessoas pedem."

Confirme que tudo compila: cd apps/web && npx vite build && cd ../api && npx tsc --noEmit