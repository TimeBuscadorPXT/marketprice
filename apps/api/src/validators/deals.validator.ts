import { z } from 'zod';

export const dealsQuerySchema = z.object({
  region: z.string().min(1, 'Região é obrigatória'),
  brand: z.string().optional(),
  category: z.string().optional(),
  minScore: z.coerce.number().min(0).max(100).default(0),
  heat: z.enum(['hot', 'warm', 'moderate', 'all']).default('all'),
  type: z.enum(['compra_revenda', 'arbitragem_regional', 'preco_fornecedor', 'liquidacao', 'recem_publicado', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type DealsQuery = z.infer<typeof dealsQuerySchema>;
