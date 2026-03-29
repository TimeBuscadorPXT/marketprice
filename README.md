# MarketPrice

Sistema de analise de precos do Facebook Marketplace para revendedores de celulares seminovos no Brasil.

## Arquitetura

```
apps/
├── api/          # Backend REST API (Express + Prisma + PostgreSQL)
├── web/          # Dashboard Frontend (React + Tailwind + Recharts)
└── extension/    # Extensao Chrome (Manifest V3, captura automatica)

packages/
└── shared/       # Tipos TypeScript compartilhados
```

### Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js, Express, TypeScript, Prisma ORM, PostgreSQL |
| Frontend | React 18, Vite, TailwindCSS, Recharts, React Query |
| Extensao | Chrome Extension Manifest V3, Webpack, TypeScript |
| Auth | JWT + Refresh Token, bcrypt |
| Testes | Vitest, Supertest |

## Como rodar localmente

### Pre-requisitos

- Node.js 20+
- npm 9+
- PostgreSQL (ou usar Prisma Postgres local com `npx prisma dev`)

### Setup

```bash
# Clonar e instalar dependencias
git clone <repo-url>
cd marketprice
npm install

# Configurar variaveis de ambiente
cp apps/api/.env.example apps/api/.env
# Editar apps/api/.env com suas credenciais

# Gerar Prisma Client
cd apps/api && npx prisma generate

# Rodar migrations
npx prisma migrate deploy

# Iniciar dev server (API + Web simultaneos)
cd ../..
npm run dev
```

### URLs em desenvolvimento

| Servico | URL |
|---------|-----|
| API | http://localhost:3001 |
| Dashboard | http://localhost:5173 |
| Health check | http://localhost:3001/api/health |

### Extensao Chrome

```bash
# Build da extensao
cd apps/extension
npm run build

# No Chrome:
# 1. Acesse chrome://extensions
# 2. Ative "Modo do desenvolvedor"
# 3. Clique "Carregar sem compactacao"
# 4. Selecione a pasta apps/extension/dist
```

## Variaveis de ambiente

### API (`apps/api/.env`)

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| DATABASE_URL | URL do PostgreSQL | postgresql://user:pass@localhost:5432/marketprice |
| JWT_SECRET | Chave para tokens JWT | uma-chave-segura-aleatoria |
| JWT_REFRESH_SECRET | Chave para refresh tokens | outra-chave-segura-aleatoria |
| PORT | Porta do servidor | 3001 |
| FRONTEND_URL | URL do frontend (CORS) | https://marketprice.vercel.app |
| NODE_ENV | Ambiente | development |

### Web (`apps/web/.env`)

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| VITE_API_URL | URL base da API | /api (dev) ou https://api.marketprice.com (prod) |

## API Endpoints

### Auth
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Perfil (auth)

### Listings
- `POST /api/listings` - Enviar anuncios (auth)
- `GET /api/listings` - Listar com paginacao (auth)

### Models
- `GET /api/models` - Listar modelos
- `GET /api/models/:id` - Detalhes do modelo

### Prices
- `GET /api/prices` - Analise de preco (auth)
- `GET /api/prices/summary` - Resumo por modelo (auth)

### Suppliers
- `GET /api/suppliers` - Listar fornecedores (auth)
- `POST /api/suppliers` - Cadastrar (auth)
- `PUT /api/suppliers/:id` - Atualizar (auth)
- `DELETE /api/suppliers/:id` - Remover (auth)
- `GET /api/suppliers/compare` - Comparar vs mercado (auth)

### Profit
- `POST /api/profit/calculate` - Calcular lucro (auth)

## Deploy

### Backend (Railway)

```bash
# O Dockerfile esta em apps/api/Dockerfile
# Railway detecta automaticamente
```

### Frontend (Vercel)

```bash
# Vercel config esta em apps/web/vercel.json
# Conectar repo ao Vercel, root directory: apps/web
```

## Testes

```bash
# Rodar testes da API
cd apps/api
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Testes do normalizador (node:test)
npx tsx --test src/services/__tests__/normalizer.test.ts
```

## Licenca

MIT
