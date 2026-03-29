# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MarketPrice is a phone reseller tool that scrapes Facebook Marketplace listings via a Chrome extension, stores pricing data, and provides analytics dashboards for resellers. All user-facing text is in Brazilian Portuguese (PT-BR).

## Monorepo Structure

```
apps/api/        → Express + Prisma API (port 3001)
apps/web/        → React + Vite dashboard (port 5173)
apps/extension/  → Chrome Extension (Manifest V3)
packages/shared/ → TypeScript type definitions
```

npm workspaces — install from root with `npm install`.

## Build & Dev Commands

```bash
# From root
npm run dev              # API + Web concurrently
npm run dev:api          # API only (tsx watch)
npm run dev:web          # Web only (vite)

# API
cd apps/api
npx tsc --noEmit         # Typecheck
npm test                 # Vitest
npm run test:watch       # Vitest watch mode
npx prisma generate      # Regenerate client after schema changes
npx prisma db push       # Push schema to database (manual only)

# Web
cd apps/web
npx vite build           # Production build
npx tsc --noEmit         # Typecheck

# Extension
cd apps/extension
npx webpack --mode production   # Build
npx webpack --mode development --watch  # Watch mode
```

## Architecture

### API (`apps/api`)

Express app with layered architecture: **routes → controllers → services → Prisma**.

- Routes at `src/routes/*.routes.ts` — each maps to a controller
- Controllers handle req/res, delegate to services
- Services contain business logic and Prisma queries
- Validators use Zod schemas at `src/validators/`
- Auth: JWT with refresh tokens, middleware at `src/middlewares/auth.ts`
- Prisma client singleton at `src/lib/prisma.ts`
- Generated Prisma client lives in `src/generated/prisma/` (gitignored, regenerated)

**API endpoints**: `/api/auth`, `/api/listings`, `/api/models`, `/api/prices`, `/api/suppliers`, `/api/profit`, `/api/analytics`

All responses follow: `{ success: boolean, data: T }` or `{ success: false, error: string }`

### Database (Prisma + PostgreSQL)

Schema at `apps/api/prisma/schema.prisma`. Uses `prisma.config.ts` for connection config (supports `DIRECT_URL` for migrations, `DATABASE_URL` for pooled connections).

Key models: User, PhoneModel, Listing (with tracking fields like `isActive`, `firstSeenAt`, `lastSeenAt`), ListingHistory (price changes and disappearances), Supplier.

**Important**: Column names use snake_case via `@map()` while Prisma fields use camelCase.

### Web (`apps/web`)

React 18 + Vite + TailwindCSS. Path alias `@/` maps to `src/`.

- Pages at `src/pages/` (Dashboard, Analysis, Calculator, Suppliers, Settings, Login, Register)
- Services at `src/services/` — axios wrappers for each API domain
- Auth context at `src/contexts/AuthContext.tsx` — provides `user`, `login`, `logout`, `register`
- Reusable UI at `src/components/ui/`, shared components at `src/components/shared/`
- Charts use Recharts; forms use react-hook-form
- Data fetching via `@tanstack/react-query`

### Chrome Extension (`apps/extension`)

Content script scrapes Facebook Marketplace DOM → batches listings → sends to background script → background calls API.

- `src/services/scraper.ts` — DOM extraction with multi-strategy selectors (FB changes selectors frequently)
- `src/services/api.ts` — API client with token refresh
- `src/services/storage.ts` — Chrome storage abstraction
- Batch: 10 listings or 30s timeout, whichever comes first

## Key Patterns

- **Region matching**: The API uses flexible region matching (`endsWith` for 2-letter states like "SC", `contains` for longer strings like "Caçador, SC")
- **Outlier detection**: Listings with price < R$200 or > R$15,000 are flagged as outliers and excluded from analytics
- **Listing upsert**: On receiving listings, the API checks `fbUrl` — existing listings get `lastSeenAt` refreshed; listings not seen in 48h are marked as disappeared
- **Model resolution**: When `modelId` is not provided, the API tries to identify the phone model from the listing title via `normalizer.service.ts`

## Environment Variables

API needs: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL` (see `apps/api/.env.example`)
Web needs: `VITE_API_URL` (defaults to `/api`, proxied to localhost:3001 in dev)

## Important Notes

- `auth.integration.test.ts` has pre-existing TypeScript errors (unrelated to feature work)
- Prisma client output is at `apps/api/src/generated/prisma/` — run `npx prisma generate` after any schema change
- The web app uses Vite's proxy in dev to forward `/api` requests to the API server
- Never use Supabase MCP tools for database operations — use Prisma CLI only
