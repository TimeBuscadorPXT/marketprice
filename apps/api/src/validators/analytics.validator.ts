import { z } from 'zod';

export const velocityQuerySchema = z.object({
  modelId: z.string().uuid('ID do modelo inválido'),
  region: z.string().min(1, 'Região é obrigatória'),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const sellersQuerySchema = z.object({
  region: z.string().min(1, 'Região é obrigatória'),
});

export const marketHealthQuerySchema = z.object({
  modelId: z.string().uuid('ID do modelo inválido'),
  region: z.string().min(1, 'Região é obrigatória'),
});

export const listingQualityQuerySchema = z.object({
  modelId: z.string().uuid('ID do modelo inválido'),
  region: z.string().min(1, 'Região é obrigatória'),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export type VelocityQuery = z.infer<typeof velocityQuerySchema>;
export type SellersQuery = z.infer<typeof sellersQuerySchema>;
export type MarketHealthQuery = z.infer<typeof marketHealthQuerySchema>;
export type ListingQualityQuery = z.infer<typeof listingQualityQuerySchema>;
