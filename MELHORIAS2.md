TAREFA: Implementar captura profunda de anúncios individuais no Facebook Marketplace

Quando o usuário clica num anúncio e abre a página individual (URL tipo facebook.com/marketplace/item/123456), a extensão deve capturar dados completos que NÃO estão disponíveis na listagem de busca.

REGRAS: NÃO use Supabase MCP. NÃO rode o servidor. Apenas modifique código e confirme builds.

=== PARTE 1: EXPANDIR BANCO DE DADOS ===

No apps/api/prisma/schema.prisma, adicione à tabela Listing:

  fullDescription  String?   @map("full_description")    // Descrição completa do anúncio
  photoUrls        String[]  @map("photo_urls")           // Array com URLs de TODAS as fotos
  photoCount       Int?      @map("photo_count")          // Atualizar com contagem real de fotos
  sellerProfileUrl String?   @map("seller_profile_url")   // Link do perfil do vendedor
  sellerJoinDate   String?   @map("seller_join_date")     // "Entrou em 2020" (indica confiabilidade)
  sellerLocation   String?   @map("seller_location")      // Localização do vendedor
  listedCategory   String?   @map("listed_category")      // Categoria do anúncio (Eletrônicos, etc.)
  isDeepCaptured   Boolean   @default(false) @map("is_deep_captured")  // Se teve captura profunda

Rode: npx prisma generate (NÃO rode db push)

=== PARTE 2: EXTENSÃO CHROME — CAPTURA PROFUNDA ===

No apps/extension/src/, crie um novo arquivo services/deep-scraper.ts:

