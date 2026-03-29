import { z } from 'zod';

export const priceQuerySchema = z.object({
  modelId: z.string({ error: 'ID do modelo e obrigatorio' }).uuid('ID do modelo invalido'),
  region: z.string({ error: 'Regiao e obrigatoria' }).min(1, 'Regiao e obrigatoria'),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const priceSummaryQuerySchema = z.object({
  region: z.string({ error: 'Regiao e obrigatoria' }).min(1, 'Regiao e obrigatoria'),
  brand: z.string().optional(),
});

export type PriceQuery = z.infer<typeof priceQuerySchema>;
export type PriceSummaryQuery = z.infer<typeof priceSummaryQuerySchema>;
