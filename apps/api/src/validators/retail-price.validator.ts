import { z } from 'zod';

export const retailPriceQuerySchema = z.object({
  modelId: z.string({ error: 'ID do modelo e obrigatorio' }).uuid('ID do modelo invalido'),
});

export const retailCompareSchema = z.object({
  modelId: z.string({ error: 'ID do modelo e obrigatorio' }).uuid('ID do modelo invalido'),
  usedPrice: z.coerce
    .number({ error: 'Preco usado e obrigatorio' })
    .positive('Preco deve ser positivo'),
});

export const retailRefreshSchema = z.object({
  modelId: z.string({ error: 'ID do modelo e obrigatorio' }).uuid('ID do modelo invalido'),
});

export type RetailPriceQuery = z.infer<typeof retailPriceQuerySchema>;
export type RetailCompareQuery = z.infer<typeof retailCompareSchema>;
export type RetailRefreshBody = z.infer<typeof retailRefreshSchema>;