Este módulo é ativado APENAS quando o usuário está numa página individual de anúncio (URL match: facebook.com/marketplace/item/*).

1. DETECÇÃO DE PÁGINA INDIVIDUAL:
   No content.ts, adicionar detecção de URL:
   - Se URL contém "/marketplace/item/" → ativar deep scraper
   - Se URL contém "/marketplace/search" ou "/marketplace?" → manter scraper normal (listagem)
   - Usar window.location.pathname para detectar

2. DADOS PARA EXTRAIR NA PÁGINA INDIVIDUAL:

   a) DESCRIÇÃO COMPLETA:
      - Na página do anúncio, a descrição aparece num bloco de texto expandido
      - Procurar por elementos com data-testid relacionado a "description", "listing-description"
      - Fallback: procurar div/span com texto longo (>50 chars) abaixo do preço
      - Pode ter botão "Ver mais" — se existir, simular clique para expandir ANTES de capturar
      - Capturar todo o texto, incluindo quebras de linha

   b) TODAS AS FOTOS:
      - Na página individual, há um carrossel de fotos
      - Extrair URLs de TODAS as imagens do carrossel, não só a primeira
      - Estratégias de extração:
        i) Procurar todas as <img> dentro do container do carrossel
        ii) Procurar elementos com role="img" ou aria-label com "foto"
        iii) Procurar por background-image em CSS inline nos slides
        iv) Verificar data-src ou srcset além de src
      - Filtrar: ignorar ícones pequenos (<100px), avatares, logos do Facebook
      - Retornar array de URLs únicas

   c) DADOS DO VENDEDOR:
      - Nome do vendedor (já captura na listagem, mas confirmar aqui)
      - URL do perfil do vendedor (link para o perfil Facebook)
      - Data de entrada no Facebook: "Entrou no Facebook em 2020" (indica confiabilidade)
      - Localização do vendedor (pode ser diferente da localização do anúncio)
      - Avaliações/estrelas do vendedor (se disponível no Marketplace)

   d) DETALHES ADICIONAIS:
      - Categoria do anúncio (Eletrônicos > Celulares)
      - Condição exata (com mais detalhe que na listagem)
      - Se tem botão "Envio disponível" ou "Apenas retirada"
      - Quantidade de visualizações (se o Facebook mostrar)
      - Quantidade de salvos/interessados (se visível)

3. IMPLEMENTAÇÃO DO deep-scraper.ts:

   export interface DeepListingData {
     fbUrl: string;                  // URL do anúncio (identificador)
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

   export function extractDeepListingData(): DeepListingData | null
   - Verifica se está numa página de anúncio individual
   - Extrai todos os campos acima
   - Cada extração em try/catch separado (nunca crashar)
   - Retorna null se não conseguir identificar que é uma página de anúncio

   export function extractFullDescription(): string | null
   - Procura o bloco de descrição
   - Se tem "Ver mais" / "See more", expande primeiro
   - Retorna texto completo

   export function extractAllPhotos(): string[]
   - Procura container do carrossel
   - Extrai todas as URLs de imagem
   - Filtra duplicatas e imagens pequenas
   - Retorna array de URLs únicas

   export function extractSellerDetails(): { profileUrl: string | null, joinDate: string | null, location: string | null }
   - Procura seção do vendedor na página
   - Extrai link do perfil, data de entrada, localização

4. INTEGRAÇÃO NO content.ts:

   - Quando detectar URL de anúncio individual:
     a) Esperar 2 segundos (dar tempo do conteúdo carregar)
     b) Chamar extractDeepListingData()
     c) Enviar para o background via chrome.runtime.sendMessage com tipo "DEEP_CAPTURE"
     d) Logar: [MarketPrice:DEEP] Captura profunda: {título} - {X fotos} - {descrição: Y chars}

5. INTEGRAÇÃO NO background.ts:

   - Novo handler para mensagem tipo "DEEP_CAPTURE"
   - Enviar para novo endpoint: PUT /api/listings/deep-update
   - Payload: { fbUrl, fullDescription, photoUrls, sellerProfileUrl, sellerJoinDate, sellerLocation, listedCategory, condition, hasShipping }

=== PARTE 3: API — ENDPOINT DE ATUALIZAÇÃO PROFUNDA ===

No apps/api, criar:

1. PUT /api/listings/deep-update (auth):
   Body: { fbUrl: string, ...DeepListingData }
   - Buscar listing existente pelo fbUrl
   - Se encontrar: atualizar com os dados profundos + isDeepCaptured = true
   - Se NÃO encontrar: criar novo listing com os dados (pode ser que o usuário abriu direto sem passar pela busca)
   - Retornar: { success: true, data: { updated: boolean, listingId: string } }

2. Validador Zod para o deep-update

3. Atualizar listing.service.ts com função deepUpdateListing()

=== PARTE 4: FRONTEND — INDICADOR DE CAPTURA PROFUNDA ===

No apps/web:

1. Na tabela de anúncios (Analysis.tsx):
   - Adicionar badge "📸 Completo" quando isDeepCaptured = true
   - Tooltip: "Este anúncio tem descrição completa e todas as fotos"
   - Anúncios com captura profunda têm mais confiabilidade nos dados

2. Na seção "Qualidade dos Anúncios" (Analysis.tsx):
   - Adicionar métrica: "X% com captura profunda"
   - "Dica: Abra os anúncios individualmente para capturar mais detalhes"

3. Modal de detalhes do anúncio (NOVO):
   - Quando clicar num anúncio na tabela, abrir modal com:
     a) Carrossel de todas as fotos (se tiver captura profunda)
     b) Descrição completa
     c) Dados do vendedor (perfil, data de entrada, localização)
     d) Link para o anúncio original
   - Se NÃO tem captura profunda: mostrar só foto principal + "Abra o anúncio no Marketplace para capturar mais detalhes"

=== PARTE 5: POPUP DA EXTENSÃO ===

No apps/extension/src/popup/:
- Adicionar contador separado: "X capturas profundas" abaixo do contador normal
- Quando o usuário está numa página individual: mostrar "📸 Captura profunda ativa"
- Quando está na busca: mostrar "🔍 Captura de listagem ativa"

=== IMPORTANTE — SELETORES DO FACEBOOK ===

O Facebook muda seletores constantemente. Para cada extração:
1. Tentar data-testid primeiro
2. Tentar aria-label
3. Tentar estrutura do DOM (posição relativa dos elementos)
4. Tentar regex no texto
5. Se NADA funcionar, retornar null (NUNCA crashar)

Logar warning quando um método de extração falhar para facilitar debug:
[MarketPrice:DEEP] WARN: Não encontrou descrição via data-testid, tentando aria-label...
[MarketPrice:DEEP] WARN: Não encontrou fotos do carrossel, tentando background-image...

Confirme builds: cd apps/web && npx vite build && cd ../extension && npx webpack --mode production && cd ../api && npx tsc --noEmit (ignorar erros em auth.integration.test.ts)